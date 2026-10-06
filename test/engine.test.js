'use strict';
// TDD test for Number Up: covers engine.ts pure logic (no DOM).
// Runner: node:test + node:assert (stdlib only, zero deps). Node strips the
// TypeScript types in src/engine.ts natively, so tests import the real module.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classify, RULES, FAILURE_RULES, createEngine } from '../src/engine.ts';

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
  });  it('DOWN is reported when the Number decreases', () => {
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
    assert.match(invalid.failReason, /had nothing to act on/);

    const engine4 = createEngine('eval', 'notUp');
    engine4.attempt(1, 'up', '6');
    const up = engine4.attempt(6, 'up', '+');
    assert.equal(up.failed, false);
    assert.equal(up.failReason, null);
  });
});

describe('down failure rule: only a decrease ends the run', () => {
  const { down } = FAILURE_RULES;

  it('invalid is reported first (no Number to carry onward)', () => {
    const reason = down.failed({ valid: false, result: null, oldNumber: 5 });
    assert.match(reason, /invalid/i);
    assert.doesNotMatch(reason, /\bUP\b/i); // down must not explain itself via UP
  });

  it('DOWN is reported when the Number decreases', () => {
    assert.match(down.failed({ valid: true, result: 3, oldNumber: 5 }), /DOWN/);
  });

  it('flat is NOT a failure (same level is fine)', () => {
    assert.equal(down.failed({ valid: true, result: 5, oldNumber: 5 }), null);
  });

  it('going UP is not a failure', () => {
    assert.equal(down.failed({ valid: true, result: 6, oldNumber: 5 }), null);
  });

  it('end-to-end: flat passes, DOWN fails, invalid fails under eval', () => {
    const engine = createEngine('eval', 'down');
    engine.attempt(1, 'up', '6'); // current 6, pending 6
    const flat = engine.attempt(6, 'up', 'wall');
    assert.equal(flat.result, 6);
    assert.equal(flat.failed, false);

    const engine2 = createEngine('eval', 'down');
    engine2.attempt(1, 'up', '6');
    const down = engine2.attempt(6, 'up', '−');
    assert.equal(down.result, 0);
    assert.equal(down.failed, true);
    assert.match(down.failReason, /DOWN/);

    const engine3 = createEngine('eval', 'down');
    const invalid = engine3.attempt(5, 'up', '+');
    assert.equal(invalid.failed, true);
    assert.match(invalid.failReason, /had nothing to act on/);
  });
});

describe('classify edge-cases (num-3mp: consumed cells must never read as numbers)', () => {
  it("empty tile-state is floor, not number 0 (Number('') === 0 is the trap)", () => {
    assert.equal(classify(''), 'floor');
    assert.equal(classify('∅'), 'floor');
    assert.equal(classify('floor'), 'floor');
    assert.equal(classify('HOLE'), 'floor');
  });
});

