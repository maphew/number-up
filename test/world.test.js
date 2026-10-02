'use strict';
// TDD test for num-wkq.1: collapse-to-floor state lives in world.ts (pure, no DOM).
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createCollapseState, COLLAPSED_TILE, generateWorld } from '../src/world.ts';
import { classify } from '../src/engine.ts';

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
