import { Piece } from "@/lib/types";

export function PieceIcon({ piece, size = 32 }: { piece: Piece; size?: number }) {
  // Using unicode characters for chess pieces
  const getIcon = (p: Piece) => {
    switch (p.type) {
      case 'KING': return '♚';
      case 'QUEEN': return '♛';
      case 'ROOK': return '♜';
      case 'BISHOP': return '♝';
      case 'KNIGHT': return '♞';
      case 'PAWN': return '♟';
      case 'JESTER': return '♦'; // Diamond for jester
      default: return '';
    }
  };

  const isWhite = piece.color === 'WHITE';
  
  // To make them distinct, we apply different text shadows and colors
  // White pieces: Light parchment color with dark stroke effect
  // Black pieces: Very dark color with subtle light stroke
  
  return (
    <div 
      className="flex items-center justify-center select-none"
      style={{
        fontSize: `${size}px`,
        color: isWhite ? '#e8dcc4' : '#111111',
        WebkitTextStroke: isWhite ? '1px #222' : '1px #555',
        filter: isWhite 
          ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.8))' 
          : 'drop-shadow(0px 2px 1px rgba(255,255,255,0.2))',
        lineHeight: 1
      }}
    >
      {getIcon(piece)}
    </div>
  );
}
