# Cadence

**eval × down** — operators are verbs; only a downward step ends the run

Play: <https://maphew.github.io/number-up/play.html?variant=cadence>
Registry: `src/variants.ts` → `VARIANTS.cadence` (collision `eval`, failure `down`, world b)

## Hypothesis

Verbs (eval × notUp) ships the verb grammar but makes every flat collision fatal:
floor, an equal number, and any operator that does not raise Number all read as
"Number did not go UP." That is a lot of death for learning a grammar. Cadence
keeps the grammar and only kills on DOWN, so floor, equal numbers, and repeated
operator steps are safe — you can stand on a tile and think, then invoke the next
verb.

The bet: once standing still is safe, you compose operator chains on purpose
("hold 6, then run the plus lane") instead of avoiding tiles. What would disprove
it: runs still end in a few moves. Then strict UP was not what made Verbs hard,
and the failure rule is not the thing to tune.

## Rules in full

- Numeric tile: Number is replaced by the tile's value, and the pending operand
  is set to that value.
- Operator tile: applies itself to (current Number, pending operand). An operator
  with no pending operand is *invalid* and still ends the run — you cannot carry
  "undefined" as a Number. A `÷` by zero is invalid likewise.
- Floor tile: no effect; safe.
- Failure (`down`): the run ends only when Number goes DOWN, or the result is
  invalid. A flat result (floor, an equal number, or an operator that returns the
  same value) is safe.

World b was rebuilt as an operator field: a ring of numbers around the start,
signs everywhere else, so the advertised "absorb a number, then run the signs"
loop exists. See `verbs.md` → Musings ("rows of identical operators adjacent to
one fat number").

## Feedback

- 2026-10-02 — New variant, filed with the softer-`down` push. Headless check
  (world b, eval × down): 0/4 first moves fatal; longest non-revisiting route 20
  moves, and plain greedy sustains 400+ (the grammar is now unbounded on purpose,
  as Verbs already was). Not yet play-tested by a human.
- (nothing else yet)

## Musings: branches and extensions

- The obvious A/B: same world b, Verbs (`notUp`) vs Cadence (`down`). Which
  teaches the verbs faster? The alpha review's R1 finding (pending operand was
  invisible) already showed the obstacle is legibility, not stakes.
- If Cadence is the one people finish dictionaries in, the failure-rule question
  narrows: is any death needed to make the verbs read as verbs?
- `down` + `add` (Accretion under the gentler rule) is nearly immortal on a
  numbers-only world — likely too soft to be interesting; not filed as a variant
  for that reason.
