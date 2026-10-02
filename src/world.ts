export interface World {
  name: string;
  rows: string[][];
}

export interface GeneratedWorld extends World {
  seed: number;
}

export const WORLDS = {
  full: {
    name: 'Full — mixed grid',
    rows: [
      ['7', '+', '3', '×', '8'],
      ['−', '4', '÷', '9', '+'],
      ['2', '×', '.', '6', '+'],
      ['+', '5', '÷', '1', '×'],
      ['8', '−', '3', '+', '7'],
    ],
  },
  a: {
    name: 'A — Number + Number',
    rows: [
      ['3', '8', '2', '5', '9'],
      ['6', '1', '7', '4', '2'],
      ['9', '5', '.', '0', '3'],
      ['1', '4', '8', '2', '6'],
      ['5', '7', '0', '3', '8'],
    ],
  },
  b: {
    name: 'B — Number + Operator',
    rows: [
      ['+', '4', '−', '2', '×'],
      ['9', '×', '6', '+', '8'],
      ['÷', '1', '.', '7', '÷'],
      ['3', '+', '5', '×', '2'],
      ['−', '8', '+', '9', '−'],
    ],
  },
  c: {
    name: 'C — UP vs DOWN',
    rows: [
      ['4', '−', '1', '9', '+'],
      ['2', '+', '7', '÷', '3'],
      ['×', '5', '.', '9', '2'],
      ['8', '÷', '0', '+', '6'],
      ['+', '3', '−', '1', '×'],
    ],
  },
  d: {
    name: 'D — Failure',
    rows: [
      ['9', '−', '0', '×', '3'],
      ['+', '÷', '5', '+', '7'],
      ['×', '2', '.', '−', '0'],
      ['÷', '4', '+', '1', '×'],
      ['8', '−', '6', '÷', '2'],
    ],
  },
} satisfies Record<string, World>;

export type WorldKey = keyof typeof WORLDS;

export const WORLD_ORDER: WorldKey[] = ['full', 'a', 'b', 'c', 'd'];

export const COLLAPSED_TILE = 'floor';

export interface CollapseState {
  has(x: number, y: number): boolean;
  tile(raw: string, x: number, y: number): string;
  add(x: number, y: number): void;
  clear(): void;
}

export function createCollapseState(): CollapseState {
  const spent = new Set<string>();
  return {
    has(x, y) {
      return spent.has(`${x},${y}`);
    },
    tile(raw, x, y) {
      return spent.has(`${x},${y}`) ? COLLAPSED_TILE : raw;
    },
    add(x, y) {
      spent.add(`${x},${y}`);
    },
    clear() {
      spent.clear();
    },
  };
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 7)) ^ (t >>> 14)) >>> 0;
  };
}

const OPS = ['+', '−', '×', '÷'] as const;

export function generateWorld(seed: number): GeneratedWorld {
  const rand = mulberry32(seed);
  const rows: string[][] = [];
  for (let y = 0; y < 5; y++) {
    const row: string[] = [];
    for (let x = 0; x < 5; x++) {
      if (x === 2 && y === 2) {
        row.push('.');
        continue;
      }
      const op = OPS[rand() % OPS.length] ?? '+';
      row.push(rand() % 10 < 6 ? String(rand() % 10) : op);
    }
    rows.push(row);
  }
  return { name: `Generated #${seed}`, rows, seed };
}

export function findStart(world: World): { x: number; y: number } {
  for (let y = 0; y < world.rows.length; y++) {
    const row = world.rows[y];
    if (row === undefined) continue;
    const x = row.indexOf('.');
    if (x !== -1) return { x, y };
  }
  const m = (world.rows.length - 1) / 2;
  return { x: m, y: m };
}
