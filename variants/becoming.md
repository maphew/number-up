# Becoming

**replace × notUp** — you become what you touch; touch smaller and the run ends

Play: <https://maphew.github.io/number-up/play.html?variant=becoming>
Registry: `src/variants.ts` → `VARIANTS.becoming` (collision `replace`, failure `notUp`, world c)

## Hypothesis

Replacement is the most literal reading of the superposition event: the Number
doesn't combine with the destination, it *becomes* it. The bet is that identity
swap plays as a tightrope. Your Number is always rented, never owned; every
move is a commitment to a new self, and survival means only ever touching a
bigger number. World c mixes operators and numbers, and under this rule an
operator tile leaves you unchanged, which is flat, which is death. Operators
become walls you must path around.

What would disprove it: if play reduces to "always step on the biggest adjacent
number", the variant is a solved greed walk with no feel of becoming anything.
The interesting outcome would be players treating it as *possession* rather
than arithmetic (wanting to be a 9, mourning a lost 9). That's the reading to
listen for.

## Rules in full

- Numeric tile: Number is replaced by the tile's value.
- Operator tile: no effect; Number stays as it was, which counts as flat.
- Floor tile: no effect.
- Failure (`notUp`): the run ends when Number goes DOWN, stays flat, or goes
  invalid. Note the edge case this creates: from Number 0 you can move onto
  anything 1 or larger, but two equal numbers adjacent to each other are
  mutually fatal stepping stones.

## Feedback

- (nothing yet)

## Musings: branches and extensions

- The operator-as-wall artifact is unintentional and interesting: a rule with
  no operator semantics still *implies* a world grammar for operators. A
  dedicated world of safe operator corridors and numeric stepping stones could
  become a maze variant.
- "Becoming" suggests memory. A variant where Number remembers the tiles it has
  been (a trail of past selves) smuggles in a persistent primitive; before
  adding one, ask whether it can be expressed as Number, Up, position,
  superposition. Probably not, which is itself a finding.
- Swap-with-the-tile: what if the destination tile takes your old value? The
  grid becomes a medium you stir. This breaks the "world is static" assumption
  and might be the first variant worth a new rule binding rather than a new
  pairing.
- Under `none` failure this variant is Masquerade. Compare: same mechanic,
  different stakes. If Masquerade is more fun, survival isn't what makes
  becoming interesting.
