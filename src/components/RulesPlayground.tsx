import { useState, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Board, 
  Color, 
  GameState, 
  getLegalMoves, 
  getValidSwapTargets, 
  getValidSacrificeTargets,
  applyJesterSacrifice,
  swapSetupSquares,
  confirmSetup,
  createInitialState,
  applyMove
} from '@workspace/hess-engine';
import { HessBoard } from './HessBoard';
import { JesterSacrificeOverlay } from './JesterSacrificeOverlay';
import { Button } from './ui/button';
import { Sparkles, RefreshCw, Move, Shield, Zap, ArrowRightLeft, Crown, ChevronRight, ShieldAlert } from 'lucide-react';

interface Preset {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  setup: () => GameState;
}

function createEmptyBoard(): Board {
  return Array(64).fill(null);
}

const PRESETS: Preset[] = [
  {
    id: 'bishops',
    title: 'Bishop Staircase',
    description: 'Bishops move in alternating vertical and horizontal staircase steps along diagonals. Click the Bishop on d4 (square 35) to test its path (note how a friendly pawn on e6 blocks the staircase path beyond it).',
    icon: Move,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[35] = { type: 'BISHOP', color: 'WHITE' }; // d4 (row 4, col 3)
      board[20] = { type: 'PAWN', color: 'WHITE' };   // e6 (row 2, col 4 - blocker)
      board[60] = { type: 'KING', color: 'WHITE' };   // e1
      board[4] = { type: 'KING', color: 'BLACK' };    // e8
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'rooks',
    title: 'Rook Hyper-Jump',
    description: 'Rooks jump exactly 4 or 6 squares in straight lines, hopping cleanly over intervening pieces! Click the Rook on d4 (square 35) — it jumps over the friendly Pawn on e4 (square 36) to land on h4 (square 39) and capture the enemy Knight!',
    icon: Zap,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[35] = { type: 'ROOK', color: 'WHITE' };   // d4 (row 4, col 3)
      board[36] = { type: 'PAWN', color: 'WHITE' };   // e4 (row 4, col 4 - intervening blocker)
      board[39] = { type: 'KNIGHT', color: 'BLACK' }; // h4 (row 4, col 7 - target square offset +4)
      board[60] = { type: 'KING', color: 'WHITE' };   // e1
      board[4] = { type: 'KING', color: 'BLACK' };    // e8
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'jester',
    title: 'Jester Bounce & Sacrifice',
    description: 'Jesters move 1 step diagonally in any direction (to & fro). Test capturing the White Jester on d5 (square 27) with the Black Queen on d8: the attack bounces back, and White must select a non-King piece to sacrifice!',
    icon: Shield,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[27] = { type: 'JESTER', color: 'WHITE' }; // d5 White Jester (inside Black territory row 3, col 3)
      board[51] = { type: 'PAWN', color: 'WHITE' };   // d2 White Pawn candidate
      board[54] = { type: 'KNIGHT', color: 'WHITE' }; // g2 White Knight candidate
      board[60] = { type: 'KING', color: 'WHITE' };   // e1 White King
      board[3] = { type: 'QUEEN', color: 'BLACK' };   // d8 Black Queen targeting Jester on d5
      board[12] = { type: 'PAWN', color: 'BLACK' };   // e6 Black Pawn (ensures no raid mode)
      board[4] = { type: 'KING', color: 'BLACK' };    // e8 Black King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'BLACK' }; // Black's turn to capture Jester!
    }
  },
  {
    id: 'king-swap',
    title: 'King Swap (3 Swaps)',
    description: 'The King can swap positions with friendly Pawns up to 3 times per game. Test swapping with each of the 3 Pawns below (d2, e2, d4) to use up all 3 King Swaps!',
    icon: ArrowRightLeft,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[60] = { type: 'KING', color: 'WHITE' };  // e1 King
      board[51] = { type: 'PAWN', color: 'WHITE' };  // d2 Pawn
      board[52] = { type: 'PAWN', color: 'WHITE' };  // e2 Pawn
      board[35] = { type: 'PAWN', color: 'WHITE' };  // d4 Pawn
      board[4] = { type: 'KING', color: 'BLACK' };   // e8 King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE', whiteSwapsLeft: 3, blackSwapsLeft: 3 };
    }
  },
  {
    id: 'pawn',
    title: 'Pawn & Promotion',
    description: 'Pawns on starting rank (d2) can move 1 or 2 squares forward or capture diagonally. Pawns on rank 7 (d7) promote into a Jester upon advancing to rank 8!',
    icon: ChevronRight,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[51] = { type: 'PAWN', color: 'WHITE' }; // d2 Pawn on starting rank
      board[11] = { type: 'PAWN', color: 'WHITE' }; // d7 Pawn 1 step from 8th rank
      board[42] = { type: 'PAWN', color: 'BLACK' }; // c3 enemy Pawn for diagonal capture test
      board[60] = { type: 'KING', color: 'WHITE' };  // e1 King
      board[4] = { type: 'KING', color: 'BLACK' };   // e8 King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'knight',
    title: 'Knight T-Shape',
    description: 'Knights move in T-shape leaps (2 steps forward or sideways + 1 perpendicular step). Direct 2-square backward jumps toward the home rank are forbidden, but backward drifting is allowed via sideways 2-step leaps!',
    icon: ShieldAlert,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[35] = { type: 'KNIGHT', color: 'WHITE' }; // d4 Knight
      board[60] = { type: 'KING', color: 'WHITE' };   // e1 King
      board[4] = { type: 'KING', color: 'BLACK' };    // e8 King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'queen',
    title: 'Queen Territory Lock',
    description: 'When other friendly pieces are present, the Queen is locked strictly to her home territory (Ranks 1–4 / rows 4–7 for White). Click the Queen on d4 (square 35) — her path stops at the midfield line!',
    icon: Crown,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[35] = { type: 'QUEEN', color: 'WHITE' };  // d4 Queen (row 4, col 3)
      board[51] = { type: 'PAWN', color: 'WHITE' };   // d2 Pawn (keeps raid locked)
      board[60] = { type: 'KING', color: 'WHITE' };   // e1 King
      board[4] = { type: 'KING', color: 'BLACK' };    // e8 King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'queen-raid',
    title: 'Queen Desperation Raid',
    description: 'When isolated with only the King remaining, the Queen unlocks a Desperation Raid! Click the Queen on d4 (square 35) — she can now cross the midfield line deep into enemy territory!',
    icon: Crown,
    setup: () => {
      const state = createInitialState();
      const board = createEmptyBoard();
      board[35] = { type: 'QUEEN', color: 'WHITE' }; // d4 Queen (isolated!)
      board[60] = { type: 'KING', color: 'WHITE' };  // e1 King
      board[4] = { type: 'KING', color: 'BLACK' };   // e8 King
      return { ...state, board, phase: 'PLAYING', currentTurn: 'WHITE' };
    }
  },
  {
    id: 'hidden-setup',
    title: 'Hidden Setup Phase',
    description: 'At the start of every Hess match, players secretly swap back-rank pieces behind a curtain before locking in their formation!',
    icon: RefreshCw,
    setup: () => {
      const state = createInitialState();
      return { ...state, phase: 'SETUP_WHITE', currentTurn: 'WHITE' };
    }
  }
];

