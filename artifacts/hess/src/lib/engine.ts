import type { Board, Color, GamePhase, GameState, JesterSacrificeContext, MoveResult, Piece, PieceType } from './types';

// ─── Coordinate helpers ────────────────────────────────────────────────────

export function getRow(sq: number): number { return Math.floor(sq / 8); }
export function getCol(sq: number): number { return sq % 8; }
export function toSquare(row: number, col: number): number { return row * 8 + col; }
export function isOnBoard(sq: number): boolean { return sq >= 0 && sq <= 63; }
export function isWhiteTerritory(sq: number): boolean { return sq >= 32; }
export function isBlackTerritory(sq: number): boolean { return sq < 32; }

// ─── Default starting board ────────────────────────────────────────────────

export function createDefaultBoard(): Board {
  const board: Board = Array(64).fill(null);

  const backRow: PieceType[] = ['ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING', 'BISHOP', 'KNIGHT', 'ROOK'];

  // Black back row: row 0 (squares 0–7)
  for (let c = 0; c < 8; c++) {
    board[c] = { type: backRow[c], color: 'BLACK' };
  }
  // Black pawns: row 1 (squares 8–15)
  for (let c = 0; c < 8; c++) {
    board[8 + c] = { type: 'PAWN', color: 'BLACK' };
  }
  // White pawns: row 6 (squares 48–55)
  for (let c = 0; c < 8; c++) {
    board[48 + c] = { type: 'PAWN', color: 'WHITE' };
  }
  // White back row: row 7 (squares 56–63)
  for (let c = 0; c < 8; c++) {
    board[56 + c] = { type: backRow[c], color: 'WHITE' };
  }

  return board;
}

export function createInitialState(): GameState {
  return {
    board: createDefaultBoard(),
    currentTurn: 'WHITE',
    phase: 'SETUP_WHITE',
    whiteSwapsLeft: 3,
    blackSwapsLeft: 3,
    winner: null,
    winReason: null,
    jesterSacrificeCtx: null,
    kingSwapCtx: null,
    hasPawnMoved: Array(64).fill(false),
    lastMove: null,
    capturedByWhite: [],
    capturedByBlack: [],
    moveHistory: [],
  };
}

// ─── Piece move generators ─────────────────────────────────────────────────

function getKingNormalMoves(board: Board, sq: number, color: Color): number[] {
  const moves: number[] = [];
  const r = getRow(sq);
  const c = getCol(sq);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const target = toSquare(nr, nc);
      const piece = board[target];
      if (!piece || piece.color !== color) moves.push(target);
    }
  }
  return moves;
}

function getQueenMoves(board: Board, sq: number, color: Color): number[] {
  const moves: number[] = [];
  const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const territory = color === 'WHITE' ? isWhiteTerritory : isBlackTerritory;

  for (const [dr, dc] of directions) {
    let r = getRow(sq);
    let c = getCol(sq);
    while (true) {
      r += dr;
      c += dc;
      if (r < 0 || r > 7 || c < 0 || c > 7) break;
      const target = toSquare(r, c);
      if (!territory(target)) break; // Cannot cross midfield
      const piece = board[target];
      if (piece) {
        if (piece.color !== color) moves.push(target);
        break;
      }
      moves.push(target);
    }
  }
  return moves;
}

function getRookTargets(board: Board, sq: number, color: Color): number[] {
  const offsets = [4, -4, 6, -6];
  const moves: number[] = [];
  for (const offset of offsets) {
    const target = sq + offset;
    if (!isOnBoard(target)) continue;
    const piece = board[target];
    if (!piece || piece.color !== color) {
      moves.push(target);
    }
  }
  return moves;
}

