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

export function applyAnyMove(state: GameState, move: { from: number; to: number; isSwap?: boolean; pawnSq?: number }): GameState {
  if (move.isSwap && move.pawnSq !== undefined) {
    const kingSq = findKing(state.board, state.currentTurn);
    return applyKingSwap(state, kingSq, move.pawnSq);
  }
  const result = applyMove(state, move.from, move.to);
  if (result.jesterBounced) {
    const sacrificeTargets = getValidSacrificeTargets(result.state);
    if (sacrificeTargets.length > 0) {
      return applyJesterSacrifice(result.state, sacrificeTargets[0]);
    }
    return result.state;
  }
  return result.state;
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
    const score = -negamax(next, depth - 1, -beta, -alpha, nextColor, evaluator);
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

  let bestMove: SearchResult | null = null;
  let bestScore = -INF;
  const nextColor: Color = color === 'WHITE' ? 'BLACK' : 'WHITE';

  for (const move of moves) {
    const next = applyAnyMove(state, move);
    const score = -negamax(next, depth - 1, -INF, INF, nextColor, evaluator);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}
