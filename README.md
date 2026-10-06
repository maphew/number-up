# NUMBER UP — superposition 0

A design-laboratory prototype. The full plan and intent live in `_the_beginning.md`.

The player is a central dot, and the dot **is** the current Number. Moving into a
cell is a superposition event: current Number + destination tile visibly interact
and a resulting Number emerges. What the operators mean, and what failure means,
are open questions — the prototype exists to let you feel candidate answers.

## Run

The front page at https://maphew.github.io/number-up/ is a catalogue of
**variants**: named rule-combinations, each a candidate answer to "what does
superposition mean?". Pick one and play. For local work, open `index.html`
directly or serve the folder, e.g. `python3 -m http.server 8123`.

On a phone (touch): the grid accepts swipes to move and taps to restart. The
shortcut chips below the map mirror the keyboard shortcuts and are clickable
with mouse or touch.

## Variants

Each variant pairs a collision rule with a failure rule and a starting world,
and carries a hypothesis it exists to test. The registry in `variants.js` is
the single source of truth; per-variant notebooks (hypothesis, feedback,
branching musings) live in `variants/`.

**With stakes** (one non-up move ends the run):

| variant | collision | failure | in one line |
|---------|-----------|---------|-------------|
| Verbs | `eval` | `notUp` | operators are verbs, numbers are fuel |
| Accretion | `add` | `notUp` | everything sticks; only growth keeps you alive |
| Becoming | `replace` | `notUp` | you become what you touch; smaller ends the run |
| Fallout | `eval` + collapse | `notUp` | every tile burns out behind you; routing is the game |

**Gentler stakes** (only a downward step ends the run; flat is safe):

| variant | collision | failure | in one line |
|---------|-----------|---------|-------------|
| Relay | `relay` | `down` | swap with numbers, pick up signs, spend them — consumption leaves holes |
| Plateau | `replace` | `down` | become tiles; only shrinking ends you |
| Cadence | `eval` | `down` | operators are verbs, without the flat-death |

**Open field** (nothing can hurt you):

| variant | collision | failure | in one line |
|---------|-----------|---------|-------------|
| Rehearsal | `eval` | `none` | the verb grammar, stakes removed |
| Hoarder | `add` | `none` | accumulation as a fidget toy |
| Masquerade | `replace` | `none` | identity swap with nothing to lose |

Any other rule/fail pairing plays as **custom** (shown in the header).
The failure rule is a candidate too: <kbd>F</kbd> cycles `notUp → down → none`
(`?fail=down` selects it directly).

## Controls

- Arrow keys / WASD / numpad (2 4 6 8): move — the only verb
- Touch: swipe the grid to move; tap the grid to restart a finished run
- `R` (or Enter): restart the run
- `Esc`: back to the variant catalogue
- `/`: toggle the lab-notebook debug panel (also `?debug=1`, round-tripped in
  the URL). Normal play stays quiet: the board shows the result beside the
  cell, blocked moves get one line, and only debug narrates the arithmetic.
  Debug shows pending operand, rule/fail/world/variant/seed, the full move
  log, run totals, and a copy-run dump for notebooks and bug reports.
- `M`: toggle sound cues. Every action gets a small, short, pre-generated
  (synthesized in-memory, no asset files) WebAudio cue: Number up plays happy,
  down sad, picking up an operator energised, consumption a hollow chomp,
  blocked moves a dull thud. The same cue also flashes a colour vignette at the
  edge of the screen on every action, so playing muted still *feels* it.
- `N`: next test world
- `G`: generate a fresh seeded world (`?world=gen&seed=N` is written to the URL,
  so the exact map can be shared)
- `C`: cycle collision rule
- `F`: cycle failure rule
- `X`: toggle collapse-to-floor (tiles burn out behind you; opt-in)
- `@` chip or the feedback line: send feedback with your current run state
  attached → maphew+number-up@gmail.com (full move log with pending operand,
  not just the last ten moves)
- Shortcut chips below the map (`R / N G C F X / @`) are clickable and perform
  each shortcut with mouse or touch
- URL params: `?variant=verbs|accretion|becoming|fallout|plateau|cadence|relay|rehearsal|hoarder|masquerade`
  (sets rule, failure, and starting world; takes precedence) or the lower-level
  `?world=full|a|b|c|d|gen&seed=N&rule=replace|add|eval|relay&fail=notUp|down|none&debug=1`
