import { useRef } from 'react';
import { Board, Color, GamePhase, Piece } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";
import { cn } from "@/lib/utils";

interface HessBoardProps {
  board: Board;
  selectedSquare: number | null;
  legalMoveSquares: number[];
  blockedRookSquares?: number[];
  validSwapTargets: number[];
  validSacrificeTargets: number[];
  attackedKingSquare: number | null;
  lastMove: { from: number; to: number } | null;
  onSquareClick: (sq: number) => void;
  phase: GamePhase;
  currentTurn: Color;
  setupSelectedSquare?: number | null;
  onSetupSquareClick?: (sq: number) => void;
  flipped?: boolean;
  onPieceLongPress?: (piece: Piece, sq: number) => void;
}

export function HessBoard({
  board,
  selectedSquare,
  legalMoveSquares,
  blockedRookSquares = [],
  validSwapTargets,
  validSacrificeTargets,
  attackedKingSquare,
  lastMove,
  onSquareClick,
  phase,
  currentTurn,
  setupSelectedSquare,
  onSetupSquareClick,
  flipped = false,
  onPieceLongPress,
}: HessBoardProps) {

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (sq: number) => {
    if (!onPieceLongPress) return;
    const piece = board[sq];
    if (!piece) return;
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      onPieceLongPress(piece, sq);
    }, 480);
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleSquareClick = (sq: number) => {
    if (phase.startsWith('SETUP_')) {
      if (onSetupSquareClick) onSetupSquareClick(sq);
    } else {
      onSquareClick(sq);
    }
  };

  const isSetup = phase.startsWith('SETUP_');
  const activeSelected = isSetup ? setupSelectedSquare : selectedSquare;

  const displaySquares = Array.from({ length: 64 }, (_, i) =>
    flipped ? 63 - Math.floor(i / 8) * 8 - (i % 8) : i
  );

  return (
    <div className="relative w-full h-full border-2 border-border/60 rounded-sm shadow-2xl bg-muted overflow-hidden">

      {/* Midfield Divider */}
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary/50 z-10 -translate-y-1/2 pointer-events-none" />

      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displaySquares.map((sq, displayIdx) => {
          const row = Math.floor(sq / 8);
          const col = sq % 8;
          const displayRow = Math.floor(displayIdx / 8);
          const displayCol = displayIdx % 8;

          const isDarkSquare = (row + col) % 2 === 1;
          const isSelected = activeSelected === sq;
          const isLegalMove = legalMoveSquares.includes(sq);
          const isBlockedRook = blockedRookSquares.includes(sq);
          const isValidSwap = validSwapTargets.includes(sq);
          const isValidSacrifice = validSacrificeTargets.includes(sq);
          const isAttackedKing = attackedKingSquare === sq;
          const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
          const piece = board[sq];

          let isInteractive = true;
          if (phase === 'SETUP_WHITE' && row !== 7) isInteractive = false;
          if (phase === 'SETUP_BLACK' && row !== 0) isInteractive = false;

          const showRank = displayCol === 0;
          const showFile = displayRow === 7;
          const rankLabel = flipped ? String(row + 1) : String(8 - row);
          const fileLabel = flipped
            ? String.fromCharCode(97 + (7 - col))
            : String.fromCharCode(97 + col);

          return (
            <div
              key={sq}
              data-testid={`square-${sq}`}
              onClick={() => isInteractive && handleSquareClick(sq)}
              onTouchStart={(e) => { startLongPress(sq); }}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              className={cn(
                "relative flex items-center justify-center w-full h-full cursor-pointer transition-colors duration-150 select-none",
                isDarkSquare ? "bg-[#2c2f33]" : "bg-[#43484f]",
                isLastMove && "after:absolute after:inset-0 after:bg-primary/20",
                isSelected && "ring-inset ring-4 ring-primary bg-primary/20 z-20",
                isValidSwap && "ring-inset ring-4 ring-amber-500 bg-amber-500/20 z-20",
                isValidSacrifice && "ring-inset ring-4 ring-destructive bg-destructive/30 z-20 shadow-[inset_0_0_15px_rgba(255,0,0,0.5)]",
                isAttackedKing && "ring-inset ring-4 ring-destructive bg-destructive/40 animate-pulse z-20",
                !isInteractive && "cursor-not-allowed",
              )}
            >
              {showRank && (
                <span className="absolute top-0.5 left-1 text-[9px] text-foreground/30 font-mono pointer-events-none leading-none select-none">
                  {rankLabel}
                </span>
              )}
              {showFile && (
                <span className="absolute bottom-0.5 right-1 text-[9px] text-foreground/30 font-mono pointer-events-none leading-none select-none uppercase">
                  {fileLabel}
                </span>
              )}

              {isLegalMove && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  {piece ? (
                    <div className="w-full h-full border-[3px] border-destructive/70 rounded-full scale-90" />
                  ) : (
                    <div className="w-[28%] h-[28%] bg-primary/50 rounded-full" />
                  )}
                </div>
              )}

              {isBlockedRook && !isLegalMove && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-[28%] h-[28%] rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center">
                    <div className="w-[40%] h-[2px] bg-white/30 rotate-45 absolute" />
                    <div className="w-[40%] h-[2px] bg-white/30 -rotate-45 absolute" />
                  </div>
                </div>
              )}

              {piece && (
                <div className="relative z-30 w-[78%] h-[78%] flex items-center justify-center pointer-events-none">
                  <PieceIcon piece={piece} size={48} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
