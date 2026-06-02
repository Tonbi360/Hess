import {
  createInitialState,
  applyMove,
  applyKingSwap,
  applyJesterSacrifice,
  swapSetupSquares,
  confirmSetup,
  findKing,
  getValidSwapTargets,
  getValidSacrificeTargets,
} from '@workspace/hess-engine';
import type { GameState, Color } from '@workspace/hess-engine';
import { randomUUID } from 'node:crypto';

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
}

const rooms = new Map<string, Room>();
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function timerKey(roomId: string, color: Color) {
  return `${roomId}_${color}`;
}

const RECONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes

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
    if (player && player.token === playerToken) {
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

/**
 * Mark a player as disconnected and start a grace-period timer.
 * Returns room info if found, plus a schedule function to call after
 * setting up the timer callback.
 */
export function markPlayerDisconnected(
  socketId: string,
  onExpire: (roomId: string, color: Color) => void,
): { roomId: string; color: Color } | null {
  for (const [roomId, room] of rooms.entries()) {
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

export function handleMakeMove(room: Room, color: Color, from: number, to: number): boolean {
  const { gameState } = room;
  if (gameState.phase !== 'PLAYING') return false;
  if (gameState.currentTurn !== color) return false;
  const piece = gameState.board[from];
  if (!piece || piece.color !== color) return false;
  const result = applyMove(gameState, from, to);
  room.gameState = result.state;
  return true;
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
  return true;
}

// Clean up rooms older than 4 hours with no players
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.createdAt < cutoff && !room.players.WHITE && !room.players.BLACK) {
      rooms.delete(id);
    }
  }
}, 60 * 60 * 1000);
