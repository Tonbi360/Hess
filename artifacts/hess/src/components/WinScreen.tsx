import { Color } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface WinScreenProps {
  winner: Color | null;
  winReason: 'KING_CAPTURED' | 'DESPERATION_STALE' | null;
  onPlayAgain: () => void;
}

export function WinScreen({ winner, winReason, onPlayAgain }: WinScreenProps) {
  if (!winner || !winReason) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border p-8 md:p-12 rounded-lg shadow-2xl max-w-lg w-full text-center space-y-6"
      >
        <h2 className="text-4xl md:text-5xl font-serif text-primary">
          {winner === 'WHITE' ? 'White' : 'Black'} Wins
        </h2>
        
        <p className="text-xl text-muted-foreground font-serif italic">
          {winReason === 'KING_CAPTURED' 
            ? "The King has fallen." 
            : "Desperation — no escape."}
        </p>

        <div className="pt-4">
          <Button 
            size="lg" 
            onClick={onPlayAgain}
            className="w-full font-serif text-lg tracking-wider"
          >
            Play Again
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
