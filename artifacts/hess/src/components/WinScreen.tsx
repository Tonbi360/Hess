import { Color } from "@/lib/types";
import { motion } from "framer-motion";

interface WinScreenProps {
  winner: Color | null;
  winReason: 'KING_CAPTURED' | 'DESPERATION_STALE' | null;
  myColor: Color | null;
  isAIGame?: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

export function WinScreen({ winner, winReason, myColor, isAIGame, onRematch, onLeave }: WinScreenProps) {
  if (!winner || !winReason) return null;

  const iWon = myColor === winner;
  const winnerName = winner === 'WHITE' ? 'White' : 'Black';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border p-8 rounded-2xl shadow-2xl max-w-xs w-full mx-4 text-center space-y-5"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {winReason === 'KING_CAPTURED' ? 'King Captured' : 'Desperation Stale'}
          </p>
          <h2 className="text-4xl font-serif text-primary">
            {isAIGame
              ? iWon ? 'You Win' : 'Hess Wins'
              : `${winnerName} Wins`}
          </h2>
          <p className="text-sm text-muted-foreground italic">
            {winReason === 'KING_CAPTURED' ? 'The King has fallen.' : 'No escape — desperation stale.'}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onRematch}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-serif tracking-wider text-base hover:opacity-90 transition-opacity"
          >
            Rematch
          </button>
          <button
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            Leave
          </button>
        </div>
      </motion.div>
    </div>
  );
}
