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

export interface Player {
  socketId: string;
  name: string;
}

export interface Room {
  id: string;
  gameState: GameState;
  players: Partial<Record<Color, Player>>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function createRoom(socketId: string, playerName: string): Room {
  let id = generateRoomId();
  while (rooms.has(id)) id = generateRoomId();
  const room: Room = {
    id,
    gameState: createInitialState(),
    players: { WHITE: { socketId, name: playerName } },
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

export function joinRoom(roomId: string, socketId: string, playerName: string): { room: Room; color: Color } | { error: string } {
  const room = rooms.get(roomId.toUpperCase());
  if (!room) return { error: 'Room not found.' };
  if (room.players.BLACK) return { error: 'Room is already full.' };
  if (room.players.WHITE?.socketId === socketId) return { error: 'You are already in this room.' };
  room.players.BLACK = { socketId, name: playerName };
  return { room, color: 'BLACK' };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomBySocket(socketId: string): { room: Room; color: Color } | null {
  for (const room of rooms.values()) {
    for (const [color, player] of Object.entries(room.players) as [Color, Player][]) {
      if (player.socketId === socketId) return { room, color };
    }
  }
  return null;
}

export function getColorInRoom(room: Room, socketId: string): Color | null {
  for (const [color, player] of Object.entries(room.players) as [Color, Player][]) {
    if (player.socketId === socketId) return color;
  }
  return null;
}

export function removePlayerFromRoom(socketId: string): { roomId: string; color: Color } | null {
  for (const [roomId, room] of rooms.entries()) {
    for (const [color, player] of Object.entries(room.players) as [Color, Player][]) {
      if (player.socketId === socketId) {
        delete room.players[color];
        if (!room.players.WHITE && !room.players.BLACK) rooms.delete(roomId);
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
  const row1 = Math.floor(sq1 / 8);
  const row2 = Math.floor(sq2 / 8);
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
