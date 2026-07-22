import { Piece } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";
import { motion } from "framer-motion";

interface JesterSacrificeOverlayProps {
  sacrificingColor: 'WHITE' | 'BLACK';
  attackerPiece: Piece;
}

export function JesterSacrificeOverlay({ sacrificingColor, attackerPiece }: JesterSacrificeOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/40"
    >
      <div className="bg-destructive/90 border border-destructive-foreground/20 text-destructive-foreground p-6 rounded-lg shadow-2xl max-w-md w-full text-center space-y-4 backdrop-blur-md pointer-events-auto">
        <h2 className="text-3xl font-serif font-bold uppercase tracking-widest">
          Jester Deflected
        </h2>
        <div className="flex justify-center py-2">
          <div className="opacity-50">
            <PieceIcon piece={attackerPiece} size={48} />
          </div>
        </div>
        <p className="text-lg leading-tight">
          The enemy attack was bounced back! <br/>
          <strong className="text-xl">{sacrificingColor}</strong> must now choose a piece to sacrifice.
        </p>
        <p className="text-sm font-bold animate-pulse text-destructive-foreground/80 mt-4 uppercase tracking-wider">
          Click a glowing red piece on the board to sacrifice it.
        </p>
      </div>
    </motion.div>
  );
}
