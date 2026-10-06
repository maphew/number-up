'use strict';
// TDD test for num-bpq: pure debug-notebook aggregation (no DOM).
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createEngine } from '../src/engine.ts';
import { summariseRun, formatMoveLog, formatRunDump } from '../src/debug.ts';

function verbsRun() {
  const engine = createEngine('eval', 'notUp');
  engine.attempt(0, 'UP', '9'); // 1: → 9 UP, pending 9
  engine.attempt(9, 'UP', '+'); // 2: → 18 UP
  engine.attempt(18, 'UP', '+'); // 3: → 27 UP
  engine.attempt(27, 'UP', 'wall'); // 4: flat 27, fails notUp
  return engine.history;
}

describe('summariseRun', () => {
  it('empty history zeroes out', () => {
    assert.deepEqual(summariseRun([]), {
      turns: 0,
      peak: null,
      final: null,
      up: 0,
      down: 0,
      flat: 0,
      invalid: 0,
    });
  });

  it('counts up/flat and tracks peak/final', () => {
    const t = summariseRun(verbsRun());
    assert.equal(t.turns, 4);
    assert.equal(t.peak, 27);
    assert.equal(t.final, 27);
    assert.equal(t.up, 3);
    assert.equal(t.flat, 1);
    assert.equal(t.down, 0);
    assert.equal(t.invalid, 0);
  });

  it('invalid moves count separately with null final', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(5, 'UP', '+');
    const t = summariseRun(engine.history);
    assert.equal(t.turns, 1);
    assert.equal(t.invalid, 1);
    assert.equal(t.final, null);
    assert.equal(t.peak, 5);
  });

  it('down moves count when the Number decreases', () => {
    const engine = createEngine('eval', 'none');
    engine.attempt(10, 'UP', '3');
    const t = summariseRun(engine.history);
    assert.equal(t.down, 1);
    assert.equal(t.peak, 10);
    assert.equal(t.final, 3);
  });
});

describe('formatMoveLog', () => {
  it('one line per move with turn, direction, tile, pending, result', () => {
    const lines = formatMoveLog(verbsRun());
    assert.equal(lines.length, 4);
    assert.match(lines[0], /UP/);
    assert.match(lines[0], /pending=—/);
    assert.match(lines[1], /pending=9/);
    assert.match(lines[1], /→ 18/);
  });

  it('from-positions render when supplied', () => {
    const lines = formatMoveLog(verbsRun(), [
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      null,
      { x: 2, y: 3 },
    ]);
    assert.match(lines[0], /from 2,2/);
    assert.match(lines[2], /pending=9/);
  });

  it('invalid and failed moves show INVALID and the reason', () => {
    const engine = createEngine('eval', 'notUp');
    engine.attempt(5, 'UP', '+');
    const lines = formatMoveLog(engine.history);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /INVALID/);
    assert.match(lines[0], /invalid/i);
  });
});

describe('formatRunDump', () => {
  it('carries context, totals, and the full log', () => {
    const dump = formatRunDump(
      {
        ruleKey: 'eval',
        ruleName: 'operator evaluation',
        failKey: 'notUp',
        failName: 'NUMBER NOT UP',
        worldKey: 'b',
        worldName: 'B — Number + Operator',
        variantLabel: 'Verbs (verbs)',
        seed: null,
        url: '?variant=verbs',
        number: 27,
        variantUpdated: '2026-09-30',
      },
      verbsRun(),
    );
    assert.match(dump, /eval/);
    assert.match(dump, /notUp/);
    assert.match(dump, /Verbs \(verbs\)/);
    assert.match(dump, /Turns 4/);
    assert.match(dump, /→ 18/);
  });

  it('names the operator with nothing to act on in the log line', () => {
    const engine = createEngine('eval', 'notUp');
    engine.attempt(5, 'UP', '×');
    const dump = formatRunDump(
      {
        ruleKey: 'eval',
        ruleName: 'operator evaluation',
        failKey: 'notUp',
        failName: 'NUMBER NOT UP',
        worldKey: 'full',
        worldName: 'Full — mixed grid',
        variantLabel: 'custom — eval × notUp',
        seed: null,
        url: '?rule=eval&fail=notUp',
        number: NaN,
      },
      engine.history,
    );
    assert.match(dump, /no number to act on/);
  });
});
