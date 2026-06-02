import { useState } from 'react';
import type { Color, Piece, PieceType } from '@/lib/types';
import type { OnlineGameState, OnlineGameActions } from '@/lib/useOnlineGame';
import { HessBoard } from '@/components/HessBoard';
import { JesterSacrificeOverlay } from '@/components/JesterSacrificeOverlay';
import { WinScreen } from '@/components/WinScreen';
import { RulebookDrawer } from '@/components/RulebookDrawer';
import { PieceIcon } from '@/components/PieceIcon';
import { motion, AnimatePresence } from 'framer-motion';

const PIECE_DESCRIPTIONS: Record<PieceType, { title: string; how: string; special?: string }> = {
  KING:   { title: 'King — The Commander',        how: 'Moves 1 square in any direction.',                                                              special: 'King Swap: 3× per game, swap with any friendly Pawn — not into an attacked square.' },
  QUEEN:  { title: 'Queen — Territorial Empress', how: 'Slides any number of squares in any direction.',                                                special: 'Cannot cross the midfield line. She defends — never invades.' },
  ROOK:   { title: 'Rook — Missile',              how: 'Instantly jumps exactly 4 or 6 squares (S±4, S±6). Ignores all pieces in between.' },
  BISHOP: { title: 'Bishop — Staircase',          how: 'Zig-zag: alternating vertical + horizontal steps. Blockable along the path.' },
  KNIGHT: { title: 'Knight — T-Shape',            how: '2 squares in any direction + 1 sideways.',                                                     special: 'The 2-square step cannot go backward toward own side.' },
  PAWN:   { title: 'Pawn',                        how: '1 square forward (or 2 from start). Captures diagonally forward.',                             special: "Promotes to a Jester on the enemy's last rank." },
  JESTER: { title: 'Jester — Untouchable',        how: 'Moves and captures diagonally forward only.',                                                  special: 'Cannot be directly captured. Attacker bounces back; owner must sacrifice a piece.' },
};

function SetupBoardWrapper({ state, actions }: { state: OnlineGameState; actions: OnlineGameActions }) {
  const [setupSelected, setSetupSelected] = useState<number | null>(null);
  const { gameState, myColor } = state;
  if (!gameState || !myColor) return null;

  const isMySetup = (gameState.phase === 'SETUP_WHITE' && myColor === 'WHITE') ||
    (gameState.phase === 'SETUP_BLACK' && myColor === 'BLACK');

  const handleSetupClick = (sq: number) => {
    if (!isMySetup) return;
    const row = Math.floor(sq / 8);
    if (myColor === 'WHITE' && row !== 7) return;
    if (myColor === 'BLACK' && row !== 0) return;
    if (setupSelected === null) { setSetupSelected(sq); }
    else { if (setupSelected !== sq) actions.setupSwap(setupSelected, sq); setSetupSelected(null); }
  };

  return (
    <div className="w-full space-y-3">
      <HessBoard
        board={gameState.board}
        selectedSquare={setupSelected}
        legalMoveSquares={[]}
        validSwapTargets={[]}
        validSacrificeTargets={[]}
        attackedKingSquare={null}
        lastMove={gameState.lastMove}
        onSquareClick={handleSetupClick}
        phase={gameState.phase}
        currentTurn={gameState.currentTurn}
        setupSelectedSquare={setupSelected}
        onSetupSquareClick={handleSetupClick}
        flipped={myColor === 'BLACK'}
      />
      <div className="text-center space-y-2">
        {isMySetup ? (
          <>
            <p className="text-xs text-muted-foreground">Tap two pieces to swap. Arrange your back row.</p>
            <button
              onClick={() => { setSetupSelected(null); actions.confirmSetup(); }}
              className="px-8 py-2.5 bg-primary text-primary-foreground font-serif tracking-widest rounded-xl hover:opacity-90 transition-opacity"
            >
              Ready
            </button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground/60 animate-pulse">
            Waiting for {gameState.phase === 'SETUP_WHITE' ? 'White' : 'Black'} to finish setup…
          </p>
        )}
      </div>
    </div>
  );
}

