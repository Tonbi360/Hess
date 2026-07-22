import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Color, Piece, PieceType } from '@/lib/types';
import type { OnlineGameState, OnlineGameActions } from '@/lib/useOnlineGame';
import { PieceIcon } from './PieceIcon';
import { RulebookDrawer } from './RulebookDrawer';

const PIECE_DESCRIPTIONS: Record<PieceType, { title: string; how: string; special?: string }> = {
  KING:   { title: 'King',   how: 'Moves 1 square in any direction.', special: 'King Swap: 3× per game, swap with any friendly Pawn — not into an attacked square.' },
  QUEEN:  { title: 'Queen',  how: 'Slides any direction.',             special: 'Cannot cross the midfield line.' },
  ROOK:   { title: 'Rook',   how: 'Jumps exactly ±4 or ±6 squares. Ignores pieces in between.' },
  BISHOP: { title: 'Bishop', how: 'Zig-zag: alternating vertical + horizontal steps. Blockable.' },
  KNIGHT: { title: 'Knight', how: '2 squares in any direction + 1 sideways.', special: 'Cannot step 2 squares backward.' },
  PAWN:   { title: 'Pawn',   how: '1 forward (or 2 from start). Captures diagonally.', special: 'Promotes to Jester on enemy\'s last rank.' },
  JESTER: { title: 'Jester', how: 'Moves and captures diagonally forward only.', special: 'Cannot be directly captured — attacker bounces back, owner sacrifices a piece.' },
};

interface HamburgerMenuProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
  selectedPiece: Piece | null;
  onLeave: () => void;
}

export function HamburgerMenu({ state, actions, selectedPiece, onLeave }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const { gameState, myColor, players, isKingSwapMode, status, isAIGame } = state;

  if (!gameState || !myColor) return null;

  const mySwaps = myColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const opponentColor: Color = myColor === 'WHITE' ? 'BLACK' : 'WHITE';
  const isMyTurn = gameState.currentTurn === myColor && gameState.phase === 'PLAYING';
  const isSetup = gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK';
  const isJesterSacrifice = gameState.phase === 'JESTER_SACRIFICE';

  const history = gameState.moveHistory ?? [];

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Open menu"
      >
        <span className="block w-5 h-[2px] bg-foreground/70 rounded" />
        <span className="block w-5 h-[2px] bg-foreground/70 rounded" />
        <span className="block w-5 h-[2px] bg-foreground/70 rounded" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-card border-l border-border flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <span className="font-serif text-lg text-primary tracking-widest">HESS</span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none transition-colors">×</button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-0 divide-y divide-border">

                {/* Game status */}
                <div className="px-4 py-3">
                  {isSetup ? (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Setup Phase</p>
                  ) : isJesterSacrifice ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-amber-400">Jester Bounce!</p>
                      <p className="text-xs text-muted-foreground">
                        {gameState.jesterSacrificeCtx?.sacrificingColor === myColor
                          ? 'Tap a piece to sacrifice.'
                          : 'Opponent sacrificing a piece…'}
                      </p>
                    </div>
                  ) : isKingSwapMode ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-primary">King Swap</p>
                      <p className="text-xs text-muted-foreground">Tap a friendly Pawn.</p>
                      <button
                        onClick={() => { actions.cancelKingSwap(); setOpen(false); }}
                        className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground underline"
                      >Cancel</button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">
                      {isMyTurn
                        ? <span className="text-primary">Your turn</span>
                        : <span className="text-muted-foreground">{isAIGame ? 'Hess is thinking…' : `${players[opponentColor] ?? 'Opponent'}'s turn`}</span>
                      }
                    </p>
                  )}
                </div>

                {/* King swap button */}
                {gameState.phase === 'PLAYING' && !isKingSwapMode && isMyTurn && (
                  <div className="px-4 py-3">
                    <button
                      onClick={() => { actions.initiateKingSwap(); setOpen(false); }}
                      disabled={mySwaps === 0}
                      className="w-full py-2 rounded-lg border border-border text-xs font-serif tracking-wider disabled:opacity-30 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      King Swap ({mySwaps} left)
                    </button>
                  </div>
                )}

                {/* Selected piece info */}
                {selectedPiece && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Selected Piece</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center bg-muted rounded-md border border-border shrink-0">
                        <PieceIcon piece={selectedPiece} size={18} />
                      </div>
                      <span className="font-serif text-xs text-primary font-semibold leading-tight">
                        {PIECE_DESCRIPTIONS[selectedPiece.type].title}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{PIECE_DESCRIPTIONS[selectedPiece.type].how}</p>
                    {PIECE_DESCRIPTIONS[selectedPiece.type].special && (
                      <p className="text-xs text-primary/70 leading-relaxed italic">{PIECE_DESCRIPTIONS[selectedPiece.type].special}</p>
                    )}
                  </div>
                )}

                {/* Move history */}
                {history.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Move History</p>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 font-mono text-[11px] text-muted-foreground">
                      {history.map((move, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-muted-foreground/30 w-6 text-right shrink-0">{Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '…'}</span>
                          <span className={i === history.length - 1 ? 'text-primary/80' : ''}>{move}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Captures */}
                {(gameState.capturedByWhite.length > 0 || gameState.capturedByBlack.length > 0) && (
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Captured</p>
                    {gameState.capturedByWhite.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/30 mb-1">By White</p>
                        <div className="flex flex-wrap gap-0.5">
                          {gameState.capturedByWhite.map((p, i) => (
                            <div key={i} className="w-5 h-5 flex items-center justify-center"><PieceIcon piece={p} size={13} /></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {gameState.capturedByBlack.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground/30 mb-1">By Black</p>
                        <div className="flex flex-wrap gap-0.5">
                          {gameState.capturedByBlack.map((p, i) => (
                            <div key={i} className="w-5 h-5 flex items-center justify-center"><PieceIcon piece={p} size={13} /></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rulebook */}
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Rulebook</p>
                  <RulebookDrawer />
                </div>

              </div>

              {/* Leave */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <button
                  onClick={() => { setOpen(false); onLeave(); }}
                  className="w-full py-2 text-sm text-muted-foreground/50 hover:text-destructive transition-colors rounded-lg border border-border/50 hover:border-destructive/30"
                >
                  Leave Game
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
