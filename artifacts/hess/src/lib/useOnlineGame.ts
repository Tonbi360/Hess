import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Color } from './types';
import {
  getLegalMoves,
  getRookPotentialTargets,
  getValidSwapTargets,
  getValidSacrificeTargets,
  findKing,
  isSquareAttackedBy,
} from './engine';

const SESSION_KEY = 'hess_session';

interface SavedSession {
  roomId: string;
  playerToken: string;
  myColor: Color;
  myName: string;
}

export function getSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch { return null; }
}

function saveSession(session: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'      // created room, waiting for opponent
  | 'ready'        // both players in, game active
  | 'reconnecting' // lost connection, trying to get back
  | 'opponent_away'// opponent disconnected, waiting for them
  | 'disconnected' // opponent permanently left
  | 'error';

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
  blockedRookSquares: number[];
  validSwapTargets: number[];
  validSacrificeTargets: number[];
  isKingSwapMode: boolean;
  attackedKingSquare: number | null;
  savedSession: SavedSession | null;
}

export interface OnlineGameActions {
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  reconnectRoom: () => void;
  setupSwap: (sq1: number, sq2: number) => void;
  confirmSetup: () => void;
  selectSquare: (sq: number) => void;
  initiateKingSwap: () => void;
  cancelKingSwap: () => void;
  sacrificePiece: (sq: number) => void;
  disconnect: () => void;
  dismissSession: () => void;
}

