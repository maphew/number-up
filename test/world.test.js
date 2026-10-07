'use strict';
// Board overlay suite (num-yyg: matter + collapse state machines merged into
// one full-truth BoardOverlay in world.ts, pure, no DOM). One truth per cell:
// the world rows plus everything written onto them during a run, written in
// move order — the last write at a cell wins.
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createBoardOverlay, COLLAPSED_TILE, generateWorld, WORLDS, findStart, HOLE } from '../src/world.ts';
import { classify, createEngine, RULES, FAILURE_RULES } from '../src/engine.ts';
import { VARIANTS, VARIANT_ORDER } from '../src/variants.ts';

describe('board overlay: one truth per cell (grid rows + run writes)', () => {
  const rows = [
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '6'],
  ];

  it('a fresh overlay shows the world rows and throws past the edge', () => {
    const board = createBoardOverlay(rows);
    assert.equal(board.tileAt(3, 2), '6');
    assert.equal(board.tileAt(0, 0), '.');
    assert.throws(() => board.tileAt(4, 2), /no tile at 4,2/);
  });

  it('collapse is an overlay write: floored cells read as the floor sentinel', () => {
    const board = createBoardOverlay(rows);
    board.set(3, 2, COLLAPSED_TILE);
    assert.equal(board.tileAt(3, 2), COLLAPSED_TILE);
    assert.equal(board.tileAt(0, 0), '.');
    assert.equal(classify(board.tileAt(3, 2)), 'floor');
  });

  it('a written pit reads as a pit and eats nothing; written ground reads as ground', () => {
    const board = createBoardOverlay(rows);
    board.set(3, 2, HOLE);
    assert.equal(board.tileAt(3, 2), HOLE);
    assert.equal(classify(board.tileAt(3, 2)), 'floor');
    board.set(3, 2, '');
    assert.equal(board.tileAt(3, 2), '');
  });

  it('writes land in move order: the last write at a cell wins', () => {
    const board = createBoardOverlay(rows);
    board.set(3, 2, COLLAPSED_TILE); // the arrival-floor write
    board.set(3, 2, '5');            // a later effect write beats it
    assert.equal(board.tileAt(3, 2), '5');
    board.set(3, 2, '');             // cleared ground...
    board.set(3, 2, COLLAPSED_TILE); // ...can still be floored by a later arrival
    assert.equal(board.tileAt(3, 2), COLLAPSED_TILE);
  });

  it('generateWorld is deterministic per seed (measurement is reproducible)', () => {
    assert.deepEqual(generateWorld(7).rows, generateWorld(7).rows);
  });
});

// Playability guardrail: the hand-authored worlds were random noise, so every
// variant died 2-3 moves in (longest valid route: 1-5). These worlds are laid
// out around each variant's grammar; this test keeps them that way.
// A world is "playable" here if its opening has no fatal first move and the
// longest non-revisiting route is long enough to feel like a run.
const MIN_ROUTE = {
  verbs: 8,
  accretion: 8,
  becoming: 8,
  fallout: 7, // collapse makes re-entry fatal, so no-revisit is the true route
  plateau: 8,
  cadence: 8,
  relay: 7, // static no-revisit DFS undercounts relay: swaps repopulate cells,
            // so true routes revisit cells for new values; 7 is the floor
};

const DIRS = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];

function neighbours(world, x, y) {
  const out = [];
  for (const [name, dx, dy] of DIRS) {
    const row = world.rows[y + dy];
    const tile = row?.[x + dx];
    if (tile === undefined) continue;
    out.push({ name, x: x + dx, y: y + dy, tile });
  }
  return out;
}

function superpose(rule, number, pending, tile) {
  const ctx = { pending };
  const result = RULES[rule].superpose(number, tile, ctx);
  if (typeof result !== 'number' || !Number.isFinite(result)) return null;
  return { result, pending: ctx.pending };
}

function fails(fail, number, pending, step, move) {
  return FAILURE_RULES[fail].failed({
    turn: move + 1,
    direction: 'x',
    oldNumber: number,
    destinationTile: 'x',
    rule: 'x',
    pendingAtEntry: pending,
    valid: true,
    result: step.result,
    delta: step.result - number,
    wentUp: step.result > number,
  });
}

