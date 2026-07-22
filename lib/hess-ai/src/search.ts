import {
  getLegalMoves,
  applyMove,
  applyKingSwap,
  getValidSwapTargets,
  findKing,
  getValidSacrificeTargets,
  applyJesterSacrifice,
} from '@workspace/hess-engine';
import type { GameState, Color } from '@workspace/hess-engine';
import { Evaluator } from './evaluator.js';
import { encodeState } from './encoder.js';

const INF = 1e9;

function evaluateForColor(state: GameState, color: Color, evaluator: Evaluator): number {
  const raw = evaluator.evaluate(encodeState(state));
  return color === 'WHITE' ? raw : -raw;
}

function getAllMoves(state: GameState, color: Color): Array<{ from: number; to: number; isSwap?: boolean; pawnSq?: number }> {
  const moves: Array<{ from: number; to: number; isSwap?: boolean; pawnSq?: number }> = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== color) continue;
    for (const to of getLegalMoves(state, sq)) {
      moves.push({ from: sq, to });
    }
  }
  const swapTargets = getValidSwapTargets(state, color);
  for (const pawnSq of swapTargets) {
    const kingSq = findKing(state.board, color);
    if (kingSq !== -1) moves.push({ from: kingSq, to: pawnSq, isSwap: true, pawnSq });
  }
  return moves;
}

const PIECE_VAL_MAP: Record<string, number> = {
  PAWN: 1, KNIGHT: 3, BISHOP: 3, JESTER: 4, ROOK: 5, QUEEN: 9, KING: 100
};

export function applyAnyMove(state: GameState, move: { from: number; to: number; isSwap?: boolean; pawnSq?: number }): GameState {
  if (move.isSwap && move.pawnSq !== undefined) {
    const kingSq = findKing(state.board, state.currentTurn);
    return applyKingSwap(state, kingSq, move.pawnSq);
  }
  const result = applyMove(state, move.from, move.to);
  if (result.jesterBounced) {
    const sacrificeTargets = getValidSacrificeTargets(result.state);
    if (sacrificeTargets.length > 0) {
      // Pick the least valuable piece to sacrifice (e.g. Pawn over Queen)
      let bestSq = sacrificeTargets[0];
      let minVal = 999;
      for (const sq of sacrificeTargets) {
        const p = result.state.board[sq];
        const val = p ? (PIECE_VAL_MAP[p.type] ?? 1) : 1;
        if (val < minVal) {
          minVal = val;
          bestSq = sq;
        }
      }
      return applyJesterSacrifice(result.state, bestSq);
    }
    return result.state;
  }
  return result.state;
}

function algToSq(alg: string): number {
  if (!alg || alg.length < 2) return -1;
  const col = alg.charCodeAt(0) - 97;
  const row = 8 - parseInt(alg.charAt(1), 10);
  if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
  return row * 8 + col;
}

function getRepetitionPenalty(state: GameState, move: SearchResult): number {
  if (move.isSwap) return 0;

  // Don't penalize capturing an enemy piece
  const targetPiece = state.board[move.to];
  if (targetPiece && targetPiece.color !== state.currentTurn) return 0;

  let penalty = 0;
  const history = state.moveHistory;
  const len = history.length;

  // 1. Moving piece back to where it was 2 plies ago (e.g. A -> B and now B -> A)
  if (len >= 2) {
    const myLastNot = history[len - 2];
    if (myLastNot && myLastNot.includes('-')) {
      const parts = myLastNot.split(':')[1]?.split('-') || [];
      if (parts.length === 2) {
        const prevFrom = algToSq(parts[0]);
        const prevTo = algToSq(parts[1]);
        if (move.from === prevTo && move.to === prevFrom) {
          penalty += 4.0;
        }
      }
    }
  }

  // 2. Moving piece back to where it was 4 plies ago (continuous back-and-forth shuffling)
  if (len >= 4) {
    const myPrevNot = history[len - 4];
    if (myPrevNot && myPrevNot.includes('-')) {
      const parts = myPrevNot.split(':')[1]?.split('-') || [];
      if (parts.length === 2) {
        const prevFrom = algToSq(parts[0]);
        const prevTo = algToSq(parts[1]);
        if (move.from === prevTo && move.to === prevFrom) {
          penalty += 6.0;
        }
      }
    }
  }

  // 3. Immediately undoing opponent's move without capturing
  if (state.lastMove && move.from === state.lastMove.to && move.to === state.lastMove.from) {
    penalty += 2.0;
  }

  return penalty;
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  color: Color,
  evaluator: Evaluator,
): number {
  if (state.phase === 'GAME_OVER' || depth === 0) {
    if (state.winner !== null) {
      return state.winner === color ? INF : -INF;
    }
    return evaluateForColor(state, color, evaluator);
  }

  const moves = getAllMoves(state, color);
  if (moves.length === 0) return -INF;

  // Sort: captures first for better pruning
  moves.sort((a, b) => {
    const capA = state.board[a.to] ? 1 : 0;
    const capB = state.board[b.to] ? 1 : 0;
    return capB - capA;
  });

  let best = -INF;
  const nextColor: Color = color === 'WHITE' ? 'BLACK' : 'WHITE';
  for (const move of moves) {
    const next = applyAnyMove(state, move);
    let score = -negamax(next, depth - 1, -beta, -alpha, nextColor, evaluator);

    score -= getRepetitionPenalty(state, move);

    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export interface SearchResult {
  from: number;
  to: number;
  isSwap?: boolean;
  pawnSq?: number;
}

export function getBestMove(
  state: GameState,
  depth: number,
  epsilon: number,
  evaluator: Evaluator,
): SearchResult | null {
  const color = state.currentTurn;
  const moves = getAllMoves(state, color);
  if (moves.length === 0) return null;

  if (Math.random() < epsilon) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let maxScore = -INF;
  const nextColor: Color = color === 'WHITE' ? 'BLACK' : 'WHITE';
  const scoredMoves: Array<{ move: SearchResult; score: number }> = [];

  for (const move of moves) {
    const next = applyAnyMove(state, move);
    let score = -negamax(next, depth - 1, -INF, INF, nextColor, evaluator);

    score -= getRepetitionPenalty(state, move);

    scoredMoves.push({ move, score });
    if (score > maxScore) {
      maxScore = score;
    }
  }

  // Filter top moves that are within 0.1 of maxScore to break ties dynamically and prevent repetitive loops
  const topMoves = scoredMoves.filter(m => m.score >= maxScore - 0.1);
  if (topMoves.length > 0) {
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
    return chosen.move;
  }

  return scoredMoves[0]?.move ?? null;
}
