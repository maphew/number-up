# Hoarder

**add × none** — everything sticks, nothing can hurt you

Play: <https://maphew.github.io/number-up/play.html?variant=hoarder>
Registry: `variants.js` → `VARIANTS.hoarder` (collision `add`, failure `none`, world full)

## Hypothesis

Accretion without death. The question is whether growth alone compels. This is
the control arm for the stakes experiments: if players keep route-optimizing
with nothing to lose, the pleasure is in the accumulation itself; if they stop
caring the moment dying is impossible, then UP-as-survival is doing the work in
every other variant, which is a big finding about the premise.

What would disprove it: players treat it as a fidget toy, number goes up, eyes
glaze. Even then it's useful; it marks the floor of the design space.

## Rules in full

Same collision rule as Accretion:

- Numeric tile: Number becomes Number + tile value.
- Operator and floor tiles: no effect.
- Failure (`none`): nothing ends the run. Number only grows or holds.

World full mixes operators into the texture; under addition they are safe
tiles, useful as rest stops and route decor.

## Feedback

- (nothing yet)

## Musings: branches and extensions

- Without death the only self-imposed games are coverage (touch everything) and
  magnitude (maximize the total after 20 moves). Both are worth listening for;
  either could become an explicit goal variant.
- The interesting tension for this variant is *stopping*. When do players put
  the phone down? If the answer is "when the number stops being fun to watch",
  the number display is doing all the work and deserves the design attention.
- A hoarder world with a few fat numbers ringed by walls of zeros: pure
  pilgrimage.
- Extension candidate: subtraction tiles that erode the hoard. Still no death,
  but loss becomes possible. Careful: erosion is close to HP by another name.
  If it gets added, it should be justified in Number/Up terms or rejected.
