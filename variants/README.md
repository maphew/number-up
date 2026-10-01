# Variants

A **variant** is one candidate answer to the core question, *what does superposition
mean?* Concretely it is a named combination of:

- a **collision rule** (how Number and the destination tile interact),
- a **failure rule** (what, if anything, ends the run),
- a suggested **starting world** (any world can be swapped in play with `N` / `G`),
- a **hypothesis**: what this variant exists to prove or disprove.

The registry in [`variants.js`](../variants.js) is the single source of truth. The
front page (<https://maphew.github.io/number-up/>) renders the catalogue straight
from it, and the game reads `?variant=<id>`. Long-form tracking for each variant
lives in its file here: rules, hypothesis, play feedback, and musings on branching.

## The catalogue

### with stakes: one non-up move ends the run

| name | id | collision | failure | opens in | notebook |
|------|----|-----------|---------|----------|----------|
| Verbs | `verbs` | `eval` | `notUp` | world b | [verbs.md](verbs.md) |
| Accretion | `accretion` | `add` | `notUp` | world a | [accretion.md](accretion.md) |
| Becoming | `becoming` | `replace` | `notUp` | world c | [becoming.md](becoming.md) |

### open field: nothing can hurt you

| name | id | collision | failure | opens in | notebook |
|------|----|-----------|---------|----------|----------|
| Rehearsal | `rehearsal` | `eval` | `none` | world b | [rehearsal.md](rehearsal.md) |
| Hoarder | `hoarder` | `add` | `none` | world `full` | [hoarder.md](hoarder.md) |
| Masquerade | `masquerade` | `replace` | `none` | world `full` | [masquerade.md](masquerade.md) |

Any rule/fail pairing not in the registry shows as **custom** in the game's
VARIANT readout; it can still be reached with `?rule=` / `?fail=`.

## Adding a variant

1. Add an entry to `VARIANTS` in `variants.js` (id, name, tagline, rule, fail,
   world, hypothesis). The name should come from the feature or rule that makes
   it different from every other variant.
2. Copy the skeleton below into `variants/<id>.md` and fill it in.
3. That's it. The gallery picks it up on its next load, and
   `?variant=<id>` starts working immediately.

Skeleton:

```markdown
# <Name>

**<rule> × <fail>** — <tagline>

Play: https://maphew.github.io/number-up/play.html?variant=<id>
Registry: `variants.js` → `VARIANTS.<id>`

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
