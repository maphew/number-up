'use strict';
// TDD test for num-dn2: Choosey — a world where the rules come from a ticked
// checkbox list. The engine composes MANY ticked rules: collision rules are
// probed top-to-bottom and the first one that can handle the tile does it;
// run-enders behave as OR (any ticked failure rule can end the run).
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createChooseyEngine } from '../src/engine.ts';
import { WORLDS, WORLD_ORDER, findStart } from '../src/world.ts';

describe('choosey engine wiring', () => {
  it('names itself choosey and echoes the ticked checks', () => {
    const engine = createChooseyEngine({ rules: ['eval'], fails: ['notUp'] });
    assert.equal(engine.ruleName, 'choosey');
    assert.equal(engine.failureName, 'choosey');
    assert.deepEqual([...engine.ruleChecks], ['eval']);
    assert.deepEqual([...engine.failureChecks], ['notUp']);
  });

  it('drops unknown rule names instead of falling back silently', () => {
    const engine = createChooseyEngine({ rules: ['bogus', 'eval'], fails: ['bogus', 'down'] });
    assert.deepEqual([...engine.ruleChecks], ['eval']);
    assert.deepEqual([...engine.failureChecks], ['down']);
  });

  it('keeps the ticked order verbatim (the panel order a player sees is the tie-breaker)', () => {
    const engine = createChooseyEngine({ rules: ['relay', 'replace'], fails: ['down'] });
    assert.deepEqual([...engine.ruleChecks], ['relay', 'replace']);
    assert.deepEqual([...engine.failureChecks], ['down']);
  });
});

describe('choosey: with no touch rules ticked, walking changes nothing', () => {
  it('numbers, signs and floor all read as plain flat moves', () => {
    const engine = createChooseyEngine({ rules: [], fails: [] });
    for (const tile of ['6', '+', 'floor']) {
      const ev = engine.attempt(5, 'up', tile);
      assert.equal(ev.valid, true, tile);
      assert.equal(ev.result, 5, tile);
    }
    assert.equal(engine.pending, null);
    assert.equal(engine.carried, null);
  });
});

describe('choosey: the first ticked rule that can handle the tile does it', () => {
  it('replace above add: numbers replace (top of the list wins)', () => {
    const engine = createChooseyEngine({ rules: ['replace', 'add'], fails: [] });
    const ev = engine.attempt(5, 'up', '3');
    assert.equal(ev.result, 3, 'must replace, not add');
  });

  it('add above replace: numbers add', () => {
    const engine = createChooseyEngine({ rules: ['add', 'replace'], fails: [] });
    const ev = engine.attempt(5, 'up', '3');
    assert.equal(ev.result, 8, 'must add, not replace');
  });

  it('a rule that cannot handle the tile falls through to the next ticked one', () => {
    const engine = createChooseyEngine({ rules: ['add', 'relay'], fails: [] });
    const ev = engine.attempt(4, 'up', '+'); // add never handles signs; relay picks up
    assert.equal(ev.result, 4);
    assert.deepEqual(ev.effect, { kind: 'pickup' });
    assert.equal(engine.carried, '+');
  });

  it('replace alone cannot handle signs: a sign is a plain move', () => {
    const engine = createChooseyEngine({ rules: ['replace'], fails: [] });
    const ev = engine.attempt(4, 'up', '+');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 4);
    assert.deepEqual(ev.effect, { kind: 'none' });
  });

  it('eval handles both halves of the verb grammar: hold a number, spend it on a sign', () => {
    const engine = createChooseyEngine({ rules: ['eval'], fails: [] });
    assert.equal(engine.attempt(0, 'up', '6').result, 6);
    assert.equal(engine.attempt(6, 'up', '+').result, 12);
    assert.equal(engine.carried, null);
  });

  it('relay above eval: relay arms on the sign before eval can claim it', () => {
    const engine = createChooseyEngine({ rules: ['relay', 'eval'], fails: [] });
    const ev = engine.attempt(4, 'up', '+');
    assert.deepEqual(ev.effect, { kind: 'pickup' });
    assert.equal(engine.carried, '+');
  });

  it('relay below eval: eval claims the sign (with a held number) and relay still owns the numbers', () => {
    const engine = createChooseyEngine({ rules: ['eval', 'relay'], fails: [] });
    engine.attempt(0, 'up', '5'); // holding 5
    const op = engine.attempt(5, 'up', '×');
    assert.equal(op.result, 25, 'eval applies the sign without the relay');
    assert.deepEqual(op.effect, { kind: 'none' });
    const num = engine.attempt(25, 'up', '2');
    assert.deepEqual(num.effect, { kind: 'none' }, 'eval claims numbers too, even when relay is ticked below');
  });

  it('an adopted invalid stays invalid (repeat toggling add → replace mid-run, state resets clean)', () => {
    const engine = createChooseyEngine({ rules: ['eval', 'relay'], fails: [] });
    const ev = engine.attempt(5, 'up', '×');
    assert.equal(ev.valid, false);
    assert.equal(ev.failed, false); // no run-ender ticked
    assert.equal(engine.pending, null);
  });

  it('floor and the start marker are plain moves under every tick combination', () => {
    for (const rules of [[], ['replace'], ['add'], ['eval'], ['relay'], ['replace', 'add', 'eval', 'relay']]) {
      const fresh = createChooseyEngine({ rules, fails: [] });
      const ev = fresh.attempt(3, 'up', '.');
      assert.equal(ev.result, 3);
      assert.equal(ev.valid, true);
    }
  });
});

