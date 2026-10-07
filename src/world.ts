export interface World {
  name: string;
  rows: string[][];
  // When this world's data was last recast (gallery cards show it per world).
  // Generated worlds are ephemeral and leave this unset.
  updated?: string;
}

export interface GeneratedWorld extends World {
  seed: number;
}

const WORLD_RECAST = '2026-10-02 19:50 PDT'; // num-ik9 rebuilt every hand-authored world

export const WORLDS = {
  full: {
    name: 'Full — mixed grid',
    updated: WORLD_RECAST,
    rows: [
      ['7', '+', '3', '×', '8'],
      ['−', '4', '5', '9', '+'],
      ['2', '3', '.', '6', '+'],
      ['+', '5', '4', '1', '×'],
      ['8', '−', '3', '+', '7'],
    ],
  },
  a: {
    name: 'A — Number + Number',
    updated: WORLD_RECAST,
    rows: [
      ['3', '8', '2', '5', '9'],
      ['6', '1', '7', '4', '2'],
      ['0', '5', '.', '4', '3'],
      ['1', '4', '8', '2', '6'],
      ['5', '7', '0', '3', '8'],
    ],
  },
  b: {
    name: 'B — Number + Operator',
    updated: WORLD_RECAST,
    rows: [
      ['×', '+', '+', '+', '×'],
      ['+', '+', '9', '+', '+'],
      ['+', '6', '.', '7', '+'],
      ['+', '+', '3', '+', '+'],
      ['×', '+', '+', '+', '×'],
    ],
  },
  c: {
    name: 'C — UP vs DOWN',
    updated: WORLD_RECAST,
    rows: [
      ['1', '2', '3', '4', '5'],
      ['10', '9', '8', '7', '6'],
      ['11', '12', '.', '14', '15'],
      ['20', '19', '18', '17', '16'],
      ['21', '22', '23', '24', '25'],
    ],
  },
  d: {
    name: 'D — Failure',
    updated: WORLD_RECAST,
    rows: [
      ['9', '−', '1', '×', '4'],
      ['+', '7', '×', '3', '8'],
      ['×', '2', '.', '6', '−'],
      ['5', '÷', '0', '+', '9'],
      ['3', '×', '8', '−', '2'],
    ],
  },
  // num-dn2: the rule-composition lab — the tiles offer every tile kind
  // (flat pairs, every sign, a 0 sitting on a ÷ trap), but which rules apply
  // is decided by the ticked checkbox list under the board (play.ts wires
  // the panel; the engine composes them first-applicable-wins).
  choosey: {
    name: 'Choosey — you pick the rules',
    updated: '2026-10-05 23:00 PDT',
    rows: [
      ['+', '+', '+', '+', '+'],
      ['+', '6', '9', '9', '×'],
      ['+', '5', '.', '7', '+'],
      ['6', '×', '6', '0', '÷'],
      ['+', '+', '−', '+', '8'],
    ],
  },
} satisfies Record<string, World>;

export type WorldKey = keyof typeof WORLDS;

export const WORLD_ORDER: WorldKey[] = ['full', 'a', 'b', 'c', 'd', 'choosey'];

export const COLLAPSED_TILE = 'floor';

// Relay rule (num-ak7): a number eaten by an armed operator becomes a hole —
// impassable for the rest of the run.
export const HOLE = '∅';

export interface BoardOverlay {
  // The shown glyph at a cell ('' is plain ground). Resolves the world row
  // first, then everything the run has written. Throws past the edge, like
  // reading the map did before this overlay existed.
  tileAt(x: number, y: number): string;
  // Write the cell: a glyph, '' for plain ground, HOLE for a pit,
  // COLLAPSED_TILE for tiles-vanish. Edits land in move order — the last
  // write at a cell wins, which is why arrival-floor writes must come before
  // the rule's effect writes within a move.
  set(x: number, y: number, glyph: string): void;
}

// One machine, not two: the map for this run is the world rows plus one
// overlay of written glyphs. Restart rebuilds the overlay next to the board,
// so there is no clear() to forget.
export function createBoardOverlay(rows: string[][]): BoardOverlay {
  const shown = new Map<string, string>();
  return {
    tileAt(x, y) {
      const tile = rows[y]?.[x];
      if (tile === undefined) throw new Error(`no tile at ${x},${y}`);
      const m = shown.get(`${x},${y}`);
      return m === undefined ? tile : m;
    },
    set(x, y, glyph) {
      shown.set(`${x},${y}`, glyph);
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
