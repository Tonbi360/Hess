import { Color } from "@/lib/types";
import { motion } from "framer-motion";

interface WinScreenProps {
  winner: Color | null;
  winReason: 'KING_CAPTURED' | 'DESPERATION_STALE' | 'CHECKMATE' | 'STALEMATE' | null;
  myColor: Color | null;
  isAIGame?: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

export function WinScreen({ winner, winReason, myColor, isAIGame, onRematch, onLeave }: WinScreenProps) {
  if (!winReason) return null;

  const iWon = myColor === winner;
  const winnerName = winner === 'WHITE' ? 'White' : 'Black';

  let title = winner ? (isAIGame ? (iWon ? 'You Win' : 'Hess Wins') : `${winnerName} Wins`) : 'Draw';
  let subtitle = '';
  let badge = '';

  switch (winReason) {
    case 'KING_CAPTURED':
      badge = 'King Captured';
      subtitle = 'The King has fallen.';
      break;
    case 'DESPERATION_STALE':
      badge = 'Desperation Stale';
      subtitle = 'No escape — trapped by desperation stalemate.';
      break;
    case 'CHECKMATE':
      badge = 'Checkmate';
      subtitle = 'Checkmate — no legal moves remaining.';
      break;
    case 'STALEMATE':
      badge = 'Stalemate';
      subtitle = 'Stalemate — no legal moves available.';
      break;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border p-8 rounded-2xl shadow-2xl max-w-xs w-full mx-4 text-center space-y-5"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {badge}
          </p>
          <h2 className="text-4xl font-serif text-primary">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground italic">
            {subtitle}
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
