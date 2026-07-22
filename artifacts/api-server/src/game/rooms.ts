import {
  createInitialState,
  applyMove,
  applyKingSwap,
  applyJesterSacrifice,
  swapSetupSquares,
  confirmSetup,
  findKing,
  getLegalMoves,
  getValidSwapTargets,
  getValidSacrificeTargets,
} from '@workspace/hess-engine';
import type { GameState, Color } from '@workspace/hess-engine';
import { randomUUID } from 'node:crypto';
import { aiManager } from './aiManager.js';
import type { Difficulty } from './aiManager.js';

export type { Difficulty };

export interface Player {
  socketId: string;
  name: string;
  token: string;
  disconnectedAt?: number;
}

export interface Room {
  id: string;
  gameState: GameState;
  players: Partial<Record<Color, Player>>;
  createdAt: number;
  isAIGame: boolean;
  aiDifficulty: Difficulty;
  aiPositions: Array<{ state: GameState }>;
  rematchVotes: Set<Color>;
}

const rooms = new Map<string, Room>();
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function timerKey(roomId: string, color: Color) {
  return `${roomId}_${color}`;
}

const RECONNECT_GRACE_MS = 2 * 60 * 1000;
const AI_PLAYER_ID = '__AI__';

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function createRoom(socketId: string, playerName: string): { room: Room; token: string } {
  let id = generateRoomId();
  while (rooms.has(id)) id = generateRoomId();
  const token = randomUUID();
  const room: Room = {
    id,
    gameState: createInitialState(),
    players: { WHITE: { socketId, name: playerName, token } },
    createdAt: Date.now(),
    isAIGame: false,
    aiDifficulty: 'normal',
    aiPositions: [],
    rematchVotes: new Set(),
  };
  rooms.set(id, room);
  return { room, token };
}

export function createAiRoom(
  socketId: string,
  playerName: string,
  difficulty: Difficulty = 'normal',
): { room: Room; token: string } {
  let id = generateRoomId();
  while (rooms.has(id)) id = generateRoomId();
  const token = randomUUID();
  const room: Room = {
    id,
    gameState: createInitialState(),
    players: {
      WHITE: { socketId, name: playerName, token },
      BLACK: { socketId: AI_PLAYER_ID, name: 'Hess', token: '' },
    },
    createdAt: Date.now(),
    isAIGame: true,
    aiDifficulty: difficulty,
    aiPositions: [],
    rematchVotes: new Set(),
  };
  rooms.set(id, room);
  return { room, token };
}

export function joinRoom(
  roomId: string,
  socketId: string,
  playerName: string,
): { room: Room; color: Color; token: string } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Room not found.' };
  if (room.isAIGame) return { error: 'This is an AI game.' };
  if (room.players.BLACK && !room.players.BLACK.disconnectedAt) return { error: 'Room is already full.' };
  if (room.players.WHITE?.socketId === socketId) return { error: 'You are already in this room.' };
  const token = randomUUID();
  room.players.BLACK = { socketId, name: playerName, token };
  return { room, color: 'BLACK', token };
}

export function reconnectPlayer(
  roomId: string,
  playerToken: string,
  newSocketId: string,
): { room: Room; color: Color } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Room no longer exists. The game may have expired.' };

  for (const color of ['WHITE', 'BLACK'] as Color[]) {
    const player = room.players[color];
    if (player && player.token === playerToken && player.socketId !== AI_PLAYER_ID) {
      const key = timerKey(room.id, color);
      const timer = disconnectTimers.get(key);
      if (timer) { clearTimeout(timer); disconnectTimers.delete(key); }
      player.socketId = newSocketId;
      delete player.disconnectedAt;
      return { room, color };
    }
  }
  return { error: 'Session not recognised. The game may have expired.' };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomBySocket(socketId: string): { room: Room; color: Color } | null {
  for (const room of rooms.values()) {
    for (const color of ['WHITE', 'BLACK'] as Color[]) {
      const player = room.players[color];
      if (player && player.socketId === socketId) return { room, color };
    }
  }
  return null;
}

export function getColorInRoom(room: Room, socketId: string): Color | null {
  for (const color of ['WHITE', 'BLACK'] as Color[]) {
    const player = room.players[color];
    if (player && player.socketId === socketId) return color;
  }
  return null;
}

export function markPlayerDisconnected(
  socketId: string,
  onExpire: (roomId: string, color: Color) => void,
): { roomId: string; color: Color } | null {
  for (const [roomId, room] of rooms.entries()) {
    if (room.isAIGame) continue;
    for (const color of ['WHITE', 'BLACK'] as Color[]) {
      const player = room.players[color];
      if (player && player.socketId === socketId) {
        player.disconnectedAt = Date.now();
        const key = timerKey(roomId, color);
        const existing = disconnectTimers.get(key);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          disconnectTimers.delete(key);
          const r = rooms.get(roomId);
          if (r) {
            const p = r.players[color];
            if (p && p.disconnectedAt) {
              delete r.players[color];
              if (!r.players.WHITE && !r.players.BLACK) rooms.delete(roomId);
            }
          }
          onExpire(roomId, color);
        }, RECONNECT_GRACE_MS);
        disconnectTimers.set(key, timer);
        return { roomId, color };
      }
    }
  }
  return null;
}

export function handleSetupSwap(room: Room, color: Color, sq1: number, sq2: number): boolean {
  const { phase } = room.gameState;
  if (phase === 'SETUP_WHITE' && color !== 'WHITE') return false;
  if (phase === 'SETUP_BLACK' && color !== 'BLACK') return false;
  const row1 = Math.floor(sq1 / 8); const row2 = Math.floor(sq2 / 8);
  if (color === 'WHITE' && (row1 !== 7 || row2 !== 7)) return false;
  if (color === 'BLACK' && (row1 !== 0 || row2 !== 0)) return false;
  room.gameState = swapSetupSquares(room.gameState, sq1, sq2);
  return true;
}

