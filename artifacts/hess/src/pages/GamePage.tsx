import { useState } from 'react';
import type { Color } from '@/lib/types';
import type { OnlineGameState, OnlineGameActions } from '@/lib/useOnlineGame';
import { HessBoard } from '@/components/HessBoard';
import { JesterSacrificeOverlay } from '@/components/JesterSacrificeOverlay';
import { WinScreen } from '@/components/WinScreen';
import { RulebookDrawer } from '@/components/RulebookDrawer';
import { PieceIcon } from '@/components/PieceIcon';
import { motion, AnimatePresence } from 'framer-motion';
import type { PieceType, Piece } from '@/lib/types';

const PIECE_DESCRIPTIONS: Record<PieceType, { title: string; how: string; special?: string }> = {
  KING: { title: 'King — The Commander', how: 'Moves 1 square in any direction.', special: 'King Swap: 3 times per game, swap with any friendly Pawn — but not into an attacked square.' },
  QUEEN: { title: 'Queen — Territorial Empress', how: 'Slides any number of squares in any direction.', special: 'Cannot cross the midfield line. She defends — never invades.' },
  ROOK: { title: 'Rook — Missile', how: 'Instantly jumps exactly 4 or 6 squares (S±4 or S±6). Ignores all pieces in between.' },
  BISHOP: { title: 'Bishop — Staircase', how: 'Zig-zag staircase: alternating vertical + horizontal steps. Blockable by pieces along the path.' },
  KNIGHT: { title: 'Knight — T-Shape', how: '2 squares in any direction + 1 sideways.', special: 'The 2-square step cannot go backward toward own side.' },
  PAWN: { title: 'Pawn', how: '1 square forward (or 2 from start). Captures diagonally forward.', special: 'Promotes to a Jester on the enemy\'s last rank.' },
  JESTER: { title: 'Jester — Untouchable', how: 'Moves and captures diagonally forward only.', special: 'Cannot be directly captured. Any attempt bounces the attacker; owner must sacrifice a piece.' },
};

interface SetupBoardWrapperProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
}

function SetupBoardWrapper({ state, actions }: SetupBoardWrapperProps) {
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
    if (setupSelected === null) {
      setSetupSelected(sq);
    } else {
      if (setupSelected !== sq) actions.setupSwap(setupSelected, sq);
      setSetupSelected(null);
    }
  };

  return (
    <>
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
      />
      <div className="mt-4 flex flex-col items-center gap-3">
        {isMySetup ? (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Tap two pieces to swap them. Arrange your back row.
            </p>
            <button
              onClick={() => { setSetupSelected(null); actions.confirmSetup(); }}
              className="px-8 py-3 bg-primary text-primary-foreground font-serif tracking-widest rounded-xl hover:opacity-90 transition-opacity text-lg"
            >
              Ready
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">
            Waiting for {gameState.phase === 'SETUP_WHITE' ? 'White' : 'Black'} to finish setup...
          </p>
        )}
      </div>
    </>
  );
}

interface GamePageProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
  onLeave: () => void;
}

