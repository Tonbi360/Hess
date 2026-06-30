import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Color, Piece, PieceType } from '@/lib/types';
import type { OnlineGameState, OnlineGameActions } from '@/lib/useOnlineGame';
import { HessBoard } from '@/components/HessBoard';
import { JesterSacrificeOverlay } from '@/components/JesterSacrificeOverlay';
import { WinScreen } from '@/components/WinScreen';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { PieceIcon } from '@/components/PieceIcon';
import {
  getLegalMoves,
  getValidSwapTargets,
} from '@/lib/engine';

// Board occupies min(dvh minus fixed chrome, full vw) — edge to edge on portrait phones
// Fixed chrome: topBar(44) + oppBar(32) + myBar(32) + kingSwapArea(44) + gaps(20) = 172px
const BOARD_SIZE = 'min(calc(100dvh - 172px), 100vw)';

const PIECE_INFO: Record<PieceType, { title: string; desc: string; special?: string }> = {
  KING:   { title: 'King',   desc: 'Moves 1 square in any direction.', special: '3× per game: swap positions with any friendly Pawn — cannot land in an attacked square.' },
  QUEEN:  { title: 'Queen',  desc: 'Slides any distance in any direction.', special: 'Cannot cross the midfield line into enemy territory.' },
  ROOK:   { title: 'Rook',   desc: 'Jumps exactly ±4 or ±6 squares along any rank or file.', special: 'Ignores all pieces between launch and landing — a missile, not a slider.' },
  BISHOP: { title: 'Bishop', desc: 'Zig-zag: alternates one vertical step then one horizontal step.', special: 'Each intermediate square is a valid landing point and can be blocked.' },
  KNIGHT: { title: 'Knight', desc: '2 squares in any direction, then 1 square sideways.', special: 'Cannot take the 2-square step backward toward your own side.' },
  PAWN:   { title: 'Pawn',   desc: 'Moves 1 forward (2 from starting square). Captures diagonally.', special: 'Promotes to Jester upon reaching the enemy\'s back rank.' },
  JESTER: { title: 'Jester', desc: 'Moves and captures diagonally forward only.', special: 'Cannot be directly captured — attackers bounce back. The Jester\'s owner must then sacrifice another piece (not the King).' },
};

