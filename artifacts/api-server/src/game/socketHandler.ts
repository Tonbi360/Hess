import type { Server, Socket } from 'socket.io';
import { logger } from '../lib/logger.js';
import {
  createRoom,
  createAiRoom,
  joinRoom,
  reconnectPlayer,
  getRoom,
  getRoomBySocket,
  markPlayerDisconnected,
  handleSetupSwap,
  handleConfirmSetup,
  handleMakeMove,
  handleKingSwap,
  handleSacrifice,
  computeAndApplyAiMove,
  requestRematch,
  resetRoomForRematch,
} from './rooms.js';
import { aiManager } from './aiManager.js';
import type { Color } from '@workspace/hess-engine';
import type { Difficulty } from './rooms.js';

const AI_MOVE_DELAY_MS = 600;
const ADMIN_PASSWORD = process.env.AI_ADMIN_PASSWORD ?? 'hess-admin';

function getRoomState(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  return {
    gameState: room.gameState,
    players: {
      WHITE: room.players.WHITE?.name ?? null,
      BLACK: room.players.BLACK?.name ?? null,
    },
    isAIGame: room.isAIGame,
    aiDifficulty: room.aiDifficulty,
  };
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  logger.info({ socketId: socket.id }, 'Client connected');

  // ── Human vs Human ────────────────────────────────────────────────────────

  socket.on('create_room', ({ playerName }: { playerName: string }) => {
    try {
      const name = (playerName || 'Anonymous').slice(0, 20);
      const { room, token } = createRoom(socket.id, name);
      socket.join(room.id);
      socket.emit('room_created', { roomId: room.id, color: 'WHITE', playerToken: token });
      logger.info({ roomId: room.id, playerName: name }, 'Room created');
    } catch (err) {
      logger.error({ err }, 'create_room error');
      socket.emit('error', { message: 'Failed to create room.' });
    }
  });

  socket.on('join_room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    try {
      const name = (playerName || 'Anonymous').slice(0, 20);
      const result = joinRoom(roomId, socket.id, name);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      const { room, token } = result;
      socket.join(room.id);
      const state = getRoomState(room.id)!;
      io.to(room.id).emit('room_ready', {
        roomId: room.id,
        gameState: state.gameState,
        players: state.players,
        isAIGame: false,
        playerTokens: {
          WHITE: room.players.WHITE?.token,
          BLACK: room.players.BLACK?.token,
        },
      });
      logger.info({ roomId: room.id, playerName: name }, 'Player joined room');
    } catch (err) {
      logger.error({ err }, 'join_room error');
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  socket.on('reconnect_room', ({ roomId, playerToken }: { roomId: string; playerToken: string }) => {
    try {
      const result = reconnectPlayer(roomId, playerToken, socket.id);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      const { room, color } = result;
      socket.join(room.id);
      const state = getRoomState(room.id)!;
      socket.emit('reconnected', {
        roomId: room.id,
        color,
        gameState: state.gameState,
        players: state.players,
        isAIGame: room.isAIGame,
        aiDifficulty: room.aiDifficulty,
      });
      socket.to(room.id).emit('opponent_reconnected', { color });
      logger.info({ roomId: room.id, color }, 'Player reconnected');
    } catch (err) {
      logger.error({ err }, 'reconnect_room error');
      socket.emit('error', { message: 'Failed to reconnect.' });
    }
  });

  // ── Human vs AI ───────────────────────────────────────────────────────────

  socket.on('create_ai_room', ({ playerName, difficulty }: { playerName: string; difficulty?: Difficulty }) => {
    try {
      const name = (playerName || 'Anonymous').slice(0, 20);
      const diff: Difficulty = difficulty ?? 'normal';
      const { room, token } = createAiRoom(socket.id, name, diff);
      socket.join(room.id);
      socket.emit('ai_game_started', {
        roomId: room.id,
        color: 'WHITE',
        playerToken: token,
        gameState: room.gameState,
        players: { WHITE: name, BLACK: 'Hess' },
        isAIGame: true,
        aiDifficulty: diff,
      });
      logger.info({ roomId: room.id, playerName: name, diff }, 'AI game created');
    } catch (err) {
      logger.error({ err }, 'create_ai_room error');
      socket.emit('error', { message: 'Failed to create AI game.' });
    }
  });

  // ── Setup ─────────────────────────────────────────────────────────────────

  socket.on('setup_swap', ({ sq1, sq2 }: { sq1: number; sq2: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) { socket.emit('error', { message: 'Not in a room.' }); return; }
    const { room, color } = found;
    const ok = handleSetupSwap(room, color, sq1, sq2);
    if (!ok) { socket.emit('error', { message: 'Invalid setup swap.' }); return; }
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('confirm_setup', () => {
    const found = getRoomBySocket(socket.id);
    if (!found) { socket.emit('error', { message: 'Not in a room.' }); return; }
    const { room, color } = found;
    const ok = handleConfirmSetup(room, color);
    if (!ok) { socket.emit('error', { message: 'Not your setup phase.' }); return; }
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  // ── Moves ─────────────────────────────────────────────────────────────────

  socket.on('make_move', ({ from, to }: { from: number; to: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) { socket.emit('error', { message: 'Not in a room.' }); return; }
    const { room, color } = found;
    const result = handleMakeMove(room, color, from, to);
    if (!result.ok) { socket.emit('error', { message: 'Invalid move.' }); return; }

    io.to(room.id).emit('game_update', { gameState: room.gameState });

    if (room.isAIGame && room.gameState.phase === 'PLAYING' && room.gameState.currentTurn === 'BLACK') {
      setTimeout(() => {
        const roomNow = getRoom(room.id);
        if (!roomNow || roomNow.gameState.phase !== 'PLAYING' || roomNow.gameState.currentTurn !== 'BLACK') return;
        const newState = computeAndApplyAiMove(roomNow);
        if (newState) {
          io.to(room.id).emit('game_update', { gameState: newState });
          if (newState.phase === 'GAME_OVER') {
            io.to(room.id).emit('ai_training_start');
            setTimeout(() => io.to(room.id).emit('ai_training_done', { bufferSize: aiManager.bufferSize() }), 1500);
          }
        }
      }, AI_MOVE_DELAY_MS);
    }
  });

  socket.on('king_swap', ({ pawnSq }: { pawnSq: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) { socket.emit('error', { message: 'Not in a room.' }); return; }
    const { room, color } = found;
    const ok = handleKingSwap(room, color, pawnSq);
    if (!ok) { socket.emit('error', { message: 'Invalid king swap.' }); return; }

    io.to(room.id).emit('game_update', { gameState: room.gameState });

    if (room.isAIGame && room.gameState.phase === 'PLAYING' && room.gameState.currentTurn === 'BLACK') {
      setTimeout(() => {
        const roomNow = getRoom(room.id);
        if (!roomNow || roomNow.gameState.phase !== 'PLAYING' || roomNow.gameState.currentTurn !== 'BLACK') return;
        const newState = computeAndApplyAiMove(roomNow);
        if (newState) io.to(room.id).emit('game_update', { gameState: newState });
      }, AI_MOVE_DELAY_MS);
    }
  });

  socket.on('sacrifice', ({ sq }: { sq: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) { socket.emit('error', { message: 'Not in a room.' }); return; }
    const { room, color } = found;
    const ok = handleSacrifice(room, color, sq);
    if (!ok) { socket.emit('error', { message: 'Invalid sacrifice.' }); return; }
    io.to(room.id).emit('game_update', { gameState: room.gameState });

    if (room.isAIGame && room.gameState.phase === 'PLAYING' && room.gameState.currentTurn === 'BLACK') {
      setTimeout(() => {
        const roomNow = getRoom(room.id);
        if (!roomNow || roomNow.gameState.phase !== 'PLAYING' || roomNow.gameState.currentTurn !== 'BLACK') return;
        const newState = computeAndApplyAiMove(roomNow);
        if (newState) io.to(room.id).emit('game_update', { gameState: newState });
      }, AI_MOVE_DELAY_MS);
    }
  });

  // ── Rematch ───────────────────────────────────────────────────────────────

  socket.on('request_rematch', () => {
    const found = getRoomBySocket(socket.id);
    if (!found) return;
    const { room, color } = found;
    if (room.gameState.phase !== 'GAME_OVER') return;

    const bothReady = requestRematch(room, color);
    if (!bothReady) {
      socket.to(room.id).emit('rematch_requested', { by: color });
      return;
    }
    resetRoomForRematch(room);
    if (room.isAIGame) {
      socket.emit('game_update', { gameState: room.gameState });
    } else {
      io.to(room.id).emit('rematch_start', {
        gameState: room.gameState,
        players: {
          WHITE: room.players.WHITE?.name ?? null,
          BLACK: room.players.BLACK?.name ?? null,
        },
      });
    }
    logger.info({ roomId: room.id }, 'Rematch started');
  });

  // ── Self-play admin ───────────────────────────────────────────────────────

  socket.on('start_self_play', async ({
    password, numGames, depth,
  }: { password: string; numGames: number; depth?: number }) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit('error', { message: 'Wrong admin password.' }); return;
    }
    const games = Math.min(Math.max(numGames || 50, 1), 500);
    const d = Math.min(Math.max(depth || 2, 1), 4);
    logger.info({ games, depth: d }, 'Self-play started');
    socket.emit('self_play_progress', { completed: 0, total: games });

    try {
      await aiManager.runSelfPlay({
        numGames: games,
        depth: d,
        epsilon: 0.2,
        batchSize: 512,
        learningRate: 0.001,
        onProgress: (completed, total) => {
          socket.emit('self_play_progress', { completed, total });
        },
      });
      socket.emit('self_play_done', {
        bufferSize: aiManager.bufferSize(),
        message: `Done! ${games} games played, weights updated.`,
      });
      logger.info({ games, bufferSize: aiManager.bufferSize() }, 'Self-play complete');
    } catch (err) {
      logger.error({ err }, 'Self-play error');
      socket.emit('error', { message: 'Self-play failed.' });
    }
  });

  socket.on('reset_ai_weights', ({ password }: { password: string }) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit('error', { message: 'Wrong admin password.' }); return;
    }
    aiManager.resetWeights();
    socket.emit('weights_reset', { message: 'Weights reset to defaults.' });
    logger.info('AI weights reset');
  });

  socket.on('get_ai_stats', ({ password }: { password: string }) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit('error', { message: 'Wrong admin password.' }); return;
    }
    socket.emit('ai_stats', { bufferSize: aiManager.bufferSize() });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
    const removed = markPlayerDisconnected(socket.id, (roomId: string, color: Color) => {
      io.to(roomId).emit('opponent_left', { color });
      logger.info({ roomId, color }, 'Player grace period expired');
    });
    if (removed) {
      io.to(removed.roomId).emit('opponent_disconnected', {
        color: removed.color,
        gracePeriodSeconds: 120,
      });
    }
  });
}
