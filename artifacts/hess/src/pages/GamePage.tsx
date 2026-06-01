import { useState, useEffect } from "react";
import { useGameState } from "@/lib/useGameState";
import { HessBoard } from "@/components/HessBoard";
import { GameInfo } from "@/components/GameInfo";
import { WinScreen } from "@/components/WinScreen";
import { JesterSacrificeOverlay } from "@/components/JesterSacrificeOverlay";
import { motion, AnimatePresence } from "framer-motion";

export default function GamePage() {
  const { gameState, ui, actions } = useGameState();
  
  // Local state for setup phase selections
  const [setupSelectedSquare, setSetupSelectedSquare] = useState<number | null>(null);

  const handleSetupSquareClick = (sq: number) => {
    const { phase, currentTurn, board } = gameState;
    const isWhiteSetup = phase === 'SETUP_WHITE';
    const row = Math.floor(sq / 8);
    
    // Only allow selecting pieces in own back row
    if (isWhiteSetup && row !== 7) return;
    if (!isWhiteSetup && row !== 0) return;

    if (setupSelectedSquare === null) {
      // First click
      setSetupSelectedSquare(sq);
    } else {
      // Second click: swap
      if (setupSelectedSquare !== sq) {
        actions.setupSwap(setupSelectedSquare, sq);
      }
      setSetupSelectedSquare(null);
    }
  };

  const handleReadySetup = () => {
    setSetupSelectedSquare(null);
    actions.confirmSetup();
  };

  // Show turn transition screen between setup phases
  const [showPassDevice, setShowPassDevice] = useState(false);
  const [passMessage, setPassMessage] = useState("");

  useEffect(() => {
    if (gameState.phase === 'SETUP_BLACK') {
      setPassMessage("Pass the device to Black");
      setShowPassDevice(true);
      const timer = setTimeout(() => setShowPassDevice(false), 2500);
      return () => clearTimeout(timer);
    }
    if (gameState.phase === 'PLAYING' && gameState.currentTurn === 'WHITE' && gameState.moveHistory?.length === 0) {
      setPassMessage("Pass the device to White to begin");
      setShowPassDevice(true);
      const timer = setTimeout(() => setShowPassDevice(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.currentTurn, gameState.moveHistory]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-4 lg:p-8 font-sans">
      
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Board Area */}
        <div className="flex-1 relative">
          
          <AnimatePresence>
            {showPassDevice && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg"
              >
                <h2 className="text-3xl md:text-5xl font-serif text-primary text-center tracking-widest uppercase">
                  {passMessage}
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          <HessBoard 
            board={gameState.board}
            selectedSquare={ui.selectedSquare}
            legalMoveSquares={ui.legalMoveSquares}
            validSwapTargets={ui.validSwapTargets}
            validSacrificeTargets={ui.validSacrificeTargets}
            attackedKingSquare={ui.attackedKingSquare}
            lastMove={gameState.lastMove}
            onSquareClick={gameState.phase === 'JESTER_SACRIFICE' ? actions.sacrificePiece : actions.selectSquare}
            phase={gameState.phase}
            currentTurn={gameState.currentTurn}
            setupSelectedSquare={setupSelectedSquare}
            onSetupSquareClick={handleSetupSquareClick}
          />

          {gameState.phase === 'JESTER_SACRIFICE' && gameState.jesterSacrificeCtx && (
            <JesterSacrificeOverlay 
              sacrificingColor={gameState.jesterSacrificeCtx.sacrificingColor}
              attackerPiece={gameState.jesterSacrificeCtx.attackerPiece}
            />
          )}

          <WinScreen 
            winner={gameState.winner}
            winReason={gameState.winReason}
            onPlayAgain={actions.resetGame}
          />
        </div>

        {/* Sidebar Info Panel */}
        <div className="w-full lg:w-80 shrink-0 h-[600px] lg:h-auto lg:max-h-[80vh]">
          <GameInfo 
            currentTurn={gameState.currentTurn}
            phase={gameState.phase}
            whiteSwapsLeft={gameState.whiteSwapsLeft}
            blackSwapsLeft={gameState.blackSwapsLeft}
            capturedByWhite={gameState.capturedByWhite}
            capturedByBlack={gameState.capturedByBlack}
            isKingSwapMode={ui.isKingSwapMode}
            onInitiateKingSwap={actions.initiateKingSwap}
            onCancelKingSwap={actions.cancelKingSwap}
            onReadySetup={handleReadySetup}
          />
        </div>

      </div>
    </div>
  );
}