function getBishopStairMoves(board: Board, sq: number, color: Color): number[] {
  const moves: number[] = [];
  // 4 staircase directions: [rowDelta, colDelta]
  const dirs: [number, number][] = [[-1, 1], [-1, -1], [1, 1], [1, -1]];

  for (const [rowDelta, colDelta] of dirs) {
    let r = getRow(sq);
    let c = getCol(sq);
    let verticalStep = true; // alternate: vertical first, then horizontal

    while (true) {
      const dr = verticalStep ? rowDelta : 0;
      const dc = verticalStep ? 0 : colDelta;
      r += dr;
      c += dc;
      verticalStep = !verticalStep;

      if (r < 0 || r > 7 || c < 0 || c > 7) break;

      const target = toSquare(r, c);
      const piece = board[target];

      if (piece) {
        if (piece.color !== color) moves.push(target); // Capture and stop
        break; // Blocked
      }
      moves.push(target); // Empty: can land here, continue
    }
  }
  return moves;
}

function getKnightMoves(board: Board, sq: number, color: Color): number[] {
  const moves: number[] = [];
  const r = getRow(sq);
  const c = getCol(sq);

  // Standard L-shape offsets: [rowOffset, colOffset]
  const allLMoves: [number, number][] = [
    [-2, -1], [-2, 1],
    [2, -1],  [2, 1],
    [-1, -2], [-1, 2],
    [1, -2],  [1, 2],
  ];

  // T-shape: remove the 2-square backward step
  // White moves up (row decreases = negative row delta)
  // White's "backward" is row increasing (+2)
  // Black moves down (row increases = positive row delta)
  // Black's "backward" is row decreasing (-2)
  const backwardTwoRow = color === 'WHITE' ? 2 : -2;

  for (const [dr, dc] of allLMoves) {
    if (dr === backwardTwoRow) continue; // Cut the 2-square backward step
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
    const target = toSquare(nr, nc);
    const piece = board[target];
    if (!piece || piece.color !== color) moves.push(target);
  }
  return moves;
}

function getPawnMoves(board: Board, sq: number, color: Color, hasPawnMoved: boolean[]): number[] {
  const moves: number[] = [];
  const r = getRow(sq);
  const c = getCol(sq);
  const dir = color === 'WHITE' ? -1 : 1; // White moves up (negative row), Black down

  // Forward 1
  const fwd = toSquare(r + dir, c);
  if (r + dir >= 0 && r + dir <= 7 && !board[fwd]) {
    moves.push(fwd);
    // Forward 2 from start (if pawn hasn't moved)
    if (!hasPawnMoved[sq]) {
      const fwd2 = toSquare(r + 2 * dir, c);
      if (r + 2 * dir >= 0 && r + 2 * dir <= 7 && !board[fwd2]) {
        moves.push(fwd2);
      }
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const nc = c + dc;
    if (nc < 0 || nc > 7) continue;
    const capSq = toSquare(r + dir, nc);
    const piece = board[capSq];
    if (piece && piece.color !== color) moves.push(capSq);
  }

  return moves;
}

function getJesterMoves(board: Board, sq: number, color: Color): number[] {
  const moves: number[] = [];
  const r = getRow(sq);
  const c = getCol(sq);
  const dir = color === 'WHITE' ? -1 : 1;

  // Jester moves ONLY diagonally forward (where a pawn would capture)
  for (const dc of [-1, 1]) {
    const nc = c + dc;
    if (nc < 0 || nc > 7) continue;
    const nr = r + dir;
    if (nr < 0 || nr > 7) continue;
    const target = toSquare(nr, nc);
    const piece = board[target];
    // Can move to empty squares or capture enemies
    // Note: Jester's bounce defense is handled at move-application time
    if (!piece || piece.color !== color) moves.push(target);
  }

  return moves;
}

// ─── Legal move aggregation ────────────────────────────────────────────────

export function getLegalMoves(state: GameState, sq: number): number[] {
  const { board, hasPawnMoved } = state;
  const piece = board[sq];
  if (!piece) return [];

  switch (piece.type) {
    case 'KING':    return getKingNormalMoves(board, sq, piece.color);
    case 'QUEEN':   return getQueenMoves(board, sq, piece.color);
    case 'ROOK':    return getRookTargets(board, sq, piece.color);
    case 'BISHOP':  return getBishopStairMoves(board, sq, piece.color);
    case 'KNIGHT':  return getKnightMoves(board, sq, piece.color);
    case 'PAWN':    return getPawnMoves(board, sq, piece.color, hasPawnMoved);
    case 'JESTER':  return getJesterMoves(board, sq, piece.color);
    default:        return [];
  }
}

// ─── Attack checking ───────────────────────────────────────────────────────

// Returns all squares that `byColor` pieces are attacking (can land on)
export function getAttackedSquares(state: GameState, byColor: Color): Set<number> {
  const attacked = new Set<number>();
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece || piece.color !== byColor) continue;
    const moves = getLegalMoves(state, sq);
    for (const m of moves) attacked.add(m);
  }
  return attacked;
}

