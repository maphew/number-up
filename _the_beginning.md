# Number Up — MVP / Superposition 0

We are exploring a tiny experimental game / piece of design-art whose working title is **Number Up**.

The premise is deliberately literal:

> **NUMBER UP**
>
> Objective: **make number go up.**

The title is also a linguistic joke: “number” is both the noun and, conceptually, the verb. We want to explore how much game can emerge from this extremely small ontology.

## Important: this is a design laboratory, not a production game

Do **not** prematurely turn this into a conventional incremental game, puzzle game, RPG, or math game.

We are trying to discover the core interaction by making something playable and feeling it.

Channel Bret Victor: make the underlying idea directly observable and manipulable. Prefer a tiny, fast, disposable prototype over architecture.

Do not spend time on:

* production architecture
* framework selection
* asset pipelines
* sound/music
* accounts/save systems
* procedural generation
* mobile support
* polish
* deployment infrastructure

Keep the implementation extremely easy to modify.

## Technology

For this prototype, use plain:

* HTML
* CSS
* JavaScript
* preferably SVG for the world/grid

No framework unless there is a compelling reason.

Keep the code small and obvious. The collision rule should be isolated so we can experiment with radically different interpretations without restructuring the application.

Production language/engine is explicitly **not decided yet**.

---

# Core conceptual model

There are initially only two fundamental concepts:

**NUMBER**

**UP**

Everything else should emerge from these rather than being introduced as conventional game mechanics.

The player is represented by a **central dot**.

But the dot isn't merely a character standing on top of a number:

> **The dot IS the current Number.**

Start with:

```text
Number = 0
```

The player moves through a spatial grid using:

* arrow keys
* numpad
* optionally WASD

Movement is the only player verb.

No interact button.
No attack button.
No "collect" button.

When the player moves into an adjacent cell, the current Number and whatever occupies that cell become **superposed**.

For example:

```text
┌───┬───┬───┐
│ 7 │ + │ 3 │
├───┼───┼───┤
│ × │ ● │ 9 │
├───┼───┼───┤
│ 2 │ − │ 4 │
└───┴───┴───┘

● = current Number
```

If Number is 0 and the player moves onto 9:

```text
0
+
9
```

becomes a **superposition event**.

Something happens.

**We deliberately do not yet know what.**

Do not assume ordinary arithmetic is the correct answer.

That is one of the things this prototype is supposed to help us discover.

---

# The key design question

For every superposition:

> **What happened to Number?**
>
> **Did Number go UP?**

That should be perceptually obvious.

Do not merely replace one number with another instantaneously.

We want to SEE the interaction:

```text
current Number
       +
destination
       ↓
 superposition
       ↓
     result
```

Experiment with a simple but satisfying transition where the two things visibly interact and a resulting Number emerges.

The animation should be fast enough not to impede play, but clear enough that we can understand the causal relationship.

---

# World

Start with a **5×5 grid**.

The player/current Number occupies the center.

The surrounding cells contain hand-authored numbers and operators.

For example:

```text
┌───┬───┬───┬───┬───┐
│ 7 │ + │ 3 │ × │ 8 │
├───┼───┼───┼───┼───┤
│ − │ 4 │ ÷ │ 9 │ + │
├───┼───┼───┼───┼───┤
│ 2 │ × │ ● │ − │ 6 │
├───┼───┼───┼───┼───┤
│ + │ 5 │ ÷ │ 1 │ × │
├───┼───┼───┼───┼───┤
│ 8 │ − │ 3 │ + │ 7 │
└───┴───┴───┴───┴───┘
```

This exact arrangement is not important.

Hand-author the initial world. We are testing interaction, not generation.

The world should visually feel like a place/environment, but **do not add decorative game-world concepts yet**.

---

# UI

There should be three conceptual regions.

## 1. Status / headline

Always visible.

At minimum:

```text
NUMBER UP

NUMBER    17
```

Potentially also:

```text
POSITION  0,0
```

But don't overcommit to exposing position to the player. It may primarily be useful during experimentation.

**Number is the score.**

Do NOT introduce:

* score
* HP
* XP
* coins
* energy
* lives
* inventory
* secondary currency

