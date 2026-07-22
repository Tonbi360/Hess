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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-2 inset-x-2 z-40 pointer-events-none flex items-center justify-center"
    >
      <div className="bg-destructive/95 border border-destructive-foreground/30 text-destructive-foreground px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-full">
        <div className="shrink-0 bg-black/30 p-1.5 rounded-lg border border-destructive-foreground/20">
          <PieceIcon piece={attackerPiece} size={28} />
        </div>
        <div className="text-left text-xs leading-tight">
          <div className="font-serif font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Jester Deflected Attack!
          </div>
          <div className="text-destructive-foreground/90 mt-0.5">
            <strong className="text-white font-bold">{sacrificingColor}</strong>: Tap a <span className="text-red-200 font-bold underline">glowing red piece</span> on the board to sacrifice.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