describe('choosey: run-enders behave as OR over the ticked list', () => {
  it('nothing ticked: nothing can end the run', () => {
    const engine = createChooseyEngine({ rules: [], fails: [] });
    assert.equal(engine.attempt(5, 'up', 'wall').failed, false);
    assert.equal(engine.attempt(5, 'up', '3').failed, false);
    assert.equal(engine.attempt(5, 'up', '×').failed, false);
  });

  it('notUp ticked: flat, down and impossible all end the run', () => {
    const engine = createChooseyEngine({ rules: [], fails: ['notUp'] });
    assert.equal(engine.attempt(5, 'up', 'wall').failed, true);
    assert.equal(engine.attempt(5, 'up', '3').failed, true);
    assert.equal(engine.attempt(5, 'up', '×').failed, true);
  });

  it('down ticked: flat is safe, down and impossible end the run (eval ticked so the signs play)', () => {
    const flat = createChooseyEngine({ rules: ['eval'], fails: ['down'] });
    assert.equal(flat.attempt(5, 'up', 'wall').failed, false, 'flat is safe ground');

    const smaller = createChooseyEngine({ rules: ['eval'], fails: ['down'] });
    const became = smaller.attempt(5, 'up', '3'); // eval: you become the tile
    assert.equal(became.failed, true, 'becoming a smaller number went down');
    assert.equal(became.failReason, 'Your number went down');

    const impossible = createChooseyEngine({ rules: ['eval'], fails: ['down'] });
    assert.equal(impossible.attempt(5, 'up', '×').failed, true, 'a sign with nothing held is impossible');
  });

  it('both ticked: the top run-ender names the reason (flat reads as not-up)', () => {
    const engine = createChooseyEngine({ rules: [], fails: ['notUp', 'down'] });
    const flat = engine.attempt(5, 'up', 'wall');
    assert.equal(flat.failed, true);
    assert.equal(flat.failReason, 'Your number did not go up');
  });
});

describe('choosey world (num-dn2)', () => {
  it('is a hand-authored world with a start cell', () => {
    const world = WORLDS.choosey;
    assert.ok(world, 'choosey must exist in WORLDS');
    assert.ok(world.rows.flat().includes('.'));
    assert.equal(findStart(world).x, 2);
    assert.equal(findStart(world).y, 2);
  });

  it('is reachable by cycling worlds (WORLD_ORDER)', () => {
    assert.ok(WORLD_ORDER.includes('choosey'), 'N-cycling must reach choosey');
  });

  // The classic default checks, played through the composite engine itself.
  function probe(tile, number, pending) {
    const engine = createChooseyEngine({ rules: ['eval'], fails: ['notUp'] });
    const ctx = { pending };
    const result = engine.rule.superpose(number, tile, ctx);
    return { result, pending: ctx.pending, engine };
  }

  function firstMovesSurvive() {
    const world = WORLDS.choosey;
    const start = findStart(world);
    const ring = [
      ['up', world.rows[start.y - 1]?.[start.x]],
      ['down', world.rows[start.y + 1]?.[start.x]],
      ['left', world.rows[start.y]?.[start.x - 1]],
      ['right', world.rows[start.y]?.[start.x + 1]],
    ];
    for (const [direction, tile] of ring) {
      const fresh = createChooseyEngine({ rules: ['eval'], fails: ['notUp'] });
      const ev = fresh.attempt(0, direction, tile);
      assert.equal(ev.valid, true, `${direction} onto ${tile} must not be invalid`);
      assert.equal(ev.failed, false, `${direction} onto ${tile} must not end the run`);
    }
  }

  it('every way off the start survives the classic default checks (eval × notUp)', () => {
    firstMovesSurvive();
  });

  it('routes under the classic default are long enough to feel like a run (no-revisit depth ≥ 8)', () => {
    const world = WORLDS.choosey;
    const start = findStart(world);
    const visited = new Set([`${start.x},${start.y}`]);
    const CAP = 8;
    let best = 0;
    function failsOnStep(number, pending, step) {
      const pr = probe(step.tile, number, pending);
      if (typeof pr.result !== 'number' || !Number.isFinite(pr.result)) return null;
      const ev = {
        valid: true,
        result: pr.result,
        delta: pr.result - number,
        oldNumber: number,
        rule: 'choosey',
      };
      const reason = pr.engine.failure.failed(ev);
      if (reason !== null) return null;
      return pr;
    }
    function dfs(x, y, number, pending, depth) {
      if (depth > best) best = depth;
      if (best >= CAP) return;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const key = `${x + dx},${y + dy}`;
        const tile = world.rows[y + dy]?.[x + dx];
        if (tile === undefined || visited.has(key)) continue;
        const pr = failsOnStep(number, pending, { tile });
        if (pr === null) continue;
        visited.add(key);
        dfs(x + dx, y + dy, pr.result, pr.pending, depth + 1);
        visited.delete(key);
      }
    }
    dfs(start.x, start.y, 0, null, 0);
    assert.ok(best >= CAP, `longest route ${best} moves, expected at least ${CAP}`);
  });
});