// ── Setup phase wrapper ──────────────────────────────────────────────────────
function SetupBoardWrapper({ state, actions }: { state: OnlineGameState; actions: OnlineGameActions }) {
  const [setupSelected, setSetupSelected] = useState<number | null>(null);
  const [longPressedPiece, setLongPressedPiece] = useState<Piece | null>(null);
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
    <div
      className="relative flex flex-col items-center"
      style={{ width: BOARD_SIZE }}
    >
      <div style={{ width: BOARD_SIZE, height: BOARD_SIZE }} className="relative">
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
          onPieceLongPress={(p) => setLongPressedPiece(p)}
        />

        {/* Long-press tooltip overlay */}
        <AnimatePresence>
          {longPressedPiece && (
            <PieceTooltip piece={longPressedPiece} onDismiss={() => setLongPressedPiece(null)} />
          )}
        </AnimatePresence>
      </div>

      <div className="text-center space-y-2 pt-2">
        {isMySetup ? (
          <>
            <p className="text-xs text-muted-foreground">Hold any piece to learn how it moves. Tap two pieces to swap them.</p>
            <button
              onClick={() => { setSetupSelected(null); actions.confirmSetup(); }}
              className="px-8 py-2.5 bg-primary text-primary-foreground font-serif tracking-widest rounded-xl hover:opacity-90 transition-opacity"
            >
              Ready
            </button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground/60 animate-pulse">
            {gameState.phase === 'SETUP_BLACK' && state.isAIGame
              ? 'Hess is setting up…'
              : `Waiting for ${gameState.phase === 'SETUP_WHITE' ? 'White' : 'Black'} to finish setup…`}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Piece tooltip ────────────────────────────────────────────────────────────
function PieceTooltip({ piece, onDismiss }: { piece: Piece; onDismiss: () => void }) {
  const info = PIECE_INFO[piece.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-0 left-0 right-0 z-50"
      onClick={onDismiss}
      onTouchEnd={onDismiss}
    >
      <div className="mx-1 mb-1 bg-card/95 border border-primary/30 rounded-xl p-3 shadow-2xl backdrop-blur-sm space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center bg-muted rounded-md shrink-0">
            <PieceIcon piece={piece} size={18} />
          </div>
          <span className="font-serif text-primary font-semibold text-sm">{info.title}</span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{info.desc}</p>
        {info.special && (
          <p className="text-xs text-primary/70 leading-relaxed italic">{info.special}</p>
        )}
        <p className="text-[10px] text-muted-foreground/40 text-right pt-0.5">tap to dismiss</p>
      </div>
    </motion.div>
  );
}

// ── Main GamePage ────────────────────────────────────────────────────────────
interface GamePageProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
  onLeave: () => void;
}

export default function GamePage({ state, actions, onLeave }: GamePageProps) {
  const [longPressedPiece, setLongPressedPiece] = useState<Piece | null>(null);

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

  const handleBoardClick = (sq: number) => {
    setLongPressedPiece(null);
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
      <div className="flex items-center justify-between px-3 h-8">
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

      {/* ── Top bar — fixed h-11 (44px) ── */}
      <div className="shrink-0 h-11 flex items-center justify-between px-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-xl text-primary tracking-widest">HESS</h1>
          {isAIGame ? (
            <span className="text-[10px] text-muted-foreground/50 border border-border/30 rounded px-1.5 py-0.5">
              {myName} vs Hess · {state.aiDifficulty}
            </span>
          ) : roomId && (
            <span className="font-mono text-[10px] text-muted-foreground/40 border border-border/30 rounded px-1">{roomId}</span>
          )}
        </div>

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

        <HamburgerMenu
          state={state}
          actions={actions}
          selectedPiece={selectedSquare !== null ? gameState.board[selectedSquare] : null}
          onLeave={onLeave}
        />
      </div>

      {/* ── Main board area — flex-1, board fills available space ── */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center">

        {isSetup ? (
          /* Setup mode — board + confirm button */
          <SetupBoardWrapper state={state} actions={actions} />
        ) : (
          /* Play mode — opponent bar, board, my bar */
          <div className="flex flex-col" style={{ width: BOARD_SIZE }}>

            {/* Opponent bar */}
            <PlayerBar isMe={false} />

            {/* Board — explicit square size */}
            <div
              className="relative shrink-0"
              style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
            >
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
                onPieceLongPress={(p) => setLongPressedPiece(p)}
              />

              {/* Jester overlay */}
              {isJesterSacrifice && gameState.jesterSacrificeCtx && (
                <JesterSacrificeOverlay
                  sacrificingColor={gameState.jesterSacrificeCtx.sacrificingColor}
                  attackerPiece={gameState.jesterSacrificeCtx.attackerPiece}
                />
              )}

              {/* Win screen */}
              <WinScreen
                winner={gameState.winner}
                winReason={gameState.winReason}
                myColor={myColor}
                isAIGame={isAIGame}
                onRematch={actions.requestRematch}
                onLeave={onLeave}
              />

              {/* Opponent away / left */}
              <AnimatePresence>
                {(status === 'opponent_away' || status === 'disconnected') && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-3"
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
                        <p className="text-xs text-muted-foreground">Waiting up to 2 min…</p>
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

              {/* Rematch request */}
              <AnimatePresence>
                {rematchRequestedByOpponent && gameState.phase === 'GAME_OVER' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-2 left-2 right-2 z-40 bg-primary/20 border border-primary/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <p className="text-sm text-primary">{opponentName} wants a rematch!</p>
                    <button onClick={actions.requestRematch}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-serif tracking-wider rounded-lg shrink-0">
                      Accept
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Long-press piece tooltip */}
              <AnimatePresence>
                {longPressedPiece && (
                  <PieceTooltip piece={longPressedPiece} onDismiss={() => setLongPressedPiece(null)} />
                )}
              </AnimatePresence>
            </div>

            {/* My bar */}
            <PlayerBar isMe={true} />
          </div>
        )}
      </div>

      {/* ── King swap button — fixed h-11 (44px) ── */}
      <div className="shrink-0 h-11 flex items-center px-3">
        <div className="w-full" style={{ maxWidth: BOARD_SIZE, margin: '0 auto' }}>
          <AnimatePresence>
            {gameState.phase === 'PLAYING' && !isKingSwapMode && isMyTurn && !isJesterSacrifice && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              >
                <button
                  onClick={actions.initiateKingSwap}
                  disabled={mySwaps === 0}
                  className="w-full py-1.5 rounded-lg border border-border/50 text-xs font-serif tracking-wider text-muted-foreground disabled:opacity-20 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  King Swap ({mySwaps} left)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
