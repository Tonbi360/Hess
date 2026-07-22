import { Evaluator } from './evaluator.js';
import type { ReplayBuffer } from './replayBuffer.js';

export function trainOnBuffer(
  buffer: ReplayBuffer,
  evaluator: Evaluator,
  batchSize = 256,
  learningRate = 0.001,
): void {
  const batch = buffer.sample(batchSize);
  for (const entry of batch) {
    const features = new Float64Array(entry.features);
    evaluator.update(features, entry.outcome, learningRate);
  }
}

export function trainOnGame(
  entries: Array<{ features: Float64Array; outcome: number }>,
  evaluator: Evaluator,
  learningRate = 0.001,
): void {
  for (const { features, outcome } of entries) {
    evaluator.update(features, outcome, learningRate);
  }
}