export function findKing(board: Board, color: Color): number {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.type === 'KING' && p.color === color) return sq;
  }
  return -1;
}

export function isSquareAttackedBy(state: GameState, sq: number, byColor: Color): boolean {
  return getAttackedSquares(state, byColor).has(sq);
}

// ─── Win condition check ───────────────────────────────────────────────────

// Check if a player is in Desperation Stale at the start of their turn.
// Conditions:
//   1. King is under attack by an enemy piece
//   2. Player has 0 swaps left
//   3. No friendly piece can capture the attacker or move the King to safety
function checkDesperationStale(state: GameState, color: Color): boolean {
  const enemyColor: Color = color === 'WHITE' ? 'BLACK' : 'WHITE';
  const kingSq = findKing(state.board, color);
  if (kingSq === -1) return false;

  // Is King attacked?
  if (!isSquareAttackedBy(state, kingSq, enemyColor)) return false;

  // Swaps left?
  const swapsLeft = color === 'WHITE' ? state.whiteSwapsLeft : state.blackSwapsLeft;
  if (swapsLeft > 0) return false; // Can still use a swap

  // Can any friendly piece capture the attacker or can the King escape?
  // Check King normal moves
  const kingMoves = getKingNormalMoves(state.board, kingSq, color);
  for (const moveSq of kingMoves) {
    // Would the King be safe on moveSq?
    const testBoard = [...state.board];
    testBoard[moveSq] = testBoard[kingSq];
    testBoard[kingSq] = null;
    const testState: GameState = { ...state, board: testBoard };
    if (!isSquareAttackedBy(testState, moveSq, enemyColor)) return false; // King can escape
  }

  // Find all attackers of the King
  const attackers: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== enemyColor) continue;
    const moves = getLegalMoves(state, sq);
    if (moves.includes(kingSq)) attackers.push(sq);
  }

  if (attackers.length === 0) return false; // Shouldn't happen

  // Can any friendly piece (not King) capture an attacker?
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== color || p.type === 'KING') continue;
    const moves = getLegalMoves(state, sq);
    for (const attackerSq of attackers) {
      if (moves.includes(attackerSq)) return false; // Can capture attacker
    }
  }

  return true; // No escape, no capture, no swap → Desperation Stale
}

// ─── Swap validation ───────────────────────────────────────────────────────

// Valid pawn swap targets for the King: any friendly PAWN on the board
// The King cannot swap to a square that is immediately attacked by the enemy
export function getValidSwapTargets(state: GameState, color: Color): number[] {
  const enemyColor: Color = color === 'WHITE' ? 'BLACK' : 'WHITE';
  const targets: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.type !== 'PAWN' || p.color !== color) continue;
    // Would the King be attacked at this square?
    const kingSq = findKing(state.board, color);
    if (kingSq === -1) continue;
    const testBoard = [...state.board];
    testBoard[sq] = { type: 'KING', color };
    testBoard[kingSq] = { type: 'PAWN', color };
    const testState: GameState = { ...state, board: testBoard };
    if (!isSquareAttackedBy(testState, sq, enemyColor)) {
      targets.push(sq);
    }
  }
  return targets;
}

// ─── Move application ──────────────────────────────────────────────────────

