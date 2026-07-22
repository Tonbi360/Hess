import { Color, GamePhase, Piece, PieceType } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";
import { RulebookDrawer } from "./RulebookDrawer";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const PIECE_DESCRIPTIONS: Record<PieceType, { title: string; how: string; special?: string }> = {
  KING: {
    title: "King — The Commander",
    how: "Moves 1 square in any direction.",
    special: "King Swap: 3 times per game, instantly swap positions with any friendly Pawn — but not into an attacked square.",
  },
  QUEEN: {
    title: "Queen — The Territorial Empress",
    how: "Slides any number of squares in any direction, like a standard chess queen.",
    special: "Territorial: she cannot cross the midfield line. She defends — never invades.",
  },
  ROOK: {
    title: "Rook — The Sniper Missile",
    how: "Does not slide. Instantly jumps to squares exactly 4 or 6 index positions away (S±4 or S±6).",
    special: "Ignores all pieces in between. Only the piece on the exact target square matters.",
  },
  BISHOP: {
    title: "Bishop — The Staircase Flanker",
    how: "Moves in a zig-zag staircase: one step up/down, then one step left/right, repeating.",
    special: "Blockable — any piece along the staircase path stops the movement.",
  },
  KNIGHT: {
    title: "Knight — T-Shape",
    how: "Moves 2 squares in any direction, then 1 square sideways.",
    special: "The 2-square step cannot go backward toward its own side. Jumps over other pieces.",
  },
  PAWN: {
    title: "Pawn",
    how: "Moves 1 square forward (or 2 from the starting row). Captures 1 square diagonally forward.",
    special: "Promotes to a Jester upon reaching the enemy's last rank. Can be swapped with the King.",
  },
  JESTER: {
    title: "Jester — The Insurance Policy",
    how: "Moves and captures diagonally forward only (like a pawn capture).",
    special: "Cannot be directly captured: any attempt bounces the attacker back, and the Jester's owner must sacrifice another friendly piece instead.",
  },
};

interface GameInfoProps {
  currentTurn: Color;
  phase: GamePhase;
  whiteSwapsLeft: number;
  blackSwapsLeft: number;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  isKingSwapMode: boolean;
  selectedPiece: Piece | null;
  onInitiateKingSwap: () => void;
  onCancelKingSwap: () => void;
  onReadySetup?: () => void;
}

export function GameInfo({
  currentTurn,
  phase,
  whiteSwapsLeft,
  blackSwapsLeft,
  capturedByWhite,
  capturedByBlack,
  isKingSwapMode,
  selectedPiece,
  onInitiateKingSwap,
  onCancelKingSwap,
  onReadySetup
}: GameInfoProps) {
  
  const renderSwaps = (left: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded-full border ${i <= left ? 'bg-primary border-primary' : 'bg-transparent border-muted'}`}
          />
        ))}
      </div>
    );
  };

  const currentSwapsLeft = currentTurn === 'WHITE' ? whiteSwapsLeft : blackSwapsLeft;
  const isPlaying = phase === 'PLAYING' || phase === 'KING_SWAP_SELECT';
  const isSetup = phase === 'SETUP_WHITE' || phase === 'SETUP_BLACK';

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
        <h1 className="font-serif text-2xl font-bold tracking-widest text-primary">HESS</h1>
        <RulebookDrawer />
      </div>

      <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
        
        {/* Turn Indicator */}
        <div className="text-center space-y-2">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Current Turn</h2>
          <div className="text-3xl font-serif">
            {currentTurn === 'WHITE' ? 'White' : 'Black'}
          </div>
          {isSetup && (
            <div className="text-sm text-primary animate-pulse">
              Setup Phase
            </div>
          )}
        </div>

        {/* Piece Info Panel */}
        <AnimatePresence mode="wait">
          {selectedPiece ? (
            <motion.div
              key={selectedPiece.type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="bg-background/70 border border-primary/30 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-md border border-border">
                  <PieceIcon piece={selectedPiece} size={22} />
                </div>
                <span className="font-serif text-sm text-primary font-semibold leading-tight">
                  {PIECE_DESCRIPTIONS[selectedPiece.type].title}
                </span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                {PIECE_DESCRIPTIONS[selectedPiece.type].how}
              </p>
              {PIECE_DESCRIPTIONS[selectedPiece.type].special && (
                <p className="text-xs text-primary/80 leading-relaxed italic border-t border-border/40 pt-2">
                  {PIECE_DESCRIPTIONS[selectedPiece.type].special}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/30 border border-border/30 rounded-lg p-4 text-xs text-muted-foreground/50 italic text-center"
            >
              Tap any piece to see how it moves
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Area */}
        <div className="space-y-4 bg-background/50 p-4 rounded-lg border border-border/50">
          {isPlaying && !isKingSwapMode && (
            <Button 
              className="w-full font-serif" 
              variant="secondary"
              onClick={onInitiateKingSwap}
              disabled={currentSwapsLeft === 0}
            >
              Use King Swap
            </Button>
          )}

          {isPlaying && isKingSwapMode && (
            <div className="space-y-3">
              <div className="text-sm text-center text-primary italic">
                Select a friendly pawn to swap with your King.
              </div>
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={onCancelKingSwap}
              >
                Cancel Swap
              </Button>
            </div>
          )}

          {isSetup && phase === `SETUP_${currentTurn}` && onReadySetup && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Click two pieces to swap their positions.
              </p>
              <Button onClick={onReadySetup} className="w-full font-serif text-lg">
                Ready
              </Button>
            </div>
          )}
        </div>

        {/* Swap Counters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">White Swaps</div>
            {renderSwaps(whiteSwapsLeft)}
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Black Swaps</div>
            {renderSwaps(blackSwapsLeft)}
          </div>
        </div>

        {/* Captures */}
        <div className="space-y-6 mt-auto pt-4 border-t border-border/50">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Captured by White</div>
            <div className="flex flex-wrap gap-1 min-h-[2rem]">
              {capturedByWhite.length === 0 && <span className="text-muted-foreground/50 italic text-sm">None</span>}
              {capturedByWhite.map((p, i) => (
                <div key={i} className="w-6 h-6 flex items-center justify-center bg-background rounded-sm border border-border/50">
                  <PieceIcon piece={p} size={16} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Captured by Black</div>
            <div className="flex flex-wrap gap-1 min-h-[2rem]">
              {capturedByBlack.length === 0 && <span className="text-muted-foreground/50 italic text-sm">None</span>}
              {capturedByBlack.map((p, i) => (
                <div key={i} className="w-6 h-6 flex items-center justify-center bg-background rounded-sm border border-border/50">
                  <PieceIcon piece={p} size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
