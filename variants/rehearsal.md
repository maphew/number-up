# Rehearsal

**eval × none** — the full verb grammar, with the stakes removed

Play: <https://maphew.github.io/number-up/play.html?variant=rehearsal>
Registry: `src/variants.ts` → `VARIANTS.rehearsal` (collision `eval`, failure `none`, world b)

## Hypothesis

Verbs without the death rule. The point is observation, not challenge: with
nothing to lose, what do players do? If they keep hunting bigger Numbers and
composing chains out of pure curiosity, the superposition mechanic generates
play by itself and `notUp` is a garnish, not the engine. If play peters out in
a minute or two, failure was carrying the game, and the "failure is
fundamentally NUMBER NOT UP" hypothesis gains weight.

What would disprove it: bored wandering with no self-set goals. Note that
disproof here is *evidence for* the stakes variants, so the variant can't lose;
it can only inform.

## Rules in full

Same collision rule as Verbs:

- Numeric tile: Number is replaced by the tile's value, and the pending operand
  is set to that same value.
- Operator tile: the operator applies itself to (current Number, pending
  operand). With no pending operand the result is invalid.
- Failure (`none`): nothing ends the run. Invalid Numbers persist and display
  as INVALID; ÷ by 0 and operator-without-pending are the ways in.

## Feedback

- 2026-10-02 — No mechanics change (collapse experiment ships as opt-in
  `fallout`). Updated date unchanged.
- (nothing yet)

## Musings: branches and extensions

- Rehearsal is where new verb semantics should be tried before they carry
  stakes. New RULES entries can be prototyped here with zero risk of a death
  rule interacting confusingly.
- Worth watching: do invalid Numbers become a toy (players seek NaN on
  purpose)? If yes, invalidity is not failure but *another state of Number*,
  which `_the_beginning.md` hints at ("Number enters a domain where up is
  undefined").
- A future variant could make UP optional rather than absent: no death, but the
  observation area quietly reports longest streak of consecutive ups. Careful:
  a streak counter may be a persistent primitive in disguise. Test the
  temptation rather than ship it.
- Pair with world gen (`G`) and see whether players invent goals on
  unmemorized terrain.
