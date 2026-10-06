# Variants

A **variant** is one candidate answer to the core question, *what does superposition
mean?* Concretely it is a named combination of:

- a **collision rule** (how Number and the destination tile interact),
- a **failure rule** (what, if anything, ends the run),
- a suggested **starting world** (any world can be swapped in play with `N` / `G`),
- a **hypothesis**: what this variant exists to prove or disprove.

The registry in [`src/variants.ts`](../src/variants.ts) is the single source of truth. The
front page (<https://maphew.github.io/number-up/>) renders the catalogue straight
from it, and the game reads `?variant=<id>`. Long-form tracking for each variant
lives in its file here: rules, hypothesis, play feedback, and musings on branching.

Card copy follows the **shorthand plus a plain line** convention: the tagline
stays aphoristic, a `how` field states the mechanics in one plain sentence, and
the `hypothesis` is the bet written in plain second person. The lab notebooks
keep the fuller design register.

## The catalogue

### with stakes: one non-up move ends the run

| name | id | collision | failure | opens in | updated | notebook |
|------|----|-----------|---------|----------|---------|----------|
| Verbs | `verbs` | `eval` | `notUp` | world b | 2026-09-30 | [verbs.md](verbs.md) |
| Accretion | `accretion` | `add` | `notUp` | world a | 2026-09-30 | [accretion.md](accretion.md) |
| Becoming | `becoming` | `replace` | `notUp` | world c | 2026-09-30 | [becoming.md](becoming.md) |
| Fallout | `fallout` | `eval` | `notUp` | world `full` | 2026-10-02 | [fallout.md](fallout.md) |

### gentler stakes: only a downward step ends the run (flat is safe)

| name | id | collision | failure | opens in | updated | notebook |
|------|----|-----------|---------|----------|---------|----------|
| Relay | `relay` | `relay` | `down` | world `full` | 2026-10-06 | [relay.md](relay.md) |
| Plateau | `plateau` | `replace` | `down` | world c | 2026-10-02 | [plateau.md](plateau.md) |
| Cadence | `cadence` | `eval` | `down` | world b | 2026-10-02 | [cadence.md](cadence.md) |

### open field: nothing can hurt you

| name | id | collision | failure | opens in | updated | notebook |
|------|----|-----------|---------|----------|---------|----------|
| Rehearsal | `rehearsal` | `eval` | `none` | world b | 2026-09-30 | [rehearsal.md](rehearsal.md) |
| Hoarder | `hoarder` | `add` | `none` | world `full` | 2026-09-30 | [hoarder.md](hoarder.md) |
| Masquerade | `masquerade` | `replace` | `none` | world `full` | 2026-09-30 | [masquerade.md](masquerade.md) |

The catalogue renders newest-first within each stakes group (by `updated`,
see `GALLERY_ORDER` in `src/variants.ts`).

Any rule/fail pairing not in the registry shows as **custom** in the game's
VARIANT readout; it can still be reached with `?rule=` / `?fail=`.

## Worlds (rebuilt 2026-10-02)

The hand-authored worlds were random tile noise, so every variant died two or
three moves in (longest valid route 1–5 moves; world `full` killed 3 of the 4
first moves). They were recast around the grammar each collision rule rewards,
keeping the experiment semantics from `_the_beginning.md`:

- **world a** (Number + Number) — numbers only; zeros are the walls. Feeds
  Accretion.
- **world b** (Number + Operator) — an operator field with a number ring around
  the start, so "absorb a number, then run the signs" actually exists. Feeds
  Verbs, Rehearsal, Cadence.
- **world c** (UP vs DOWN) — an ascending route where the biggest neighbour is
  usually a dead end, so it is a route and not a greed walk. Feeds Becoming,
  Plateau.
- **world d** (Failure) — a mixed grid for testing DOWN / flat / invalid choices:
  an operator on the start ring is a named no-operand death, and a `0` beside a
  `÷` gives the invalid `÷0` case.
- **world full** (mixed) — the default board; a routing problem under collapse.
  Feeds Fallout, Hoarder, Masquerade.
- **world choosey** (num-dn2) — the rule-composition lab: every tile kind is
  offered (flat pairs, all four signs, a `0` beside a `÷`), and the rules come
  from a checkbox panel under the board. See the README's Worlds section for
  the composition semantics; it is a world, not a variant, so no notebook.

Every variant opening now has no fatal first move (0/4) and a longest route of at
least 7 moves; `test/world.test.js` enforces both.

## Adding a variant

1. Add an entry to `VARIANTS` in `src/variants.ts` (id, name, tagline, how, rule,
   fail, world, hypothesis). The name should come from the feature or rule that
   makes it different from every other variant. Write the tagline as shorthand,
   the `how` line in plain second person, and the hypothesis as the bet.
2. Copy the skeleton below into `variants/<id>.md` and fill it in.
3. That's it. The gallery picks it up on its next load, and
   `?variant=<id>` starts working immediately.

Skeleton:

```markdown
# <Name>

**<rule> × <fail>** — <tagline>

Play: https://maphew.github.io/number-up/play.html?variant=<id>
Registry: `src/variants.ts` → `VARIANTS.<id>`

## Hypothesis

What we hope to prove or disprove, and what observation would count as a verdict.

## Rules in full

The exact semantics, so future-us doesn't have to re-derive them from code.

## Feedback

- YYYY-MM-DD — (nothing yet)

## Musings: branches and extensions

Ideas for where this variant could go. Not commitments.
```

## Naming

Names are one word, earned by mechanics. When a new variant lands, try the
obvious literal description first ("you become what you touch") and compress it.
If two variants would wear the same name, they are probably the same variant.
