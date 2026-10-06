# Relay

**relay × down** — numbers trade places; signs ride on you until spent

Play: <https://maphew.github.io/number-up/play.html?variant=relay>
Registry: `src/variants.ts` → `VARIANTS.relay` (collision `relay`, failure `down`, world full)

## Hypothesis

You will start authoring collisions instead of reading them: grab a sign only
when you already know which number it should hit, and use swap as free
position-economy — nothing is ever a wall until you eat a hole into it. If the
board still reads as a static obstacle field you dodge, possession needs stakes
to become strategy.

## Rules in full

The fourth collision rule (after `replace`, `add`, `eval`), keyed `relay` in
`src/engine.ts`. It is the first rule with **possession** and **board edits**:
engine state `carried` (`Operator | null`, next to `pending`) and a per-move
`effect` on the event, rendered by `play.ts` through the matter overlay in
`src/world.ts`.

- Unarmed onto a **number**: the two numbers swap places. You become the
  tile's number; your old Number is painted on the cell you left (`swap`).
  Moving up/down is real — swaps can kill under `notUp`/`down` custom pairings.
- Unarmed onto an **operator**: it is picked up; you are **armed**. Number
  unchanged. Its cell becomes plain ground (`pickup`).
- Armed onto a **number**: the carried operator applies to
  (Number, tile number); the tile is **consumed**, leaving a hole (`consume`).
  The operator is spent — you are unarmed again.
- Armed onto another **operator**: you trade carried ops; the old one is
  dropped on the cell you entered (`opswap`). Discard is tactical.
- Armed or not, **floor / ground** tiles are plain moves; nothing disarms.
- A **hole** (`∅`) cannot be moved onto — blocked like the edge of the world.
  You may be standing on one you just ate; only entry is forbidden.
- Default pairing is `down` (gentler stakes): flat swaps and equal-number
  consumes are safe ground; only Number going DOWN, or an armed `÷0`,
  ends the run. `?rule=relay` with any other failure rule names a custom
  variant.

Sound/feel note: Relay launched together with the sound cues and vignette
(num-ak7). Picking up a sign is the *energised* cue; eating a number is a
hollow chomp followed by the happy/sad of its result. This carries to all
variants.

## Feedback

- 2026-10-06 — (nothing yet; try it and log what it felt like)

## Musings: branches and extensions

- Armed onto an operator as *trade* (old sign dropped at your feet) is a
  design call, not from the brief — it gives discards without an inventory.
  If it reads as noise, alternative: the move is simply blocked while armed.
- `notUp` + Relay is the obvious stakes pairing: swaps go down all the time,
  so it may be strictly harder than Verbs. Try it before writing it off.
- A hole field is a self-authored Fallout: Relay + collapse-to-floor composes
  (matter overlay wins over spent tiles, so holes stay holes).
- `÷0` while armed → NaN → invalid: under `none` the run survives with `✕`.
  Check how that *feels* before deciding if consumption should refuse.
- Sound ideas deferred: per-operator timbres, swap whoosh, pending hum.
