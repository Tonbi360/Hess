import fs from 'node:fs';
import path from 'node:path';

export interface ReplayEntry {
  features: number[];
  outcome: number;
}

const MAX_ENTRIES = 50_000;

export class ReplayBuffer {
  private entries: ReplayEntry[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  add(entry: ReplayEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    }
  }

  addBatch(batch: ReplayEntry[]): void {
    for (const e of batch) this.add(e);
  }

  sample(n: number): ReplayEntry[] {
    if (this.entries.length === 0) return [];
    const size = Math.min(n, this.entries.length);
    const result: ReplayEntry[] = [];
    for (let i = 0; i < size; i++) {
      result.push(this.entries[Math.floor(Math.random() * this.entries.length)]);
    }
    return result;
  }

  size(): number { return this.entries.length; }

  save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries), 'utf-8');
    } catch {}
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.entries = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as ReplayEntry[];
      }
    } catch { this.entries = []; }
  }
}
