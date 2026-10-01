'use strict';
// TDD tests for src/lattice.ts: pure lattice math (no DOM).
// Runner: node:test + node:assert (stdlib only). Node strips the TypeScript
// types natively, so tests import the real module.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createHexLattice, createSquareLattice } from '../src/lattice.ts';

function near2(p, cx, cy, label) {
  assert.ok(
    Math.abs(p.cx - cx) < 1e-9 && Math.abs(p.cy - cy) < 1e-9,
    `${label}: got ${p.cx},${p.cy} want ${cx},${cy}`,
  );
}

const SQ = createSquareLattice(5, 5, 100);
const HEX = createHexLattice(5, 5, 10); // small circumradius for round numbers

describe('square lattice', () => {
  it('centres cells at half-cell offsets (current 5x5 geometry)', () => {
    assert.deepEqual(SQ.centre(0, 0), { cx: 50, cy: 50 });
    assert.deepEqual(SQ.centre(2, 2), { cx: 250, cy: 250 });
    assert.deepEqual(SQ.centre(4, 3), { cx: 450, cy: 350 });
  });

  it('steps unit distances in the four cardinal directions', () => {
    assert.deepEqual(SQ.step(2, 2, 'up'), { x: 2, y: 1 });
    assert.deepEqual(SQ.step(2, 2, 'down'), { x: 2, y: 3 });
    assert.deepEqual(SQ.step(2, 2, 'left'), { x: 1, y: 2 });
    assert.deepEqual(SQ.step(2, 2, 'right'), { x: 3, y: 2 });
  });

  it('blocks steps off the board (null = edge)', () => {
    assert.equal(SQ.step(0, 0, 'up'), null);
    assert.equal(SQ.step(0, 0, 'left'), null);
    assert.equal(SQ.step(4, 4, 'down'), null);
    assert.equal(SQ.step(4, 4, 'right'), null);
    assert.equal(SQ.step(2, 2, 'nonsense'), null);
  });

  it('resolves swipes by dominant axis (current behaviour, ties go to the vertical)', () => {
    assert.equal(SQ.nearest(2, 2, 40, 0), 'right');
    assert.equal(SQ.nearest(2, 2, -40, 0), 'left');
    assert.equal(SQ.nearest(2, 2, 0, 40), 'down');
    assert.equal(SQ.nearest(2, 2, 0, -40), 'up');
    assert.equal(SQ.nearest(2, 2, 40, 30), 'right');
    assert.equal(SQ.nearest(2, 2, 30, 40), 'down');
    assert.equal(SQ.nearest(2, 2, 30, 30), 'down');
  });

  it('bounds are the full cell rectangle', () => {
    assert.deepEqual(SQ.bounds(), { minX: 0, minY: 0, width: 500, height: 500 });
  });

  it('has no per-cell shape (square keeps its grid-line rendering)', () => {
    assert.equal(SQ.cellPath(50, 50), null);
  });
});

