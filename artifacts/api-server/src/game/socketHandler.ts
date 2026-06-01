import type { Server, Socket } from 'socket.io';
import { logger } from '../lib/logger.js';
import {
  createRoom,
  joinRoom,
  getRoom,
  getColorInRoom,
  getRoomBySocket,
  removePlayerFromRoom,
  handleSetupSwap,
  handleConfirmSetup,
  handleMakeMove,
  handleKingSwap,
  handleSacrifice,
} from './rooms.js';

function getRoomState(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  return {
    gameState: room.gameState,
    players: {
      WHITE: room.players.WHITE?.name ?? null,
      BLACK: room.players.BLACK?.name ?? null,
    },
  };
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  logger.info({ socketId: socket.id }, 'Client connected');

  socket.on('create_room', ({ playerName }: { playerName: string }) => {
    try {
      const name = (playerName || 'Anonymous').slice(0, 20);
      const room = createRoom(socket.id, name);
      socket.join(room.id);
      socket.emit('room_created', { roomId: room.id, color: 'WHITE' });
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
      if ('error' in result) {
        socket.emit('error', { message: result.error });
        return;
      }
      const { room } = result;
      socket.join(room.id);
      const state = getRoomState(room.id)!;
      io.to(room.id).emit('room_ready', {
        roomId: room.id,
        gameState: state.gameState,
        players: state.players,
      });
      logger.info({ roomId: room.id, playerName: name }, 'Player joined room');
    } catch (err) {
      logger.error({ err }, 'join_room error');
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  socket.on('setup_swap', ({ sq1, sq2 }: { sq1: number; sq2: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) return socket.emit('error', { message: 'Not in a room.' });
    const { room, color } = found;
    const ok = handleSetupSwap(room, color, sq1, sq2);
    if (!ok) return socket.emit('error', { message: 'Invalid setup swap.' });
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('confirm_setup', () => {
    const found = getRoomBySocket(socket.id);
    if (!found) return socket.emit('error', { message: 'Not in a room.' });
    const { room, color } = found;
    const ok = handleConfirmSetup(room, color);
    if (!ok) return socket.emit('error', { message: 'Not your setup phase.' });
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('make_move', ({ from, to }: { from: number; to: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) return socket.emit('error', { message: 'Not in a room.' });
    const { room, color } = found;
    const ok = handleMakeMove(room, color, from, to);
    if (!ok) return socket.emit('error', { message: 'Invalid move.' });
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('king_swap', ({ pawnSq }: { pawnSq: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) return socket.emit('error', { message: 'Not in a room.' });
    const { room, color } = found;
    const ok = handleKingSwap(room, color, pawnSq);
    if (!ok) return socket.emit('error', { message: 'Invalid king swap.' });
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('sacrifice', ({ sq }: { sq: number }) => {
    const found = getRoomBySocket(socket.id);
    if (!found) return socket.emit('error', { message: 'Not in a room.' });
    const { room, color } = found;
    const ok = handleSacrifice(room, color, sq);
    if (!ok) return socket.emit('error', { message: 'Invalid sacrifice.' });
    io.to(room.id).emit('game_update', { gameState: room.gameState });
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
    const removed = removePlayerFromRoom(socket.id);
    if (removed) {
      io.to(removed.roomId).emit('opponent_disconnected', { color: removed.color });
    }
  });
}