- URL param `?collapse=1` (or `X` key / collapse chip): tiles collapse to floor
  after collision — opt-in experiment, default off; the `fallout` variant sets
  it on. Replay-safe: `?collapse=0` forces it off.
- URL param `?layout=hex`: play the same worlds on a hexagonal lattice instead
  of the square grid (experiment; square stays the default and the gallery
  default). The board becomes pointy-top hexes in offset rows (odd-r) — every
  world's rows array reads as hex rows unchanged, and `?world=gen&seed=N`
  generates the same map for both layouts. Six neighbours per cell:

  | direction | keys |
  |-----------|------|
  | W / E (along the row) | `←` `→` / `A` `D` / numpad `4` `6` |
  | NW / NE | `Q` / `E` / numpad `7` `9` |
  | SW / SE | `Z` / `C` / numpad `1` `3` |

  Swipes snap to the nearest of the six neighbours by angle (a straight
  up/down swipe resolves NE/SE — hex rows have no north/south neighbour, and
  pressing `↑`/`↓`/`W`/`S` in hex explains that instead of moving). The
  rule-cycle shortcut moves from `C` to `V` in hex (`C` is now the SE move);
  the active mapping is always printed in the help row and the debug
  notebook.

## Where things live

- **Variant registry**: `src/variants.ts` → `VARIANTS`. Named rule × failure ×
  world combinations with a one-line hypothesis each. Both the front-page
  gallery (`index.html` + `gallery.js`) and the game (`play.html`) read it.
  Per-variant notebooks live in `variants/<id>.md`. Registry carries
  `updated` (meaningful-change date, shown on cards and in the notebook) and
  optional `collapse` (collapse-to-floor on).
- **Collision rule**: `engine.js` → `RULES`. Each rule is
  `superpose(currentNumber, destinationTile, ctx) → result`. Shipped candidates:
  `replace` (Number becomes the tile), `add` (Number plus tile), `eval`
  (numbers set a pending operand; operators apply themselves to current Number
  and that pending operand — one interpretation of "operator as verb").
- **Failure rule**: `engine.js` → `FAILURE_RULES`. Each rule is
  `failed(event) → reason or null`. Shipped candidates: `notUp` (provisional:
  the run ends when Number fails to go UP or becomes invalid), `down` (the
  gentler candidate: the run ends only when Number goes DOWN or becomes
  invalid, so flat is safe ground), and `none`.
- **Test worlds**: `world.js` → `WORLDS`. Hand-authored 5×5 rows of tiles
  (`+ − × ÷` or numbers); `.` marks the starting cell. `generateWorld(seed)`
  builds a deterministic random 5×5 grid the same shape. The hand-authored
  worlds are laid out around each variant's grammar (operator runs beside a big
  number for `eval`, an ascending route for `replace`, positive corridors for
  `add`, a routing problem for collapse) and every opening guarantees at least
  one survivable first move — `test/world.test.js` keeps them that way.
- **Lattice**: `lattice.ts` → `createSquareLattice` / `createHexLattice`.
  Pure board geometry behind one small interface: centres, steps (null =
  edge), swipe resolution, bounds, cell path. Square is the default;
  `?layout=hex` swaps in pointy-top hexes in odd-r offset rows (six
  neighbours, same world data). Covered by `test/lattice.test.js`.
- **Wiring, rendering, animation, input**: `main.js`; looks: `style.css`.
- **Front page**: `index.html` + `gallery.js` — the catalogue, rendered from
  `variants.js`. The game page is `play.html`; old deep links
  (`?world=…&rule=…`) redirect there automatically.

Every move appends an event
`{turn, direction, oldNumber, destinationTile, result, delta, wentUp, valid, failed, failReason, pendingAtEntry}`
to the engine's in-memory history. Normal play shows one quiet glyph line per
move; debug mode renders the full notebook (context, totals, log, copy-run).

## Do not add

No score, HP, XP, coins, energy, lives, inventory, or other primitives. If a new
persistent concept seems necessary, first ask: can it be expressed purely in
terms of Number, Up, position, and superposition?

Once it runs: stop, play, and only then change things.
