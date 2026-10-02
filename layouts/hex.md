# Hex lattice layout (experiment)

**Status:** experiment behind `?layout=hex`. Square grid stays the default;
gallery untouched. Not a named variant — geometry is not a mechanic.

Play: `play.html?layout=hex&variant=verbs` (`debug=1` prints the mapping).
Code: `src/lattice.ts` → `createSquareLattice` / `createHexLattice`.
Tests: `test/lattice.test.js` (17 lattice tests). Engine untouched.

## Hypothesis (recorded before implementation, 2026-10-01)

A 6-neighbour hex lattice makes superposition MORE legible, not less —
three onward choices per tile turn verb-chains (eval rule) from narrow
corridors into a wider deliberate search, and players will plan 2+ moves
ahead more often than on the square grid. Predicted cost: direction
legibility — keyboard/swipe must be re-learned; if the input mapping is
approximated silently the game will read as ignoring input, so the mapping
ships explicit (6 honest keys + nearest-hex-of-swipe-angle) and this
experiment judges legibility of the lattice itself, not input friction.

## Geometry

Pointy-top hexes in odd-r offset rows, so a world's `rows` array reads as
hex rows unchanged (data-compatible with square worlds):

- `centre(x, y) = (sqrt(3)·R·(x + (y&1)/2), 1.5·R·y)`
- All six neighbour distances exactly `sqrt(3)·R` (verified per cell, 1e-9).
- Neighbour table parity-correct: E/W along the row from any cell; diagonals
  lean left on even rows, right on odd rows.
- Boundary stays rectangular in odd-r coords (ragged half-hexes at alternating
  row ends accepted for this cut). One seeded `generateWorld` serves both
  layouts, so `?world=gen&seed=N` is the same map either way.
- `cellPath` is a closed 6-vertex pointy-top hexagon; `bounds` includes the
  half-hex overhang; `hexRadius` fits the 5-wide board into the 500 canvas.

Correction worth keeping: the design doc's first-cut centre formula was the
odd-q flat-top form transposed (irregular neighbour distances). What keeps
rows-as-world-data intact is odd-r = pointy-top, above. Intent kept, name
fixed.

## Input (explicit, never approximated silently)

- W/E along the row: `←` `→` / `A` `D` / numpad `4` `6`.
- NW/NE: `Q` / `E` / numpad `7` `9`. SW/SE: `Z` / `C` / numpad `1` `3`.
- `↑`/`↓`/`W`/`S` have no north/south neighbour on pointy-top rows: pressing
  them explains that (honesty hint) instead of moving.
- Rule-cycle moves `C` → `V` in hex (`C` is now SE); chip label updates.
- Swipe resolves by max dot product against the six neighbour-centre vectors;
  straight up/down ties resolve NE/SE. Printed in the help row and the debug
  notebook panel.

## Feedback

- 2026-10-01 — Simulated support for the hypothesis (headless, world b /
  Verbs): strictly-increasing sequences from the start — length-2: square 5
  vs hex 13; length-3: 19 vs 45; length-4: 25 vs 144. The 6-neighbour lattice
  widens the verb-chain search ~2.6–5.8x, compounding with depth. Full runs
  start-to-failure confirmed headless (engine+lattice): eval×notUp dies at
  move 3, add×notUp sustains 200+ moves, replace×notUp dies move 1.
- 2026-10-02 — Re-verified headless after later play.ts changes: all five
  hand worlds start-to-failure on hex under eval×notUp (moves 1–2, named
  reasons), gen seed 7 likewise; increasing-sequence width re-checked
  (depth 2/3/4: sq 8/3/6 vs hex 13/18/24 — direction of effect holds, exact
  counts depend on the counter). Square default + gallery untouched confirmed
  (no `layout` references in gallery/index; `IS_HEX` false by default).
  `npm run verify` green (tsc strict + 51 tests + esbuild), `dist/` current.
- 2026-10-02 — Listed on the home page under "lab bench: layout experiments"
  (num-fmd): the variant-catalogue gallery could never render hex since it is
  a layout modifier, not a rule×fail variant, and matt could not find it
  without the README. Square stays the default; the card links
  `?layout=hex&variant=verbs` and points here.
- Still open — the actual question needs human play: whether the wider search
  READS as more legible or as overwhelming, and whether QEZC diagonals +
  nearest-of-six swipe feel honest in the hand. Watch for: on square a row of
  verbs is a corridor you can walk; on hex a row has three exits, so chains
  are easier to extend but harder to "own".
