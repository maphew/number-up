# Fallout

**eval × notUp + collapse-to-floor** — every tile burns out behind you; routing is the game

Play: <https://maphew.github.io/number-up/play.html?variant=fallout>
Registry: `src/variants.ts` → `VARIANTS.fallout` (collision `eval`, failure `notUp`, world full, `collapse: true`)

## Hypothesis

With re-entry fatal, you will plan routes instead of mashing loops. World full
becomes a short routing puzzle with a best Number of exactly 243: hold the 9,
then run two `+` and a `×` without revisiting. If finiteness reads as routing
rather than shortness, collapse is the structural fix the alpha review simulated
(unbounded runs vanish, 4–9 band grows 8.5% → 47.5%, ≤3 band grows to ~52%).

Verified at HEAD by exhaustive simple-path search over world full (no
revisits, `notUp` gating). Two different measures, do not conflate them:
- best Number is exactly **243**, reachable in **5** moves:
  UP:5=5 → RIGHT:9=9 → RIGHT:+=18 → DOWN:+=27 → DOWN:×=243.
- longest survivable route is **7** moves (same ceiling of 243):
  LEFT:3=3 → UP:4=4 → RIGHT:5=5 → RIGHT:9=9 → RIGHT:+=18 → DOWN:+=27 → DOWN:×=243.

World full was recast (2026-10-02) so the start ring is numbers, not operators:
0/4 first moves are now fatal, down from 3/4.
1500-seed headless distribution reproduced: baseline 40.1% ≤3 / 11.7% 4–9 /
48.3% 30+ vs collapse 52.4% ≤3 / 47.5% 4–9 / 0.0% 30+ (blip 0.1% at 10–29).
The distribution is over `generateWorld` seeds, which are unchanged; the
hand-authored world above is the new opening.

See `num-wkq.1` for the before/after distribution script expectations.

## Rules in full

Same collision rule as Verbs, plus collapse:

- Numeric tile: Number is replaced by the tile's value, pending set to it.
- Operator tile: applies itself to (current Number, pending); no pending is
  `× had nothing to act on`.
- After every collision the tile collapses to floor (`floor` sentinel in
  `src/world.ts` → `createCollapseState`). Re-entry reads as floor: Number
  unchanged, flat, fatal under `notUp`.
- Failure (`notUp`): DOWN, flat (including re-entry), or invalid ends the run.

## Feedback

- 2026-10-02 — (nothing yet; opt-in experiment, existing variants untouched)

## Musings: branches and extensions

- Hoarder under collapse becomes a finite consume-everything puzzle — arguably
  truer to its hypothesis; try it before promoting collapse anywhere else.
- Becoming gets forced forward motion; check whether the tightrope survives.
- Cheaper alternative (fatal step-back) rejected: leaves ~1% unbounded via
  op-only 4-cycles that never step back.
- Caveat carried from the review: ≤3-move runs rise to ~52%, so first-move
  onboarding (named no-operand death, start-world tuning) matters more, not less.
