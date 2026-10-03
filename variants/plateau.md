# Plateau

**replace × down** — you become what you touch; only a downward step ends the run

Play: <https://maphew.github.io/number-up/play.html?variant=plateau>
Registry: `src/variants.ts` → `VARIANTS.plateau` (collision `replace`, failure `down`, world c)

## Hypothesis

Becoming (replace × notUp) makes every non-increase fatal, so its tightrope is
absolute: equal numbers are mutually fatal, and operator tiles are walls. Those
were accidents of the failure rule, not of replacement. Plateau removes the
flat-death and asks what identity-swap feels like once equal numbers, signs, and
floor are *safe ground*.

The bet: flat squares become route-planning tools. You step onto a tile your own
size to pause and look around instead of reading every non-bigger neighbour as a
wall. What would disprove it: players still just chase the biggest adjacent
number, never using a flat square. Then the strictness was the game, not a tax on
it — and Plateau is Becoming with its teeth pulled.

## Rules in full

- Numeric tile: Number is replaced by the tile's value.
- Operator tile: no effect; Number is unchanged, which is now *safe*.
- Floor tile: no effect; safe.
- Failure (`down`): the run ends only when Number goes DOWN. Flat is safe.
  A Number that becomes invalid is still fatal, because there is no Number left
  to carry (the engine treats invalid as its own death, not as flat).

## Feedback

- 2026-10-02 — New variant, filed with the softer-`down` push. World c was
  rebuilt as an ascending route so replacement has somewhere to go. Headless
  check (world c, replace × down): 0/4 first moves fatal; longest non-revisiting
  route 12 moves (`up 8 → left 9 → 10 → 11 → 12 → 19 → 20 → … → 25`). The
  greedy "always take the biggest neighbour" line dies at 4, so the world is a
  route, not a solved greed walk. Not yet play-tested by a human.
- (nothing else yet)

## Musings: branches and extensions

- Compare directly against Becoming on the same world: does the failure rule or
  the layout carry the feel? Same board, two stakes, one notebook each.
- Under `down`, a `−` operator can be a genuine plateau only if the result is
  exactly equal; most are drops. A world with `+0`-like tiles would be pure
  flats — check whether route-planning makes them precious or dull.
- Plateau is the natural home for the Becoming "swap with the tile" idea: with
  flat moves safe, the grid can be stirred without instant death.