export function applyMove(state: GameState, from: number, to: number): MoveResult {
  let board = [...state.board];
  const movingPiece = board[from];
  if (!movingPiece) return { state, jesterBounced: false };

  const targetPiece = board[to];
  let newPhase: GamePhase = state.phase;
  let winner: Color | null = state.winner;
  let winReason: GameState['winReason'] = state.winReason;
  let jesterSacrificeCtx: JesterSacrificeContext | null = null;
  let jesterBounced = false;

  const capturedByWhite = [...state.capturedByWhite];
  const capturedByBlack = [...state.capturedByBlack];
  const hasPawnMoved = [...state.hasPawnMoved];
  let whiteSwapsLeft = state.whiteSwapsLeft;
  let blackSwapsLeft = state.blackSwapsLeft;
  let currentTurn: Color = state.currentTurn;
  const enemyColor: Color = currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';

  // ── Jester defense ──────────────────────────────────────────────────────
  if (targetPiece && targetPiece.type === 'JESTER' && targetPiece.color !== movingPiece.color) {
    // Bounce: attacker goes back, Jester survives, owner must sacrifice
    jesterBounced = true;
    jesterSacrificeCtx = {
      sacrificingColor: targetPiece.color,
      jesterSquare: to,
      attackerFrom: from,
      attackerPiece: movingPiece,
    };
    // Do NOT move the attacker — just bounce it back (piece stays at `from`)
    return {
      state: {
        ...state,
        board,
        phase: 'JESTER_SACRIFICE',
        jesterSacrificeCtx,
        lastMove: { from, to },
      },
      jesterBounced: true,
    };
  }

  // ── Normal move ─────────────────────────────────────────────────────────
  // Track pawn first-move flag
  if (movingPiece.type === 'PAWN' && !hasPawnMoved[from]) {
    hasPawnMoved[from] = true;
    // If pawn moves 2 squares, mark original square
    if (Math.abs(to - from) === 16) {
      hasPawnMoved[from] = true;
    }
  }

  // Capture enemy piece
  if (targetPiece) {
    if (movingPiece.color === 'WHITE') {
      capturedByWhite.push(targetPiece);
    } else {
      capturedByBlack.push(targetPiece);
    }
    // Win condition 1: King captured
    if (targetPiece.type === 'KING') {
      board[to] = movingPiece;
      board[from] = null;
      return {
        state: {
          ...state,
          board,
          phase: 'GAME_OVER',
          winner: movingPiece.color,
          winReason: 'KING_CAPTURED',
          capturedByWhite,
          capturedByBlack,
          lastMove: { from, to },
        },
        jesterBounced: false,
      };
    }
  }

  board[to] = movingPiece;
  board[from] = null;

  // Pawn promotion to Jester
  if (movingPiece.type === 'PAWN') {
    const promotionRow = movingPiece.color === 'WHITE' ? 0 : 7;
    if (getRow(to) === promotionRow) {
      board[to] = { type: 'JESTER', color: movingPiece.color };
    }
  }

  // Switch turns
  currentTurn = enemyColor;

  const nextState: GameState = {
    ...state,
    board,
    currentTurn,
    phase: 'PLAYING',
    whiteSwapsLeft,
    blackSwapsLeft,
    winner,
    winReason,
    jesterSacrificeCtx: null,
    kingSwapCtx: null,
    hasPawnMoved,
    lastMove: { from, to },
    capturedByWhite,
    capturedByBlack,
  };

  // Win condition 2: check Desperation Stale for the opponent (who just became current turn)
  if (checkDesperationStale(nextState, currentTurn)) {
    return {
      state: {
        ...nextState,
        phase: 'GAME_OVER',
        winner: movingPiece.color,
        winReason: 'DESPERATION_STALE',
      },
      jesterBounced: false,
    };
  }

  return { state: nextState, jesterBounced: false };
}

// ─── King swap ─────────────────────────────────────────────────────────────

