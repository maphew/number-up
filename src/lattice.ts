export interface Pos {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface Lattice<D extends string = string> {
  readonly id: 'square' | 'hex';
  readonly directions: readonly D[];
  readonly stepLength: number;
  centre(x: number, y: number): { cx: number; cy: number };
  step(x: number, y: number, dir: string): Pos | null;
  nearest(x: number, y: number, vx: number, vy: number): D;
  bounds(): Bounds;
  cellPath(cx: number, cy: number): string | null;
}

export type SquareDirection = 'up' | 'down' | 'left' | 'right';
export type HexDirection = 'NE' | 'NW' | 'E' | 'W' | 'SE' | 'SW';

const SQUARE_STEPS: Record<SquareDirection, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createSquareLattice(cols: number, rows: number, cell: number): Lattice<SquareDirection> {
  return {
    id: 'square',
    directions: ['up', 'down', 'left', 'right'],
    stepLength: cell,
    centre(x, y) {
      return { cx: x * cell + cell / 2, cy: y * cell + cell / 2 };
    },
    step(x, y, dir) {
      const d = SQUARE_STEPS[dir as SquareDirection];
      if (!d) return null;
      const nx = x + d.x;
      const ny = y + d.y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
      return { x: nx, y: ny };
    },
    nearest(_x, _y, vx, vy) {
      return Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
    },
    bounds() {
      return { minX: 0, minY: 0, width: cols * cell, height: rows * cell };
    },
    cellPath() {
      return null;
    },
  };
}

const SQRT3 = Math.sqrt(3);

// Pointy-top hexes in odd-r offset rows (odd rows sit half a hex further
// right), so a World's rows array reads as hex rows unchanged:
//   centre(x, y) = (sqrt(3)*R*(x + (y&1)/2), 1.5*R*y)
// All six neighbour distances are exactly sqrt(3)*R.
const HEX_STEPS: Record<HexDirection, (y: number) => [number, number]> = {
  E: () => [1, 0],
  W: () => [-1, 0],
  NE: (y) => [y & 1, -1],
  SE: (y) => [y & 1, 1],
  NW: (y) => [(y & 1) - 1, -1],
  SW: (y) => [(y & 1) - 1, 1],
};

const HEX_DIRS: readonly HexDirection[] = ['NE', 'NW', 'E', 'W', 'SE', 'SW'];

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function createHexLattice(cols: number, rows: number, r: number): Lattice<HexDirection> {
  const hw = SQRT3 * r;
  const vh = 1.5 * r;
  const vec: Record<HexDirection, [number, number]> = {
    NE: [hw / 2, -vh],
    NW: [-hw / 2, -vh],
    E: [hw, 0],
    W: [-hw, 0],
    SE: [hw / 2, vh],
    SW: [-hw / 2, vh],
  };
  return {
    id: 'hex',
    directions: HEX_DIRS,
    stepLength: hw,
    centre(x, y) {
      return { cx: hw * (x + (y & 1) / 2), cy: vh * y };
    },
    step(x, y, dir) {
      const f = HEX_STEPS[dir as HexDirection];
      if (!f) return null;
      const [dx, dy] = f(y);
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
      return { x: nx, y: ny };
    },
    nearest(_x, _y, vx, vy) {
      let best: HexDirection = HEX_DIRS[0] ?? 'NE';
      let bestDot = -Infinity;
      for (const dir of HEX_DIRS) {
        const [ux, uy] = vec[dir];
        const dot = vx * ux + vy * uy;
        if (dot > bestDot) {
          bestDot = dot;
          best = dir;
        }
      }
      return best;
    },
    bounds() {
      return {
        minX: -hw / 2,
        minY: -r,
        width: hw * (cols + 0.5),
        height: vh * (rows - 1) + 2 * r,
      };
    },
    cellPath(cx, cy) {
      const pts: string[] = [];
      for (let k = 0; k < 6; k++) {
        const a = ((60 * k - 90) * Math.PI) / 180;
        pts.push(`${round6(cx + r * Math.cos(a))} ${round6(cy + r * Math.sin(a))}`);
      }
      return `M${pts.join(' L')}Z`;
    },
  };
}
