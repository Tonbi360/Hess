import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Color } from './types';
import {
  getLegalMoves,
  getValidSwapTargets,
  getValidSacrificeTargets,
  findKing,
  isSquareAttackedBy,
} from './engine';

export type ConnectionStatus = 'idle' | 'connecting' | 'waiting' | 'ready' | 'disconnected';

export interface OnlinePlayers {
  WHITE: string | null;
  BLACK: string | null;
}

export interface OnlineGameState {
  gameState: GameState | null;
  myColor: Color | null;
  roomId: string | null;
  players: OnlinePlayers;
  status: ConnectionStatus;
  errorMsg: string | null;
  selectedSquare: number | null;
  legalMoveSquares: number[];
  validSwapTargets: number[];
  validSacrificeTargets: number[];
  isKingSwapMode: boolean;
  attackedKingSquare: number | null;
}

export interface OnlineGameActions {
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  setupSwap: (sq1: number, sq2: number) => void;
  confirmSetup: () => void;
  selectSquare: (sq: number) => void;
  initiateKingSwap: () => void;
  cancelKingSwap: () => void;
  sacrificePiece: (sq: number) => void;
  disconnect: () => void;
}

export function useOnlineGame(): { state: OnlineGameState; actions: OnlineGameActions } {
  const socketRef = useRef<Socket | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<OnlinePlayers>({ WHITE: null, BLACK: null });
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [isKingSwapMode, setIsKingSwapMode] = useState(false);

  const getSocket = useCallback((): Socket => {
    if (!socketRef.current || !socketRef.current.connected) {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
      socketRef.current = io({
        path: `${base}/api/socket.io/`,
        autoConnect: true,
        transports: ['websocket', 'polling'],
      });
    }
    return socketRef.current;
  }, []);

  const setupSocketListeners = useCallback((socket: Socket) => {
    socket.off('room_created');
    socket.off('room_ready');
    socket.off('game_update');
    socket.off('opponent_disconnected');
    socket.off('error');

    socket.on('room_created', ({ roomId: rid, color }: { roomId: string; color: Color }) => {
      setRoomId(rid);
      setMyColor(color);
      setStatus('waiting');
      setErrorMsg(null);
    });

    socket.on('room_ready', ({ roomId: rid, gameState: gs, players: ps }: { roomId: string; gameState: GameState; players: OnlinePlayers }) => {
      setRoomId(rid);
      setGameState(gs);
      setPlayers(ps);
      setStatus('ready');
      setErrorMsg(null);
      setSelectedSquare(null);
      setIsKingSwapMode(false);
    });

    socket.on('game_update', ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      setSelectedSquare(null);
      setIsKingSwapMode(false);
    });

    socket.on('opponent_disconnected', () => {
      setStatus('disconnected');
      setErrorMsg('Your opponent disconnected.');
    });

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
    });
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    setStatus('connecting');
    setErrorMsg(null);
    const socket = getSocket();
    setupSocketListeners(socket);
    socket.emit('create_room', { playerName });
  }, [getSocket, setupSocketListeners]);

  const joinRoom = useCallback((rid: string, playerName: string) => {
    setStatus('connecting');
    setErrorMsg(null);
    const socket = getSocket();
    setupSocketListeners(socket);
    setMyColor('BLACK');
    socket.emit('join_room', { roomId: rid.toUpperCase(), playerName });
  }, [getSocket, setupSocketListeners]);

  const setupSwap = useCallback((sq1: number, sq2: number) => {
    socketRef.current?.emit('setup_swap', { sq1, sq2 });
  }, []);

  const confirmSetup = useCallback(() => {
    socketRef.current?.emit('confirm_setup');
  }, []);

  const initiateKingSwap = useCallback(() => {
    setIsKingSwapMode(true);
    setSelectedSquare(null);
  }, []);

  const cancelKingSwap = useCallback(() => {
    setIsKingSwapMode(false);
    setSelectedSquare(null);
  }, []);

  const sacrificePiece = useCallback((sq: number) => {
    socketRef.current?.emit('sacrifice', { sq });
    setSelectedSquare(null);
  }, []);

  const selectSquare = useCallback((sq: number) => {
    if (!gameState || !myColor) return;
    const { board, currentTurn, phase } = gameState;

    if (phase === 'JESTER_SACRIFICE') return;

    if (isKingSwapMode) {
      const validSwaps = getValidSwapTargets(gameState, myColor);
      if (validSwaps.includes(sq)) {
        socketRef.current?.emit('king_swap', { pawnSq: sq });
        setIsKingSwapMode(false);
        setSelectedSquare(null);
      } else {
        setIsKingSwapMode(false);
        setSelectedSquare(null);
      }
      return;
    }

    if (phase !== 'PLAYING') return;
    if (currentTurn !== myColor) return;

    const piece = board[sq];

    if (selectedSquare === null) {
      if (piece && piece.color === myColor) setSelectedSquare(sq);
      return;
    }

    if (sq === selectedSquare) { setSelectedSquare(null); return; }

    if (piece && piece.color === myColor) { setSelectedSquare(sq); return; }

    const legal = getLegalMoves(gameState, selectedSquare);
    if (legal.includes(sq)) {
      socketRef.current?.emit('make_move', { from: selectedSquare, to: sq });
      setSelectedSquare(null);
    } else {
      setSelectedSquare(null);
    }
  }, [gameState, myColor, selectedSquare, isKingSwapMode]);

  const disconnectFn = useCallback(() => {
    socketRef.current?.disconnect();
    setStatus('idle');
    setGameState(null);
    setMyColor(null);
    setRoomId(null);
    setPlayers({ WHITE: null, BLACK: null });
    setSelectedSquare(null);
    setIsKingSwapMode(false);
    setErrorMsg(null);
  }, []);

  // Derived UI state
  const legalMoveSquares: number[] = selectedSquare !== null && gameState && !isKingSwapMode
    ? getLegalMoves(gameState, selectedSquare)
    : [];

  const validSwapTargets: number[] = isKingSwapMode && gameState && myColor
    ? getValidSwapTargets(gameState, myColor)
    : [];

  const validSacrificeTargets: number[] = gameState?.phase === 'JESTER_SACRIFICE' && gameState
    ? getValidSacrificeTargets(gameState)
    : [];

  let attackedKingSquare: number | null = null;
  if (gameState?.phase === 'PLAYING' && myColor) {
    const kingSq = findKing(gameState.board, gameState.currentTurn);
    const enemy: Color = gameState.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';
    if (kingSq !== -1 && isSquareAttackedBy(gameState, kingSq, enemy)) {
      attackedKingSquare = kingSq;
    }
  }

  return {
    state: {
      gameState,
      myColor,
      roomId,
      players,
      status,
      errorMsg,
      selectedSquare,
      legalMoveSquares,
      validSwapTargets,
      validSacrificeTargets,
      isKingSwapMode,
      attackedKingSquare,
    },
    actions: {
      createRoom,
      joinRoom,
      setupSwap,
      confirmSetup,
      selectSquare,
      initiateKingSwap,
      cancelKingSwap,
      sacrificePiece,
      disconnect: disconnectFn,
    },
  };
}