export default function GamePage({ state, actions, onLeave }: GamePageProps) {
  const { gameState, myColor, players, roomId, isKingSwapMode, selectedSquare,
    legalMoveSquares, validSwapTargets, validSacrificeTargets, attackedKingSquare, status } = state;

  if (!gameState || !myColor) return null;

  const isMyTurn = gameState.currentTurn === myColor && gameState.phase === 'PLAYING';
  const isSetup = gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK';
  const isJesterSacrifice = gameState.phase === 'JESTER_SACRIFICE';
  const opponentColor: Color = myColor === 'WHITE' ? 'BLACK' : 'WHITE';
  const myName = players[myColor] ?? 'You';
  const opponentName = players[opponentColor] ?? 'Opponent';
  const mySwaps = myColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const oppSwaps = opponentColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;

  const selectedPiece: Piece | null = selectedSquare !== null ? gameState.board[selectedSquare] : null;

  const renderSwaps = (count: number) => (
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i <= count ? 'bg-primary border-primary' : 'bg-transparent border-muted'}`} />
      ))}
    </div>
  );

  const handleBoardClick = (sq: number) => {
    if (isJesterSacrifice) {
      if (gameState.jesterSacrificeCtx?.sacrificingColor === myColor) {
        actions.sacrificePiece(sq);
      }
    } else {
      actions.selectSquare(sq);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col lg:flex-row gap-0 font-sans">

      {/* Board area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative">

        {/* Opponent label */}
        <div className="w-full max-w-[640px] flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${opponentColor === 'WHITE' ? 'bg-white border border-muted' : 'bg-zinc-800 border border-zinc-600'}`} />
            <span className="text-sm font-medium text-muted-foreground">{opponentName}</span>
            <span className="text-xs text-muted-foreground/50">({opponentColor})</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground/60">
            {renderSwaps(oppSwaps)}
          </div>
        </div>

        {/* Board */}
        <div className="w-full max-w-[640px] relative">
          {isSetup ? (
            <SetupBoardWrapper state={state} actions={actions} />
          ) : (
            <>
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
              />
              {isJesterSacrifice && gameState.jesterSacrificeCtx && (
                <JesterSacrificeOverlay
                  sacrificingColor={gameState.jesterSacrificeCtx.sacrificingColor}
                  attackerPiece={gameState.jesterSacrificeCtx.attackerPiece}
                />
              )}
            </>
          )}

          <WinScreen
            winner={gameState.winner}
            winReason={gameState.winReason}
            onPlayAgain={onLeave}
          />

          {/* Opponent disconnected banner */}
          <AnimatePresence>
            {status === 'disconnected' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg gap-4"
              >
                <p className="font-serif text-2xl text-primary">Opponent disconnected</p>
                <button onClick={onLeave} className="px-6 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Back to lobby
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* My label */}
        <div className="w-full max-w-[640px] flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${myColor === 'WHITE' ? 'bg-white border border-muted' : 'bg-zinc-800 border border-zinc-600'}`} />
            <span className="text-sm font-medium text-foreground">{myName}</span>
            <span className="text-xs text-muted-foreground/50">({myColor}) · You</span>
          </div>
          <div className="flex items-center gap-1">
            {renderSwaps(mySwaps)}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl text-primary tracking-widest">HESS</h1>
            {roomId && (
              <span className="font-mono text-xs text-muted-foreground/50 border border-border/40 rounded px-1.5 py-0.5">{roomId}</span>
            )}
          </div>
          <RulebookDrawer />
        </div>

        {/* Turn / status */}
        <div className="px-5 py-4 border-b border-border">
          {isSetup ? (
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Setup Phase</p>
          ) : isJesterSacrifice ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-amber-500">Jester Bounce!</p>
              <p className="text-sm text-muted-foreground">
                {gameState.jesterSacrificeCtx?.sacrificingColor === myColor
                  ? 'Tap a piece to sacrifice it.'
                  : 'Opponent must sacrifice a piece.'}
              </p>
            </div>
          ) : isKingSwapMode ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-primary">King Swap</p>
              <p className="text-sm text-muted-foreground">Tap a friendly Pawn to swap.</p>
              <button onClick={actions.cancelKingSwap} className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${gameState.currentTurn === 'WHITE' ? 'bg-white border border-muted' : 'bg-zinc-700 border border-zinc-500'}`} />
              <span className="text-sm font-medium">
                {isMyTurn ? 'Your turn' : `${opponentName}'s turn`}
              </span>
            </div>
          )}
        </div>

        {/* King swap button */}
        {gameState.phase === 'PLAYING' && !isKingSwapMode && isMyTurn && (
          <div className="px-5 py-3 border-b border-border">
            <button
              onClick={actions.initiateKingSwap}
              disabled={mySwaps === 0}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-serif tracking-wider disabled:opacity-30 hover:border-primary/50 hover:text-primary transition-colors"
            >
              King Swap ({mySwaps} left)
            </button>
          </div>
        )}

        {/* Piece info */}
        <div className="px-5 py-4 flex-1">
          <AnimatePresence mode="wait">
            {selectedPiece ? (
              <motion.div
                key={selectedPiece.type}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-md border border-border shrink-0">
                    <PieceIcon piece={selectedPiece} size={20} />
                  </div>
                  <span className="font-serif text-sm text-primary font-semibold leading-tight">
                    {PIECE_DESCRIPTIONS[selectedPiece.type].title}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {PIECE_DESCRIPTIONS[selectedPiece.type].how}
                </p>
                {PIECE_DESCRIPTIONS[selectedPiece.type].special && (
                  <p className="text-xs text-primary/70 leading-relaxed italic">
                    {PIECE_DESCRIPTIONS[selectedPiece.type].special}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground/40 italic"
              >
                {isMyTurn ? 'Tap a piece to see how it moves.' : 'Waiting for opponent...'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Captures */}
        {(gameState.capturedByWhite.length > 0 || gameState.capturedByBlack.length > 0) && (
          <div className="px-5 py-4 border-t border-border space-y-3">
            {gameState.capturedByWhite.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-1">White captured</p>
                <div className="flex flex-wrap gap-1">
                  {gameState.capturedByWhite.map((p, i) => (
                    <div key={i} className="w-5 h-5 flex items-center justify-center">
                      <PieceIcon piece={p} size={14} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {gameState.capturedByBlack.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-1">Black captured</p>
                <div className="flex flex-wrap gap-1">
                  {gameState.capturedByBlack.map((p, i) => (
                    <div key={i} className="w-5 h-5 flex items-center justify-center">
                      <PieceIcon piece={p} size={14} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave button */}
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={onLeave}
            className="w-full py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Leave game
          </button>
        </div>
      </div>
    </div>
  );
}
