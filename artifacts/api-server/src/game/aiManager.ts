import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Evaluator,
  ReplayBuffer,
  getBestMove,
  applyAnyMove,
  encodeState,
  outcomeForColor,
  saveWeights,
  loadWeights,
  runSelfPlay,
  trainOnBuffer,
  trainOnGame,
} from '@workspace/hess-ai';
import type { SelfPlayOptions } from '@workspace/hess-ai';
import type { GameState, Color } from '@workspace/hess-engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');
const WEIGHTS_PATH = path.join(DATA_DIR, 'weights.json');
const BUFFER_PATH = path.join(DATA_DIR, 'replayBuffer.json');

export type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_SETTINGS: Record<Difficulty, { depth: number; epsilon: number }> = {
  easy:   { depth: 1, epsilon: 0.20 },
  normal: { depth: 2, epsilon: 0.05 },
  hard:   { depth: 3, epsilon: 0.02 },
};

class AiManager {
  evaluator: Evaluator;
  buffer: ReplayBuffer;

  constructor() {
    this.evaluator = loadWeights(WEIGHTS_PATH);
    this.buffer = new ReplayBuffer(BUFFER_PATH);
  }

  computeMove(state: GameState, difficulty: Difficulty) {
    const { depth, epsilon } = DIFFICULTY_SETTINGS[difficulty];
    return getBestMove(state, depth, epsilon, this.evaluator);
  }

  /** Record a sequence of (state, color) pairs from a completed game for post-game training. */
  recordAndTrain(
    positions: Array<{ state: GameState }>,
    winner: Color | null,
    learningRate = 0.001,
  ): void {
    const entries = positions.map(({ state }) => ({
      features: new Float64Array(encodeState(state)),
      outcome: outcomeForColor(winner, 'WHITE'),
    }));
    this.buffer.addBatch(entries.map(e => ({ features: Array.from(e.features), outcome: e.outcome })));
    trainOnGame(entries, this.evaluator, learningRate);
    this.buffer.save();
    saveWeights(this.evaluator, WEIGHTS_PATH);
  }

  async runSelfPlay(
    opts: SelfPlayOptions,
  ): Promise<void> {
    await runSelfPlay(this.evaluator, this.buffer, opts);
    saveWeights(this.evaluator, WEIGHTS_PATH);
  }

  trainOnBuffer(batchSize = 512, learningRate = 0.001): void {
    trainOnBuffer(this.buffer, this.evaluator, batchSize, learningRate);
    saveWeights(this.evaluator, WEIGHTS_PATH);
  }

  resetWeights(): void {
    this.evaluator = new Evaluator();
    saveWeights(this.evaluator, WEIGHTS_PATH);
  }

  bufferSize(): number {
    return this.buffer.size();
  }
}

export const aiManager = new AiManager();
