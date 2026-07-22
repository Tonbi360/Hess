import fs from 'node:fs';
import path from 'node:path';
import { Evaluator } from './evaluator.js';

export function saveWeights(evaluator: Evaluator, filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(evaluator.toArray()), 'utf-8');
  } catch {}
}

export function loadWeights(filePath: string): Evaluator {
  try {
    if (fs.existsSync(filePath)) {
      const weights = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as number[];
      return new Evaluator(weights);
    }
  } catch {}
  return new Evaluator();
}
