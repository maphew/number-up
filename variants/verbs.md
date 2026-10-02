# Verbs

**eval × notUp** — operators are verbs, numbers are fuel

Play: <https://maphew.github.io/number-up/play.html?variant=verbs>
Registry: `src/variants.ts` → `VARIANTS.verbs` (collision `eval`, failure `notUp`, world b)

## Hypothesis

This is the current best guess at "operator as verb". We hope to prove that an
operator reads as something you *invoke*, not a thing you bump into. The pending
operand is the tell: numbers set it, operators spend it, so touching 6 and then
walking a line of `+` tiles adds 6 at every step. If players start composing
chains on purpose ("absorb the 6, then run the plus row"), the verb reading is
real. If they get surprised by the pending-operand mechanic or read operators as
obstacles, the hypothesis loses.

What would disprove it: players avoid operator tiles, or the pending operand
never becomes visible to them as a concept. Then "operator as verb" is my
projection, not their experience.

## Rules in full

- Numeric tile: Number is replaced by the tile's value, and the pending operand
  is set to that same value.
- Operator tile: the operator applies itself to (current Number, pending
  operand). With no pending operand the result is invalid.
- Floor tile (the start cell): no effect.
- Failure (`notUp`): the run ends when Number goes DOWN, stays flat, or goes
  invalid. DOWN/flat/invalid are all just "NUMBER NOT UP".

World b is operator-dense so verbs dominate the texture of play.

## Feedback

- 2026-10-02 — External alpha review (GH issue 1, R1): pending operand is
  invisible in normal play (`↑ 18` with no trace of the held `6`), so no
  theory of Verbs can form. Fixed: quiet line now reads `↑ 18 [6]`, held
  operand always observable; design tension (pending as carried state vs
  Number/Up/position/superposition) stays open — if it cannot be observed it
  cannot be learned. See `num-wkq.2`.
- (nothing else yet)

## Musings: branches and extensions

- The pending operand is currently invisible. A small ghost readout of what
  will be spent next might make chains legible before they're walked. Risk:
  clutter, and solving the puzzle for the player.
- Operators could alter the meaning of UP instead of the Number (from
  `_the_beginning.md`: an operator "might alter the meaning of UP"). A `−` that
  flips what counts as up for a few moves is a different game with the same
  atoms.
- Two-tile verbs: an operator that consumes the *next* tile too, so you steer
  an expression as it assembles.
- A variant where operators persist after use (tiles don't vanish here anyway,
  but an operator that weakens with each use would give the grid a memory).
- World design for verbs: rows of identical operators adjacent to one fat
  number reward chain-running; that's the level grammar this variant wants.
