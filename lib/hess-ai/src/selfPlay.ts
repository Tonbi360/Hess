import {
  createInitialState,
  confirmSetup,
  getValidSacrificeTargets,
  applyJesterSacrifice,
  findKing,
  isSquareAttackedBy,
} from '@workspace/hess-engine';
import type { GameState } from '@workspace/hess-engine';
import { encodeState, outcomeForColor } from './encoder.js';
import { Evaluator } from './evaluator.js';
import { ReplayBuffer, type ReplayEntry } from './replayBuffer.js';
import { getBestMove, applyAnyMove } from './search.js';
import { trainOnBuffer } from './training.js';

export interface SelfPlayOptions {
  numGames: number;
  depth?: number;
  epsilon?: number;
  batchSize?: number;
  learningRate?: number;
  onProgress?: (completed: number, total: number) => void;
}

function skipSetup(state: GameState): GameState {
  let s = confirmSetup(state);
  s = confirmSetup(s);
  return s;
}

function runOneGame(
  evaluator: Evaluator,
  depth: number,
  epsilon: number,
): ReplayEntry[] {
  let state = skipSetup(createInitialState());
  const positions: Array<{ features: Float64Array }> = [];
  let safety = 0;

  while (state.phase !== 'GAME_OVER' && safety < 300) {
    safety++;
    if (state.phase === 'JESTER_SACRIFICE') {
      const targets = getValidSacrificeTargets(state);
      if (targets.length > 0) {
        state = applyJesterSacrifice(state, targets[0]);
        continue;
      }
    }

    positions.push({ features: encodeState(state) });
    const move = getBestMove(state, depth, epsilon, evaluator);
    if (!move) {
      const kingSq = findKing(state.board, state.currentTurn);
      const enemy = state.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE';
      const isCheck = kingSq !== -1 && isSquareAttackedBy(state, kingSq, enemy);
      state = {
        ...state,
        phase: 'GAME_OVER',
        winner: isCheck ? enemy : null,
        winReason: isCheck ? 'CHECKMATE' : 'STALEMATE',
      };
      break;
    }
    state = applyAnyMove(state, move);
  }

  const winner = state.winner;
  return positions.map(({ features }) => ({
    features: Array.from(features),
    outcome: outcomeForColor(winner, 'WHITE'),
  }));
}

export async function runSelfPlay(
  evaluator: Evaluator,
  buffer: ReplayBuffer,
  options: SelfPlayOptions,
): Promise<void> {
  const {
    numGames,
    depth = 2,
    epsilon = 0.2,
    batchSize = 512,
    learningRate = 0.001,
    onProgress,
  } = options;

  for (let i = 0; i < numGames; i++) {
    const entries = runOneGame(evaluator, depth, epsilon);
    buffer.addBatch(entries);
    onProgress?.(i + 1, numGames);
    await new Promise<void>(resolve => setImmediate(resolve));
  }

  trainOnBuffer(buffer, evaluator, batchSize, learningRate);
  buffer.save();
}
