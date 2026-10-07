// Pure fit maths for the player mark (num-qhf): the bare numeral is the
// player, so its size must answer "what does a 4-digit you look like in a
// 1-cell space" without invading a neighbour's cell. No DOM in here — the
// renderer (play.ts) measures the real advance ratio at runtime and passes
// it in as a parameter; the classic 0.6 monospace estimate is only ever a
// value the caller may supply, never an assumption of this module.

export type DigitBand = 0 | 1 | 2;

// Share of the cell the mark's ink may occupy (the disc equivalent of the
// bead's r ≤ 0.5 · CELL · fill cap: nothing crossable invades a neighbour).
const INK = 0.94;

// Band base font-size as a fraction of the cell: bare numerals can use the
// whole cell, unlike the old 60px-disc/30px-glyph split.
const BAND_BASE: readonly [number, number, number] = [0.5, 0.44, 0.36];

// 1–2 / 3 / 4+ digits. Discrete bands (not a value-proportional scale) stay
// calm across ×-chains, which jump four orders of magnitude in three moves.
export function digitBand(chars: number): DigitBand {
  if (chars <= 2) return 0;
  if (chars === 3) return 1;
  return 2;
}

// Largest monospace font-size whose advance width fits maxWidth:
//   0.6·n·fs ≤ maxWidth  →  fs = maxWidth / (ratio·n), solved exactly.
export function fitFontSize(digitCount: number, advanceRatio: number, maxWidth: number): number {
  return maxWidth / (advanceRatio * digitCount);
}

// The size the player numeral should render at: band base, clamped by the
// cell's ink budget with the measured advance ratio.
export function pnumFont(
  chars: number,
  advanceRatio: number,
  cellSize: number,
): { fontSize: number; band: DigitBand } {
  const band = digitBand(chars);
  const base = BAND_BASE[band] * cellSize;
  const max = fitFontSize(chars, advanceRatio, cellSize * INK);
  return { fontSize: Math.min(base, max), band };
}
