import { useState, useCallback } from 'react';
import type { GameState } from './types';
import {
  createInitialState,
  getLegalMoves,
  getValidSwapTargets,
  getValidSacrificeTargets,
  applyMove,
  applyKingSwap,
  applyJesterSacrifice,
  swapSetupSquares,
  confirmSetup,
  findKing,
  isSquareAttackedBy,
} from './engine';

export interface GameActions {
  // Setup phase
  setupSwap: (sq1: number, sq2: number) => void;
  confirmSetup: () => void;

  // Playing phase – selection
  selectSquare: (sq: number) => void;

  // King swap mode
  initiateKingSwap: () => void;
  cancelKingSwap: () => void;

  // Jester sacrifice
  sacrificePiece: (sq: number) => void;

  // Reset
  resetGame: () => void;
}

export interface GameUI {
  selectedSquare: number | null;
  legalMoveSquares: number[];
  validSwapTargets: number[];
  validSacrificeTargets: number[];
  isKingSwapMode: boolean;
  attackedKingSquare: number | null; // King square when under attack
}

export function useGameState(): { gameState: GameState; ui: GameUI; actions: GameActions } {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [isKingSwapMode, setIsKingSwapMode] = useState(false);

  const resetGame = useCallback(() => {
    setGameState(createInitialState());
    setSelectedSquare(null);
    setIsKingSwapMode(false);
  }, []);

  const setupSwapFn = useCallback((sq1: number, sq2: number) => {
    setGameState(s => swapSetupSquares(s, sq1, sq2));
  }, []);

  const confirmSetupFn = useCallback(() => {
    setGameState(s => confirmSetup(s));
    setSelectedSquare(null);
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
    setGameState(s => applyJesterSacrifice(s, sq));
  }, []);

  const selectSquare = useCallback((sq: number) => {
    setGameState(currentState => {
      const { board, currentTurn, phase } = currentState;

      // ── King swap mode ────────────────────────────────────────────────
      if (phase === 'KING_SWAP_SELECT' || isKingSwapMode) {
        const kingSq = findKing(board, currentTurn);
        if (kingSq === -1) return currentState;
        const validSwaps = getValidSwapTargets(currentState, currentTurn);
        if (validSwaps.includes(sq)) {
          setIsKingSwapMode(false);
          setSelectedSquare(null);
          return applyKingSwap(currentState, kingSq, sq);
        }
        // Clicking non-swap target: cancel swap mode
        setIsKingSwapMode(false);
        setSelectedSquare(null);
        return currentState;
      }

      if (phase !== 'PLAYING') return currentState;

      const piece = board[sq];

      // ── Selecting a piece ─────────────────────────────────────────────
      if (selectedSquare === null) {
        if (piece && piece.color === currentTurn) {
          setSelectedSquare(sq);
        }
        return currentState;
      }

      // ── Already have a selection ──────────────────────────────────────
      if (sq === selectedSquare) {
        // Deselect
        setSelectedSquare(null);
        return currentState;
      }

      // Re-select own piece
      if (piece && piece.color === currentTurn) {
        setSelectedSquare(sq);
        return currentState;
      }

      // Try to move to sq
      const legal = getLegalMoves(currentState, selectedSquare);
      if (legal.includes(sq)) {
        setSelectedSquare(null);
        const result = applyMove(currentState, selectedSquare, sq);
        return result.state;
      }

      // Clicked an invalid square — deselect
      setSelectedSquare(null);
      return currentState;
    });
  }, [selectedSquare, isKingSwapMode]);

  // ── Compute UI-derived state ────────────────────────────────────────────
  const legalMoveSquares: number[] = selectedSquare !== null && !isKingSwapMode
    ? getLegalMoves(gameState, selectedSquare)
    : [];

  const validSwapTargets: number[] = isKingSwapMode
    ? getValidSwapTargets(gameState, gameState.currentTurn)
    : [];

  const validSacrificeTargets: number[] = gameState.phase === 'JESTER_SACRIFICE'
    ? getValidSacrificeTargets(gameState)
    : [];

  // Highlight the King square if under attack
  let attackedKingSquare: number | null = null;
  if (gameState.phase === 'PLAYING') {
    const kingSq = findKing(gameState.board, gameState.currentTurn);
    const enemy = gameState.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';
    if (kingSq !== -1 && isSquareAttackedBy(gameState, kingSq, enemy)) {
      attackedKingSquare = kingSq;
    }
  }

  return {
    gameState,
    ui: {
      selectedSquare,
      legalMoveSquares,
      validSwapTargets,
      validSacrificeTargets,
      isKingSwapMode,
      attackedKingSquare,
    },
    actions: {
      setupSwap: setupSwapFn,
      confirmSetup: confirmSetupFn,
      selectSquare,
      initiateKingSwap,
      cancelKingSwap,
      sacrificePiece,
      resetGame,
    },
  };
}
