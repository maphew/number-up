# Accretion

**add × notUp** — everything you touch sticks; only growth keeps you alive

Play: <https://maphew.github.io/number-up/play.html?variant=accretion>
Registry: `variants.js` → `VARIANTS.accretion` (collision `add`, failure `notUp`, world a)

## Hypothesis

Experiment A from `_the_beginning.md`, answered the most conventional way: two
Numbers meet and their values add. The bet is that this is already a complete
game, because *make number go up* plus *one bad step ends it* forces route
planning through a sea of numbers. Operators are absent from world a, so all
tension comes from choosing a path where every number is bigger than the last.

What would disprove it: runs feel like account keeping. If the interesting part
is just "avoid small numbers" and the game flattens once Number outgrows the
grid (past ~40, every tile is a rounding error), addition alone doesn't hold a
game together and the lab should look elsewhere for the core interaction.

## Rules in full

- Numeric tile: Number becomes Number + tile value.
- Operator and floor tiles: no effect. Under world a there are none anyway.
- Failure (`notUp`): the run ends when Number goes DOWN, stays flat, or goes
  invalid. A `0` tile or an operator tile is death by flatness here.

## Feedback

- (nothing yet)

## Musings: branches and extensions

- Death by `0` tile makes zero interesting: it's a wall you can never afford to
  touch. Worlds could lean into zero lattices.
- A subtraction world (`+ −` only, no × ÷) would make each step a knife-edge:
  pick a number bigger than the tile or die. Might be the honest hardest variant.
- The scale problem: if small tiles stop mattering, the fix is relative UP
  (percentage growth required) rather than absolute. That's a different
  interpretation of "up" worth its own variant someday.
- Overlays with world gen: force world `gen` for a run so route planning can't
  be memorized.
- Extension: a world where numbers are mostly `1`, so the game is about
  *never stopping* rather than magnitude.
