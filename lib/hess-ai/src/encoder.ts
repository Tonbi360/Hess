import type { GameState, PieceType, Color } from '@workspace/hess-engine';
import { getAttackedSquares, getLegalMoves, findKing } from '@workspace/hess-engine';

export const FEATURE_SIZE = 34;

const PIECE_ORDER: PieceType[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN', 'JESTER'];
const PIECE_VALUES: Record<PieceType, number> = {
  KING: 100,
  QUEEN: 9,
  ROOK: 5,
  BISHOP: 3,
  KNIGHT: 3,
  PAWN: 1,
  JESTER: 4,
};

const CENTER_SQUARES = [27, 28, 35, 36];

export function encodeState(state: GameState): Float64Array {
  const f = new Float64Array(FEATURE_SIZE);
  const { board, whiteSwapsLeft, blackSwapsLeft } = state;

  const whiteCounts = new Array(7).fill(0);
  const blackCounts = new Array(7).fill(0);
  let whiteKingRow = 7;
  let blackKingRow = 0;
  let whiteAdvancedPawns = 0;
  let blackAdvancedPawns = 0;

  let whiteThreatenedVal = 0;
  let blackThreatenedVal = 0;
  let whiteHangingVal = 0;
  let blackHangingVal = 0;
  let whiteMobility = 0;
  let blackMobility = 0;
  let whiteCenterControl = 0;
  let blackCenterControl = 0;

  const whiteAttackedSqs = getAttackedSquares(state, 'WHITE');
  const blackAttackedSqs = getAttackedSquares(state, 'BLACK');

  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p) continue;
    const row = Math.floor(sq / 8);
    const typeIdx = PIECE_ORDER.indexOf(p.type);
    const pieceVal = PIECE_VALUES[p.type] ?? 1;

    if (p.color === 'WHITE') {
      whiteCounts[typeIdx]++;
      if (p.type === 'KING') whiteKingRow = row;
      if (p.type === 'PAWN' && row < 4) whiteAdvancedPawns++;

      // Check if White piece is threatened by Black
      if (blackAttackedSqs.has(sq)) {
        whiteThreatenedVal += pieceVal;
        // Hanging if NOT defended by White
        if (!whiteAttackedSqs.has(sq)) {
          whiteHangingVal += pieceVal;
        }
      }

      const moves = getLegalMoves(state, sq);
      whiteMobility += moves.length;
      for (const m of moves) {
        if (CENTER_SQUARES.includes(m)) whiteCenterControl++;
      }
    } else {
      blackCounts[typeIdx]++;
      if (p.type === 'KING') blackKingRow = row;
      if (p.type === 'PAWN' && row >= 4) blackAdvancedPawns++;

      // Check if Black piece is threatened by White
      if (whiteAttackedSqs.has(sq)) {
        blackThreatenedVal += pieceVal;
        // Hanging if NOT defended by Black
        if (!blackAttackedSqs.has(sq)) {
          blackHangingVal += pieceVal;
        }
      }

      const moves = getLegalMoves(state, sq);
      blackMobility += moves.length;
      for (const m of moves) {
        if (CENTER_SQUARES.includes(m)) blackCenterControl++;
      }
    }
  }

  const whiteKingSq = findKing(board, 'WHITE');
  const blackKingSq = findKing(board, 'BLACK');
  const whiteKingInCheck = whiteKingSq !== -1 && blackAttackedSqs.has(whiteKingSq);
  const blackKingInCheck = blackKingSq !== -1 && whiteAttackedSqs.has(blackKingSq);

  for (let i = 0; i < 7; i++) {
    f[i] = whiteCounts[i];
    f[7 + i] = blackCounts[i];
  }
  f[14] = whiteSwapsLeft / 3;
  f[15] = blackSwapsLeft / 3;
  f[16] = whiteAdvancedPawns / 8;
  f[17] = blackAdvancedPawns / 8;
  f[18] = (7 - whiteKingRow) / 7;
  f[19] = blackKingRow / 7;
  f[20] = state.currentTurn === 'WHITE' ? 1 : 0;
  f[21] = 1;

  // Tactical and threat features
  f[22] = whiteThreatenedVal / 50;
  f[23] = blackThreatenedVal / 50;
  f[24] = whiteHangingVal / 50;
  f[25] = blackHangingVal / 50;
  f[26] = whiteKingInCheck ? 1 : 0;
  f[27] = blackKingInCheck ? 1 : 0;
  f[28] = Math.min(whiteMobility, 50) / 50;
  f[29] = Math.min(blackMobility, 50) / 50;
  f[30] = Math.min(whiteCenterControl, 10) / 10;
  f[31] = Math.min(blackCenterControl, 10) / 10;
  f[32] = (state.whiteQueenRaidMoves || 0) / 5;
  f[33] = (state.blackQueenRaidMoves || 0) / 5;

  return f;
}

export function outcomeForColor(winner: Color | null, perspective: Color): number {
  if (winner === null) return 0;
  return winner === perspective ? 1 : -1;
}
