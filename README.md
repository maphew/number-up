# NUMBER UP — superposition 0

A design-laboratory prototype. The full plan and intent live in `_the_beginning.md`.

The player is a central dot, and the dot **is** the current Number. Moving into a
cell is a superposition event: current Number + destination tile visibly interact
and a resulting Number emerges. What the operators mean, and what failure means,
are open questions — the prototype exists to let you feel candidate answers.

## Run

Play in the browser at https://maphew.github.io/number-up/ — no build, no
install. For local work, open `index.html` directly or serve the folder,
e.g. `python3 -m http.server 8123`.

On a phone (touch): serve the folder on your network, e.g.
`python3 -m http.server 8123`, then open `http://<your-machine-ip>:8123` on the
phone. The grid accepts swipes to move and taps to restart; an on-screen row of
`R / N C F /` buttons mirrors the keyboard shortcuts (shown on touch devices).

## Controls

- Arrow keys / WASD / numpad (2 4 6 8): move — the only verb
- Touch: swipe the grid to move; tap the grid to restart a finished run
- `R` (or Enter): restart the run
- `/`: toggle verbose debug observation (also `?debug=1`)
- `N`: next test world
- `G`: generate a fresh seeded world (`?world=gen&seed=N` is written to the URL,
  so the exact map can be shared)
- `C`: cycle collision rule
- `F`: cycle failure rule
- `@` (touch row) or the feedback line: send feedback with your current run state
  attached → maphew+number-up@gmail.com
- URL params: `?world=full|a|b|c|d|gen&seed=N&rule=replace|add|eval&fail=notUp|none&debug=1`

## Where things live

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

Every move appends an event
`{turn, direction, oldNumber, destinationTile, result, delta, wentUp, valid, failed, failReason}`
to the engine's in-memory history, visible in debug mode.

## Do not add

No score, HP, XP, coins, energy, lives, inventory, or other primitives. If a new
persistent concept seems necessary, first ask: can it be expressed purely in
terms of Number, Up, position, and superposition?

Once it runs: stop, play, and only then change things.
