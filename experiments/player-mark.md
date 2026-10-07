# Player mark: the Number, centrally (num-qhf)

**Goal** — make the current Number the player mark, centrally. The premise says
"the dot IS the current Number" (`_the_beginning.md:66`); the build rendered a
fixed amber disc with the value inside and a second, louder value in the header
(`#number`). The player's eye split: one glance at the position for *where*,
one up top for *how much*. This experiment makes the board mark authoritative
and retires the split.

Play: <https://maphew.github.io/number-up/play.html>
Bead: `num-qhf`. This is not a variant — no rule/fail/world changes — so it has
no catalogue entry, but the form here follows the variant notebooks on purpose.

## Hypothesis

A bare, amber, weight-700 numeral with a dark outline, stepped in
digit-count bands (1–2 / 3 / 4+), can *be* the player — no disc — and the
board mark can carry the up/down/flat signal itself. When that is true:

- a player can state their current Number after ~20 moves without looking at
  the top of the screen;
- asked "what are you?", they point at the board, not at the header;
- the header NUMBER readout can be demoted to debug-only without anyone losing
  track of their value.

The premise moves from *stated* to *built*: the thing you steer is the digit
itself, and you visibly get bigger as you grow (peripheral legibility —
magnitude readable without reading digits).

What would disprove it:

- the bare numeral reads as an ordinary tile — players mistake it for a
  pickup/wall, or "you" becomes findable only by motion; then typography
  (weight, size, outline, status flash) was not enough separation and some
  disc- or ring-borne identity was load-bearing;
- 5+ digits at touch width (~75px cells) are illegible or bleed into the
  neighbouring cell, i.e. the fit maths only worked on easy worlds;
- players keep glancing up for the value even with the header gone.

## The fit problem (why bands, not a scale)

The player's value is unbounded and the cell is fixed; any proportional
radius = k·value explodes across four orders of magnitude in an ×-chain
(9 → 81 → 729 → 6561 in three moves). Digit-count bands turn the room problem
into the point (a 4-digit you is a big you filling its cell) while staying
calm at thresholds. The pure maths lives in `src/fit.ts`:

- `digitBand(chars)` — 1–2 / 3 / 4+ bands.
- `fitFontSize(n, advanceRatio, maxWidth)` — largest font whose advance width
  fits the ink budget of the cell; closed form (no bisection needed for
  linear advance), so it is solved exactly.
- `pnumFont(chars, advanceRatio, cell)` — band base, then fit-clamped; the
  renderer applies the returned size directly.

The disc's chord constraint (widest chord at the text's vertical extent) is
retired *with* the disc: bare numerals are constrained by the cell box, not by
a circle's chord. The bead's radius bands (r≈34/42/47) were the disc reading
of the same constraint; the numeral reading reads as ink budget ≈ 0.94 of the
cell width.

The 0.6 advance ratio is **measured, not assumed**: `play.ts` measures a real
numeral with `getComputedTextLength()` at startup and again after fonts settle,
and passes the measured ratio into the pure functions. The 0.6 guess is only an
emergency default when the measurement API is unavailable (e.g. non-rendering
embeddings) — never the steady-state path.

Known compromises, recorded rather than hidden:

- `fmtNumber` caps the *string* at ~8 chars (exponential form past 6), so the
  fit function is exercised at 1..8 chars, not at 12. That cap is a rendering
  fact of the header era; it belongs to this experiment (a numerically exact
  but unreadable bowl of digits is not legible either).
- Abbreviation (1k / 1M) is the option to **reject**: the value is the entire
  subject of the game; "§D" style compression loses what the game is about.
- Option C (fixed disc + arc meter) added a second channel to decode; the
  disc is what removed the numeral from identity, so its meter inherits the
  claim without the delivery. Reject.
- Option E (trailing wake) is the strongest idea but multiplies against
  `animateSuperpose`, which already flies the tile/old-number and raises a
  delta glyph over the destination cell — the cell the player lands in. Held
  until the static mark proves itself (then re-cost the FX collision).

## The paired half

The up/down signal moves with the Number: `flashStatus` colours the board
mark, and the header keeps its flash only for debug viewers. If the Number
moved to the board and the flash stayed in the header, half the split would
survive and the header would be harder to drop. Same ground as num-bpq (quiet
normal play): the board doing this work is what lets the text narration stay
quiet.

## Feedback

- 2026-10-07 — Implemented A+B+F (disc dropped, band-scaled amber numeral
  with panel outline; status flash moved onto the mark; header readout
  debug-only). Verification, not preference-shaping: `test/fit.test.js` (13
  cases) locks the maths; the jsdom page harness (20 checks, in /tmp/kilo per
  AGENTS.md) boots the real bundle and plays:
  - disc gone (`#player` has no `<circle>`), mark renders "0" at 50u inline;
  - a 261-press add-walk crossed into band 1 (44px) and band 2 ("1002", 36px);
  - the up/invalid flashes land on `#player .pnum` (`.up` / `.down` classes
    observed where the Number lives);
  - `?layout=hex` boots, numeral scales to its smaller cell (45.4px < 50px).
  - Touch width (390px viewport → ~73px cells): band 0 renders 37px
    on-screen, 3 digits 32px, 5 digits 23px with 69px of ink in the 73px cell
    — inside at every ordinary band. The only sub-20px case is the 8-char
    exponential cap (~14px on a phone), reachable only past a six-digit you;
    recorded as the known compromise in place of the rejected abbreviation.
- 2026-10-07 — Two-axis review verdict, owned here: the **F-alone baseline
  (step 1) was skipped** — A+B+F landed in one commit, so "if players still
  track their value fine, the rest is optional" was never measured. That
  question is now closed by decision rather than by measurement: A+B
  shipped, and the replacement for the measurement is the human attention
  run tracked in the follow-up bead **num-1zh** (verdict writes back here). A fresh
  player sees the demoted header *and* the banded mark together; what the
  run must still answer is whether the mark earns its complexity, not
  whether the header was enough alone.
- 2026-10-07 — Review also found the arithmetic table hid a **per-glyph
  inversion** (scale-independent, so sharper than the phone-only framing I
  first typed): the mark grows in *spread* as digits accrue (4 digits span
  86u of the 100u cell), but its *glyphs shrink* — 36u type at 4 digits vs
  a tile's 44u, and the 5-digit fit-clamp pulls that to 31.3u. At-cap-height
  ≈ 25u→22u against a tile's ≈30u: as you get bigger, the strokes of you
  get smaller, which inverts the "you get bigger as you get bigger" promise
  at the digit level. The mark is still in-cell and still amber/700/outlined;
  machine-fixing it is blocked by the in-cell ink budget (any floor above
  the fit value overflows the cell). Goes to the human run's checks; the
  honest fallbacks the design section named remain (rework the budget, or
  accept + record here).
- (the attention observable — state your number without looking up, point at
  the board when asked what you are — needs a human run; everything
  machine-checkable above is locked)

## Musings: branches and extensions

- `?layout=hex` shrank the cell ~9–25% at equal board width; every size chosen
  here goes through the same fit function with the real cell span, so the two
  experiments cannot contradict — verify at least once on hex before closing.
- The old-number `fly` glyph is amber like the new mark; if that ever confuses
  "you" with "your shed value", the shed glyph is the one to re-tint.
- Dead state now reads as a dim numeral instead of a grey disc; if death walks
  past unnoticed the colour needs a partner (motion, sound already cue it).
