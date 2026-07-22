import { FEATURE_SIZE } from './encoder.js';

const DEFAULT_WEIGHTS: number[] = [
  // WHITE piece counts [0-6]: K, Q, R, B, N, P, J
  100,   9,  5,  3,  3,  1,  4,
  // BLACK piece counts [7-13]: K, Q, R, B, N, P, J (negative = good for black = bad for white)
 -100,  -9, -5, -3, -3, -1, -4,
  // whiteSwapsLeft/3, blackSwapsLeft/3
   0.5, -0.5,
  // white advanced pawns, black advanced pawns
   0.3, -0.3,
  // white king row danger, black king row danger
  -0.5,  0.5,
  // currentTurn bias, constant
   0.1,    0,
  // whiteThreatenedVal / 50, blackThreatenedVal / 50
  -2.5,  2.5,
  // whiteHangingVal / 50, blackHangingVal / 50
  -4.0,  4.0,
  // whiteKingInCheck, blackKingInCheck
  -2.0,  2.0,
  // whiteMobility, blackMobility
   0.4, -0.4,
  // whiteCenterControl, blackCenterControl
   0.3, -0.3,
  // whiteQueenRaidMoves, blackQueenRaidMoves
   0.2, -0.2,
];

export class Evaluator {
  weights: Float64Array;

  constructor(weights?: number[] | Float64Array) {
    this.weights = new Float64Array(FEATURE_SIZE);
    const src = weights ?? DEFAULT_WEIGHTS;
    for (let i = 0; i < FEATURE_SIZE; i++) {
      this.weights[i] = src[i] ?? DEFAULT_WEIGHTS[i] ?? 0;
    }
  }

  evaluate(features: Float64Array): number {
    let score = 0;
    for (let i = 0; i < FEATURE_SIZE; i++) score += this.weights[i] * features[i];
    return score;
  }

  /**
   * Single TD(0) weight update.
   * target: the better estimate of the value (e.g. actual outcome or discounted next-state value)
   * alpha: learning rate (keep small, e.g. 0.001)
   */
  update(features: Float64Array, target: number, alpha = 0.001): void {
    const pred = this.evaluate(features);
    const error = target - pred;
    for (let i = 0; i < FEATURE_SIZE; i++) {
      this.weights[i] += alpha * error * features[i];
    }
  }

  toArray(): number[] {
    return Array.from(this.weights);
  }
}
