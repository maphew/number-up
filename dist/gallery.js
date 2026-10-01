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
  var gameParams = ["world", "seed", "rule", "fail", "variant", "debug"];
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
      <h2>${v.name}</h2>
      <p class="tagline"></p>
      <p class="how"></p>
      <p class="meta"></p>
      <p class="hypothesis"></p>
      <p class="play">play \u2192</p>`;
      setText(a, ".tagline", v.tagline);
      setText(a, ".how", v.how);
      setText(a, ".meta", `collision: ${v.rule} \xB7 failure: ${v.fail} \xB7 opens in world ${v.world || "full"}`);
      setText(a, ".hypothesis", v.hypothesis);
      return a;
    };
    card = card2;
    const root = mustEl("gallery");
    const GROUPS = [
      { label: "with stakes: one non-up move ends the run", fail: "notUp" },
      { label: "open field: nothing can hurt you", fail: "none" }
    ];
    for (const group of GROUPS) {
      const ids = VARIANT_ORDER.filter((id) => VARIANTS[id].fail === group.fail);
      if (!ids.length) continue;
      const h = document.createElement("h2");
      h.className = "group-label";
      h.textContent = group.label;
      root.appendChild(h);
      for (const id of ids) root.appendChild(card2({ id, ...VARIANTS[id] }));
    }
  }
  var card;
})();
//# sourceMappingURL=gallery.js.map
