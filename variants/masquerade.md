# Masquerade

**replace × none** — try on any identity, answer to none

Play: <https://maphew.github.io/number-up/play.html?variant=masquerade>
Registry: `src/variants.ts` → `VARIANTS.masquerade` (collision `replace`, failure `none`, world full)

## Hypothesis

Becoming without death. With survival out of the picture, the prediction is
that players invent their own goals: tour every number, chase a specific value,
hop between 9s. Self-set goals are the strongest evidence that the premise
generates play rather than demanding it. This is the variant most likely to
produce "wait, try going there" conversations in `_the_beginning.md`'s sense.

What would disprove it: with no stakes and no goal, identity swap is just
teleporting a label around a grid. If nothing emerges, replacement semantics
need stakes to matter, and Becoming's tightrope is the whole show.

## Rules in full

Same collision rule as Becoming:

- Numeric tile: Number is replaced by the tile's value.
- Operator and floor tiles: no effect.
- Failure (`none`): nothing ends the run. Number only changes identity.

## Feedback

- (nothing yet)

## Musings: branches and extensions

- The natural first self-set game is "touch every tile". A second is "end on a
  specific number". Both suggest the premise might want *targets* rather than
  scores; if players ask for targets, that's a design discovery worth its own
  variant, not a feature request.
- Operators are inert here, which makes them the only landmarks. Players may
  use them as furniture. If that reads as charming, static-operator worlds have
  a role; if it reads as broken, operators should do *something* under every
  rule.
- A value-quest variant: "become 100 exactly" using only replacement is a
  genuine little puzzle on a hand-authored grid, and needs no new primitives,
  only a target. Whether a target is a smuggled primitive is worth an explicit
  debate before building.
- Pairing with world gen makes identity tours non-repetitive.