interface GamePageProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
  onLeave: () => void;
}

export default function GamePage({ state, actions, onLeave }: GamePageProps) {
  const {
    gameState, myColor, players, roomId, isKingSwapMode, selectedSquare,
    legalMoveSquares, validSwapTargets, validSacrificeTargets, attackedKingSquare, status,
  } = state;

  if (!gameState || !myColor) return null;

  const flipped = myColor === 'BLACK';
  const isMyTurn = gameState.currentTurn === myColor && gameState.phase === 'PLAYING';
  const isSetup = gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK';
  const isJesterSacrifice = gameState.phase === 'JESTER_SACRIFICE';
  const opponentColor: Color = myColor === 'WHITE' ? 'BLACK' : 'WHITE';
  const myName = players[myColor] ?? 'You';
  const opponentName = players[opponentColor] ?? 'Opponent';
  const mySwaps = myColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const oppSwaps = opponentColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const selectedPiece: Piece | null = selectedSquare !== null ? gameState.board[selectedSquare] : null;

  const renderSwaps = (count: number, dim = false) => (
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full border transition-colors ${
          i <= count
            ? dim ? 'bg-muted-foreground/50 border-muted-foreground/50' : 'bg-primary border-primary'
            : 'bg-transparent border-muted-foreground/30'
        }`} />
      ))}
    </div>
  );

  const handleBoardClick = (sq: number) => {
    if (isJesterSacrifice) {
      if (gameState.jesterSacrificeCtx?.sacrificingColor === myColor) actions.sacrificePiece(sq);
    } else {
      actions.selectSquare(sq);
    }
  };

  // Player label bar (shown above/below board)
  const PlayerBar = ({ isMe }: { isMe: boolean }) => {
    const color = isMe ? myColor : opponentColor;
    const name = isMe ? myName : opponentName;
    const swaps = isMe ? mySwaps : oppSwaps;
    const isCurrentTurn = gameState.currentTurn === color && !isSetup;
    return (
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full shrink-0 ${
            color === 'WHITE' ? 'bg-[#d4c5a9] border border-[#a89880]' : 'bg-[#3a3a3a] border border-[#555]'
          }`} />
          <span className={`text-sm font-medium ${isMe ? 'text-foreground' : 'text-muted-foreground'}`}>{name}</span>
          {isMe && <span className="text-xs text-muted-foreground/40">({myColor.toLowerCase()})</span>}
          {isCurrentTurn && (
            <span className="text-xs text-primary font-semibold animate-pulse">●</span>
          )}
        </div>
        {renderSwaps(swaps, !isMe)}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col lg:flex-row overflow-hidden font-sans">

      {/* ── Board column ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3 min-h-0">

        {/* Opponent bar — always on top of board */}
        <div className="w-full" style={{ maxWidth: 'min(calc(100vh - 140px), 100%)' }}>
          <PlayerBar isMe={false} />
        </div>

        {/* Board — fills remaining space, stays square */}
        <div className="relative flex-1 w-full min-h-0 flex items-center justify-center">
          <div className="w-full h-full" style={{ maxWidth: 'min(calc(100vh - 140px), 100%)', maxHeight: 'min(calc(100vh - 140px), 100%)' }}>
            {isSetup ? (
              <SetupBoardWrapper state={state} actions={actions} />
            ) : (
              <div className="relative w-full h-full">
                <HessBoard
                  board={gameState.board}
                  selectedSquare={selectedSquare}
                  legalMoveSquares={legalMoveSquares}
                  validSwapTargets={validSwapTargets}
                  validSacrificeTargets={validSacrificeTargets}
                  attackedKingSquare={attackedKingSquare}
                  lastMove={gameState.lastMove}
                  onSquareClick={handleBoardClick}
                  phase={gameState.phase}
                  currentTurn={gameState.currentTurn}
                  setupSelectedSquare={null}
                  onSetupSquareClick={() => {}}
                  flipped={flipped}
                />
                {isJesterSacrifice && gameState.jesterSacrificeCtx && (
                  <JesterSacrificeOverlay
                    sacrificingColor={gameState.jesterSacrificeCtx.sacrificingColor}
                    attackerPiece={gameState.jesterSacrificeCtx.attackerPiece}
                  />
                )}
              </div>
            )}
          </div>

          <WinScreen winner={gameState.winner} winReason={gameState.winReason} onPlayAgain={onLeave} />

          {/* Opponent away/disconnected overlay */}
          <AnimatePresence>
            {(status === 'opponent_away' || status === 'disconnected') && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-sm gap-3"
              >
                {status === 'opponent_away' ? (
                  <>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                          animate={{ opacity: [0.3,1,0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
                      ))}
                    </div>
                    <p className="font-serif text-lg text-primary">{opponentName} disconnected</p>
                    <p className="text-xs text-muted-foreground">Waiting up to 2 min for them to return…</p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-xl text-primary">Opponent left</p>
                    <button onClick={onLeave} className="px-5 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Back to lobby
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* My bar — always below board */}
        <div className="w-full" style={{ maxWidth: 'min(calc(100vh - 140px), 100%)' }}>
          <PlayerBar isMe={true} />
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className="lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl text-primary tracking-widest">HESS</h1>
            {roomId && <span className="font-mono text-[10px] text-muted-foreground/40 border border-border/30 rounded px-1">{roomId}</span>}
          </div>
          <RulebookDrawer />
        </div>

        {/* Status */}
        <div className="px-4 py-3 border-b border-border">
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
              <button onClick={actions.cancelKingSwap} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground underline">Cancel</button>
            </div>
          ) : (
            <p className="text-sm font-medium">
              {isMyTurn ? (
                <span className="text-primary">Your turn</span>
              ) : (
                <span className="text-muted-foreground">{opponentName}'s turn</span>
              )}
            </p>
          )}
        </div>

        {/* King swap button */}
        {gameState.phase === 'PLAYING' && !isKingSwapMode && isMyTurn && (
          <div className="px-4 py-2 border-b border-border">
            <button
              onClick={actions.initiateKingSwap}
              disabled={mySwaps === 0}
              className="w-full py-2 rounded-lg border border-border text-xs font-serif tracking-wider disabled:opacity-30 hover:border-primary/50 hover:text-primary transition-colors"
            >
              King Swap ({mySwaps} left)
            </button>
          </div>
        )}

        {/* Piece info */}
        <div className="px-4 py-3 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedPiece ? (
              <motion.div key={selectedPiece.type} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-2">
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
              </motion.div>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground/30 italic">
                {isMyTurn ? 'Tap a piece to move.' : 'Waiting for opponent…'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Captures */}
        {(gameState.capturedByWhite.length > 0 || gameState.capturedByBlack.length > 0) && (
          <div className="px-4 py-3 border-t border-border space-y-2">
            {gameState.capturedByWhite.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1">White captured</p>
                <div className="flex flex-wrap gap-0.5">
                  {gameState.capturedByWhite.map((p, i) => <div key={i} className="w-5 h-5 flex items-center justify-center"><PieceIcon piece={p} size={13} /></div>)}
                </div>
              </div>
            )}
            {gameState.capturedByBlack.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1">Black captured</p>
                <div className="flex flex-wrap gap-0.5">
                  {gameState.capturedByBlack.map((p, i) => <div key={i} className="w-5 h-5 flex items-center justify-center"><PieceIcon piece={p} size={13} /></div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave */}
        <div className="px-4 py-2 border-t border-border">
          <button onClick={onLeave} className="w-full py-1.5 text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors">
            Leave game
          </button>
        </div>
      </div>
    </div>
  );
}
