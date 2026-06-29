import { useState } from 'react';
import type { Color, Piece } from '@/lib/types';
import type { OnlineGameState, OnlineGameActions } from '@/lib/useOnlineGame';
import { HessBoard } from '@/components/HessBoard';
import { JesterSacrificeOverlay } from '@/components/JesterSacrificeOverlay';
import { WinScreen } from '@/components/WinScreen';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="w-full h-full">
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
      </div>
      <div className="text-center space-y-2 shrink-0">
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
    legalMoveSquares, blockedRookSquares, validSwapTargets, validSacrificeTargets,
    attackedKingSquare, status, isAIGame, aiIsLearning, rematchRequestedByOpponent,
  } = state;

  if (!gameState || !myColor) return null;

  const flipped = myColor === 'BLACK';
  const isMyTurn = gameState.currentTurn === myColor && gameState.phase === 'PLAYING';
  const isSetup = gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK';
  const isJesterSacrifice = gameState.phase === 'JESTER_SACRIFICE';
  const opponentColor: Color = myColor === 'WHITE' ? 'BLACK' : 'WHITE';
  const myName = players[myColor] ?? 'You';
  const opponentName = isAIGame ? 'Hess' : (players[opponentColor] ?? 'Opponent');
  const mySwaps = myColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const oppSwaps = opponentColor === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft;
  const selectedPiece: Piece | null = selectedSquare !== null ? gameState.board[selectedSquare] : null;

  const handleBoardClick = (sq: number) => {
    if (isJesterSacrifice) {
      if (gameState.jesterSacrificeCtx?.sacrificingColor === myColor) actions.sacrificePiece(sq);
    } else {
      actions.selectSquare(sq);
    }
  };

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

  const PlayerBar = ({ isMe }: { isMe: boolean }) => {
    const color = isMe ? myColor : opponentColor;
    const name = isMe ? myName : opponentName;
    const swaps = isMe ? mySwaps : oppSwaps;
    const isCurrentTurn = gameState.currentTurn === color && !isSetup && !isJesterSacrifice;
    return (
      <div className="flex items-center justify-between px-1 h-8">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            color === 'WHITE' ? 'bg-[#d4c5a9] border border-[#a89880]' : 'bg-[#3a3a3a] border border-[#555]'
          }`} />
          <span className={`text-sm font-medium truncate ${isMe ? 'text-foreground' : 'text-muted-foreground'}`}>{name}</span>
          {isCurrentTurn && <span className="text-xs text-primary font-semibold animate-pulse shrink-0">●</span>}
          {!isMe && isAIGame && aiIsLearning && (
            <span className="text-[10px] text-amber-400/70 shrink-0 animate-pulse">learning…</span>
          )}
        </div>
        {renderSwaps(swaps, !isMe)}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-hidden font-sans">

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-xl text-primary tracking-widest">HESS</h1>
          {roomId && !isAIGame && (
            <span className="font-mono text-[10px] text-muted-foreground/40 border border-border/30 rounded px-1">{roomId}</span>
          )}
          {isAIGame && (
            <span className="text-[10px] text-muted-foreground/50 border border-border/30 rounded px-1.5 py-0.5">
              vs Hess · {state.aiDifficulty}
            </span>
          )}
        </div>

        {/* Center: status / turn indicator */}
        <div className="flex-1 text-center">
          {isSetup ? (
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Setup</span>
          ) : isJesterSacrifice ? (
            <span className="text-xs uppercase tracking-widest text-amber-400">Jester Bounce!</span>
          ) : isKingSwapMode ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-widest text-primary">King Swap</span>
              <button onClick={actions.cancelKingSwap} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground underline">cancel</button>
            </div>
          ) : (
            <span className={`text-xs font-medium ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`}>
              {isMyTurn ? 'Your turn' : isAIGame ? 'Hess thinking…' : `${opponentName}'s turn`}
            </span>
          )}
        </div>

        <HamburgerMenu state={state} actions={actions} selectedPiece={selectedPiece} onLeave={onLeave} />
      </div>

      {/* ── Board area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-0">

        {/* Opponent bar */}
        <div className="w-full shrink-0" style={{ maxWidth: 'min(calc(100dvh - 160px), calc(100vw - 24px))' }}>
          <PlayerBar isMe={false} />
        </div>

        {/* Board — square, fills available space */}
        <div
          className="relative flex-1 w-full min-h-0"
          style={{ maxWidth: 'min(calc(100dvh - 160px), calc(100vw - 24px))' }}
        >
          <div className="w-full h-full">
            {isSetup ? (
              <SetupBoardWrapper state={state} actions={actions} />
            ) : (
              <div className="relative w-full h-full">
                <HessBoard
                  board={gameState.board}
                  selectedSquare={selectedSquare}
                  legalMoveSquares={legalMoveSquares}
                  blockedRookSquares={blockedRookSquares}
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

          {/* Win screen */}
          <WinScreen
            winner={gameState.winner}
            winReason={gameState.winReason}
            myColor={myColor}
            isAIGame={isAIGame}
            onRematch={actions.requestRematch}
            onLeave={onLeave}
          />

          {/* Opponent away overlay */}
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

          {/* Rematch request banner */}
          <AnimatePresence>
            {rematchRequestedByOpponent && gameState.phase === 'GAME_OVER' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 left-2 right-2 z-40 bg-primary/20 border border-primary/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-sm text-primary">{opponentName} wants a rematch!</p>
                <button onClick={actions.requestRematch}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-serif tracking-wider rounded-lg hover:opacity-90 transition-opacity shrink-0">
                  Accept
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* My bar */}
        <div className="w-full shrink-0" style={{ maxWidth: 'min(calc(100dvh - 160px), calc(100vw - 24px))' }}>
          <PlayerBar isMe={true} />
        </div>
      </div>

      {/* King swap action bar */}
      <AnimatePresence>
        {gameState.phase === 'PLAYING' && !isKingSwapMode && isMyTurn && !isJesterSacrifice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="shrink-0 px-3 pb-2"
          >
            <div style={{ maxWidth: 'min(calc(100dvh - 160px), calc(100vw - 24px))', margin: '0 auto' }}>
              <button
                onClick={actions.initiateKingSwap}
                disabled={mySwaps === 0}
                className="w-full py-2 rounded-lg border border-border/50 text-xs font-serif tracking-wider text-muted-foreground disabled:opacity-20 hover:border-primary/40 hover:text-primary transition-colors"
              >
                King Swap ({mySwaps} left)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