function survivableFirstMoves(world, rule, fail) {
  const start = findStart(world);
  return neighbours(world, start.x, start.y).filter((o) => {
    const step = superpose(rule, 0, null, o.tile);
    return step !== null && fails(fail, 0, null, step, 0) === null;
  }).length;
}

// Longest non-revisiting route. Stops as soon as it reaches `cap`, because the
// test only needs to know the route is at least that long; that bounds the
// self-avoiding-walk search no matter how permissive a future world is.
function longestRoute(world, rule, fail, cap = Infinity) {
  const start = findStart(world);
  const visited = new Set([`${start.x},${start.y}`]);
  let best = 0;
  let done = false;
  function dfs(x, y, number, pending, depth) {
    if (done) return;
    if (depth > best) best = depth;
    if (best >= cap) {
      done = true;
      return;
    }
    for (const o of neighbours(world, x, y)) {
      if (done) return;
      const key = `${o.x},${o.y}`;
      if (visited.has(key)) continue;
      const step = superpose(rule, number, pending, o.tile);
      if (step === null || fails(fail, number, pending, step, depth) !== null) continue;
      visited.add(key);
      dfs(o.x, o.y, step.result, step.pending, depth + 1);
      visited.delete(key);
    }
  }
  dfs(start.x, start.y, 0, null, 0);
  return best;
}
describe('relay board edits through the overlay (num-ak7: swap · arm · consume)', () => {

  it('named cells override the underlying world row; empty string is ground', () => {
    const board = createBoardOverlay([
      ['6'],
    ]);
    assert.equal(board.tileAt(0, 0), '6');
    board.set(0, 0, '0');
    assert.equal(board.tileAt(0, 0), '0');
    board.set(0, 0, '');
    assert.equal(board.tileAt(0, 0), '');
  });

  // The board semantics play.ts applies from the engine's effect channel,
  // mirrored here so the pure modules keep the contract without a DOM.
  it('a consumed number leaves an impassable hole; a swap repopulates the origin cell', () => {
    const engine = createEngine('relay', 'none');
    const board = createBoardOverlay([
      ['+', '+', '9'],
      ['+', '+', '+'],
      ['+', '+', '.'],
    ]);

    // start 0 → swap with 7: you become 7, origin cell holds 0
    const swap = engine.attempt(0, 'up', '7');
    assert.deepEqual(swap.effect, { kind: 'swap' });
    board.set(2, 2, swap.destinationTile);
    board.set(2, 1, '');
    assert.equal(board.tileAt(2, 2), '7');

    // armed: pick up '+' from the world row
    const pickup = engine.attempt(7, 'up', '+');
    assert.deepEqual(pickup.effect, { kind: 'pickup' });
    board.set(2, 0, '');
    assert.equal(engine.carried, '+');

    // eat the 9: consumed, hole, unarmed again
    const eat = engine.attempt(7, 'up', '9');
    assert.equal(eat.result, 16);
    assert.deepEqual(eat.effect, { kind: 'consume' });
    board.set(2, 0, HOLE);
    assert.equal(engine.carried, null);
    assert.equal(board.tileAt(2, 0), HOLE);
  });
});

describe('variant openings are playable on their hand-authored world', () => {
  for (const id of VARIANT_ORDER) {
    const v = VARIANTS[id];
    it(`${id} (${v.rule} × ${v.fail}) opens on ${v.world}`, () => {
      const world = WORLDS[v.world];
      const start = findStart(world);
      const total = neighbours(world, start.x, start.y).length;
      const survivable = survivableFirstMoves(world, v.rule, v.fail);
      assert.equal(
        survivable,
        total,
        `${id}: ${total - survivable}/${total} first moves are fatal at ${start.x},${start.y}`,
      );
      const cap = MIN_ROUTE[id] ?? 8;
      const route = longestRoute(world, v.rule, v.fail, cap);
      assert.ok(route >= cap, `${id}: longest route ${route} moves, expected >= ${cap}`);
    });
  }
});
