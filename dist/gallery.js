"use strict";
(() => {
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

  // src/version.ts
  var APP_VERSION = "0.3.0";

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
    if (tile === "") return "floor";
    if (tile === "HOLE" || tile === "\u2205") return "floor";
    if (isOperator(tile)) return "op";
    const n = Number(tile);
    return Number.isFinite(n) ? "num" : "floor";
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
        return OPS[tile](currentNumber, ctx.pending);
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
            return OPS[armed](currentNumber, Number(tile));
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
  var COLLAPSE_SHORT = "tiles vanish";
  var WORLD_LONG = {
    full: "A bit of everything: numbers and all four signs.",
    a: "Nothing but numbers \u2014 the zeros are the walls.",
    b: "A number ring at the start, and a good long run of plus signs.",
    c: "Numbers climb away from the start; the biggest neighbours are quietly traps.",
    d: "Built to test losing on purpose: a sign beside the start has no number to act on, and a 0 sits beside a \xF7.",
    choosey: "The rules are not fixed \u2014 tick them on and off in the boxes under the board.",
    gen: "A random 5\xD75 map. The same seed always makes the same map."
  };
  var GLOSSARY = [
    ["you", "the dot on the board \u2014 and the dot is your number."],
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
    for (const ruleKey of rules) {
      const row = el("tr", "ref-row");
      row.appendChild(el("th", "ref-cell head", `${ruleKey} \u2014 ${RULE_SHORT[ruleKey]}`));
      for (const failKey of fails) {
        const names = [];
        for (const id of VARIANT_ORDER) {
          const v = VARIANTS[id];
          if (v.rule === ruleKey && v.fail === failKey) {
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

  // src/gallery.ts
  function mustEl(id) {
    const el2 = document.getElementById(id);
    if (el2 === null) throw new Error(`missing #${id}`);
    return el2;
  }
  function setText(root, selector, text) {
    const node = root.querySelector(selector);
    if (!node) throw new Error(`missing ${selector}`);
    node.textContent = text;
  }
  var params = new URLSearchParams(location.search);
  var gameParams = ["world", "seed", "rule", "fail", "variant", "layout", "debug"];
  if (gameParams.some((k) => params.has(k))) {
    location.replace(`play.html${location.search}`);
  } else {
    let card2 = function(v) {
      const q = new URLSearchParams({ variant: v.id });
      if (v.world) q.set("world", v.world);
      const a = document.createElement("a");
      a.className = "card";
      a.href = `play.html?${q}`;
      a.innerHTML = `
      <h2></h2>
      <p class="tagline"></p>
      <p class="how"></p>
      <p class="meta"></p>
      <p class="world"></p>
      <p class="hypothesis"></p>
      <p class="play">play \u2192</p>`;
      setText(a, "h2", `${v.name}${v.collapse ? " \u269B" : ""}`);
      setText(a, ".tagline", v.tagline);
      setText(a, ".how", v.how);
      setText(a, ".meta", `touch rule: ${v.rule} (${RULE_SHORT[v.rule]}) \xB7 run ends: ${v.fail} (${FAILURE_SHORT[v.fail]})${v.collapse ? ` \xB7 ${COLLAPSE_SHORT}` : ""} \xB7 updated ${v.updated}`);
      const w = WORLDS[v.world];
      setText(a, ".world", `opens in world ${v.world || "full"} \u2014 ${w?.name ?? "unknown"} \xB7 ${WORLD_LONG[v.world] ?? "a generated map"} \xB7 map data last changed ${w?.updated ?? "\u2014"}`);
      setText(a, ".hypothesis", v.hypothesis);
      return a;
    };
    card = card2;
    const root = mustEl("gallery");
    const versionEl = document.getElementById("app-version");
    if (versionEl) versionEl.textContent = `v${APP_VERSION}`;
    const GROUPS = [
      { label: "with stakes: one non-up move ends the run", fail: "notUp" },
      { label: "gentler stakes: only a downward step ends the run", fail: "down" },
      { label: "open field: nothing can hurt you", fail: "none" }
    ];
    for (const group of GROUPS) {
      const ids = GALLERY_ORDER.filter((id) => VARIANTS[id].fail === group.fail);
      if (!ids.length) continue;
      const h = document.createElement("h2");
      h.className = "group-label";
      h.textContent = group.label;
      root.appendChild(h);
      for (const id of ids) root.appendChild(card2({ id, ...VARIANTS[id] }));
    }
    const BENCH = [
      {
        name: "Choosey",
        tagline: "the boxes under the board are the rules",
        how: "A world where nothing is fixed: tick which touch rules apply (the first ticked one that fits a tile does it), which run-enders can fire, and whether tiles vanish. Change a box and the run starts over.",
        meta: "rules experiment (?world=choosey) \xB7 touch + run-ender + vanish checkboxes under the board \xB7 updated 2026-10-06",
        hypothesis: "You will read the ticked list as a dial and turn it until the board feels like yours \u2014 mixing halves of different grammars (holding a number AND trading places) is the pairing no single variant offers. If the chart of first-applicable-wins is never consulted and runs feel incoherent instead, composed rules need names of their own, not checkboxes.",
        href: "play.html?world=choosey"
      }
    ];
    const LAYOUT_EXPERIMENTS = [
      {
        name: "Hex lattice",
        tagline: "six neighbours, three ways onward",
        how: "Same variants, same worlds \u2014 the board just becomes hexes, so every tile has six neighbours and every row of signs has three exits.",
        meta: "layout experiment (?layout=hex) \xB7 square stays the default \xB7 updated 2026-10-01 \xB7 notebook: layouts/hex.md",
        hypothesis: "You will plan further ahead when each tile offers three ways onward instead of two, and the six-key mapping (Q E Z C take the diagonals; swipes snap to the nearest of six) will feel honest rather than approximate. If the wider search reads as overwhelming or the keys fight your hand, the square grid keeps the board.",
        href: "play.html?layout=hex&variant=verbs"
      }
    ];
    if (BENCH.length || LAYOUT_EXPERIMENTS.length) {
      const h = document.createElement("h2");
      h.className = "group-label";
      h.textContent = "lab bench: the board and the rules, up to you";
      root.appendChild(h);
      for (const e of [...BENCH, ...LAYOUT_EXPERIMENTS]) {
        const a = document.createElement("a");
        a.className = "card";
        a.href = e.href;
        a.innerHTML = `
        <h2></h2>
        <p class="tagline"></p>
        <p class="how"></p>
        <p class="meta"></p>
        <p class="hypothesis"></p>
        <p class="play">play \u2192</p>`;
        setText(a, "h2", e.name === "Hex lattice" ? `\u2B21 ${e.name}` : e.name);
        setText(a, ".tagline", e.tagline);
        setText(a, ".how", e.how);
        setText(a, ".meta", e.meta);
        setText(a, ".hypothesis", e.hypothesis);
        root.appendChild(a);
      }
    }
    const refHost = document.getElementById("rules-ref");
    if (refHost) renderRulesReference(refHost, (v) => `play.html?variant=${v.id}`);
  }
  var card;
})();
//# sourceMappingURL=gallery.js.map
