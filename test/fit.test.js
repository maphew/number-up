'use strict';
// Tests for src/fit.ts: pure player-mark fit maths (no DOM).
// The bead (num-qhf) asks that radius/font vs digit-count is pure and
// node:test covered, with the 0.6 advance ratio measured at runtime and
// passed in as a parameter — so these tests exercise it, never assume it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { digitBand, fitFontSize, pnumFont } from '../src/fit.ts';

const CELL = 100;
const INK = 0.94; // share of the cell the numeral's ink may occupy
const RATIO = 0.6; // the classic monospace estimate — a measurement stand-in here

describe('digitBand', () => {
  it('steps 1–2 / 3 / 4+ digits into three bands', () => {
    assert.equal(digitBand(1), 0);
    assert.equal(digitBand(2), 0);
    assert.equal(digitBand(3), 1);
    assert.equal(digitBand(4), 2);
    assert.equal(digitBand(5), 2);
    assert.equal(digitBand(8), 2);
  });

  it('is never frightened by a huge value (fmtNumber caps the string, but still)', () => {
    assert.equal(digitBand(100), 2);
  });

  it('never decreases as digits grow', () => {
    let prev = digitBand(1);
    for (let n = 2; n <= 12; n++) {
      const band = digitBand(n);
      assert.ok(band >= prev, `band went backwards at ${n} digits`);
      prev = band;
    }
  });
});

describe('fitFontSize', () => {
  it('solves the advance-width constraint exactly', () => {
    for (const n of [1, 2, 3, 4, 5, 8]) {
      const fs = fitFontSize(n, RATIO, 94);
      assert.ok(Math.abs(fs - 94 / (RATIO * n)) < 1e-9, `${n} digits: got ${fs}`);
      // and the solution really fits
      assert.ok(RATIO * n * fs <= 94 + 1e-9);
    }
  });

  it('shrinks as digits are added', () => {
    let prev = Infinity;
    for (let n = 1; n <= 12; n++) {
      const fs = fitFontSize(n, RATIO, CELL);
      assert.ok(fs <= prev + 1e-9, `font grew at ${n} digits`);
      prev = fs;
    }
  });

  it('honours the measured ratio: wider glyphs need a smaller size', () => {
    assert.ok(fitFontSize(4, 0.65, 94) < fitFontSize(4, 0.6, 94));
    assert.ok(fitFontSize(4, 0.55, 94) > fitFontSize(4, 0.6, 94));
  });
});

describe('pnumFont', () => {
  const at = (n, ratio, cell) => pnumFont(n, ratio, cell).fontSize;

  it('uses the band base while room allows', () => {
    assert.ok(Math.abs(at(1, RATIO, CELL) - 50) < 1e-9, `1 digit: ${at(1, RATIO, CELL)}`);
    assert.ok(Math.abs(at(2, RATIO, CELL) - 50) < 1e-9, `2 digits: ${at(2, RATIO, CELL)}`);
    assert.ok(Math.abs(at(3, RATIO, CELL) - 44) < 1e-9, `3 digits: ${at(3, RATIO, CELL)}`);
    assert.ok(Math.abs(at(4, RATIO, CELL) - 36) < 1e-9, `4 digits: ${at(4, RATIO, CELL)}`);
  });

  it('clamps to the ink budget before digits overflow the cell', () => {
    // 5 digits at ratio 0.6 want 31.33…, under the 36 base
    assert.ok(Math.abs(at(5, RATIO, CELL) - 94 / 3) < 1e-9, `5 digits: ${at(5, RATIO, CELL)}`);
    for (let n = 1; n <= 12; n++) {
      const fs = at(n, RATIO, CELL);
      assert.ok(RATIO * n * fs <= CELL * INK + 1e-9, `${n} digits broke the budget: ${fs}`);
    }
  });

  it('descends in a calm staircase (no jitter between neighbours)', () => {
    assert.equal(at(1, RATIO, CELL), at(2, RATIO, CELL));
    assert.ok(at(2, RATIO, CELL) >= at(3, RATIO, CELL));
    assert.ok(at(3, RATIO, CELL) >= at(4, RATIO, CELL));
    assert.ok(at(4, RATIO, CELL) >= at(5, RATIO, CELL));
  });

  it('applies to INVALID too: the ✕ glyph takes full band-0 sizing', () => {
    const f = pnumFont(1, RATIO, CELL);
    assert.equal(f.band, 0);
    assert.ok(Math.abs(f.fontSize - 50) < 1e-9);
  });

  it('adapts to smaller cells: hex-era spans yield smaller numerals that still fit', () => {
    const hexCell = 90.8; // √3 · hexRadius for a 5×5 board in a 500 canvas
    const f = pnumFont(5, RATIO, hexCell);
    assert.ok(f.fontSize <= pnumFont(5, RATIO, CELL).fontSize, 'hex numeral grew');
    assert.ok(RATIO * 5 * f.fontSize <= hexCell * INK + 1e-9, 'hex numeral overflows');
    // and never below something a human reads (roughly a tile's height)
    assert.ok(f.fontSize > 20, `hex 5-digit numeral unreadable: ${f.fontSize}`);
  });
});