If we find ourselves wanting one of these, that's a design discovery — stop and examine why.

## 2. World

The grid and current player/Number.

The center dot should be visually distinct.

The player should always be able to tell:

* where Number currently is
* what is adjacent
* what they are about to collide with

## 3. Message / observation area

A small area for hints, observations, and debugging information.

Initially this can be relatively verbose because it is also a **design laboratory notebook**.

For example:

```text
You moved RIGHT.

SUPERPOSITION

0  +  9

Result: 9
Number went UP: YES
```

Make it easy to turn the verbosity down later.

Ideally support a developer/debug mode with more detail, without requiring code changes.

---

# Collision engine

Make the core operation conceptually:

```text
superpose(currentNumber, destinationTile) → result
```

This must be isolated and trivial to replace.

During development, we should be able to experiment with different candidate rules such as:

* replacement
* addition
* operator evaluation
* other interpretations

Do not decide which is "correct."

The point of the MVP is to let us try them.

A useful internal event record would contain something like:

```text
turn
direction
oldNumber
destinationTile
result
delta
wentUp
valid
```

Keep a run history/replay if it is cheap. It will be useful when comparing rules.

---

# Do not assume operators are conventional operators

`+`, `−`, `×`, `÷` are deliberately included because they are familiar, but we don't yet know what they mean in this universe.

An operator might:

* behave conventionally
* modify Number
* alter the meaning of UP
* interact with neighbouring numbers
* become something else entirely

The prototype should make experimentation easy.

Likewise, do not assume Number + Number must mean arithmetic.

---

# Failure / death

This is one of the most important unresolved design questions.

We specifically want to experiment with it.

Candidate possibilities include:

* Number decreases → death
* Number fails to increase → death
* Number becomes invalid → death
* Number becomes non-numeric / undefined → death
* Number enters a domain where "up" is undefined → death
* something else entirely

**Do not quietly pick one and build the rest of the game around it.**

Implement a simple provisional rule if needed, but isolate it so we can change it immediately.

The deeper design hypothesis we're exploring is:

> Perhaps failure is not "health reaches zero."
>
> Perhaps failure is fundamentally **NUMBER NOT UP**.

We don't know yet.

---

# Design principle: don't smuggle in extra primitives

This is extremely important.

If we invent:

* a multiplier resource
* move energy
* currency
* health
* experience
* inventory
* keys
* abilities

we may have accidentally escaped the premise.

Before adding any persistent concept, ask:

> Can this be expressed purely in terms of Number, Up, position, and superposition?

If not, don't add it without discussing why.

---

# First experiments

The MVP should support four experiments.

### A — Number + Number

A tiny world containing only numbers.

Question:

> What interaction between two Numbers feels intrinsically interesting?

### B — Number + Operator

Introduce `+ − × ÷`.

Question:

> Does an operator feel like a thing you collide with, or a verb you invoke?

### C — Intentionally UP vs DOWN

Construct a tiny hand-authored situation where different movement choices produce different numerical outcomes.

Question:

> Does the player naturally begin thinking "I need to figure out how to make Number go UP"?

### D — Failure

Create situations where Number can go down, stay unchanged, become invalid, etc.

Try different death/failure semantics.

Question:

> What makes failure feel like a natural consequence of the premise rather than a conventional game rule bolted onto it?

---

# What success looks like

The MVP is successful if, after playing it for a few minutes, we find ourselves saying things like:

> "Wait — try going THERE."

or:

> "Oh! I understand what that collision means now."

or, ideally:

> **"I want to see what happens if I do this."**

We are looking for **intrinsic curiosity generated by the superposition mechanic**.

We are NOT looking for:

* a polished game
* lots of content
* a complete progression system
* a clever math puzzle
* an impressive tech demo

The key question is:

> **What is the smallest interaction that makes me want to move again?**

Build the smallest thing that lets us answer that question.

---

## Deliverable

Produce a runnable local prototype.

It should be possible to launch it with essentially one command or by opening the HTML file.

Include a tiny README explaining:

* how to run it
* controls
* where the collision rule lives
* where the failure rule lives
* how to change the test world

Do not over-document.

Once it runs, **stop and let us play with it before adding features.**
