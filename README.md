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

| variant | collision | failure | in one line |
|---------|-----------|---------|-------------|
| Verbs | `eval` | `notUp` | operators are verbs, numbers are fuel |
| Accretion | `add` | `notUp` | everything sticks; only growth keeps you alive |
| Becoming | `replace` | `notUp` | you become what you touch; smaller ends the run |
| Rehearsal | `eval` | `none` | the verb grammar, stakes removed |
| Hoarder | `add` | `none` | accumulation as a fidget toy |
| Masquerade | `replace` | `none` | identity swap with nothing to lose |

Any other rule/fail pairing plays as **custom** (shown in the header).

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
- `N`: next test world
- `G`: generate a fresh seeded world (`?world=gen&seed=N` is written to the URL,
  so the exact map can be shared)
- `C`: cycle collision rule
- `F`: cycle failure rule
- `@` chip or the feedback line: send feedback with your current run state
  attached → maphew+number-up@gmail.com (full move log with pending operand,
  not just the last ten moves)
- Shortcut chips below the map (`R / N G C F / @`) are clickable and perform
  each shortcut with mouse or touch
- URL params: `?variant=verbs|accretion|becoming|rehearsal|hoarder|masquerade`
  (sets rule, failure, and starting world; takes precedence) or the lower-level
  `?world=full|a|b|c|d|gen&seed=N&rule=replace|add|eval&fail=notUp|none&debug=1`

## Where things live

- **Variant registry**: `variants.js` → `VARIANTS`. Named rule × failure ×
  world combinations with a one-line hypothesis each. Both the front-page
  gallery (`index.html` + `gallery.js`) and the game (`play.html`) read it.
  Per-variant notebooks live in `variants/<id>.md`.
- **Collision rule**: `engine.js` → `RULES`. Each rule is
  `superpose(currentNumber, destinationTile, ctx) → result`. Shipped candidates:
  `replace` (Number becomes the tile), `add` (Number plus tile), `eval`
  (numbers set a pending operand; operators apply themselves to current Number
  and that pending operand — one interpretation of "operator as verb").
- **Failure rule**: `engine.js` → `FAILURE_RULES`. Each rule is
  `failed(event) → reason or null`. Shipped candidates: `notUp` (provisional:
  the run ends when Number fails to go UP or becomes invalid) and `none`.
- **Test worlds**: `world.js` → `WORLDS`. Hand-authored 5×5 rows of tiles
  (`+ − × ÷` or numbers); `.` marks the starting cell. `generateWorld(seed)`
  builds a deterministic random 5×5 grid the same shape.
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
