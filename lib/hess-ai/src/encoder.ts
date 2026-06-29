import type { GameState, PieceType, Color } from '@workspace/hess-engine';

export const FEATURE_SIZE = 22;

const PIECE_ORDER: PieceType[] = ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN', 'JESTER'];

export function encodeState(state: GameState): Float64Array {
  const f = new Float64Array(FEATURE_SIZE);
  const { board, whiteSwapsLeft, blackSwapsLeft } = state;

  const whiteCounts = new Array(7).fill(0);
  const blackCounts = new Array(7).fill(0);
  let whiteKingRow = 7;
  let blackKingRow = 0;
  let whiteAdvancedPawns = 0;
  let blackAdvancedPawns = 0;

  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p) continue;
    const row = Math.floor(sq / 8);
    const typeIdx = PIECE_ORDER.indexOf(p.type);
    if (p.color === 'WHITE') {
      whiteCounts[typeIdx]++;
      if (p.type === 'KING') whiteKingRow = row;
      if (p.type === 'PAWN' && row < 4) whiteAdvancedPawns++;
    } else {
      blackCounts[typeIdx]++;
      if (p.type === 'KING') blackKingRow = row;
      if (p.type === 'PAWN' && row >= 4) blackAdvancedPawns++;
    }
  }

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

  return f;
}

export function outcomeForColor(winner: Color | null, perspective: Color): number {
  if (winner === null) return 0;
  return winner === perspective ? 1 : -1;
}
