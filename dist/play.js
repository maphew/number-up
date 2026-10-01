"use strict";
(() => {
  // src/engine.ts
  var OPS = {
    "+": (a, b) => a + b,
    "\u2212": (a, b) => a - b,
    "\xD7": (a, b) => a * b,
    "\xF7": (a, b) => b === 0 ? NaN : a / b
  };
  function isOperator(tile) {
    return Object.prototype.hasOwnProperty.call(OPS, tile);
  }
  function classify(tile) {
    if (isOperator(tile)) return "op";
    const n = Number(tile);
    return Number.isFinite(n) ? "num" : "floor";
  }
  function round(x) {
    return Math.round(x * 1e6) / 1e6;
  }
  var RULES = {
    replace: {
      name: "replacement",
      superpose(currentNumber, tile, ctx) {
        const kind = classify(tile);
        if (kind !== "num") return currentNumber;
        ctx.pending = Number(tile);
        return Number(tile);
      }
    },
    add: {
      name: "addition",
      superpose(currentNumber, tile, ctx) {
        const kind = classify(tile);
        if (kind === "op" || kind === "floor") return currentNumber;
        ctx.pending = Number(tile);
        return currentNumber + Number(tile);
      }
    },
    eval: {
      name: "operator evaluation",
      superpose(currentNumber, tile, ctx) {
        const kind = classify(tile);
        if (kind === "floor") return currentNumber;
        if (kind === "num") {
          ctx.pending = Number(tile);
          return Number(tile);
        }
        if (!isOperator(tile) || ctx.pending === null) return NaN;
        return OPS[tile](currentNumber, ctx.pending);
      }
    }
  };
  var FAILURE_RULES = {
    none: {
      name: "no failure",
      failed() {
        return null;
      }
    },
    notUp: {
      name: "NUMBER NOT UP",
      failed(ev) {
        if (!ev.valid) return "Number became invalid \u2014 UP is undefined here";
        if (ev.result < ev.oldNumber) return "Number went DOWN";
        if (ev.result === ev.oldNumber) return "Number did not go UP";
        return null;
      }
    }
  };
  function named(table, key, fallback) {
    return Object.prototype.hasOwnProperty.call(table, key) ? key : fallback;
  }
  function createEngine(ruleName, failureName) {
    const resolvedRule = named(RULES, ruleName, "eval");
    const resolvedFailure = named(FAILURE_RULES, failureName, "notUp");
    const rule = RULES[resolvedRule];
    const failure = FAILURE_RULES[resolvedFailure];
    let pending = null;
    let turn = 0;
    const history2 = [];
    return {
      get rule() {
        return rule;
      },
      get failure() {
        return failure;
      },
      get ruleName() {
        return resolvedRule;
      },
      get failureName() {
        return resolvedFailure;
      },
      get turn() {
        return turn;
      },
      get history() {
        return history2;
      },
      reset() {
        pending = null;
        turn = 0;
        history2.length = 0;
      },
      attempt(currentNumber, direction, tile) {
        const ctx = { pending };
        let result;
        try {
          result = rule.superpose(currentNumber, tile, ctx);
        } catch {
          result = NaN;
        }
        pending = ctx.pending;
        const valid = typeof result === "number" && Number.isFinite(result);
        const base = {
          turn: ++turn,
          direction,
          oldNumber: currentNumber,
          destinationTile: tile,
          rule: rule.name
        };
        const ev = valid ? {
          ...base,
          valid: true,
          result: round(result),
          delta: round(result - currentNumber),
          wentUp: result > currentNumber
        } : { ...base, valid: false, result: null, delta: null, wentUp: false };
        const failReason = failure.failed(ev);
        const move = { ...ev, failed: failReason !== null, failReason };
        history2.push(move);
        if (history2.length > 500) history2.shift();
        return move;
      }
    };
  }

  // src/world.ts
  var WORLDS = {
    full: {
      name: "Full \u2014 mixed grid",
      rows: [
        ["7", "+", "3", "\xD7", "8"],
        ["\u2212", "4", "\xF7", "9", "+"],
        ["2", "\xD7", ".", "6", "+"],
        ["+", "5", "\xF7", "1", "\xD7"],
        ["8", "\u2212", "3", "+", "7"]
      ]
    },
    a: {
      name: "A \u2014 Number + Number",
      rows: [
        ["3", "8", "2", "5", "9"],
        ["6", "1", "7", "4", "2"],
        ["9", "5", ".", "0", "3"],
        ["1", "4", "8", "2", "6"],
        ["5", "7", "0", "3", "8"]
      ]
    },
    b: {
      name: "B \u2014 Number + Operator",
      rows: [
        ["+", "4", "\u2212", "2", "\xD7"],
        ["9", "\xD7", "6", "+", "8"],
        ["\xF7", "1", ".", "7", "\xF7"],
        ["3", "+", "5", "\xD7", "2"],
        ["\u2212", "8", "+", "9", "\u2212"]
      ]
    },
    c: {
      name: "C \u2014 UP vs DOWN",
      rows: [
        ["4", "\u2212", "1", "9", "+"],
        ["2", "+", "7", "\xF7", "3"],
        ["\xD7", "5", ".", "9", "2"],
        ["8", "\xF7", "0", "+", "6"],
        ["+", "3", "\u2212", "1", "\xD7"]
      ]
    },
    d: {
      name: "D \u2014 Failure",
      rows: [
        ["9", "\u2212", "0", "\xD7", "3"],
        ["+", "\xF7", "5", "+", "7"],
        ["\xD7", "2", ".", "\u2212", "0"],
        ["\xF7", "4", "+", "1", "\xD7"],
        ["8", "\u2212", "6", "\xF7", "2"]
      ]
    }
  };
  var WORLD_ORDER = ["full", "a", "b", "c", "d"];
  function mulberry32(seed) {
    let a = seed | 0;
    return function() {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
      return (t ^ t >>> 7 ^ t >>> 14) >>> 0;
    };
  }
  var OPS2 = ["+", "\u2212", "\xD7", "\xF7"];
  function generateWorld(seed) {
    const rand = mulberry32(seed);
    const rows = [];
    for (let y = 0; y < 5; y++) {
      const row = [];
      for (let x = 0; x < 5; x++) {
        if (x === 2 && y === 2) {
          row.push(".");
          continue;
        }
        const op = OPS2[rand() % OPS2.length] ?? "+";
        row.push(rand() % 10 < 6 ? String(rand() % 10) : op);
      }
      rows.push(row);
    }
    return { name: `Generated #${seed}`, rows, seed };
  }
  function findStart(world2) {
    for (let y = 0; y < world2.rows.length; y++) {
      const row = world2.rows[y];
      if (row === void 0) continue;
      const x = row.indexOf(".");
      if (x !== -1) return { x, y };
    }
    const m = (world2.rows.length - 1) / 2;
    return { x: m, y: m };
  }

  // src/variants.ts
  var VARIANTS = {
    verbs: {
      name: "Verbs",
      tagline: "operators are verbs, numbers are fuel",
      how: "Touch a number to hold it. Then walk a row of plus signs to add it at every step.",
      rule: "eval",
      fail: "notUp",
      world: "b",
      hypothesis: "You will read the signs as moves to make, not obstacles to hit, holding a number and then running a row of signs on purpose. If you avoid the signs instead, the verb reading is ours, not yours."
    },
    accretion: {
      name: "Accretion",
      tagline: "everything you touch sticks; only growth keeps you alive",
      how: "Whatever number you touch adds to you. A zero or a sign does nothing, and doing nothing ends the run.",
      rule: "add",
      fail: "notUp",
      world: "a",
      hypothesis: "You can keep this going by picking a path where every tile grows you. If it turns into bookkeeping once your number passes 40, plain addition is not enough on its own."
    },
    becoming: {
      name: "Becoming",
      tagline: "you become what you touch; touch smaller and the run ends",
      how: "Touch a number and become it. Touch one your size or smaller, or a sign, and the run ends.",
      rule: "replace",
      fail: "notUp",
      world: "c",
      hypothesis: "You will feel every move as a commitment, because your number is rented, never owned. If you reduce it to chasing the biggest neighbour, the tightrope is just a greed walk."
    },
    rehearsal: {
      name: "Rehearsal",
      tagline: "the full verb grammar, with the stakes removed",
      how: "Touch a number to hold it, then let the signs act on it. Nothing can end the run, so try anything.",
      rule: "eval",
      fail: "none",
      world: "b",
      hypothesis: "With nothing to lose, you decide what the game is. If you keep hunting bigger numbers anyway, curiosity was never about the stakes. If you drift and stop, failure was doing the work all along."
    },
    hoarder: {
      name: "Hoarder",
      tagline: "everything sticks, nothing can hurt you",
      how: "Every number you touch adds to you, and nothing can hurt you. Grow as big as the grid allows.",
      rule: "add",
      fail: "none",
      world: "full",
      hypothesis: "You keep choosing paths even with no threat, or you drift once dying is impossible. Either way you tell us whether growing for its own sake is enough to keep you moving."
    },
    masquerade: {
      name: "Masquerade",
      tagline: "try on any identity, answer to none",
      how: "Touch a number and become it. No stakes here, so tour the grid, chase a number, or make up your own game.",
      rule: "replace",
      fail: "none",
      world: "full",
      hypothesis: "Once survival is off the table, you make up your own goals, and that is the evidence that the premise generates play by itself. If you just wander, becoming needs stakes to matter."
    }
  };
  function isVariantId(id) {
    return Object.prototype.hasOwnProperty.call(VARIANTS, id);
  }
  var VARIANT_ORDER = Object.keys(VARIANTS).filter(isVariantId);
  function getVariant(id) {
    if (!isVariantId(id)) return null;
    return { id, ...VARIANTS[id] };
  }
  function variantFor(ruleKey2, failKey2) {
    for (const id of VARIANT_ORDER) {
      const v = VARIANTS[id];
      if (v.rule === ruleKey2 && v.fail === failKey2) return { id, ...v };
    }
    return null;
  }

  // src/play.ts
  function mustEl(id) {
    const el = document.getElementById(id);
    if (el === null) throw new Error(`missing #${id}`);
    return el;
  }
  function isKeyOf(pool, key) {
    return Object.prototype.hasOwnProperty.call(pool, key);
  }
  function pickKey(key, pool, fallback) {
    return key !== null && isKeyOf(pool, key) ? key : fallback;
  }
  function isWorldKey(key) {
    return isKeyOf(WORLDS, key);
  }
  var params = new URLSearchParams(location.search);
  var IS_TOUCH = window.matchMedia("(pointer: coarse)").matches;
  var variantParam = params.get("variant");
  var rawWorld = params.get("world");
  var rawVariant = variantParam ? getVariant(variantParam) : null;
  var ruleKey = rawVariant ? rawVariant.rule : pickKey(params.get("rule"), RULES, "eval");
  var failKey = rawVariant ? rawVariant.fail : pickKey(params.get("fail"), FAILURE_RULES, "notUp");
  function resolveWorldKey(raw, variantWorld) {
    if (raw === "gen") return "gen";
    if (raw !== null && isWorldKey(raw)) return raw;
    return variantWorld ?? "full";
  }
  var state = {
    worldKey: resolveWorldKey(rawWorld, rawVariant?.world),
    genSeed: null,
    ruleKey,
    failKey,
    debug: params.get("debug") === "1",
    number: 0,
    pos: { x: 2, y: 2 },
    over: false,
    engine: createEngine(ruleKey, failKey)
  };
  if (state.worldKey === "gen") {
    const s = parseInt(params.get("seed") ?? "", 10);
    state.genSeed = Number.isInteger(s) && s > 0 ? s : Math.floor(Math.random() * 99999) + 1;
  }
  var CELL = 100;
  var mail = document.getElementById("feedback-mail");
  var els = {
    number: mustEl("number"),
    variantSub: document.getElementById("variant-sub-text"),
    position: mustEl("position"),
    ruleLabel: mustEl("rule-label"),
    failLabel: mustEl("fail-label"),
    worldLabel: mustEl("world-label"),
    observation: mustEl("observation"),
    history: mustEl("history"),
    feedbackLink: mail instanceof HTMLAnchorElement ? mail : null
  };
  var svg = mustEl("grid");
  var tileNodes = [];
  var playerNode;
  var playerNumberNode;
  var fxLayer;
  function world() {
    if (state.worldKey === "gen") {
      const seed = state.genSeed;
      if (seed === null) throw new Error("generated world has no seed");
      return generateWorld(seed);
    }
    return WORLDS[state.worldKey];
  }
  function currentVariant() {
    return variantFor(state.ruleKey, state.failKey);
  }
  function tileAt(x, y) {
    const row = world().rows[y];
    const tile = row?.[x];
    if (tile === void 0) throw new Error(`no tile at ${x},${y}`);
    return tile;
  }
  function ns(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) node.setAttribute(k, String(attrs[k]));
    return node;
  }
  function cellCenter(x, y) {
    return { cx: x * CELL + CELL / 2, cy: y * CELL + CELL / 2 };
  }
  function buildGrid() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    tileNodes = [];
    const rows = world().rows;
    for (let i = 0; i <= rows.length; i++) {
      svg.appendChild(ns("line", { x1: 0, y1: i * CELL, x2: rows.length * CELL, y2: i * CELL, class: "cell-line" }));
      svg.appendChild(ns("line", { x1: i * CELL, y1: 0, x2: i * CELL, y2: rows.length * CELL, class: "cell-line" }));
    }
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      if (row === void 0) continue;
      const nodes = [];
      tileNodes.push(nodes);
      for (let x = 0; x < row.length; x++) {
        const { cx, cy } = cellCenter(x, y);
        const glyph = row[x];
        if (glyph === void 0) continue;
        if (glyph === ".") {
          nodes.push(null);
          continue;
        }
        const text = ns("text", { x: cx, y: cy, class: isOperator(glyph) ? "tile op" : "tile" });
        text.textContent = glyph;
        svg.appendChild(text);
        nodes.push(text);
      }
    }
    fxLayer = ns("g", { id: "fx" });
    svg.appendChild(fxLayer);
    playerNode = ns("g", { id: "player" });
    playerNode.appendChild(ns("circle", { cx: 0, cy: 0, r: 30, class: "dot" }));
    playerNumberNode = ns("text", { x: 0, y: 1, class: "pnum" });
    playerNode.appendChild(playerNumberNode);
    svg.appendChild(playerNode);
  }
  function placePlayer() {
    const { cx, cy } = cellCenter(state.pos.x, state.pos.y);
    playerNode.style.transform = `translate(${cx}px, ${cy}px)`;
  }
  function fmtNumber(n) {
    return Number.isFinite(n) ? String(n) : "INVALID";
  }
  function statusClass(ev) {
    if (!ev.valid) return "down";
    if (ev.delta > 0) return "up";
    if (ev.delta < 0) return "down";
    return "flat";
  }
  function flashStatus(cls) {
    els.number.classList.remove("up", "down", "flat");
    void els.number.offsetWidth;
    if (cls) els.number.classList.add(cls);
    setTimeout(() => els.number.classList.remove(cls), 450);
  }
  function deltaGlyph(ev) {
    if (!ev.valid) return "\u2715 invalid";
    if (ev.delta > 0) return `\u2191 +${ev.delta}`;
    if (ev.delta < 0) return `\u2193 ${ev.delta}`;
    return "\u2014 \xB10";
  }
  function animateSuperpose(ev, from, to) {
    const dest = tileNodes[from.y]?.[from.x] ?? null;
    const { cx: fx, cy: fy } = cellCenter(from.x, from.y);
    const { cx: tx, cy: ty } = cellCenter(to.x, to.y);
    if (dest) {
      const fly = ns("text", { x: 0, y: 0, class: "fly", transform: `translate(${fx}px, ${fy}px)` });
      fly.textContent = ev.destinationTile;
      fxLayer.appendChild(fly);
      requestAnimationFrame(() => {
        fly.style.transform = `translate(${fx}px, ${fy}px)`;
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${tx}px, ${ty}px)`;
          fly.style.opacity = "0";
        });
      });
      setTimeout(() => fly.remove(), 500);
    }
    playerNumberNode.textContent = fmtNumber(state.number);
    playerNumberNode.classList.remove("pop");
    void playerNumberNode.getBoundingClientRect();
    playerNumberNode.classList.add("pop");
    const cls = statusClass(ev);
    const delta = ns("text", { x: 0, y: 0, class: `delta ${cls}` });
    delta.style.transform = `translate(${tx}px, ${ty - 44}px)`;
    delta.textContent = deltaGlyph(ev);
    fxLayer.appendChild(delta);
    setTimeout(() => delta.remove(), 700);
    flashStatus(cls);
  }
  function line(cls, text) {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    return div;
  }
  function showBlocked(direction) {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(line("", `You moved ${direction}.`));
    obs.appendChild(line("", ""));
    obs.appendChild(line("flat", "Blocked \u2014 edge of world."));
  }
  function showObservation(move, extra) {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(line("", `You moved ${move.direction}.`));
    obs.appendChild(line("", ""));
    obs.appendChild(line("", "SUPERPOSITION"));
    obs.appendChild(line("", ""));
    obs.appendChild(line("", `${fmtNumber(move.oldNumber)}  ${move.destinationTile}`));
    obs.appendChild(line("", ""));
    obs.appendChild(line("", `Result: ${move.valid ? fmtNumber(move.result) : "INVALID"}`));
    const deltaNote = move.valid ? `  (\u0394 ${move.delta > 0 ? "+" : ""}${move.delta})` : "";
    obs.appendChild(line(
      move.valid ? statusClass(move) : "down",
      `Number went UP: ${move.valid ? move.wentUp ? "YES" : "NO" : "\u2014"}${deltaNote}`
    ));
    if (extra) {
      obs.appendChild(line("", ""));
      obs.appendChild(extra);
    }
  }
  function showRunOver(ev) {
    const frag = document.createDocumentFragment();
    frag.appendChild(line("over", `RUN OVER \u2014 ${ev.failReason}.`));
    frag.appendChild(line("", `Survived ${ev.turn} move${ev.turn === 1 ? "" : "s"}, final Number ${fmtNumber(state.number)}.`));
    frag.appendChild(line("", IS_TOUCH ? "Tap the grid (or R) to restart." : "Press R to restart."));
    return frag;
  }
  function renderStatus() {
    els.number.textContent = fmtNumber(state.number);
    els.position.textContent = `${state.pos.x},${state.pos.y}`;
    if (els.variantSub) {
      const v = currentVariant();
      els.variantSub.textContent = v ? `${v.name} \u2014 ${v.tagline}` : `custom \u2014 ${state.ruleKey} \xD7 ${state.failKey}`;
      document.title = v ? `NUMBER UP \u2014 ${v.name}` : "NUMBER UP \u2014 custom";
    }
    els.ruleLabel.textContent = `${state.ruleKey} (${state.engine.rule.name})`;
    els.failLabel.textContent = `${state.failKey} (${state.engine.failure.name})`;
    els.worldLabel.textContent = `${state.worldKey} \u2014 ${world().name}`;
  }
  function feedbackHref() {
    const v = currentVariant();
    const lines = [
      `World: ${state.worldKey} \u2014 ${world().name}`,
      `Variant: ${v ? `${v.name} (${v.id})` : `custom \u2014 ${state.ruleKey} \xD7 ${state.failKey}`}`,
      `Collision rule: ${state.ruleKey} (${state.engine.rule.name})`,
      `Failure rule: ${state.failKey} (${state.engine.failure.name})`,
      `Number: ${fmtNumber(state.number)} after ${state.engine.turn} move${state.engine.turn === 1 ? "" : "s"}`,
      "",
      "Last moves:",
      ...state.engine.history.slice(-10).map((ev) => `${ev.turn} ${ev.direction} ${ev.oldNumber} ${ev.destinationTile} \u2192 ${ev.valid ? ev.result : "INVALID"}`),
      "",
      "What happened / what should have happened:"
    ];
    return `mailto:maphew+number-up@gmail.com?subject=${encodeURIComponent("NUMBER UP feedback")}&body=${encodeURIComponent(lines.join("\n"))}`;
  }
  function openFeedback() {
    location.href = feedbackHref();
  }
  function renderHistory() {
    const rows = state.engine.history.slice(-8).map((ev) => {
      const outcome = ev.valid ? `\u2192 ${ev.result} (\u0394 ${ev.delta > 0 ? "+" : ""}${ev.delta}) ${ev.wentUp ? "UP" : "not up"}` : "\u2192 INVALID";
      return `${String(ev.turn).padStart(3)} ${ev.direction.padEnd(5)} ${ev.oldNumber} ${ev.destinationTile} ${outcome}${ev.failed ? `  \u2620 ${ev.failReason}` : ""}`;
    });
    els.history.textContent = rows.join("\n");
  }
  function render() {
    placePlayer();
    playerNumberNode.textContent = fmtNumber(state.number);
    playerNode.classList.toggle("dead", state.over);
    renderStatus();
    if (els.feedbackLink) els.feedbackLink.href = feedbackHref();
    if (state.debug) renderHistory();
  }
  var DIRECTIONS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };
  function tryMove(name) {
    if (state.over) {
      const obs = els.observation;
      obs.textContent = "";
      obs.appendChild(line("", `You moved ${name.toUpperCase()}.`));
      obs.appendChild(line("", ""));
      obs.appendChild(line("flat", IS_TOUCH ? "Run is over \u2014 tap the grid to restart." : "Run is over \u2014 press R to restart."));
      return;
    }
    const step = DIRECTIONS[name];
    if (!step) return;
    const nx = state.pos.x + step.dx;
    const ny = state.pos.y + step.dy;
    const size = world().rows.length;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
      playerNode.classList.remove("pop");
      void playerNode.getBoundingClientRect();
      playerNode.classList.add("pop");
      showBlocked(name);
      return;
    }
    const from = { ...state.pos };
    const ev = state.engine.attempt(state.number, name.toUpperCase(), tileAt(nx, ny));
    state.number = ev.valid ? ev.result : NaN;
    state.pos = { x: nx, y: ny };
    render();
    animateSuperpose(ev, from, state.pos);
    showObservation(ev, ev.failed ? showRunOver(ev) : null);
    if (ev.failed) state.over = true;
    render();
  }
  function restart(message) {
    applyEngine();
    state.number = 0;
    state.pos = findStart(world());
    state.over = false;
    buildGrid();
    syncUrl();
    render();
    const v = currentVariant();
    const variantNote = v ? ` Variant ${v.name}.` : "";
    els.observation.textContent = message || `World ${state.worldKey} \u2014 ${world().name}.${variantNote} Number = 0.${IS_TOUCH ? " Swipe the grid to move." : ""}`;
    if (state.debug) renderHistory();
  }
  function syncUrl() {
    try {
      const p = new URLSearchParams(location.search);
      p.set("world", state.worldKey);
      if (state.worldKey === "gen") p.set("seed", String(state.genSeed));
      else p.delete("seed");
      const v = currentVariant();
      if (v) p.set("variant", v.id);
      else p.delete("variant");
      p.set("rule", state.ruleKey);
      p.set("fail", state.failKey);
      history.replaceState(null, "", `${location.pathname}?${p}`);
    } catch {
    }
  }
  function cycle(order, key) {
    const i = order.findIndex((item) => item === key);
    const next = order[(i + 1) % order.length];
    if (next === void 0) throw new Error("empty cycle");
    return next;
  }
  function nextWorld() {
    state.worldKey = cycle(WORLD_ORDER, state.worldKey);
    restart();
  }
  function nextGenerated() {
    state.worldKey = "gen";
    state.genSeed = Math.floor(Math.random() * 99999) + 1;
    restart(`World gen \u2014 ${world().name}. Number = 0.`);
  }
  function nextRule() {
    state.ruleKey = cycle(["replace", "add", "eval"], state.ruleKey);
    restart(`Collision rule \u2192 ${state.ruleKey} (${state.engine.rule.name}). Number = 0.`);
  }
  function nextFailure() {
    state.failKey = cycle(["notUp", "none"], state.failKey);
    restart(`Failure rule \u2192 ${state.failKey} (${state.engine.failure.name}). Number = 0.`);
  }
  function applyEngine() {
    state.engine = createEngine(state.ruleKey, state.failKey);
  }
  var KEYS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    Numpad8: "up",
    Numpad2: "down",
    Numpad4: "left",
    Numpad6: "right"
  };
  function toggleDebug() {
    state.debug = !state.debug;
    document.body.classList.toggle("debug", state.debug);
    document.querySelector('#help [data-action="debug"]')?.classList.toggle("on", state.debug);
    if (state.debug) renderHistory();
  }
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const move = KEYS[e.key] || KEYS[e.code];
    if (move) {
      e.preventDefault();
      tryMove(move);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "r" || e.key === "Enter") {
      e.preventDefault();
      restart();
    } else if (e.key === "Escape") {
      location.href = "index.html";
    } else if (k === "/") {
      e.preventDefault();
      toggleDebug();
    } else if (k === "n") {
      nextWorld();
    } else if (k === "g") {
      nextGenerated();
    } else if (k === "c") {
      nextRule();
    } else if (k === "f") {
      nextFailure();
    }
  });
  document.getElementById("help")?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest("button[data-action]");
    if (!(btn instanceof HTMLElement)) return;
    const action = btn.getAttribute("data-action");
    if (action === "restart") restart();
    else if (action === "debug") toggleDebug();
    else if (action === "catalogue") location.href = "index.html";
    else if (action === "world") nextWorld();
    else if (action === "worldgen") nextGenerated();
    else if (action === "rule") nextRule();
    else if (action === "fail") nextFailure();
    else if (action === "feedback") openFeedback();
  });
  var touchStart = null;
  var SWIPE_MIN = 24;
  svg.addEventListener("touchstart", (e) => {
    if (e.changedTouches.length !== 1) return;
    e.preventDefault();
    const t = e.changedTouches.item(0);
    if (!t) return;
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  svg.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });
  svg.addEventListener("touchend", (e) => {
    if (!touchStart || e.changedTouches.length !== 1) return;
    e.preventDefault();
    const t = e.changedTouches.item(0);
    if (!t) return;
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_MIN) {
      if (state.over) restart();
      return;
    }
    tryMove(ax > ay ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up");
  }, { passive: false });
  svg.addEventListener("touchcancel", () => {
    touchStart = null;
  }, { passive: false });
  if (state.debug) document.body.classList.add("debug");
  restart();
})();
//# sourceMappingURL=play.js.map
