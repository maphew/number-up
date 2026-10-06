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
      fail: "none",
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

  // src/version.ts
  var APP_VERSION = "0.2.0";

  // src/gallery.ts
  function mustEl(id) {
    const el = document.getElementById(id);
    if (el === null) throw new Error(`missing #${id}`);
    return el;
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
      <p class="hypothesis"></p>
      <p class="play">play \u2192</p>`;
      setText(a, "h2", `${v.name}${v.collapse ? " \u269B" : ""}`);
      setText(a, ".tagline", v.tagline);
      setText(a, ".how", v.how);
      setText(a, ".meta", `collision: ${v.rule} \xB7 failure: ${v.fail} \xB7 opens in world ${v.world || "full"}${v.collapse ? " \xB7 collapse-to-floor" : ""} \xB7 updated ${v.updated}`);
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
    if (LAYOUT_EXPERIMENTS.length) {
      const h = document.createElement("h2");
      h.className = "group-label";
      h.textContent = "lab bench: layout experiments \u2014 the board, not the rules";
      root.appendChild(h);
      for (const e of LAYOUT_EXPERIMENTS) {
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
        setText(a, "h2", `\u2B21 ${e.name}`);
        setText(a, ".tagline", e.tagline);
        setText(a, ".how", e.how);
        setText(a, ".meta", e.meta);
        setText(a, ".hypothesis", e.hypothesis);
        root.appendChild(a);
      }
    }
  }
  var card;
})();
//# sourceMappingURL=gallery.js.map