describe('hex lattice geometry (pointy-top, odd-r offset rows)', () => {
  it('places odd rows half a hex right, rows 1.5R apart', () => {
    near2(HEX.centre(0, 0), 0, 0, 'origin');
    near2(HEX.centre(1, 0), Math.sqrt(3) * 10, 0, 'even row');
    near2(HEX.centre(0, 1), Math.sqrt(3) * 5, 15, 'odd row start');
    near2(HEX.centre(2, 1), Math.sqrt(3) * 25, 15, 'odd row');
    near2(HEX.centre(1, 3), Math.sqrt(3) * 15, 45, 'row 3');
  });

  it('steps E/W along the row from any cell', () => {
    assert.deepEqual(HEX.step(2, 2, 'E'), { x: 3, y: 2 });
    assert.deepEqual(HEX.step(2, 2, 'W'), { x: 1, y: 2 });
    assert.deepEqual(HEX.step(2, 1, 'E'), { x: 3, y: 1 });
    assert.deepEqual(HEX.step(2, 1, 'W'), { x: 1, y: 1 });
  });

  it('diagonals depend on row parity (odd-r: even rows lean left, odd rows lean right)', () => {
    assert.deepEqual(HEX.step(2, 2, 'NE'), { x: 2, y: 1 });
    assert.deepEqual(HEX.step(2, 2, 'NW'), { x: 1, y: 1 });
    assert.deepEqual(HEX.step(2, 2, 'SE'), { x: 2, y: 3 });
    assert.deepEqual(HEX.step(2, 2, 'SW'), { x: 1, y: 3 });
    assert.deepEqual(HEX.step(2, 1, 'NE'), { x: 3, y: 0 });
    assert.deepEqual(HEX.step(2, 1, 'NW'), { x: 2, y: 0 });
    assert.deepEqual(HEX.step(2, 1, 'SE'), { x: 3, y: 2 });
    assert.deepEqual(HEX.step(2, 1, 'SW'), { x: 2, y: 2 });
  });

  it('blocks steps off the board and unknown directions', () => {
    assert.equal(HEX.step(0, 0, 'W'), null);
    assert.equal(HEX.step(0, 0, 'NW'), null);
    assert.equal(HEX.step(0, 0, 'SW'), null);
    assert.equal(HEX.step(4, 0, 'E'), null);
    assert.equal(HEX.step(4, 4, 'E'), null);
    assert.equal(HEX.step(2, 4, 'SE'), null);
    assert.equal(HEX.step(2, 0, 'NE'), null);
    assert.equal(HEX.step(4, 1, 'NE'), null);
    assert.equal(HEX.step(2, 2, 'nonsense'), null);
  });

  it('every legal step lands exactly one stepLength away (catches parity bugs)', () => {
    assert.ok(Math.abs(HEX.stepLength - Math.sqrt(3) * 10) < 1e-9);
    const dirs = HEX.directions;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        for (const dir of dirs) {
          const next = HEX.step(x, y, dir);
          if (next === null) continue;
          const a = HEX.centre(x, y);
          const b = HEX.centre(next.x, next.y);
          const dist = Math.hypot(b.cx - a.cx, b.cy - a.cy);
          assert.ok(
            Math.abs(dist - HEX.stepLength) < 1e-9,
            `${dir} step from ${x},${y} to ${next.x},${next.y} is ${dist}, want ${HEX.stepLength}`,
          );
        }
      }
    }
  });

  it('centre cell has 6 neighbours, corners have 2, odd-row west edge has 5', () => {
    const count = (x, y) => HEX.directions.filter((d) => HEX.step(x, y, d) !== null).length;
    assert.equal(count(2, 2), 6);
    assert.equal(count(0, 0), 2);
    assert.equal(count(4, 4), 3);
    assert.equal(count(0, 1), 5);
    assert.equal(count(4, 1), 3);
  });

  it('directions are the six honest compass labels', () => {
    assert.deepEqual([...HEX.directions], ['NE', 'NW', 'E', 'W', 'SE', 'SW']);
  });

  it('resolves swipes to the nearest of six neighbour directions by angle', () => {
    assert.equal(HEX.nearest(2, 2, 10, 0), 'E');
    assert.equal(HEX.nearest(2, 2, -10, 0), 'W');
    assert.equal(HEX.nearest(2, 2, 6, -10), 'NE');
    assert.equal(HEX.nearest(2, 2, -6, -10), 'NW');
    assert.equal(HEX.nearest(2, 2, 6, 10), 'SE');
    assert.equal(HEX.nearest(2, 2, -6, 10), 'SW');
  });

  it('straight up/down swipes are a documented tie, resolved NE/SE', () => {
    assert.equal(HEX.nearest(2, 2, 0, -10), 'NE');
    assert.equal(HEX.nearest(2, 2, 0, 10), 'SE');
  });

  it('bounds include the half-hex overhang of odd rows', () => {
    const b = HEX.bounds();
    const HW = Math.sqrt(3) * 10;
    assert.equal(b.minX, -HW / 2);
    assert.equal(b.minY, -10);
    assert.equal(b.width, HW * 5.5);
    assert.equal(b.height, 8 * 10);
  });

  it('cell path is a closed pointy-top hexagon around the centre', () => {
    const path = HEX.cellPath(0, 0);
    assert.match(path, /^M/);
    assert.match(path, /Z$/);
    const points = path.slice(1, -1).trim().split(/\s+L\s*/).map((pair) => pair.split(' ').map(Number));
    assert.equal(points.length, 6);
    for (const [px, py] of points) {
      assert.ok(Math.abs(Math.hypot(px, py) - 10) < 1e-6, `vertex ${px},${py} is not on the circumcircle`);
    }
    assert.deepEqual(points[0], [0, -10]);
  });
});