export function applyKingSwap(state: GameState, kingSq: number, pawnSq: number): GameState {
  const board = [...state.board];
  const king = board[kingSq];
  const pawn = board[pawnSq];

  board[pawnSq] = king;
  board[kingSq] = pawn;

  const currentTurn: Color = state.currentTurn;
  const enemyColor: Color = currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';

  const whiteSwapsLeft = currentTurn === 'WHITE' ? state.whiteSwapsLeft - 1 : state.whiteSwapsLeft;
  const blackSwapsLeft = currentTurn === 'BLACK' ? state.blackSwapsLeft - 1 : state.blackSwapsLeft;

  const nextState: GameState = {
    ...state,
    board,
    currentTurn: enemyColor,
    phase: 'PLAYING',
    whiteSwapsLeft,
    blackSwapsLeft,
    kingSwapCtx: null,
    lastMove: { from: kingSq, to: pawnSq },
  };

  // Check Desperation Stale for opponent
  if (checkDesperationStale(nextState, enemyColor)) {
    return {
      ...nextState,
      phase: 'GAME_OVER',
      winner: currentTurn,
      winReason: 'DESPERATION_STALE',
    };
  }

  return nextState;
}

// ─── Jester sacrifice ──────────────────────────────────────────────────────

export function applyJesterSacrifice(state: GameState, sacrificeSq: number): GameState {
  if (!state.jesterSacrificeCtx) return state;

  const { sacrificingColor, attackerFrom } = state.jesterSacrificeCtx;
  const board = [...state.board];
  const sacrificedPiece = board[sacrificeSq];

  // Remove the sacrificed piece
  board[sacrificeSq] = null;

  const capturedByWhite = [...state.capturedByWhite];
  const capturedByBlack = [...state.capturedByBlack];

  if (sacrificedPiece) {
    if (sacrificingColor === 'WHITE') {
      capturedByBlack.push(sacrificedPiece); // Black gains the sacrifice
    } else {
      capturedByWhite.push(sacrificedPiece);
    }
  }

  // After sacrifice, it becomes the attacker's turn (the one whose move was bounced)
  const attackerColor: Color = sacrificingColor === 'WHITE' ? 'BLACK' : 'WHITE';

  const nextState: GameState = {
    ...state,
    board,
    currentTurn: attackerColor,
    phase: 'PLAYING',
    jesterSacrificeCtx: null,
    capturedByWhite,
    capturedByBlack,
  };

  // Check Desperation Stale for the attacker (who is now taking their turn)
  if (checkDesperationStale(nextState, attackerColor)) {
    return {
      ...nextState,
      phase: 'GAME_OVER',
      winner: sacrificingColor,
      winReason: 'DESPERATION_STALE',
    };
  }

  return nextState;
}

// ─── Valid sacrifice targets ───────────────────────────────────────────────

// Any friendly piece except the King and the Jester that was just defended
export function getValidSacrificeTargets(state: GameState): number[] {
  if (!state.jesterSacrificeCtx) return [];
  const { sacrificingColor, jesterSquare } = state.jesterSacrificeCtx;
  const targets: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== sacrificingColor) continue;
    if (p.type === 'KING') continue;
    if (sq === jesterSquare) continue; // Cannot sacrifice the Jester that just bounced
    targets.push(sq);
  }
  return targets;
}

// ─── Setup phase: rearrange back row ───────────────────────────────────────

export function swapSetupSquares(state: GameState, sq1: number, sq2: number): GameState {
  const board = [...state.board];
  const tmp = board[sq1];
  board[sq1] = board[sq2];
  board[sq2] = tmp;
  return { ...state, board };
}

export function confirmSetup(state: GameState): GameState {
  if (state.phase === 'SETUP_WHITE') {
    return { ...state, phase: 'SETUP_BLACK' };
  }
  if (state.phase === 'SETUP_BLACK') {
    return { ...state, phase: 'PLAYING', currentTurn: 'WHITE' };
  }
  return state;
}

// ─── Piece value (for display only) ───────────────────────────────────────

export const PIECE_VALUES: Record<string, number> = {
  PAWN: 1, JESTER: 3, KNIGHT: 3, BISHOP: 3, ROOK: 5, QUEEN: 9, KING: 0,
};
