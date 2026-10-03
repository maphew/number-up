'use strict';
// TDD test for num-wkq.1: collapse-to-floor state lives in world.ts (pure, no DOM).
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createCollapseState, COLLAPSED_TILE, generateWorld, WORLDS, findStart } from '../src/world.ts';
import { classify, RULES, FAILURE_RULES } from '../src/engine.ts';
import { VARIANTS, VARIANT_ORDER } from '../src/variants.ts';

describe('collapse-to-floor state (review R2 opt-in experiment)', () => {
  it('fresh state collapses nothing; tiles pass through', () => {
    const spent = createCollapseState();
    assert.equal(spent.has(3, 2), false);
    assert.equal(spent.tile('6', 3, 2), '6');
  });

  it('marked cells read as the floor sentinel, which classifies as floor', () => {
    const spent = createCollapseState();
    spent.add(3, 2);
    assert.equal(spent.has(3, 2), true);
    assert.equal(spent.has(3, 3), false);
    assert.equal(spent.tile('6', 3, 2), COLLAPSED_TILE);
    assert.equal(spent.tile('6', 3, 3), '6');
    assert.equal(classify(spent.tile('6', 3, 2)), 'floor');
  });

  it('clear() restores the board (restart)', () => {
    const spent = createCollapseState();
    spent.add(3, 2);
    spent.clear();
    assert.equal(spent.has(3, 2), false);
    assert.equal(spent.tile('6', 3, 2), '6');
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