export function handleConfirmSetup(room: Room, color: Color): boolean {
  const { phase } = room.gameState;
  if (phase === 'SETUP_WHITE' && color !== 'WHITE') return false;
  if (phase === 'SETUP_BLACK' && color !== 'BLACK') return false;
  room.gameState = confirmSetup(room.gameState);
  return true;
}

export interface MakeMoveResult {
  ok: boolean;
  aiResponded?: boolean;
  gameEnded?: boolean;
}

export function handleMakeMove(room: Room, color: Color, from: number, to: number): MakeMoveResult {
  const { gameState } = room;
  if (gameState.phase !== 'PLAYING') return { ok: false };
  if (gameState.currentTurn !== color) return { ok: false };
  const piece = gameState.board[from];
  if (!piece || piece.color !== color) return { ok: false };
  const legal = getLegalMoves(gameState, from);
  if (!legal.includes(to)) return { ok: false };

  if (room.isAIGame) room.aiPositions.push({ state: { ...gameState } });

  const result = applyMove(gameState, from, to);
  room.gameState = result.state;

  if (result.state.phase === 'GAME_OVER') {
    triggerAiTraining(room);
    return { ok: true, gameEnded: true };
  }

  // When the Human's move bounces off the AI's Jester, the AI must sacrifice.
  // Since the AI has no socket, resolve it server-side immediately.
  if (result.state.phase === 'JESTER_SACRIFICE' &&
      room.isAIGame &&
      result.state.jesterSacrificeCtx?.sacrificingColor === 'BLACK') {
    const targets = getValidSacrificeTargets(result.state);
    if (targets.length > 0) {
      room.gameState = applyJesterSacrifice(result.state, targets[0]);
      if (room.gameState.phase === 'GAME_OVER') {
        triggerAiTraining(room);
        return { ok: true, gameEnded: true };
      }
    }
    // currentTurn is now WHITE — caller will NOT queue an AI move (correct)
    return { ok: true };
  }

  if (result.state.phase === 'JESTER_SACRIFICE') return { ok: true };

  return { ok: true };
}

export function handleKingSwap(room: Room, color: Color, pawnSq: number): boolean {
  const { gameState } = room;
  if (gameState.phase !== 'PLAYING') return false;
  if (gameState.currentTurn !== color) return false;
  const swapsLeft = color === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  if (swapsLeft <= 0) return false;
  const validTargets = getValidSwapTargets(gameState, color);
  if (!validTargets.includes(pawnSq)) return false;
  const kingSq = findKing(gameState.board, color);
  if (kingSq === -1) return false;

  if (room.isAIGame) room.aiPositions.push({ state: { ...gameState } });

  room.gameState = applyKingSwap(gameState, kingSq, pawnSq);
  return true;
}

export function handleSacrifice(room: Room, color: Color, sq: number): boolean {
  const { gameState } = room;
  if (gameState.phase !== 'JESTER_SACRIFICE') return false;
  if (gameState.jesterSacrificeCtx?.sacrificingColor !== color) return false;
  const validTargets = getValidSacrificeTargets(gameState);
  if (!validTargets.includes(sq)) return false;
  room.gameState = applyJesterSacrifice(gameState, sq);

  if (room.gameState.phase === 'GAME_OVER') triggerAiTraining(room);
  return true;
}

/** Compute and apply the AI's move. Returns the new game state or null if AI can't move. */
export function computeAndApplyAiMove(room: Room): GameState | null {
  if (!room.isAIGame || room.gameState.phase !== 'PLAYING') return null;
  if (room.gameState.currentTurn !== 'BLACK') return null;

  room.aiPositions.push({ state: { ...room.gameState } });

  const move = aiManager.computeMove(room.gameState, room.aiDifficulty);
  if (!move) return null;

  if (move.isSwap && move.pawnSq !== undefined) {
    const kingSq = findKing(room.gameState.board, 'BLACK');
    room.gameState = applyKingSwap(room.gameState, kingSq, move.pawnSq);
  } else {
    const result = applyMove(room.gameState, move.from, move.to);
    if (result.jesterBounced) {
      const targets = getValidSacrificeTargets(result.state);
      if (targets.length > 0) {
        room.gameState = applyJesterSacrifice(result.state, targets[0]);
      } else {
        room.gameState = result.state;
      }
    } else {
      room.gameState = result.state;
    }
  }

  if (room.gameState.phase === 'GAME_OVER') triggerAiTraining(room);
  return room.gameState;
}

function triggerAiTraining(room: Room): void {
  if (!room.isAIGame || room.aiPositions.length === 0) return;
  const positions = [...room.aiPositions];
  const winner = room.gameState.winner;
  room.aiPositions = [];
  setImmediate(() => {
    aiManager.recordAndTrain(positions, winner);
  });
}

/** Request a rematch. Returns true when both players have voted (game should reset). */
export function requestRematch(room: Room, color: Color): boolean {
  room.rematchVotes.add(color);
  if (room.isAIGame) return true;
  return room.rematchVotes.has('WHITE') && room.rematchVotes.has('BLACK');
}

/** Reset game state for a rematch in the same room. */
export function resetRoomForRematch(room: Room): void {
  let gs = createInitialState();
  if (room.isAIGame) {
    gs = confirmSetup(gs);
    gs = confirmSetup(gs);
  }
  room.gameState = gs;
  room.aiPositions = [];
  room.rematchVotes = new Set();
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.createdAt < cutoff && !room.players.WHITE && !room.players.BLACK) {
      rooms.delete(id);
    }
  }
}, 60 * 60 * 1000);