describe('relay rule semantics (num-ak7: swap · arm · consume)', () => {
  const RELAY = 'relay';

  it('unarmed onto a number: numbers trade places (you become the tile, flat never)', () => {
    const engine = createEngine(RELAY, 'none');
    const ev = engine.attempt(1, 'up', '7');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 7);
    assert.deepEqual(ev.effect, { kind: 'swap' });
    assert.equal(engine.carried, null);
  });

  it('the swap carries the old Number to the origin cell via the effect channel', () => {
    const engine = createEngine(RELAY, 'none');
    const ev = engine.attempt(1, 'up', '7');
    assert.equal(ev.destinationTile, '7'); // play.ts places this at the origin cell
    assert.equal(ev.effect.kind, 'swap');
  });

  it('unarmed onto an operator: picked up and armed, Number unchanged', () => {
    const engine = createEngine(RELAY, 'none');
    const ev = engine.attempt(4, 'up', '+');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 4);
    assert.deepEqual(ev.effect, { kind: 'pickup' });
    assert.equal(engine.carried, '+');
  });

  it('armed onto a number: the carried operator applies and the tile is consumed', () => {
    const engine = createEngine(RELAY, 'none');
    engine.attempt(4, 'up', '+');
    const ev = engine.attempt(4, 'up', '5');
    assert.equal(ev.result, 9);
    assert.deepEqual(ev.effect, { kind: 'consume' });
    assert.equal(engine.carried, null); // the operator is spent in the application
  });

  it('each operator applies correctly (−, ×, ÷)', () => {
    for (const [op, a, b, want] of [['−', 9, 4, 5], ['×', 3, 6, 18], ['÷', 18, 6, 3]]) {
      const engine = createEngine(RELAY, 'none');
      engine.attempt(1, 'up', op);
      const ev = engine.attempt(Number(a), 'up', String(b));
      assert.equal(ev.result, want, op);
      assert.equal(ev.effect.kind, 'consume');
    }
  });

  it('unarmed onto vacated ground (empty tile-state): a plain flat move, never a consume', () => {
    const engine = createEngine(RELAY, 'none');
    engine.attempt(4, 'up', '+');
    const ev = engine.attempt(4, 'up', '');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 4);
    assert.equal(ev.delta, 0);
    assert.deepEqual(ev.effect, { kind: 'none' });
    assert.equal(engine.carried, '+'); // still armed — nothing was touched
  });

  it('unarmed onto vacated ground: swap destination glyph is never bare ground', () => {
    const engine = createEngine(RELAY, 'none');
    const ev = engine.attempt(5, 'up', '5');
    assert.deepEqual(ev.effect, { kind: 'swap' });
    assert.notEqual(ev.destinationTile, '');
  });

  it('armed onto another operator: the carried op is traded for the new one', () => {
    const engine = createEngine(RELAY, 'none');
    engine.attempt(4, 'up', '+');
    const ev = engine.attempt(4, 'up', '×');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 4);
    assert.deepEqual(ev.effect, { kind: 'opswap', dropped: '+' });
    assert.equal(engine.carried, '×');
  });

  it('floor/empty-ground tiles are plain moves and never disarm (hole sentinel included)', () => {
    const engine = createEngine(RELAY, 'none');
    engine.attempt(4, 'up', '+');
    assert.equal(engine.attempt(4, 'up', 'floor').result, 4);
    assert.equal(engine.carried, '+');
    assert.equal(engine.attempt(4, 'up', '.').result, 4);
  });

  it('carried state survives until spent and clears on reset', () => {
    const engine = createEngine(RELAY, 'none');
    engine.attempt(4, 'up', '×');
    assert.equal(engine.carried, '×');
    engine.reset();
    assert.equal(engine.carried, null);
  });

  it('events record carriedAtEntry like pendingAtEntry', () => {
    const engine = createEngine(RELAY, 'none');
    const first = engine.attempt(4, 'up', '+');
    assert.equal(first.carriedAtEntry, null);
    const second = engine.attempt(4, 'up', '5');
    assert.equal(second.carriedAtEntry, '+');
  });

  it('relay under notUp: a downward swap fails, an upward consume passes', () => {
    const engine = createEngine(RELAY, 'notUp');
    const down = engine.attempt(9, 'up', '4');
    assert.equal(down.failed, true);
    assert.match(down.failReason, /DOWN/);

    const engine2 = createEngine(RELAY, 'notUp');
    engine2.attempt(1, 'up', '+');
    const up = engine2.attempt(1, 'up', '5');
    assert.equal(up.valid, true);
    assert.equal(up.failed, false);
  });

  it('relay is reachable by URL key and in the RULES registry', () => {
    const engine = createEngine('relay', 'none');
    assert.equal(engine.ruleName, 'relay');
    assert.match(engine.rule.name, /relay/i);
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

  it('exposes pending at entry on each event (observable-only)', () => {
    const engine = createEngine('eval', 'none');
    const first = engine.attempt(1, 'up', '6');
    assert.equal(first.pendingAtEntry, null);
    const second = engine.attempt(6, 'up', '+');
    assert.equal(second.pendingAtEntry, 6);
  });

  it('exposes the live pending operand', () => {
    const engine = createEngine('eval', 'none');
    assert.equal(engine.pending, null);
    engine.attempt(1, 'up', '6');
    assert.equal(engine.pending, 6);
  });
});

describe('operator-with-no-operand names its death (num-wkq.3)', () => {
  it('an operator with no pending operand says what had nothing to act on', () => {
    const engine = createEngine('eval', 'notUp');
    const ev = engine.attempt(5, 'up', '×');
    assert.equal(ev.valid, false);
    assert.equal(ev.failed, true);
    assert.match(ev.failReason, /× had nothing to act on/);
  });

  it('÷ by zero keeps the generic invalid message (operand present, result undefined)', () => {
    const engine = createEngine('eval', 'notUp');
    engine.attempt(1, 'up', '0'); // pending = 0
    const ev = engine.attempt(0, 'up', '÷');
    assert.equal(ev.valid, false);
    assert.equal(ev.failed, true);
    assert.match(ev.failReason, /invalid/i);
    assert.doesNotMatch(ev.failReason, /nothing to act on/);
  });
});

describe('round() never corrupts the carried Number (num-wkq.5)', () => {
  it('keeps large integers exact (37238650778412 + 6)', () => {
    const engine = createEngine('add', 'none');
    const ev = engine.attempt(37238650778412, 'up', '6');
    assert.equal(ev.result, 37238650778418);
  });

  it('still rounds float hygiene to 6dp (1 ÷ 3)', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(0, 'up', '3'); // pending = 3
    const ev = engine.attempt(1, 'up', '÷');
    assert.equal(ev.result, 0.333333);
  });

  it('collapse re-entry reads as flat: floor leaves Number unchanged, fails notUp', () => {
    const engine = createEngine('eval', 'notUp');
    engine.attempt(1, 'up', '6');
    const ev = engine.attempt(6, 'up', 'floor');
    assert.equal(ev.valid, true);
    assert.equal(ev.result, 6);
    assert.equal(ev.failed, true);
    assert.match(ev.failReason, /not go UP/);
  });
});
