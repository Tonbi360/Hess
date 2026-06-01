import { Board, Color, GamePhase } from "@/lib/types";
import { getRow } from "@/lib/engine";
import { PieceIcon } from "./PieceIcon";
import { cn } from "@/lib/utils";

interface HessBoardProps {
  board: Board;
  selectedSquare: number | null;
  legalMoveSquares: number[];
  validSwapTargets: number[];
  validSacrificeTargets: number[];
  attackedKingSquare: number | null;
  lastMove: { from: number; to: number } | null;
  onSquareClick: (sq: number) => void;
  phase: GamePhase;
  currentTurn: Color;
  setupSelectedSquare?: number | null;
  onSetupSquareClick?: (sq: number) => void;
}

export function HessBoard({
  board,
  selectedSquare,
  legalMoveSquares,
  validSwapTargets,
  validSacrificeTargets,
  attackedKingSquare,
  lastMove,
  onSquareClick,
  phase,
  currentTurn,
  setupSelectedSquare,
  onSetupSquareClick
}: HessBoardProps) {
  
  const handleSquareClick = (sq: number) => {
    if (phase.startsWith('SETUP_')) {
      if (onSetupSquareClick) onSetupSquareClick(sq);
    } else {
      onSquareClick(sq);
    }
  };

  const isSetup = phase.startsWith('SETUP_');
  const activeSelected = isSetup ? setupSelectedSquare : selectedSquare;

  return (
    <div className="relative w-full max-w-[80vh] aspect-square mx-auto border-4 border-border rounded-sm shadow-2xl bg-muted overflow-hidden">
      
      {/* Midfield Divider */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-primary/40 z-10 -translate-y-1/2 pointer-events-none" />

      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {board.map((piece, sq) => {
          const row = Math.floor(sq / 8);
          const col = sq % 8;
          const isDarkSquare = (row + col) % 2 === 1;
          
          const isSelected = activeSelected === sq;
          const isLegalMove = legalMoveSquares.includes(sq);
          const isValidSwap = validSwapTargets.includes(sq);
          const isValidSacrifice = validSacrificeTargets.includes(sq);
          const isAttackedKing = attackedKingSquare === sq;
          const isLastMove = lastMove?.from === sq || lastMove?.to === sq;

          // In setup phase, only allow clicking on own back row
          let isInteractive = true;
          if (phase === 'SETUP_WHITE' && row !== 7) isInteractive = false;
          if (phase === 'SETUP_BLACK' && row !== 0) isInteractive = false;

          return (
            <div
              key={sq}
              data-testid={`square-${sq}`}
              onClick={() => isInteractive && handleSquareClick(sq)}
              className={cn(
                "relative flex items-center justify-center w-full h-full cursor-pointer transition-colors duration-200",
                isDarkSquare ? "bg-[#2c2f33]" : "bg-[#43484f]", // charcoal/slate board colors
                isLastMove && "after:absolute after:inset-0 after:bg-primary/20",
                isSelected && "ring-inset ring-4 ring-primary bg-primary/20 z-20",
                isValidSwap && "ring-inset ring-4 ring-amber-500 bg-amber-500/20 z-20",
                isValidSacrifice && "ring-inset ring-4 ring-destructive bg-destructive/30 z-20 shadow-[inset_0_0_15px_rgba(255,0,0,0.5)]",
                isAttackedKing && "ring-inset ring-4 ring-destructive bg-destructive/40 animate-pulse z-20",
                !isInteractive && "cursor-not-allowed",
              )}
            >
              {/* Coordinates for edge squares */}
              {col === 0 && (
                <span className="absolute top-1 left-1 text-[10px] text-foreground/30 font-mono pointer-events-none">
                  {8 - row}
                </span>
              )}
              {row === 7 && (
                <span className="absolute bottom-1 right-1 text-[10px] text-foreground/30 font-mono pointer-events-none uppercase">
                  {String.fromCharCode(97 + col)}
                </span>
              )}

              {/* Legal move indicator */}
              {isLegalMove && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  {piece ? (
                    <div className="w-full h-full border-4 border-destructive/60 rounded-full scale-90" /> // Capture indicator
                  ) : (
                    <div className="w-1/4 h-1/4 bg-primary/40 rounded-full" /> // Move indicator
                  )}
                </div>
              )}

              {/* Piece */}
              {piece && (
                <div className="relative z-30 w-3/4 h-3/4 flex items-center justify-center">
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