export function useOnlineGame(): { state: OnlineGameState; actions: OnlineGameActions } {
  const socketRef = useRef<Socket | null>(null);
  const myColorRef = useRef<Color | null>(null);
  const myNameRef = useRef<string>('');
  const roomIdRef = useRef<string | null>(null);
  const playerTokenRef = useRef<string | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<OnlinePlayers>({ WHITE: null, BLACK: null });
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [isKingSwapMode, setIsKingSwapMode] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => getSavedSession());

  const setMyColorBoth = (color: Color) => {
    setMyColor(color);
    myColorRef.current = color;
  };

  const getSocket = useCallback((): Socket => {
    if (socketRef.current?.connected) return socketRef.current;
    if (socketRef.current) { socketRef.current.removeAllListeners(); socketRef.current.disconnect(); }
    const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
    const s = io({
      path: `${base}/api/socket.io/`,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: false, // we handle reconnection manually
    });
    socketRef.current = s;
    return s;
  }, []);

  const setupSocketListeners = useCallback((socket: Socket) => {
    socket.removeAllListeners();

    socket.on('connect_error', () => {
      if (status === 'reconnecting') setErrorMsg('Could not reach the server. Retrying…');
    });

    socket.on('room_created', ({ roomId: rid, color, playerToken }: { roomId: string; color: Color; playerToken: string }) => {
      playerTokenRef.current = playerToken;
      roomIdRef.current = rid;
      setRoomId(rid);
      setMyColorBoth(color);
      setStatus('waiting');
      setErrorMsg(null);
      saveSession({ roomId: rid, playerToken, myColor: color, myName: myNameRef.current });
    });

    socket.on('room_ready', ({
      roomId: rid, gameState: gs, players: ps, playerTokens,
    }: { roomId: string; gameState: GameState; players: OnlinePlayers; playerTokens?: Partial<Record<Color, string>> }) => {
      // The token for our color arrives here if we're BLACK (we joined)
      if (playerTokens && myColorRef.current && playerTokens[myColorRef.current]) {
        const token = playerTokens[myColorRef.current]!;
        playerTokenRef.current = token;
        saveSession({ roomId: rid, playerToken: token, myColor: myColorRef.current, myName: myNameRef.current });
      }
      roomIdRef.current = rid;
      setRoomId(rid);
      setGameState(gs);
      setPlayers(ps);
      setStatus('ready');
      setErrorMsg(null);
      setSelectedSquare(null);
      setIsKingSwapMode(false);
    });

    socket.on('reconnected', ({
      roomId: rid, color, gameState: gs, players: ps,
    }: { roomId: string; color: Color; gameState: GameState; players: OnlinePlayers }) => {
      roomIdRef.current = rid;
      setRoomId(rid);
      setMyColorBoth(color);
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
      if (gs.phase === 'GAME_OVER') clearSession();
    });

    socket.on('opponent_disconnected', ({ gracePeriodSeconds }: { gracePeriodSeconds: number }) => {
      setStatus('opponent_away');
      setErrorMsg(`Opponent disconnected. Waiting up to ${gracePeriodSeconds / 60} min for them to return…`);
    });

    socket.on('opponent_reconnected', () => {
      setStatus('ready');
      setErrorMsg(null);
    });

    socket.on('opponent_left', () => {
      setStatus('disconnected');
      setErrorMsg('Opponent left the game.');
      clearSession();
    });

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
      if (status === 'reconnecting') setStatus('error');
    });
  }, [status]);

  // On mount: check for a saved session so the lobby can show "Rejoin" prompt
  useEffect(() => {
    setSavedSession(getSavedSession());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    myNameRef.current = playerName;
    setStatus('connecting');
    setErrorMsg(null);
    const socket = getSocket();
    setupSocketListeners(socket);
    socket.emit('create_room', { playerName });
  }, [getSocket, setupSocketListeners]);

  const joinRoom = useCallback((rid: string, playerName: string) => {
    myNameRef.current = playerName;
    setStatus('connecting');
    setErrorMsg(null);
    const socket = getSocket();
    setupSocketListeners(socket);
    setMyColorBoth('BLACK');
    socket.emit('join_room', { roomId: rid.toUpperCase(), playerName });
  }, [getSocket, setupSocketListeners]);

  const reconnectRoom = useCallback(() => {
    const session = getSavedSession();
    if (!session) return;
    myNameRef.current = session.myName;
    playerTokenRef.current = session.playerToken;
    roomIdRef.current = session.roomId;
    setMyColorBoth(session.myColor);
    setStatus('reconnecting');
    setErrorMsg(null);
    const socket = getSocket();
    setupSocketListeners(socket);
    socket.emit('reconnect_room', { roomId: session.roomId, playerToken: session.playerToken });
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
    if (!gameState || !myColorRef.current) return;
    const { board, currentTurn, phase } = gameState;
    const myCol = myColorRef.current;

    if (phase === 'JESTER_SACRIFICE') return;

    if (isKingSwapMode) {
      const validSwaps = getValidSwapTargets(gameState, myCol);
      if (validSwaps.includes(sq)) {
        socketRef.current?.emit('king_swap', { pawnSq: sq });
      }
      setIsKingSwapMode(false);
      setSelectedSquare(null);
      return;
    }

    if (phase !== 'PLAYING') return;
    if (currentTurn !== myCol) return;

    const piece = board[sq];

    if (selectedSquare === null) {
      if (piece && piece.color === myCol) setSelectedSquare(sq);
      return;
    }

    if (sq === selectedSquare) { setSelectedSquare(null); return; }

    if (piece && piece.color === myCol) { setSelectedSquare(sq); return; }

    const legal = getLegalMoves(gameState, selectedSquare);
    if (legal.includes(sq)) {
      socketRef.current?.emit('make_move', { from: selectedSquare, to: sq });
    }
    setSelectedSquare(null);
  }, [gameState, selectedSquare, isKingSwapMode]);

  const disconnectFn = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    clearSession();
    setStatus('idle');
    setGameState(null);
    setMyColor(null);
    myColorRef.current = null;
    setRoomId(null);
    roomIdRef.current = null;
    playerTokenRef.current = null;
    setPlayers({ WHITE: null, BLACK: null });
    setSelectedSquare(null);
    setIsKingSwapMode(false);
    setErrorMsg(null);
    setSavedSession(null);
  }, []);

  const dismissSession = useCallback(() => {
    clearSession();
    setSavedSession(null);
  }, []);

  // Derived UI state
  const legalMoveSquares: number[] = selectedSquare !== null && gameState && !isKingSwapMode
    ? getLegalMoves(gameState, selectedSquare) : [];

  // For a selected Rook: show its ±4/±6 targets that are blocked by friendly pieces
  const blockedRookSquares: number[] = (() => {
    if (selectedSquare === null || !gameState || isKingSwapMode) return [];
    const piece = gameState.board[selectedSquare];
    if (!piece || piece.type !== 'ROOK') return [];
    return getRookPotentialTargets(selectedSquare).filter(sq => !legalMoveSquares.includes(sq));
  })();

  const validSwapTargets: number[] = isKingSwapMode && gameState && myColor
    ? getValidSwapTargets(gameState, myColor) : [];

  const validSacrificeTargets: number[] = gameState?.phase === 'JESTER_SACRIFICE' && gameState
    ? getValidSacrificeTargets(gameState) : [];

  let attackedKingSquare: number | null = null;
  if (gameState?.phase === 'PLAYING') {
    const kingSq = findKing(gameState.board, gameState.currentTurn);
    const enemy: Color = gameState.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';
    if (kingSq !== -1 && isSquareAttackedBy(gameState, kingSq, enemy)) attackedKingSquare = kingSq;
  }

  return {
    state: {
      gameState, myColor, roomId, players, status, errorMsg,
      selectedSquare, legalMoveSquares, blockedRookSquares, validSwapTargets,
      validSacrificeTargets, isKingSwapMode, attackedKingSquare,
      savedSession,
    },
    actions: {
      createRoom, joinRoom, reconnectRoom, setupSwap, confirmSetup,
      selectSquare, initiateKingSwap, cancelKingSwap, sacrificePiece,
      disconnect: disconnectFn, dismissSession,
    },
  };
}