export function RulesPlayground({ onBack }: { onBack?: () => void }) {
  const [activePresetId, setActivePresetId] = useState<string>(PRESETS[0].id);
  const [gameState, setGameState] = useState<GameState>(PRESETS[0].setup);
  const [selectedSq, setSelectedSq] = useState<number | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const activePreset = PRESETS.find(p => p.id === activePresetId) || PRESETS[0];

  const handleSelectPreset = (preset: Preset) => {
    setActivePresetId(preset.id);
    setGameState(preset.setup());
    setSelectedSq(null);
    setIsSwapping(false);
  };

  const handleReset = () => {
    setGameState(activePreset.setup());
    setSelectedSq(null);
    setIsSwapping(false);
  };

  const validMoves = selectedSq !== null ? getLegalMoves(gameState, selectedSq) : [];
  const swapTargets = isSwapping ? getValidSwapTargets(gameState, gameState.currentTurn) : [];
  const sacrificeTargets = gameState.phase === 'JESTER_SACRIFICE' ? getValidSacrificeTargets(gameState) : [];

  const handleSquareClick = (sq: number) => {
    // If in SETUP_WHITE or SETUP_BLACK phase, swap back-rank pieces
    if (gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK') {
      const isWhite = gameState.phase === 'SETUP_WHITE';
      const targetRow = isWhite ? 7 : 0;
      const row = Math.floor(sq / 8);
      if (row !== targetRow) return;
      if (selectedSq === null) {
        setSelectedSq(sq);
      } else {
        if (selectedSq !== sq) {
          const nextState = swapSetupSquares(gameState, selectedSq, sq);
          setGameState(nextState);
        }
        setSelectedSq(null);
      }
      return;
    }

    // If in JESTER_SACRIFICE phase, click a sacrifice target to sacrifice it
    if (gameState.phase === 'JESTER_SACRIFICE') {
      if (sacrificeTargets.includes(sq)) {
        const nextState = applyJesterSacrifice(gameState, sq);
        setGameState(nextState);
        setSelectedSq(null);
      }
      return;
    }

    if (isSwapping) {
      if (swapTargets.includes(sq)) {
        const kingSq = gameState.board.findIndex(
          p => p?.type === 'KING' && p.color === gameState.currentTurn
        );
        if (kingSq !== -1) {
          const newBoard = [...gameState.board];
          const temp = newBoard[kingSq];
          newBoard[kingSq] = newBoard[sq];
          newBoard[sq] = temp;
          const isPlaygroundSandbox = activePresetId === 'king-swap';
          setGameState({
            ...gameState,
            board: newBoard,
            currentTurn: isPlaygroundSandbox ? 'WHITE' : (gameState.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE'),
            whiteSwapsLeft: gameState.currentTurn === 'WHITE' ? gameState.whiteSwapsLeft - 1 : gameState.whiteSwapsLeft,
            blackSwapsLeft: gameState.currentTurn === 'BLACK' ? gameState.blackSwapsLeft - 1 : gameState.blackSwapsLeft,
          });
          setIsSwapping(false);
          setSelectedSq(null);
          return;
        }
      }
      setIsSwapping(false);
      return;
    }

    if (selectedSq === null) {
      const piece = gameState.board[sq];
      if (piece && piece.color === gameState.currentTurn) {
        if (piece.type === 'KING' && (gameState.currentTurn === 'WHITE' ? gameState.whiteSwapsLeft : gameState.blackSwapsLeft) > 0) {
          setIsSwapping(true);
        }
        setSelectedSq(sq);
      }
    } else {
      if (selectedSq === sq) {
        setSelectedSq(null);
        return;
      }
      if (validMoves.includes(sq)) {
        const { state: nextState } = applyMove(gameState, selectedSq, sq);
        setGameState(nextState);
        setSelectedSq(null);
      } else {
        const piece = gameState.board[sq];
        if (piece && piece.color === gameState.currentTurn) {
          setSelectedSq(sq);
        } else {
          setSelectedSq(null);
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6 bg-card border border-border rounded-2xl text-foreground">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="font-serif text-2xl text-primary flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Hess Rules Playground
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Interactive sandbox to test and verify non-standard movement and rules of Hess
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Reset Scenario
          </Button>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Exit
            </Button>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          const isActive = p.id === activePresetId;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[11px] font-serif transition-all text-center leading-tight ${
                isActive
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 mb-1 text-primary shrink-0" />
              <span className="truncate w-full">{p.title}</span>
            </button>
          );
        })}
      </div>

      {/* Preset Description */}
      <div className="bg-muted/40 border border-border rounded-xl p-3.5 text-xs text-muted-foreground leading-relaxed flex items-center justify-between gap-4">
        <span>{activePreset.description}</span>
        {activePresetId === 'king-swap' && (
          <Button
            size="sm"
            variant={isSwapping ? 'default' : 'outline'}
            onClick={() => setIsSwapping(!isSwapping)}
            className="shrink-0 gap-1 text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {isSwapping ? 'Cancel Swap' : 'Test King Swap'}
          </Button>
        )}
        {(gameState.phase === 'SETUP_WHITE' || gameState.phase === 'SETUP_BLACK') && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedSq(null);
              setGameState(confirmSetup(gameState));
            }}
            className="shrink-0 gap-1 text-xs bg-primary text-primary-foreground font-serif tracking-wide"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Confirm {gameState.phase === 'SETUP_WHITE' ? 'White' : 'Black'} Setup
          </Button>
        )}
      </div>

      {/* Board Sandbox View */}
      <div className="flex flex-col items-center justify-center relative">
        <div className="w-full max-w-[420px] aspect-square relative">
          <HessBoard
            board={gameState.board}
            selectedSquare={selectedSq}
            legalMoveSquares={isSwapping ? [] : validMoves}
            validSwapTargets={isSwapping ? swapTargets : []}
            validSacrificeTargets={sacrificeTargets}
            attackedKingSquare={null}
            lastMove={gameState.lastMove}
            onSquareClick={handleSquareClick}
            phase={gameState.phase}
            currentTurn={gameState.currentTurn}
            flipped={false}
          />

          {/* Render Jester Sacrifice Overlay in Playground */}
          <AnimatePresence>
            {gameState.phase === 'JESTER_SACRIFICE' && gameState.jesterSacrificeCtx && (
              <JesterSacrificeOverlay
                sacrificingColor={gameState.jesterSacrificeCtx.sacrificingColor}
                attackerPiece={gameState.jesterSacrificeCtx.attackerPiece}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Turn: <strong className="text-foreground">{gameState.currentTurn}</strong></span>
          <span>Phase: <strong className="text-primary">{gameState.phase}</strong></span>
          <span>White Swaps: <strong className="text-foreground">{gameState.whiteSwapsLeft}</strong></span>
          <span>Black Swaps: <strong className="text-foreground">{gameState.blackSwapsLeft}</strong></span>
          {(gameState.whiteQueenRaidMoves || 0) > 0 && (
            <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              White Queen Raid: {gameState.whiteQueenRaidMoves}/5
            </span>
          )}
          {(gameState.blackQueenRaidMoves || 0) > 0 && (
            <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              Black Queen Raid: {gameState.blackQueenRaidMoves}/5
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
