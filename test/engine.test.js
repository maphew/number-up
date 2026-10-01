'use strict';
// TDD test for Number Up: covers engine.ts pure logic (no DOM).
// Runner: node:test + node:assert (stdlib only, zero deps). Node strips the
// TypeScript types in src/engine.ts natively, so tests import the real module.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RULES, FAILURE_RULES, createEngine } from '../src/engine.ts';

describe('eval rule semantics (current candidate: numeric)', () => {
  it('numeric tiles REPLACE current Number (not add)', () => {
    const engine = createEngine('eval', 'none');
    const ev = engine.attempt(1, 'up', '6');
    assert.equal(ev.result, 6);
    assert.equal(ev.valid, true);
  });

  it('numeric tiles set the pending operand used by the next operator', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(1, 'up', '6');
    const ev = engine.attempt(6, 'up', '+');
    assert.equal(ev.result, 12); // 6 (current) + 6 (pending)
  });

  it('operator tiles apply themselves to (currentNumber, pending)', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(2, 'up', '3'); // pending = 3, current becomes 3
    assert.equal(engine.attempt(3, 'up', '×').result, 9);
  });

  it('operator chains act as verbs (absorb 6, then + + + adds 6 each step)', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(1, 'up', '6');
    assert.equal(engine.attempt(6, 'up', '+').result, 12);
    assert.equal(engine.attempt(12, 'up', '+').result, 18);
    assert.equal(engine.attempt(18, 'up', '+').result, 24);
  });

  it('operators with no pending operand yield an invalid result', () => {
    const engine = createEngine('eval', 'none');
    const ev = engine.attempt(5, 'up', '+');
    assert.equal(ev.valid, false);
    assert.equal(ev.result, null);
  });

  it('floor (non-numeric, non-operator) tiles leave Number unchanged', () => {
    const engine = createEngine('eval', 'none');
    const ev = engine.attempt(4, 'up', 'wall');
    assert.equal(ev.result, 4);
    assert.equal(ev.valid, true);
  });
});

describe('notUp failure rule boundaries (check order: invalid, DOWN, flat)', () => {
  const { notUp } = FAILURE_RULES;

  it('invalid is reported first (even when result would compare as DOWN)', () => {
    // result null < oldNumber 5 is true, so DOWN would win if order were swapped.
    const reason = notUp.failed({ valid: false, result: null, oldNumber: 5 });
    assert.match(reason, /invalid/i);
  });

  it('DOWN is reported when the Number decreases', () => {
    assert.match(notUp.failed({ valid: true, result: 3, oldNumber: 5 }), /DOWN/);
  });

  it('flat is reported when the Number does not change', () => {
    assert.match(notUp.failed({ valid: true, result: 5, oldNumber: 5 }), /not go UP/);
  });

  it('going UP is not a failure', () => {
    assert.equal(notUp.failed({ valid: true, result: 6, oldNumber: 5 }), null);
  });

  it('end-to-end: DOWN / flat / invalid moves fail under notUp, UP passes', () => {
    const engine = createEngine('eval', 'notUp');
    engine.attempt(1, 'up', '6'); // current 6, pending 6
    const down = engine.attempt(6, 'up', '−');
    assert.equal(down.result, 0);
    assert.equal(down.failed, true);
    assert.match(down.failReason, /DOWN/);

    const engine2 = createEngine('eval', 'notUp');
    engine2.attempt(1, 'up', '6');
    const flat = engine2.attempt(6, 'up', 'wall');
    assert.equal(flat.failed, true);
    assert.match(flat.failReason, /not go UP/);

    const engine3 = createEngine('eval', 'notUp');
    const invalid = engine3.attempt(5, 'up', '+');
    assert.equal(invalid.failed, true);
    assert.match(invalid.failReason, /invalid/);

    const engine4 = createEngine('eval', 'notUp');
    engine4.attempt(1, 'up', '6');
    const up = engine4.attempt(6, 'up', '+');
    assert.equal(up.failed, false);
    assert.equal(up.failReason, null);
  });
});

describe('createEngine wiring', () => {
  it('exposes the selected rule and failure rule registries', () => {
    const engine = createEngine('eval', 'notUp');
    assert.equal(engine.rule, RULES.eval);
    assert.equal(engine.failure, FAILURE_RULES.notUp);
    assert.equal(engine.ruleName, 'eval');
    assert.equal(engine.failureName, 'notUp');
  });

  it('falls back to eval × notUp for unknown names', () => {
    const engine = createEngine('bogus', 'bogus');
    assert.equal(engine.ruleName, 'eval');
    assert.equal(engine.failureName, 'notUp');
  });

  it('records one history event per attempt with an incrementing turn', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(1, 'up', '6');
    engine.attempt(6, 'up', '+');
    assert.equal(engine.history.length, 2);
    assert.deepEqual(
      engine.history.map((ev) => ev.turn),
      [1, 2],
    );
  });
});
