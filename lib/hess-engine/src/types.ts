export type PieceType = 'KING' | 'QUEEN' | 'ROOK' | 'BISHOP' | 'KNIGHT' | 'PAWN' | 'JESTER';
export type Color = 'WHITE' | 'BLACK';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[];

export type GamePhase =
  | 'SETUP_WHITE'
  | 'SETUP_BLACK'
  | 'PLAYING'
  | 'JESTER_SACRIFICE'
  | 'KING_SWAP_SELECT'
  | 'GAME_OVER';

export interface JesterSacrificeContext {
  sacrificingColor: Color;
  jesterSquare: number;
  attackerFrom: number;
  attackerPiece: Piece;
}

export interface KingSwapContext {
  kingSquare: number;
}

export interface GameState {
  board: Board;
  currentTurn: Color;
  phase: GamePhase;
  whiteSwapsLeft: number;
  blackSwapsLeft: number;
  winner: Color | null;
  winReason: 'KING_CAPTURED' | 'DESPERATION_STALE' | null;
  jesterSacrificeCtx: JesterSacrificeContext | null;
  kingSwapCtx: KingSwapContext | null;
  hasPawnMoved: boolean[];
  lastMove: { from: number; to: number } | null;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  moveHistory: string[];
}

export interface MoveResult {
  state: GameState;
  jesterBounced: boolean;
}
