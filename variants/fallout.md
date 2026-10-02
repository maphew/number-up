# Fallout

**eval × notUp + collapse-to-floor** — every tile burns out behind you; routing is the game

Play: <https://maphew.github.io/number-up/play.html?variant=fallout>
Registry: `src/variants.ts` → `VARIANTS.fallout` (collision `eval`, failure `notUp`, world full, `collapse: true`)

## Hypothesis

With re-entry fatal, you will plan routes instead of mashing loops. World full
becomes a 5-move routing puzzle with a best Number near 243: pick up the 9
before the 6, never revisit. If finiteness reads as routing rather than
shortness, collapse is the structural fix the alpha review simulated
(unbounded runs vanish, 4–9 band grows 8.5% → 47.5%, ≤3 band grows to ~52%).

Verified at HEAD by exhaustive simple-path search over world full (no
revisits, `notUp` gating): best is exactly 243 in 5 moves —
RIGHT:6=6 → UP:9=9 → RIGHT:+=18 → DOWN:+=27 → DOWN:×=243.
1500-seed headless distribution reproduced: baseline 40.1% ≤3 / 11.7% 4–9 /
48.3% 30+ vs collapse 52.4% ≤3 / 47.5% 4–9 / 0.0% 30+ (blip 0.1% at 10–29).

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
