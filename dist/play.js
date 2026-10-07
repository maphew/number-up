"use strict";
(() => {
  // src/world.ts
  var WORLD_RECAST = "2026-10-02 19:50 PDT";
  var WORLDS = {
    full: {
      name: "Full \u2014 mixed grid",
      updated: WORLD_RECAST,
      rows: [
        ["7", "+", "3", "\xD7", "8"],
        ["\u2212", "4", "5", "9", "+"],
        ["2", "3", ".", "6", "+"],
        ["+", "5", "4", "1", "\xD7"],
        ["8", "\u2212", "3", "+", "7"]
      ]
    },
    a: {
      name: "A \u2014 Number + Number",
      updated: WORLD_RECAST,
      rows: [
        ["3", "8", "2", "5", "9"],
        ["6", "1", "7", "4", "2"],
        ["0", "5", ".", "4", "3"],
        ["1", "4", "8", "2", "6"],
        ["5", "7", "0", "3", "8"]
      ]
    },
    b: {
      name: "B \u2014 Number + Operator",
      updated: WORLD_RECAST,
      rows: [
        ["\xD7", "+", "+", "+", "\xD7"],
        ["+", "+", "9", "+", "+"],
        ["+", "6", ".", "7", "+"],
        ["+", "+", "3", "+", "+"],
        ["\xD7", "+", "+", "+", "\xD7"]
      ]
    },
    c: {
      name: "C \u2014 UP vs DOWN",
      updated: WORLD_RECAST,
      rows: [
        ["1", "2", "3", "4", "5"],
        ["10", "9", "8", "7", "6"],
        ["11", "12", ".", "14", "15"],
        ["20", "19", "18", "17", "16"],
        ["21", "22", "23", "24", "25"]
      ]
    },
    d: {
      name: "D \u2014 Failure",
      updated: WORLD_RECAST,
      rows: [
        ["9", "\u2212", "1", "\xD7", "4"],
        ["+", "7", "\xD7", "3", "8"],
        ["\xD7", "2", ".", "6", "\u2212"],
        ["5", "\xF7", "0", "+", "9"],
        ["3", "\xD7", "8", "\u2212", "2"]
      ]
    },
    // num-dn2: the rule-composition lab — the tiles offer every tile kind
    // (flat pairs, every sign, a 0 sitting on a ÷ trap), but which rules apply
    // is decided by the ticked checkbox list under the board (play.ts wires
    // the panel; the engine composes them first-applicable-wins).
    choosey: {
      name: "Choosey \u2014 you pick the rules",
      updated: "2026-10-05 23:00 PDT",
      rows: [
        ["+", "+", "+", "+", "+"],
        ["+", "6", "9", "9", "\xD7"],
        ["+", "5", ".", "7", "+"],
        ["6", "\xD7", "6", "0", "\xF7"],
        ["+", "+", "\u2212", "+", "8"]
      ]
    }
  };
  var WORLD_ORDER = ["full", "a", "b", "c", "d", "choosey"];
  var COLLAPSED_TILE = "floor";
  var HOLE = "\u2205";
  function createBoardOverlay(rows) {
    const shown = /* @__PURE__ */ new Map();
    return {
      tileAt(x, y) {
        const tile = rows[y]?.[x];
        if (tile === void 0) throw new Error(`no tile at ${x},${y}`);
        const m = shown.get(`${x},${y}`);
        return m === void 0 ? tile : m;
      },
      set(x, y, glyph) {
        shown.set(`${x},${y}`, glyph);
      }
    };
  }
  function mulberry32(seed) {
    let a = seed | 0;
    return function() {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
      return (t ^ t >>> 7 ^ t >>> 14) >>> 0;
    };
  }
  var OPS = ["+", "\u2212", "\xD7", "\xF7"];
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
        const op = OPS[rand() % OPS.length] ?? "+";
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

  // src/engine.ts
  var OPS2 = {
    "+": (a, b) => a + b,
    "\u2212": (a, b) => a - b,
    "\xD7": (a, b) => a * b,
    "\xF7": (a, b) => b === 0 ? NaN : a / b
  };
  function isOperator(tile) {
    return Object.prototype.hasOwnProperty.call(OPS2, tile);
  }
  function classify(tile) {
    if (tile === "") return "floor";
    if (tile === "HOLE" || tile === HOLE) return "floor";
    if (isOperator(tile)) return "op";
    const n = Number(tile);
    return Number.isFinite(n) ? "num" : "floor";
  }
  function round(x) {
    if (!Number.isFinite(x)) return null;
    if (Number.isInteger(x) && Math.abs(x) <= Number.MAX_SAFE_INTEGER) return x;
    return Math.round(x * 1e6) / 1e6;
  }
  var RULES = {
    replace: {
      name: "replacement",
      superpose(currentNumber, tile, ctx) {
        const kind = classify(tile);
        if (kind !== "num") return currentNumber;
        ctx.applied = true;
        ctx.pending = Number(tile);
        return Number(tile);
      }
    },
    add: {
      name: "addition",
      superpose(currentNumber, tile, ctx) {
        const kind = classify(tile);
        if (kind === "op" || kind === "floor") return currentNumber;
        ctx.applied = true;
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
          ctx.applied = true;
          ctx.pending = Number(tile);
          return Number(tile);
        }
        if (!isOperator(tile)) return NaN;
        ctx.applied = true;
        if (ctx.pending === null) {
          ctx.noOperand = tile;
          return NaN;
        }
        return OPS2[tile](currentNumber, ctx.pending);
      }
    },
    relay: {
      name: "relay \u2014 swap \xB7 arm \xB7 consume",
      superpose(currentNumber, tile, ctx) {
        const armed = ctx.carried ?? null;
        const kind = classify(tile);
        if (kind === "floor") return currentNumber;
        if (kind === "num") {
          ctx.applied = true;
          if (armed !== null) {
            ctx.carried = null;
            ctx.effect = { kind: "consume" };
            return OPS2[armed](currentNumber, Number(tile));
          }
          ctx.effect = { kind: "swap" };
          return Number(tile);
        }
        if (!isOperator(tile)) return NaN;
        ctx.applied = true;
        ctx.carried = tile;
        ctx.effect = armed === null ? { kind: "pickup" } : { kind: "opswap", dropped: armed };
        return currentNumber;
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
        if (!ev.valid) {
          if (ev.noOperand !== void 0) return `${ev.noOperand} had no number to act on`;
          return "That move was impossible \u2014 it made no number";
        }
        if (ev.result < ev.oldNumber) return "Your number went down";
        if (ev.result === ev.oldNumber) return "Your number did not go up";
        return null;
      }
    },
    down: {
      name: "NUMBER WENT DOWN",
      failed(ev) {
        if (!ev.valid) {
          if (ev.noOperand !== void 0) return `${ev.noOperand} had no number to act on`;
          return "That move was impossible \u2014 your number vanished";
        }
        if (ev.result < ev.oldNumber) return "Your number went down";
        return null;
      }
    }
  };
  function named(table, key, fallback) {
    return Object.prototype.hasOwnProperty.call(table, key) ? key : fallback;
  }
  function listChecks(table, picked) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const k of picked) {
      if (seen.has(k)) continue;
      if (Object.prototype.hasOwnProperty.call(table, k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }
  function createEngine(ruleName, failureName) {
    const resolvedRule = named(RULES, ruleName, "eval");
    const resolvedFailure = named(FAILURE_RULES, failureName, "notUp");
    return createEngineFrom([resolvedRule], [resolvedFailure], false);
  }
  function createChooseyEngine(checks) {
    return createEngineFrom(
      listChecks(RULES, checks.rules),
      listChecks(FAILURE_RULES, checks.fails),
      true
    );
  }
  function createEngineFrom(components, enders, asChoosey) {
    const composite = components.length !== 1 || enders.length !== 1;
    const firstRule = components[0] ?? "replace";
    const firstEnder = enders[0] ?? "notUp";
    const rule = composite ? {
      name: "choosey \u2014 first ticked rule that fits the tile",
      superpose(currentNumber, tile, ctx) {
        for (const key of components) {
          const probe = { pending: ctx.pending, carried: ctx.carried };
          const result = RULES[key].superpose(currentNumber, tile, probe);
          if (probe.applied) {
            ctx.pending = probe.pending;
            ctx.carried = probe.carried;
            ctx.noOperand = probe.noOperand;
            ctx.effect = probe.effect;
            return result;
          }
        }
        return currentNumber;
      }
    } : RULES[firstRule];
    const failure = composite ? {
      name: "choosey \u2014 first ticked run-ender to fire",
      failed(ev) {
        for (const key of enders) {
          const reason = FAILURE_RULES[key].failed(ev);
          if (reason !== null) return reason;
        }
        return null;
      }
    } : FAILURE_RULES[firstEnder];
    const resolvedRule = composite ? "choosey" : asChoosey ? "choosey" : firstRule;
    const resolvedFailure = composite ? "choosey" : asChoosey ? "choosey" : firstEnder;
    const ruleList = [...components];
    const enderList = [...enders];
    let pending = null;
    let carried = null;
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
      get ruleChecks() {
        return ruleList;
      },
      get failureChecks() {
        return enderList;
      },
      get turn() {
        return turn;
      },
      get history() {
        return history2;
      },
      get pending() {
        return pending;
      },
      get carried() {
        return carried;
      },
      reset() {
        pending = null;
        carried = null;
        turn = 0;
        history2.length = 0;
      },
      attempt(currentNumber, direction, tile) {
        const pendingBefore = pending;
        const carriedBefore = carried;
        const ctx = { pending, carried: carriedBefore };
        let result;
        try {
          result = rule.superpose(currentNumber, tile, ctx);
        } catch {
          result = NaN;
        }
        pending = ctx.pending;
        carried = ctx.carried ?? null;
        const noOperand = ctx.noOperand;
        const effect = ctx.effect ?? { kind: "none" };
        const valid = typeof result === "number" && Number.isFinite(result);
        const base = {
          turn: ++turn,
          direction,
          oldNumber: currentNumber,
          destinationTile: tile,
          rule: rule.name,
          pendingAtEntry: pendingBefore,
          carriedAtEntry: carriedBefore,
          effect,
          noOperand
        };
        const rounded = valid ? round(result) : null;
        const delta = valid ? round(result - currentNumber) : null;
        const ev = valid ? {
          ...base,
          valid: true,
          result: rounded ?? result,
          delta: delta ?? result - currentNumber,
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

  // src/fit.ts
  var INK = 0.94;
  var BAND_BASE = [0.5, 0.44, 0.36];
  function digitBand(chars) {
    if (chars <= 2) return 0;
    if (chars === 3) return 1;
    return 2;
  }
  function fitFontSize(digitCount, advanceRatio2, maxWidth) {
    return maxWidth / (advanceRatio2 * digitCount);
  }
  function pnumFont(chars, advanceRatio2, cellSize) {
    const band = digitBand(chars);
    const base = BAND_BASE[band] * cellSize;
    const max = fitFontSize(chars, advanceRatio2, cellSize * INK);
    return { fontSize: Math.min(base, max), band };
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
      hypothesis: "You will read the signs as moves to make, not obstacles to hit, holding a number and then running a row of signs on purpose. If you avoid the signs instead, the verb reading is ours, not yours.",
      updated: "2026-09-30"
    },
    accretion: {
      name: "Accretion",
      tagline: "everything you touch sticks; only growth keeps you alive",
      how: "Whatever number you touch adds to you. A zero or a sign does nothing, and doing nothing ends the run.",
      rule: "add",
      fail: "notUp",
      world: "a",
      hypothesis: "You can keep this going by picking a path where every tile grows you. If it turns into bookkeeping once your number passes 40, plain addition is not enough on its own.",
      updated: "2026-09-30"
    },
    becoming: {
      name: "Becoming",
      tagline: "you become what you touch; touch smaller and the run ends",
      how: "Touch a number and become it. Touch one your size or smaller, or a sign, and the run ends.",
      rule: "replace",
      fail: "notUp",
      world: "c",
      hypothesis: "You will feel every move as a commitment, because your number is rented, never owned. If you reduce it to chasing the biggest neighbour, the tightrope is just a greed walk.",
      updated: "2026-09-30"
    },
    rehearsal: {
      name: "Rehearsal",
      tagline: "the full verb grammar, with the stakes removed",
      how: "Touch a number to hold it, then let the signs act on it. Nothing can end the run, so try anything.",
      rule: "eval",
      fail: "none",
      world: "b",
      hypothesis: "With nothing to lose, you decide what the game is. If you keep hunting bigger numbers anyway, curiosity was never about the stakes. If you drift and stop, failure was doing the work all along.",
      updated: "2026-09-30"
    },
    hoarder: {
      name: "Hoarder",
      tagline: "everything sticks, nothing can hurt you",
      how: "Every number you touch adds to you, and nothing can hurt you. Grow as big as the grid allows.",
      rule: "add",
      fail: "none",
      world: "full",
      hypothesis: "You keep choosing paths even with no threat, or you drift once dying is impossible. Either way you tell us whether growing for its own sake is enough to keep you moving.",
      updated: "2026-09-30"
    },
    masquerade: {
      name: "Masquerade",
      tagline: "try on any identity, answer to none",
      how: "Touch a number and become it. No stakes here, so tour the grid, chase a number, or make up your own game.",
      rule: "replace",
      fail: "none",
      world: "full",
      hypothesis: "Once survival is off the table, you make up your own goals, and that is the evidence that the premise generates play by itself. If you just wander, becoming needs stakes to matter.",
      updated: "2026-09-30"
    },
    plateau: {
      name: "Plateau",
      tagline: "you become what you touch; only a downward step ends the run",
      how: "Touch a number and become it. Touch one smaller than you and the run ends. Equal numbers, signs, and floor are safe ground.",
      rule: "replace",
      fail: "down",
      world: "c",
      hypothesis: 'With flat ground allowed, becoming stops being a strict-increase tightrope: equal numbers and operator tiles become resting squares you can plan from. If play still reduces to chasing the biggest neighbour, the tightrope was the game; if you route through flat squares, "up" alone was never the point.',
      updated: "2026-10-02"
    },
    cadence: {
      name: "Cadence",
      tagline: "operators are verbs; only a downward step ends the run",
      how: "Touch a number to hold it, then let the signs act on it. A flat result \u2014 floor, or a number equal to yours \u2014 is safe; only Number going down, or a sign that yields no Number, ends the run.",
      rule: "eval",
      fail: "down",
      world: "b",
      hypothesis: "Once standing still is safe, the verb grammar can be experimented with instead of feared, with no dying to every operator or equal number. If runs still collapse in a few moves, strict UP was not what made Verbs hard; if they lengthen into composition, the flat death was punishing learning, not play.",
      updated: "2026-10-02"
    },
    fallout: {
      name: "Fallout",
      tagline: "every tile burns out behind you; routing is the game",
      how: "Walk like Verbs, but every tile you touch collapses to floor and re-entry ends the run. Plan a route that never revisits.",
      rule: "eval",
      fail: "notUp",
      world: "full",
      hypothesis: "With re-entry fatal, you will plan routes instead of mashing loops. If world full becomes a 5-move puzzle with a best Number near 243, finiteness reads as routing, not as shortness.",
      updated: "2026-10-02",
      collapse: true
    },
    relay: {
      name: "Relay",
      tagline: "numbers trade places; signs ride on you until spent",
      how: "Walk onto a number unarmed and you two swap places. Walk onto a sign to pick it up, now armed; the next number you touch takes its operator and is consumed, leaving a hole nothing can enter.",
      rule: "relay",
      fail: "down",
      world: "full",
      hypothesis: "You will start authoring collisions instead of reading them: grab a sign only when you already know which number it should hit, and use swap as free position-economy since nothing is ever a wall until you eat a hole into it. If the board still reads as a static obstacle field you dodge, possession needs stakes to become strategy.",
      updated: "2026-10-06"
    }
  };
  function isVariantId(id) {
    return Object.prototype.hasOwnProperty.call(VARIANTS, id);
  }
  var VARIANT_ORDER = Object.keys(VARIANTS).filter(isVariantId);
  var GALLERY_ORDER = [...VARIANT_ORDER].sort(
    (a, b) => VARIANTS[b].updated.localeCompare(VARIANTS[a].updated)
  );
  function getVariant(id) {
    if (!isVariantId(id)) return null;
    return { id, ...VARIANTS[id] };
  }
  function variantFor(ruleKey2, failKey2, collapse = false) {
    for (const id of VARIANT_ORDER) {
      const v = VARIANTS[id];
      if (v.rule === ruleKey2 && v.fail === failKey2 && (v.collapse ?? false) === collapse)
        return { id, ...v };
    }
    return null;
  }

  // src/plain.ts
  var RULE_LONG = {
    replace: "Touch a number and become it: your whole number is traded for what you touched. Signs and empty ground do nothing.",
    add: "Every number you touch is added onto yours. Signs and empty ground do nothing.",
    eval: "Touch a number to pick it up and hold it, and the signs will use it. Touch a sign (+ \u2212 \xD7 \xF7) and it does its thing to you with the number you're holding: + grows you by it, \u2212 shrinks you, \xD7 multiplies, \xF7 splits you down.",
    relay: "Numbers trade places with you when you step on them. Sign tiles hop onto you \u2014 you carry one, and the next number you touch, the sign spends itself on that number and eats it, leaving a pit nothing can enter."
  };
  var RULE_SHORT = {
    replace: "become the tile",
    add: "tiles add up",
    eval: "signs act",
    relay: "trade & pocket"
  };
  var FAILURE_LONG = {
    none: "Nothing can end the run. Walk as long as you like.",
    notUp: "Growth is the only safe step: if your number does not get bigger \u2014 flat, smaller, or an impossible move \u2014 the run ends.",
    down: "Only a smaller number ends the run. Standing flat is safe."
  };
  var FAILURE_SHORT = {
    none: "nothing can end it",
    notUp: "only growing counts",
    down: "only shrinking ends it"
  };
  var COLLAPSE_LONG = "Tiles you have stepped on vanish behind you. Stepping back on one does nothing.";
  var WORLD_LONG = {
    full: "A bit of everything: numbers and all four signs.",
    a: "Nothing but numbers \u2014 the zeros are the walls.",
    b: "A number ring at the start, and a good long run of plus signs.",
    c: "Numbers climb away from the start; the biggest neighbours are quietly traps.",
    d: "Built to test losing on purpose: a sign beside the start has no number to act on, and a 0 sits beside a \xF7.",
    choosey: "The rules are not fixed \u2014 tick them on and off in the boxes under the board.",
    gen: "A random 5\xD75 map. The same seed always makes the same map."
  };
  function rulesJoined(rules) {
    return rules.map((r) => RULE_SHORT[r] ?? r).join(" + ") || "nothing ticked";
  }
  function failsJoined(fails) {
    return fails.map((f) => FAILURE_SHORT[f] ?? f).join(" + ") || "nothing can end it";
  }
  var GLOSSARY = [
    ["you", "the amber numeral on the board \u2014 it IS your number, and it grows in steps as you do."],
    ["sign", "any of the four math tiles: + \u2212 \xD7 \xF7."],
    ["holding a number", "you picked a number up by touching it; the next sign will use it."],
    ["carrying a sign", "you stepped on a sign and it came with you, waiting to be spent."],
    ["pit", "a tile that got eaten \u2014 nothing can move onto it again."],
    ["run", "one walk, from the start until a run-ender fires (or forever)."],
    ["world", "the map you are walking: full, a, b, c, d, choosey, or a generated one."],
    ["variant", "a named pairing of touch rules + run-ender + starting map, on the front page."]
  ];
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function variantSuffix(collapse) {
    return collapse ? " \u269B" : "";
  }
  function renderRulesReference(target, hrefFor) {
    target.textContent = "";
    target.appendChild(el("h3", "ref-title", "A few words"));
    const glossary = el("ul", "ref-list");
    for (const [term, plain] of GLOSSARY) {
      const item = el("li", "ref-item");
      item.appendChild(el("span", "ref-key", term));
      item.appendChild(el("span", "ref-plain", plain));
      glossary.appendChild(item);
    }
    target.appendChild(glossary);
    const rules = Object.keys(RULES);
    const fails = Object.keys(FAILURE_RULES);
    target.appendChild(el("h3", "ref-title", "Touch rules \u2014 what touching a tile does"));
    const rulesList = el("ul", "ref-list");
    for (const key of rules) {
      const item = el("li", "ref-item");
      item.appendChild(el("span", "ref-key", `${key} \u2014 ${RULE_SHORT[key]}`));
      item.appendChild(el("span", "ref-plain", RULE_LONG[key]));
      rulesList.appendChild(item);
    }
    target.appendChild(rulesList);
    target.appendChild(el("h3", "ref-title", "Run-enders \u2014 what can end the run"));
    const endersList = el("ul", "ref-list");
    for (const key of fails) {
      const item = el("li", "ref-item");
      item.appendChild(el("span", "ref-key", `${key}: ${FAILURE_SHORT[key]}`));
      item.appendChild(el("span", "ref-plain", FAILURE_LONG[key]));
      endersList.appendChild(item);
    }
    target.appendChild(endersList);
    target.appendChild(el("h3", "ref-title", "Lookup \u2014 every named rules pairing"));
    const table = el("table", "ref-table");
    const head = el("tr", "ref-row");
    head.appendChild(el("th", "ref-cell head", "touch rule"));
    for (const key of fails) head.appendChild(el("th", "ref-cell head", FAILURE_SHORT[key]));
    table.appendChild(head);
    for (const ruleKey2 of rules) {
      const row = el("tr", "ref-row");
      row.appendChild(el("th", "ref-cell head", `${ruleKey2} \u2014 ${RULE_SHORT[ruleKey2]}`));
      for (const failKey2 of fails) {
        const names = [];
        for (const id of VARIANT_ORDER) {
          const v = VARIANTS[id];
          if (v.rule === ruleKey2 && v.fail === failKey2) {
            const a = el("a", "ref-link", `${v.name}${variantSuffix(v.collapse ?? false)}`);
            a.setAttribute("href", hrefFor({ id, ...v }));
            names.push(a);
          }
        }
        const cell = el("td", "ref-cell");
        if (!names.length) {
          cell.textContent = "\u2014 (custom)";
        } else {
          names.forEach((a, i) => {
            if (i > 0) cell.appendChild(el("span", "ref-sep", " \xB7 "));
            cell.appendChild(a);
          });
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    target.appendChild(table);
    target.appendChild(el("p", "ref-note", "\u269B = the tiles also vanish behind you after you step on them."));
    target.appendChild(el("h3", "ref-title", "Worlds \u2014 the maps"));
    const worldsList = el("ul", "ref-list");
    for (const key of Object.keys(WORLDS)) {
      const item = el("li", "ref-item");
      item.appendChild(el("span", "ref-key", `${key} \u2014 ${WORLDS[key].name}`));
      item.appendChild(el("span", "ref-plain", WORLD_LONG[key]));
      const openers = VARIANT_ORDER.filter((id) => VARIANTS[id].world === key).map((id) => VARIANTS[id].name);
      item.appendChild(el("span", "ref-meta", openers.length ? `opens for: ${openers.join(", ")}` : "opens for: choosey + any custom pairing you point here"));
      worldsList.appendChild(item);
    }
    target.appendChild(worldsList);
    target.appendChild(el("p", "ref-note", 'Any other pairing plays as "custom". URL params: ?rule=replace|add|eval|relay &fail=notUp|down|none &world=full|a|b|c|d|choosey|gen &seed=N &variant=<name>.'));
  }

  // src/lattice.ts
  var SQUARE_STEPS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  function createSquareLattice(cols, rows, cell) {
    return {
      id: "square",
      directions: ["up", "down", "left", "right"],
      stepLength: cell,
      centre(x, y) {
        return { cx: x * cell + cell / 2, cy: y * cell + cell / 2 };
      },
      step(x, y, dir) {
        const d = SQUARE_STEPS[dir];
        if (!d) return null;
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
        return { x: nx, y: ny };
      },
      nearest(_x, _y, vx, vy) {
        return Math.abs(vx) > Math.abs(vy) ? vx > 0 ? "right" : "left" : vy > 0 ? "down" : "up";
      },
      bounds() {
        return { minX: 0, minY: 0, width: cols * cell, height: rows * cell };
      },
      cellPath() {
        return null;
      }
    };
  }
  var SQRT3 = Math.sqrt(3);
  var HEX_STEPS = {
    E: () => [1, 0],
    W: () => [-1, 0],
    NE: (y) => [y & 1, -1],
    SE: (y) => [y & 1, 1],
    NW: (y) => [(y & 1) - 1, -1],
    SW: (y) => [(y & 1) - 1, 1]
  };
  var HEX_DIRS = ["NE", "NW", "E", "W", "SE", "SW"];
  function round6(n) {
    return Math.round(n * 1e6) / 1e6;
  }
  function createHexLattice(cols, rows, r) {
    const hw = SQRT3 * r;
    const vh = 1.5 * r;
    const vec = {
      NE: [hw / 2, -vh],
      NW: [-hw / 2, -vh],
      E: [hw, 0],
      W: [-hw, 0],
      SE: [hw / 2, vh],
      SW: [-hw / 2, vh]
    };
    return {
      id: "hex",
      directions: HEX_DIRS,
      stepLength: hw,
      centre(x, y) {
        return { cx: hw * (x + (y & 1) / 2), cy: vh * y };
      },
      step(x, y, dir) {
        const f = HEX_STEPS[dir];
        if (!f) return null;
        const [dx, dy] = f(y);
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return null;
        return { x: nx, y: ny };
      },
      nearest(_x, _y, vx, vy) {
        let best = HEX_DIRS[0] ?? "NE";
        let bestDot = -Infinity;
        for (const dir of HEX_DIRS) {
          const [ux, uy] = vec[dir];
          const dot = vx * ux + vy * uy;
          if (dot > bestDot) {
            bestDot = dot;
            best = dir;
          }
        }
        return best;
      },
      bounds() {
        return {
          minX: -hw / 2,
          minY: -r,
          width: hw * (cols + 0.5),
          height: vh * (rows - 1) + 2 * r
        };
      },
      cellPath(cx, cy) {
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const a = (60 * k - 90) * Math.PI / 180;
          pts.push(`${round6(cx + r * Math.cos(a))} ${round6(cy + r * Math.sin(a))}`);
        }
        return `M${pts.join(" L")}Z`;
      }
    };
  }

  // src/debug.ts
  function fmtNum(n) {
    return Number.isFinite(n) ? String(n) : "INVALID";
  }
  function fmtPending(p) {
    return p === null ? "\u2014" : String(p);
  }
  function summariseRun(history2) {
    const totals = {
      turns: history2.length,
      peak: null,
      final: null,
      up: 0,
      down: 0,
      flat: 0,
      invalid: 0
    };
    let peak = null;
    const consider = (n) => {
      if (!Number.isFinite(n)) return;
      if (peak === null || n > peak) peak = n;
    };
    for (const ev of history2) {
      consider(ev.oldNumber);
      if (!ev.valid) {
        totals.invalid++;
        continue;
      }
      consider(ev.result);
      if (ev.delta > 0) totals.up++;
      else if (ev.delta < 0) totals.down++;
      else totals.flat++;
    }
    totals.peak = peak;
    const last = history2[history2.length - 1];
    totals.final = last === void 0 || !last.valid ? null : last.result;
    return totals;
  }
  function formatMoveLog(history2, from) {
    return history2.map((ev, i) => {
      const outcome = ev.valid ? `\u2192 ${ev.result} (\u0394 ${ev.delta > 0 ? "+" : ""}${ev.delta}) ${ev.wentUp ? "UP" : "not up"}` : "\u2192 INVALID";
      const kind = ev.destinationTile === "." ? "start" : classify(ev.destinationTile);
      const at = from?.[i];
      const pos = at === void 0 || at === null ? "" : ` from ${at.x},${at.y}`;
      const fail = ev.failed && ev.failReason ? `  \u2620 ${ev.failReason}` : "";
      const arm = ev.carriedAtEntry == null ? "" : ` arm=${ev.carriedAtEntry}`;
      return `${String(ev.turn).padStart(3)} ${ev.direction.padEnd(5)}${pos} ${fmtNum(ev.oldNumber)} ${ev.destinationTile} [${kind}] ${outcome} pending=${fmtPending(ev.pendingAtEntry)}${arm}${fail}`;
    });
  }
  function formatRunDump(ctx, history2, from) {
    const totals = summariseRun(history2);
    const lines = [
      "NUMBER UP \u2014 run dump",
      ...ctx.appVersion !== void 0 ? [`Version: ${ctx.appVersion}`] : [],
      `Variant: ${ctx.variantLabel}`,
      ...ctx.variantUpdated !== void 0 ? [`Experiment updated: ${ctx.variantUpdated}`] : [],
      ...ctx.variantHypothesis !== void 0 ? [`Hypothesis: ${ctx.variantHypothesis}`] : [],
      `World: ${ctx.worldKey} \u2014 ${ctx.worldName}`,
      `Collision rule: ${ctx.ruleKey} (${ctx.ruleName})`,
      `Failure rule: ${ctx.failKey} (${ctx.failName})`,
      `Seed: ${ctx.seed === null ? "\u2014" : String(ctx.seed)}`,
      `URL: ${ctx.url}`,
      `Number: ${fmtNum(ctx.number)}`,
      ...ctx.carried ? [`Armed operator: ${ctx.carried}`] : [],
      `Turns ${totals.turns} \xB7 peak ${totals.peak === null ? "\u2014" : totals.peak} \xB7 final ${totals.final === null ? "\u2014" : totals.final} \xB7 up ${totals.up} \xB7 down ${totals.down} \xB7 flat ${totals.flat} \xB7 invalid ${totals.invalid}`,
      "",
      "Log:",
      ...formatMoveLog(history2, from)
    ];
    return lines.join("\n");
  }

  // src/sound.ts
  var SR_BASE = 44100;
  function waveAt(wave, phase) {
    switch (wave) {
      case "sine":
        return Math.sin(phase);
      case "tri":
        return Math.asin(Math.sin(phase)) * (2 / Math.PI);
      case "square":
        return Math.sin(phase) >= 0 ? 0.7 : -0.7;
      case "noise":
        return Math.random() * 2 - 1;
    }
  }
  var RECIPES = {
    happy: {
      dur: 0.13,
      voices: [
        { wave: "sine", f0: 523, f1: 784, amp: 0.5, dur: 0.12, tau: 0.05 },
        { wave: "sine", f0: 1046, f1: 1568, amp: 0.16, dur: 0.11, tau: 0.04 }
      ]
    },
    sad: {
      dur: 0.19,
      voices: [
        { wave: "sine", f0: 415, f1: 262, amp: 0.5, dur: 0.17, tau: 0.07 },
        { wave: "sine", f0: 208, f1: 131, amp: 0.2, dur: 0.17, tau: 0.08 }
      ]
    },
    flat: {
      dur: 0.07,
      voices: [{ wave: "sine", f0: 330, amp: 0.3, dur: 0.06, tau: 0.025 }]
    },
    pickup: {
      dur: 0.18,
      voices: [
        { wave: "tri", f0: 659, amp: 0.45, dur: 0.05, tau: 0.02 },
        { wave: "tri", f0: 988, amp: 0.4, onset: 0.03, dur: 0.06, tau: 0.02 },
        { wave: "tri", f0: 1319, amp: 0.45, onset: 0.06, dur: 0.11, tau: 0.03 },
        { wave: "sine", f0: 2637, amp: 0.08, onset: 0.07, dur: 0.08, tau: 0.02 }
      ]
    },
    consume: {
      dur: 0.16,
      voices: [
        { wave: "noise", f0: 0, amp: 0.4, dur: 0.06, tau: 0.025, attack: 2e-3 },
        { wave: "sine", f0: 196, f1: 98, amp: 0.45, dur: 0.15, tau: 0.07 }
      ]
    },
    blocked: {
      dur: 0.09,
      voices: [
        { wave: "square", f0: 96, amp: 0.28, dur: 0.08, tau: 0.035, attack: 2e-3 },
        { wave: "sine", f0: 64, amp: 0.2, dur: 0.08, tau: 0.04, attack: 2e-3 }
      ]
    },
    over: {
      dur: 0.6,
      voices: [
        { wave: "sine", f0: 311, f1: 98, amp: 0.5, dur: 0.55, tau: 0.2 },
        { wave: "sine", f0: 156, f1: 49, amp: 0.25, dur: 0.55, tau: 0.22 }
      ]
    },
    start: {
      dur: 0.1,
      voices: [
        { wave: "tri", f0: 392, amp: 0.3, dur: 0.06, tau: 0.03 },
        { wave: "tri", f0: 660, amp: 0.2, onset: 0.04, dur: 0.05, tau: 0.02 }
      ]
    }
  };
  function createSoundKit() {
    let enabled = true;
    let unlocked = false;
    let ctx = null;
    let master = null;
    const buffers = /* @__PURE__ */ new Map();
    function render2(recipe) {
      const c = ctx;
      const sr = c.sampleRate || SR_BASE;
      const n = Math.ceil(recipe.dur * sr);
      const buf = c.createBuffer(1, n, sr);
      const data = buf.getChannelData(0);
      for (const v of recipe.voices) {
        const onset = v.onset ?? 0;
        const attack = v.attack ?? 4e-3;
        const tau = v.tau ?? recipe.dur / 2;
        const f0 = v.f0;
        const f1 = v.f1 ?? v.f0;
        const tSpan = Math.max(v.dur, 1e-4);
        let phase = 0;
        const i0 = Math.floor(onset * sr);
        const i1 = Math.min(n, Math.floor((onset + tSpan) * sr));
        for (let i = i0; i < i1; i++) {
          const t = (i - i0) / sr;
          const r = f1 / f0;
          const f = f1 === void 0 ? f0 : f0 * Math.exp(Math.log(r) * (t / tSpan));
          phase += 2 * Math.PI * f / sr;
          if (t < attack) {
            data[i] = (data[i] ?? 0) + waveAt(v.wave, phase) * (t / attack) * v.amp;
            continue;
          }
          const back = Math.exp(-(t - attack) / tau);
          data[i] = (data[i] ?? 0) + waveAt(v.wave, phase) * back * v.amp;
        }
      }
      return buf;
    }
    function ensure() {
      if (ctx !== null && master !== null) {
        return;
      }
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (AC === void 0) {
        enabled = false;
        return;
      }
      try {
        ctx = new AC();
      } catch {
        enabled = false;
        return;
      }
      master = ctx.createGain();
      master.gain.value = 0.15;
      master.connect(ctx.destination);
      for (const sig of Object.keys(RECIPES)) {
        buffers.set(sig, render2(RECIPES[sig]));
      }
    }
    return {
      // Returns whether the cue is reaching (or will reach) the speakers — a
      // still-locked AudioContext answers no, so callers can skip scheduling
      // second-half staggers that would land in silence.
      play(sig) {
        if (!enabled) return false;
        ensure();
        const c = ctx;
        const m = master;
        if (c === null || m === null) return false;
        if (c.state === "suspended") {
          if (!unlocked) {
            if (sig === "start") return false;
            unlocked = true;
          }
          void c.resume().then(() => {
            const buf2 = buffers.get(sig);
            if (!buf2 || c.state === "suspended") return;
            const src2 = c.createBufferSource();
            src2.buffer = buf2;
            if (master !== null) src2.connect(master);
            src2.start();
          });
          return true;
        }
        const buf = buffers.get(sig);
        if (!buf) return false;
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(m);
        src.start();
        return true;
      },
      toggle() {
        enabled = !enabled;
        return enabled;
      },
      get enabled() {
        return enabled;
      }
    };
  }

  // src/version.ts
  var APP_VERSION = "0.4.2";

  // src/play.ts
  function mustEl(id) {
    const el2 = document.getElementById(id);
    if (el2 === null) throw new Error(`missing #${id}`);
    return el2;
  }
  function isKeyOf(pool, key) {
    return Object.prototype.hasOwnProperty.call(pool, key);
  }
  function pickKey(key, pool, fallback) {
    return key !== null && isKeyOf(pool, key) ? key : fallback;
  }
  function pickChecks(param, pool, fallback) {
    if (param === null) return fallback;
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of param.split(",")) {
      const key = raw.trim();
      if (key && !seen.has(key) && isKeyOf(pool, key)) {
        seen.add(key);
        out.push(key);
      }
    }
    return out;
  }
  function isWorldKey(key) {
    return isKeyOf(WORLDS, key);
  }
  var params = new URLSearchParams(location.search);
  var IS_TOUCH = window.matchMedia("(pointer: coarse)").matches;
  var IS_HEX = params.get("layout") === "hex";
  var variantParam = params.get("variant");
  var rawWorld = params.get("world");
  var rawVariant = variantParam ? getVariant(variantParam) : null;
  var rawCollapse = params.get("collapse");
  var ruleKey = rawVariant ? rawVariant.rule : pickKey(params.get("rule"), RULES, "eval");
  var failKey = rawVariant ? rawVariant.fail : pickKey(params.get("fail"), FAILURE_RULES, "notUp");
  var collapseDefault = rawVariant ? rawVariant.collapse ?? false : rawCollapse === "1";
  var collapseOn = collapseDefault && rawCollapse !== "0";
  function resolveWorldKey(raw, variantWorld) {
    if (raw === "gen") return "gen";
    if (raw !== null && isWorldKey(raw)) return raw;
    return variantWorld ?? "full";
  }
  function chooseyChecksAtStartup() {
    if (resolveWorldKey(rawWorld, rawVariant?.world) !== "choosey") return { rules: [], fails: [] };
    return {
      rules: pickChecks(params.get("crules"), RULES, rawVariant ? [rawVariant.rule] : ["eval"]),
      fails: pickChecks(params.get("cfails"), FAILURE_RULES, rawVariant ? [rawVariant.fail] : ["notUp"])
    };
  }
  var worldKeyAtStart = resolveWorldKey(rawWorld, rawVariant?.world);
  var bootSeed = null;
  if (worldKeyAtStart === "gen") {
    const s = parseInt(params.get("seed") ?? "", 10);
    bootSeed = Number.isInteger(s) && s > 0 ? s : Math.floor(Math.random() * 99999) + 1;
  }
  var bootRows = worldKeyAtStart === "gen" ? generateWorld(bootSeed ?? 0).rows : WORLDS[worldKeyAtStart].rows;
  var state = {
    worldKey: worldKeyAtStart,
    genSeed: bootSeed,
    ruleKey,
    failKey,
    chooseyChecks: chooseyChecksAtStartup(),
    debug: params.get("debug") === "1",
    number: 0,
    pos: { x: 2, y: 2 },
    over: false,
    engine: createEngine(ruleKey, failKey),
    board: createBoardOverlay(bootRows)
  };
  var CELL = 100;
  var CANVAS = 500;
  var sound = createSoundKit();
  function hexRadius(cols, rows) {
    return Math.min(CANVAS / (Math.sqrt(3) * (cols + 0.5)), CANVAS / (1.5 * rows + 0.5));
  }
  function buildLattice(cols, rows) {
    if (!IS_HEX) return createSquareLattice(cols, rows, CELL);
    return createHexLattice(cols, rows, hexRadius(cols, rows));
  }
  var lat = createSquareLattice(5, 5, CELL);
  var unit = CELL;
  var mail = document.getElementById("feedback-mail");
  var els = {
    number: mustEl("number"),
    worldName: mustEl("world-name"),
    variantSub: document.getElementById("variant-sub-text"),
    position: mustEl("position"),
    ruleLabel: mustEl("rule-label"),
    failLabel: mustEl("fail-label"),
    worldLabel: mustEl("world-label"),
    observation: mustEl("observation"),
    noteMeta: document.getElementById("note-meta"),
    noteTotals: document.getElementById("note-totals"),
    noteLog: document.getElementById("note-log"),
    feedbackLink: mail instanceof HTMLAnchorElement ? mail : null
  };
  var svg = mustEl("grid");
  var copyBtn = document.getElementById("note-copy");
  var issueBtn = document.getElementById("note-issue");
  var copyRunBtn = document.getElementById("copy-run");
  var openIssueBtn = document.getElementById("open-issue");
  var historyPre = mustEl("history");
  var fromLog = [];
  var tileNodes = [];
  var playerNode;
  var playerNumberNode;
  var playerCarriedNode;
  var fxLayer;
  var ADVANCE_RATIO_GUESS = 0.6;
  var advanceRatio = ADVANCE_RATIO_GUESS;
  var advanceRatioMeasured = false;
  function measureAdvanceRatio() {
    try {
      const probe = ns("text", { x: -999, y: -999, class: "probe" });
      probe.textContent = "0123456789";
      probe.style.fontSize = "100px";
      probe.style.visibility = "hidden";
      svg.appendChild(probe);
      const width = probe.getComputedTextLength();
      probe.remove();
      const ratio = width / (probe.textContent.length * 100);
      if (Number.isFinite(ratio) && ratio > 0.1 && ratio < 2) {
        advanceRatio = ratio;
        advanceRatioMeasured = true;
      }
    } catch {
    }
  }
  function calibrateAdvanceRatio() {
    measureAdvanceRatio();
    if (playerNumberNode) renderPnum();
  }
  function world() {
    if (state.worldKey === "gen") {
      const seed = state.genSeed;
      if (seed === null) throw new Error("generated world has no seed");
      return generateWorld(seed);
    }
    return WORLDS[state.worldKey];
  }
  function currentVariant() {
    if (state.worldKey === "choosey") return null;
    return variantFor(state.ruleKey, state.failKey, collapseOn);
  }
  function ns(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) node.setAttribute(k, String(attrs[k]));
    return node;
  }
  function cellCenter(x, y) {
    return lat.centre(x, y);
  }
  function buildGrid() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    tileNodes = [];
    const rows = world().rows;
    const cols = rows.reduce((m, row) => Math.max(m, row?.length ?? 0), 0);
    lat = buildLattice(cols, rows.length);
    unit = IS_HEX ? hexRadius(cols, rows.length) : CELL;
    const b = lat.bounds();
    svg.setAttribute("viewBox", `${b.minX} ${b.minY} ${b.width} ${b.height}`);
    svg.classList.toggle("hex", lat.id === "hex");
    svg.style.setProperty("--u", `${unit}px`);
    if (lat.id === "square") {
      for (let i = 0; i <= rows.length; i++) {
        svg.appendChild(ns("line", { x1: 0, y1: i * unit, x2: rows.length * unit, y2: i * unit, class: "cell-line" }));
        svg.appendChild(ns("line", { x1: i * unit, y1: 0, x2: i * unit, y2: rows.length * unit, class: "cell-line" }));
      }
    } else {
      for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        if (row === void 0) continue;
        for (let x = 0; x < row.length; x++) {
          const { cx, cy } = lat.centre(x, y);
          const d = lat.cellPath(cx, cy);
          if (d === null) continue;
          svg.appendChild(ns("path", { d, class: "cell-line" }));
        }
      }
    }
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      if (row === void 0) continue;
      const nodes = [];
      tileNodes.push(nodes);
      for (let x = 0; x < row.length; x++) {
        const { cx, cy } = lat.centre(x, y);
        const glyph = row[x];
        if (glyph === void 0) continue;
        const text = ns("text", { x: cx, y: cy, class: isOperator(glyph) ? "tile op" : "tile" });
        if (glyph !== ".") text.textContent = glyph;
        svg.appendChild(text);
        nodes.push(text);
      }
    }
    fxLayer = ns("g", { id: "fx" });
    svg.appendChild(fxLayer);
    playerNode = ns("g", { id: "player" });
    playerNumberNode = ns("text", { x: 0, y: 1, class: "pnum" });
    playerNode.appendChild(playerNumberNode);
    playerCarriedNode = ns("text", { x: 0, y: -unit * 0.42, class: "carried" });
    playerNode.appendChild(playerCarriedNode);
    svg.appendChild(playerNode);
  }
  function paintTileNode(x, y) {
    const node = tileNodes[y]?.[x] ?? null;
    if (!node) return;
    const glyph = state.board.tileAt(x, y);
    node.textContent = glyph === "." || glyph === COLLAPSED_TILE ? "" : glyph;
    node.classList.toggle("hole", glyph === HOLE);
    node.classList.toggle("spent", glyph === COLLAPSED_TILE);
  }
  function placePlayer() {
    const { cx, cy } = cellCenter(state.pos.x, state.pos.y);
    playerNode.style.transform = `translate(${cx}px, ${cy}px)`;
  }
  function fmtNumber(n) {
    if (!Number.isFinite(n)) return "\u2715";
    const s = String(n);
    return s.length > 6 ? n.toExponential(2) : s;
  }
  function renderPnum() {
    const text = fmtNumber(state.number);
    playerNumberNode.textContent = text;
    const fit = pnumFont(text.length, advanceRatio, IS_HEX ? unit * Math.sqrt(3) : unit);
    playerNumberNode.style.fontSize = `${fit.fontSize}px`;
    playerNode.dataset.band = String(fit.band);
  }
  function renderCarried() {
    const op = state.engine.carried;
    playerCarriedNode.textContent = op ?? "";
    playerNode.classList.toggle("armed", op !== null);
  }
  function statusClass(ev) {
    if (!ev.valid) return "down";
    if (ev.delta > 0) return "up";
    if (ev.delta < 0) return "down";
    return "flat";
  }
  var STATUS_CLASSES = ["up", "down", "flat"];
  function flashStatus(cls) {
    for (const c of STATUS_CLASSES) playerNumberNode.classList.remove(c);
    void playerNumberNode.getBoundingClientRect();
    playerNumberNode.classList.add(cls);
    setTimeout(() => playerNumberNode.classList.remove(cls), 450);
    els.number.classList.remove("up", "down", "flat");
    void els.number.offsetWidth;
    els.number.classList.add(cls);
    setTimeout(() => els.number.classList.remove(cls), 450);
  }
  function deltaGlyph(ev) {
    if (!ev.valid) return "\u2715 impossible";
    if (ev.delta > 0) return `\u2191 +${ev.delta}`;
    if (ev.delta < 0) return `\u2193 ${ev.delta}`;
    return "\u2014 \xB10";
  }
  function applyEffect(ev, from, to) {
    const originGlyph = fmtNumber(ev.oldNumber);
    switch (ev.effect.kind) {
      case "swap":
        state.board.set(from.x, from.y, originGlyph);
        state.board.set(to.x, to.y, "");
        paintTileNode(from.x, from.y);
        paintTileNode(to.x, to.y);
        break;
      case "pickup":
        state.board.set(to.x, to.y, "");
        paintTileNode(to.x, to.y);
        break;
      case "opswap":
        state.board.set(to.x, to.y, ev.effect.dropped);
        paintTileNode(to.x, to.y);
        break;
      case "consume":
        state.board.set(to.x, to.y, HOLE);
        paintTileNode(to.x, to.y);
        break;
      case "none":
        break;
    }
  }
  function fly(glyph, from, to) {
    const { cx: fx, cy: fy } = cellCenter(from.x, from.y);
    const { cx: tx, cy: ty } = cellCenter(to.x, to.y);
    const node = ns("text", { x: 0, y: 0, class: "fly", transform: `translate(${fx}px, ${fy}px)` });
    node.textContent = glyph;
    fxLayer.appendChild(node);
    requestAnimationFrame(() => {
      node.style.transform = `translate(${fx}px, ${fy}px)`;
      requestAnimationFrame(() => {
        node.style.transform = `translate(${tx}px, ${ty}px)`;
        node.style.opacity = "0";
      });
    });
    setTimeout(() => node.remove(), 500);
  }
  function cueFor(ev) {
    if (ev.failed) return "over";
    if (!ev.valid) return "sad";
    switch (ev.effect.kind) {
      case "pickup":
      case "opswap":
        return "pickup";
      default: {
        if (ev.delta > 0) return "happy";
        if (ev.delta < 0) return "sad";
        return "flat";
      }
    }
  }
  function flashVignette(sig) {
    const v = document.getElementById("vignette");
    if (!v) return;
    v.className = `cue-${sig}`;
    void v.offsetWidth;
    v.classList.add("on");
  }
  function playCue(sig, delayed = null) {
    const heard = sound.play(sig);
    if (delayed !== null && heard) setTimeout(() => sound.play(delayed), 75);
  }
  function animateSuperpose(ev, from, to) {
    applyEffect(ev, from, to);
    const { cx: tx, cy: ty } = cellCenter(to.x, to.y);
    if (ev.effect.kind === "swap") {
      fly(ev.destinationTile, to, from);
      fly(fmtNumber(ev.oldNumber), from, to);
    } else if (ev.effect.kind === "opswap") {
      fly(ev.effect.dropped, from, to);
    } else if (ev.effect.kind === "pickup") {
      fly(ev.destinationTile, to, to);
    } else if (ev.effect.kind === "none") {
      const dest = tileNodes[to.y]?.[to.x] ?? null;
      if (dest && dest.textContent !== "") fly(ev.destinationTile, from, to);
    }
    renderPnum();
    playerNumberNode.classList.remove("pop");
    void playerNumberNode.getBoundingClientRect();
    playerNumberNode.classList.add("pop");
    const cls = statusClass(ev);
    const delta = ns("text", { x: 0, y: 0, class: `delta ${cls}` });
    delta.style.transform = `translate(${tx}px, ${ty - unit * 0.44}px)`;
    delta.textContent = deltaGlyph(ev);
    fxLayer.appendChild(delta);
    setTimeout(() => delta.remove(), 700);
    const resultText = ns("text", { x: 0, y: 0, class: `result-eq ${cls}` });
    resultText.style.transform = `translate(${tx + unit * 0.34}px, ${ty + unit * 0.06}px)`;
    resultText.textContent = `= ${fmtNumber(ev.valid ? ev.result : NaN)}`;
    fxLayer.appendChild(resultText);
    setTimeout(() => resultText.remove(), 900);
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
  function showBlockedHole(direction) {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(line("", `You moved ${direction}.`));
    obs.appendChild(line("", ""));
    obs.appendChild(line("flat", "Blocked \u2014 that is a pit (a number that got eaten). Nothing can walk there."));
  }
  function verboseObservation(move) {
    const frag = document.createDocumentFragment();
    frag.appendChild(line("", `You moved ${move.direction}.`));
    frag.appendChild(line("", ""));
    frag.appendChild(line("", "WHAT HAPPENED"));
    frag.appendChild(line("", ""));
    frag.appendChild(line("", `${fmtNumber(move.oldNumber)}  ${move.destinationTile}`));
    frag.appendChild(line("", `Held number: ${move.pendingAtEntry === null ? "\u2014" : move.pendingAtEntry}`));
    frag.appendChild(line("", `Carrying: ${move.carriedAtEntry ?? "\u2014"}`));
    frag.appendChild(line("", `Board change: ${move.effect.kind}${move.effect.kind === "opswap" ? ` (drops ${move.effect.dropped})` : ""}`));
    frag.appendChild(line("", `Your number now: ${move.valid ? fmtNumber(move.result) : "impossible"}`));
    const deltaNote = move.valid ? `  (by ${move.delta > 0 ? "+" : ""}${move.delta})` : "";
    frag.appendChild(line(
      move.valid ? statusClass(move) : "down",
      `Did your number get bigger? ${move.valid ? move.wentUp ? "YES" : "NO" : "\u2014"}${deltaNote}`
    ));
    return frag;
  }
  function quietObservation(move) {
    const frag = document.createDocumentFragment();
    const glyph = move.valid ? move.wentUp ? "\u2191" : move.delta < 0 ? "\u2193" : "\u2014" : "\u2715";
    const held = [];
    if (move.pendingAtEntry !== null) held.push(`[${move.pendingAtEntry}]`);
    const armed = state.engine.carried;
    if (armed !== null) held.push(`\u2301${armed}`);
    const tail = held.length ? ` ${held.join(" ")}` : "";
    frag.appendChild(line(move.valid ? statusClass(move) : "down", `${glyph} ${fmtNumber(state.number)}${tail}`));
    return frag;
  }
  function showObservation(move, extra) {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(state.debug ? verboseObservation(move) : quietObservation(move));
    if (extra) {
      obs.appendChild(line("", ""));
      obs.appendChild(extra);
    }
  }
  function showRunOver(ev) {
    const frag = document.createDocumentFragment();
    frag.appendChild(line("over", `The run ends \u2014 ${ev.failReason}.`));
    const survived = Math.max(0, ev.turn - 1);
    frag.appendChild(line("", `You lasted ${survived} move${survived === 1 ? "" : "s"}; your number finished at ${fmtNumber(state.number)}.`));
    frag.appendChild(line("", IS_TOUCH ? "Tap the grid (or R) to start again." : "Press R to start again."));
    return frag;
  }
  function renderStatus() {
    els.number.textContent = fmtNumber(state.number);
    els.worldName.textContent = world().name;
    els.position.textContent = `${state.pos.x},${state.pos.y}`;
    const choosey = state.worldKey === "choosey";
    if (els.variantSub) {
      if (choosey) {
        els.variantSub.textContent = "Choosey \u2014 you call the rules \xB7 tick them under the board";
        document.title = "NUMBER UP \u2014 Choosey";
      } else {
        const v = currentVariant();
        els.variantSub.textContent = v ? `${v.name} \u2014 ${v.tagline}` : `custom \u2014 ${state.ruleKey} \xD7 ${state.failKey}`;
        document.title = v ? `NUMBER UP \u2014 ${v.name}` : "NUMBER UP \u2014 custom";
      }
    }
    els.ruleLabel.textContent = choosey ? `choosey (${rulesJoined(state.chooseyChecks.rules)})` : `${state.ruleKey} \u2014 ${RULE_SHORT[state.ruleKey]}`;
    els.failLabel.textContent = choosey ? `choosey (${failsJoined(state.chooseyChecks.fails)})` : `${state.failKey} \u2014 ${FAILURE_SHORT[state.failKey]}`;
    els.worldLabel.textContent = `${state.worldKey} \u2014 ${world().name}${collapseOn ? " + tiles-vanish" : ""}`;
    syncRulesNow();
    const issueUrl = issueHref();
    const issueLink = document.getElementById("feedback-issue");
    if (issueLink instanceof HTMLAnchorElement) issueLink.href = issueUrl;
  }
  function syncRulesNow() {
    const box = document.getElementById("rules-now");
    if (!box) return;
    const choosey = state.worldKey === "choosey";
    box.textContent = "";
    const touch = choosey ? rulesJoined(state.chooseyChecks.rules) : RULE_LONG[state.ruleKey];
    const ends = choosey ? failsJoined(state.chooseyChecks.fails) : FAILURE_LONG[state.failKey];
    box.appendChild(line("", `Touching a tile here: ${touch}`));
    box.appendChild(line("", `The run ends when: ${ends}`));
    box.appendChild(line("", `Board: ${collapseOn ? COLLAPSE_LONG : "Tiles stay put."}`));
  }
  function issueHref() {
    const dump = formatRunDump(runContext(), state.engine.history, fromLog);
    const body = `${dump}

What happened / what should have happened:
`;
    return `https://github.com/maphew/number-up/issues/new?${new URLSearchParams({ title: "NUMBER UP feedback", body })}`;
  }
  function openIssue() {
    window.open(issueHref(), "_blank", "noopener");
  }
  function feedbackHref() {
    const lines = [
      `World: ${state.worldKey} \u2014 ${world().name}`,
      `Variant: ${variantLabel()}`,
      `Collision rule: ${state.ruleKey} (${state.engine.rule.name})`,
      `Failure rule: ${state.failKey} (${state.engine.failure.name})`,
      `Number: ${fmtNumber(state.number)} after ${state.engine.turn} move${state.engine.turn === 1 ? "" : "s"}`,
      "",
      "Last moves:",
      ...formatMoveLog(state.engine.history.slice(-10), fromLog.slice(-10)),
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
    historyPre.textContent = rows.join("\n");
  }
  function variantLabel() {
    if (state.worldKey === "choosey") {
      return `Choosey (touch: ${state.chooseyChecks.rules.join("+") || "none"} \xB7 run-ender: ${state.chooseyChecks.fails.join("+") || "none"}${collapseOn ? " \xB7 tiles vanish" : ""})`;
    }
    const v = currentVariant();
    if (v) return `${v.name} (${v.id})`;
    return collapseOn ? `custom \u2014 ${state.ruleKey} \xD7 ${state.failKey} + collapse` : `custom \u2014 ${state.ruleKey} \xD7 ${state.failKey}`;
  }
  function runContext() {
    const v = currentVariant();
    const choosey = state.worldKey === "choosey";
    return {
      ruleKey: choosey ? "choosey" : state.ruleKey,
      ruleName: state.engine.rule.name,
      failKey: choosey ? "choosey" : state.failKey,
      failName: state.engine.failure.name,
      worldKey: state.worldKey,
      worldName: world().name,
      variantLabel: variantLabel(),
      seed: state.genSeed,
      url: location.search || location.pathname,
      number: state.number,
      variantUpdated: v?.updated,
      variantHypothesis: v?.hypothesis,
      pending: state.engine.pending,
      carried: state.engine.carried,
      appVersion: APP_VERSION
    };
  }
  function renderNotebook() {
    if (!state.debug) return;
    renderHistory();
    if (els.noteMeta) {
      const ctx = runContext();
      const v = currentVariant();
      els.noteMeta.textContent = [
        `NUMBER UP v${APP_VERSION}`,
        `Variant: ${ctx.variantLabel}${v?.updated !== void 0 ? ` (updated ${v.updated})` : ""}`,
        `Rule ${ctx.ruleKey} \xB7 fail ${ctx.failKey} \xB7 world ${ctx.worldKey}${ctx.seed === null ? "" : ` seed ${ctx.seed}`}${collapseOn ? " \xB7 tiles vanish" : ""}`,
        state.worldKey === "choosey" ? `Choosey ticks \u2014 touch: ${state.chooseyChecks.rules.join("+") || "none"} \xB7 run-ender: ${state.chooseyChecks.fails.join("+") || "none"}` : "",
        IS_HEX ? "Layout hex (pointy-top odd-r, 6 neighbours) \u2014 \u2190\u2192/AD = W E \xB7 Q/E = NW/NE \xB7 Z/C = SW/SE \xB7 numpad 7/9/1/3 diagonals \xB7 swipe snaps to nearest of 6 (straight up/down \u2192 NE/SE)" : "Layout square (4 neighbours) \u2014 arrows / WASD / numpad \xB7 swipe dominant axis",
        `URL: ${ctx.url}`,
        // The mark's own telemetry (num-qhf): consumes the band write so the
        // debug notebook can see what the fit maths did on a real device.
        `Mark: ${playerNumberNode.style.fontSize || "?"} band ${playerNode.dataset.band ?? "?"} \xB7 advance ratio ${advanceRatio.toFixed(3)}${advanceRatioMeasured ? "" : " (guess \u2014 measurement API unavailable)"}`,
        `Pending: ${state.engine.pending === null ? "\u2014" : state.engine.pending}`,
        `Armed: ${state.engine.carried ?? "\u2014"}`,
        v ? `Hypothesis: ${v.hypothesis}` : "Custom rule \xD7 fail pairing."
      ].join("\n");
    }
    if (els.noteTotals) {
      const t = summariseRun(state.engine.history);
      els.noteTotals.textContent = `Turns ${t.turns} \xB7 peak ${t.peak === null ? "\u2014" : t.peak} \xB7 final ${t.final === null ? "\u2014" : t.final} \xB7 up ${t.up} \xB7 down ${t.down} \xB7 flat ${t.flat} \xB7 invalid ${t.invalid}`;
    }
    if (els.noteLog) {
      els.noteLog.textContent = formatMoveLog(state.engine.history, fromLog).join("\n");
    }
  }
  function copyRunDump() {
    const dump = formatRunDump(runContext(), state.engine.history, fromLog);
    const done = (ok) => {
      if (copyBtn instanceof HTMLElement) {
        copyBtn.textContent = ok ? "copied" : "copy failed";
        setTimeout(() => {
          copyBtn.textContent = "copy run";
        }, 1200);
      }
    };
    try {
      const clip = navigator.clipboard;
      if (clip) {
        void clip.writeText(dump).then(() => done(true), () => fallbackCopy(dump, done));
        return;
      }
    } catch {
    }
    fallbackCopy(dump, done);
  }
  function fallbackCopy(text, done) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      done(ok);
    } catch {
      done(false);
    }
  }
  function render() {
    placePlayer();
    renderPnum();
    renderCarried();
    playerNode.classList.toggle("dead", state.over);
    renderStatus();
    if (els.feedbackLink) els.feedbackLink.href = feedbackHref();
    if (state.debug) renderNotebook();
  }
  function tryMove(name) {
    if (state.over) {
      const obs = els.observation;
      obs.textContent = "";
      obs.appendChild(line("", `You moved ${name.toUpperCase()}.`));
      obs.appendChild(line("", ""));
      obs.appendChild(line("flat", IS_TOUCH ? "The run is over \u2014 tap the grid to start again." : "The run is over \u2014 press R to start again."));
      return;
    }
    const next = lat.step(state.pos.x, state.pos.y, name);
    if (next === null) {
      playerNode.classList.remove("pop");
      void playerNode.getBoundingClientRect();
      playerNode.classList.add("pop");
      showBlocked(name);
      playCue("blocked");
      flashVignette("blocked");
      return;
    }
    if (state.board.tileAt(next.x, next.y) === HOLE) {
      playerNode.classList.remove("pop");
      void playerNode.getBoundingClientRect();
      playerNode.classList.add("pop");
      showBlockedHole(name);
      playCue("blocked");
      flashVignette("blocked");
      return;
    }
    const from = { ...state.pos };
    fromLog.push({ ...from });
    const ev = state.engine.attempt(state.number, name.toUpperCase(), state.board.tileAt(next.x, next.y));
    state.number = ev.valid ? ev.result : NaN;
    state.pos = next;
    if (collapseOn) {
      state.board.set(state.pos.x, state.pos.y, COLLAPSED_TILE);
      paintTileNode(state.pos.x, state.pos.y);
    }
    render();
    animateSuperpose(ev, from, state.pos);
    renderCarried();
    const cue = cueFor(ev);
    if (ev.effect.kind === "consume" && !ev.failed) {
      playCue("consume", cue);
      flashVignette("consume");
      if (sound.enabled) setTimeout(() => flashVignette(cue), 130);
    } else {
      playCue(cue);
      flashVignette(cue);
    }
    showObservation(ev, ev.failed ? showRunOver(ev) : null);
    if (ev.failed) state.over = true;
    render();
  }
  function movementNote() {
    if (IS_TOUCH) {
      return IS_HEX ? " Swipe toward a neighbour \u2014 the swipe snaps to the nearest of the six." : " Swipe the grid to move.";
    }
    return IS_HEX ? " Move: A/D or \u2190\u2192 = W/E \xB7 Q/E = NW/NE \xB7 Z/C = SW/SE." : "";
  }
  function restart(message) {
    applyEngine();
    state.number = 0;
    state.pos = findStart(world());
    state.over = false;
    fromLog = [];
    state.board = createBoardOverlay(world().rows);
    buildGrid();
    syncUrl();
    syncChooseyPanel();
    render();
    const v = currentVariant();
    const variantNote = v ? ` Variant ${v.name}.` : "";
    const openLine = state.worldKey === "choosey" ? `World ${state.worldKey} \u2014 ${world().name} Touch rules ticked: ${rulesJoined(state.chooseyChecks.rules)}. Run-ender ticked: ${failsJoined(state.chooseyChecks.fails)}. The boxes under the board change these. Number = 0.${movementNote()}` : `World ${state.worldKey} \u2014 ${world().name}.${variantNote} Number = 0.${movementNote()}`;
    els.observation.textContent = message || openLine;
    if (state.debug) renderNotebook();
    playCue("start");
  }
  function syncUrl() {
    try {
      const p = new URLSearchParams(location.search);
      p.set("world", state.worldKey);
      if (state.worldKey === "gen") p.set("seed", String(state.genSeed));
      else p.delete("seed");
      if (state.worldKey === "choosey") {
        p.set("crules", state.chooseyChecks.rules.join(","));
        p.set("cfails", state.chooseyChecks.fails.join(","));
        p.delete("rule");
        p.delete("fail");
        p.delete("variant");
      } else {
        p.delete("crules");
        p.delete("cfails");
        const v = currentVariant();
        if (v) p.set("variant", v.id);
        else p.delete("variant");
        p.set("rule", state.ruleKey);
        p.set("fail", state.failKey);
      }
      if (collapseOn !== (currentVariant()?.collapse ?? false)) p.set("collapse", collapseOn ? "1" : "0");
      else p.delete("collapse");
      if (IS_HEX) p.set("layout", "hex");
      else p.delete("layout");
      if (state.debug) p.set("debug", "1");
      else p.delete("debug");
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
    if (state.worldKey === "choosey") {
      showChooseyNote("Choosey \u2014 the boxes under the board pick the touch rules here.");
      return;
    }
    if (!IS_HEX && !confirmWipe("rule")) return;
    state.ruleKey = cycle(["replace", "add", "eval", "relay"], state.ruleKey);
    restart(`Touch rule \u2192 ${state.ruleKey} \u2014 ${RULE_SHORT[state.ruleKey]}. Number = 0.`);
  }
  function nextFailure() {
    if (state.worldKey === "choosey") {
      showChooseyNote("Choosey \u2014 the boxes under the board pick the run-ender here.");
      return;
    }
    if (!IS_HEX && !confirmWipe("fail")) return;
    state.failKey = cycle(["notUp", "down", "none"], state.failKey);
    restart(`Run-ender \u2192 ${state.failKey} \u2014 ${FAILURE_SHORT[state.failKey]}. Number = 0.`);
  }
  function toggleCollapse() {
    collapseOn = !collapseOn;
    syncChooseyPanel();
    restart(`Tiles vanishing behind you ${collapseOn ? "ON \u2014 after you step on a tile it is gone" : "OFF"}. Number = 0.`);
  }
  function showChooseyNote(text) {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(line("", text));
  }
  function applyEngine() {
    if (state.worldKey === "choosey") {
      state.engine = createChooseyEngine(state.chooseyChecks);
    } else {
      state.engine = createEngine(state.ruleKey, state.failKey);
    }
  }
  var CHOOSEY_RULE_ORDER = ["replace", "add", "eval", "relay"];
  var CHOOSEY_ENDER_ORDER = ["notUp", "down"];
  function chooseyRow(kind, key, title, blurb) {
    const label = document.createElement("label");
    label.className = "choosey-row";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.kind = kind;
    box.dataset.key = key;
    label.appendChild(box);
    const text = document.createElement("span");
    const bold = document.createElement("b");
    bold.textContent = `${title} \u2014 `;
    text.appendChild(bold);
    text.appendChild(document.createTextNode(blurb));
    label.appendChild(text);
    return label;
  }
  function buildChooseyPanel() {
    const host = document.getElementById("choosey-list");
    if (!host) return;
    const touch = document.createElement("div");
    touch.className = "choosey-group";
    touch.appendChild(line("choosey-group-label", "Touch rules \u2014 ticked rules try from the top; the first that can handle the tile does it."));
    for (const key of CHOOSEY_RULE_ORDER) {
      touch.appendChild(chooseyRow("rule", key, key, RULE_LONG[key]));
    }
    host.appendChild(touch);
    const enders = document.createElement("div");
    enders.className = "choosey-group";
    enders.appendChild(line("choosey-group-label", "Run-enders \u2014 any ticked one can end the run (untick both and nothing can)."));
    for (const key of CHOOSEY_ENDER_ORDER) {
      enders.appendChild(chooseyRow("ender", key, key, FAILURE_LONG[key]));
    }
    host.appendChild(enders);
    const board = document.createElement("div");
    board.className = "choosey-group";
    board.appendChild(line("choosey-group-label", "Board"));
    board.appendChild(chooseyRow("board", "vanish", "vanish", COLLAPSE_LONG));
    host.appendChild(board);
    host.addEventListener("change", onChooseyChange);
  }
  function onChooseyChange(e) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) || !target.dataset.kind) {
      syncChooseyPanel();
      return;
    }
    const kind = target.dataset.kind;
    const proceed = state.engine.turn === 0 || confirmWipe("rule");
    if (!proceed) {
      syncChooseyPanel();
      return;
    }
    if (kind === "board") {
      collapseOn = target.checked;
    } else {
      const host = document.getElementById("choosey-list");
      const checked = (selector) => Array.from(host?.querySelectorAll(selector) ?? []).filter((b) => b instanceof HTMLInputElement && b.checked).map((b) => b.dataset.key ?? "");
      if (kind === "rule") state.chooseyChecks.rules = checked('input[data-kind="rule"]');
      else state.chooseyChecks.fails = checked('input[data-kind="ender"]');
    }
    restart(
      `Choosey \u2014 touch rules: ${rulesJoined(state.chooseyChecks.rules)} \xB7 run-ender: ${failsJoined(state.chooseyChecks.fails)}${collapseOn ? " \xB7 tiles vanish" : ""}. Number = 0.`
    );
  }
  function syncChooseyPanel() {
    const panel = document.getElementById("choosey");
    if (!panel) return;
    panel.hidden = state.worldKey !== "choosey";
    if (panel.hidden) return;
    const set = (kind, keys) => {
      for (const box of panel.querySelectorAll(`input[data-kind="${kind}"]`)) {
        if (box instanceof HTMLInputElement) box.checked = keys.includes(box.dataset.key ?? "");
      }
    };
    set("rule", state.chooseyChecks.rules);
    set("ender", state.chooseyChecks.fails);
    set("board", collapseOn ? ["vanish"] : []);
  }
  var MOVE_KEYS = IS_HEX ? {
    ArrowLeft: "W",
    ArrowRight: "E",
    A: "W",
    D: "E",
    a: "W",
    d: "E",
    Q: "NW",
    E: "NE",
    q: "NW",
    e: "NE",
    Z: "SW",
    C: "SE",
    z: "SW",
    c: "SE",
    W: "W",
    S: "S",
    Numpad4: "W",
    Numpad6: "E",
    Numpad7: "NW",
    Numpad9: "NE",
    Numpad1: "SW",
    Numpad3: "SE"
  } : {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    Numpad8: "up",
    Numpad2: "down",
    Numpad4: "left",
    Numpad6: "right"
  };
  function confirmWipe(action) {
    if (state.engine.turn === 0) return true;
    const label = action === "rule" ? "touch rule" : "run-ender";
    return window.confirm(`Change the ${label}? This starts the run over (${state.engine.turn} moves in).`);
  }
  var HEX_NO_NS_KEYS = /* @__PURE__ */ new Set(["ArrowUp", "ArrowDown", "w", "s", "W", "S", "Numpad8", "Numpad2", "8", "2"]);
  function showHexNoNorthSouth() {
    const obs = els.observation;
    obs.textContent = "";
    obs.appendChild(line("", "Hex rows have no north/south neighbour."));
    obs.appendChild(line("", ""));
    obs.appendChild(line("flat", "Diagonals: Q/E = NW/NE, Z/C = SW/SE (numpad 7 9 1 3)."));
  }
  function toggleDebug() {
    state.debug = !state.debug;
    document.body.classList.toggle("debug", state.debug);
    document.querySelector('#help [data-action="debug"]')?.classList.toggle("on", state.debug);
    const last = state.engine.history[state.engine.history.length - 1];
    if (state.debug) {
      renderNotebook();
      if (last !== void 0) showObservation(last, last.failed ? showRunOver(last) : null);
    } else if (last !== void 0) {
      showObservation(last, last.failed ? showRunOver(last) : null);
    }
    syncUrl();
  }
  function toggleRulesReference() {
    const details = document.getElementById("rules-details");
    if (!(details instanceof HTMLDetailsElement)) return;
    details.open = !details.open;
    document.querySelector('#help [data-action="rules"]')?.classList.toggle("on", details.open);
  }
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const direct = MOVE_KEYS[e.key];
    const move = direct ?? MOVE_KEYS[e.key.toLowerCase()] ?? MOVE_KEYS[e.code];
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
    } else if (k === "m") {
      const on = sound.toggle();
      const btn = document.querySelector('#help [data-action="sound"]');
      if (btn instanceof HTMLElement) btn.classList.toggle("on", on);
      if (on) playCue("start");
    } else if (k === "l") {
      toggleRulesReference();
    } else if (k === "n") {
      nextWorld();
    } else if (k === "g") {
      nextGenerated();
    } else if (k === "c" || IS_HEX && k === "v") {
      nextRule();
    } else if (k === "f") {
      nextFailure();
    } else if (k === "x") {
      toggleCollapse();
    } else if (IS_HEX && HEX_NO_NS_KEYS.has(e.key)) {
      e.preventDefault();
      showHexNoNorthSouth();
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
    else if (action === "rules") toggleRulesReference();
    else if (action === "catalogue") location.href = "index.html";
    else if (action === "world") nextWorld();
    else if (action === "worldgen") nextGenerated();
    else if (action === "rule") nextRule();
    else if (action === "fail") nextFailure();
    else if (action === "collapse") toggleCollapse();
    else if (action === "sound") {
      const k = sound.toggle();
      btn.classList.toggle("on", k);
      if (k) playCue("start");
    } else if (action === "feedback") openFeedback();
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
    tryMove(lat.nearest(state.pos.x, state.pos.y, dx, dy));
  }, { passive: false });
  svg.addEventListener("touchcancel", () => {
    touchStart = null;
  }, { passive: false });
  if (copyBtn instanceof HTMLButtonElement) {
    copyBtn.addEventListener("click", copyRunDump);
  }
  if (issueBtn instanceof HTMLButtonElement) {
    issueBtn.addEventListener("click", openIssue);
  }
  if (copyRunBtn instanceof HTMLButtonElement) {
    copyRunBtn.addEventListener("click", copyRunDump);
  }
  if (openIssueBtn instanceof HTMLButtonElement) {
    openIssueBtn.addEventListener("click", openIssue);
  }
  if (IS_HEX) {
    const keyNote = document.getElementById("key-note");
    if (keyNote) keyNote.textContent = "\u2190\u2192/AD = W\xB7E \xB7 Q E Z C = NW\xB7NE\xB7SW\xB7SE / swipe";
    const ruleKbd = document.querySelector('#help [data-action="rule"] kbd');
    if (ruleKbd) ruleKbd.textContent = "V";
  }
  if (state.debug) document.body.classList.add("debug");
  document.querySelector('#help [data-action="sound"]')?.classList.toggle("on", sound.enabled);
  var rulesRefHost = document.getElementById("rules-ref");
  if (rulesRefHost) renderRulesReference(rulesRefHost, (v) => `play.html?variant=${v.id}`);
  buildChooseyPanel();
  measureAdvanceRatio();
  restart();
  if (typeof document?.fonts?.ready?.then === "function") {
    void document.fonts.ready.then(calibrateAdvanceRatio);
  }
})();
//# sourceMappingURL=play.js.map
