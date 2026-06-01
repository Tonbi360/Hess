import { Color, GamePhase, Piece } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";
import { RulebookDrawer } from "./RulebookDrawer";
import { Button } from "@/components/ui/button";

interface GameInfoProps {
  currentTurn: Color;
  phase: GamePhase;
  whiteSwapsLeft: number;
  blackSwapsLeft: number;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  isKingSwapMode: boolean;
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
