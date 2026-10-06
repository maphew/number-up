import { GALLERY_ORDER, VARIANTS, type ResolvedVariant } from './variants.ts';
import { WORLDS } from './world.ts';
import { APP_VERSION } from './version.ts';
import { COLLAPSE_SHORT, RULE_SHORT, FAILURE_SHORT, WORLD_LONG, renderRulesReference } from './plain.ts';

function mustEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing #${id}`);
  return el;
}

function setText(root: Element, selector: string, text: string) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`missing ${selector}`);
  node.textContent = text;
}

// Deep links written before the catalogue existed (?world=…&rule=…&seed=…)
// belong to the game page now. Hand them over intact.
const params = new URLSearchParams(location.search);
const gameParams = ['world', 'seed', 'rule', 'fail', 'variant', 'layout', 'debug'];
if (gameParams.some((k) => params.has(k))) {
  location.replace(`play.html${location.search}`);
} else {
  const root = mustEl('gallery');
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  const GROUPS = [
    { label: 'with stakes: one non-up move ends the run', fail: 'notUp' },
    { label: 'gentler stakes: only a downward step ends the run', fail: 'down' },
    { label: 'open field: nothing can hurt you', fail: 'none' },
  ];

  function card(v: ResolvedVariant): HTMLAnchorElement {
    const q = new URLSearchParams({ variant: v.id });
    if (v.world) q.set('world', v.world);
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `play.html?${q}`;
    a.innerHTML = `
      <h2></h2>
      <p class="tagline"></p>
      <p class="how"></p>
      <p class="meta"></p>
      <p class="world"></p>
      <p class="hypothesis"></p>
      <p class="play">play →</p>`;
    setText(a, 'h2', `${v.name}${v.collapse ? ' ⚛' : ''}`);
    setText(a, '.tagline', v.tagline);
    setText(a, '.how', v.how);
    setText(a, '.meta', `touch rule: ${v.rule} (${RULE_SHORT[v.rule]}) · run ends: ${v.fail} (${FAILURE_SHORT[v.fail]})${v.collapse ? ` · ${COLLAPSE_SHORT}` : ''} · updated ${v.updated}`);
    const w = WORLDS[v.world];
    setText(a, '.world', `opens in world ${v.world || 'full'} — ${w?.name ?? 'unknown'} · ${WORLD_LONG[v.world] ?? 'a generated map'} · map data last changed ${w?.updated ?? '—'}`);
    setText(a, '.hypothesis', v.hypothesis);
    return a;
  }

  // Newest first within each stakes group (GALLERY_ORDER is sorted by
  // `updated` descending); group order keeps the stakes narrative.
  for (const group of GROUPS) {
    const ids = GALLERY_ORDER.filter((id) => VARIANTS[id].fail === group.fail);
    if (!ids.length) continue;
    const h = document.createElement('h2');
    h.className = 'group-label';
    h.textContent = group.label;
    root.appendChild(h);
    for (const id of ids) root.appendChild(card({ id, ...VARIANTS[id] }));
  }

  // Rules that are not a single pairing get their own bench cards: the board
  // changes, or the rules themselves are the player's to tick.
  const BENCH = [
    {
      name: 'Choosey',
      tagline: 'the boxes under the board are the rules',
      how: 'A world where nothing is fixed: tick which touch rules apply (the first ticked one that fits a tile does it), which run-enders can fire, and whether tiles vanish. Change a box and the run starts over.',
      meta: 'rules experiment (?world=choosey) · touch + run-ender + vanish checkboxes under the board · updated 2026-10-06',
      hypothesis:
        'You will read the ticked list as a dial and turn it until the board feels like yours — mixing halves of different grammars (holding a number AND trading places) is the pairing no single variant offers. If the chart of first-applicable-wins is never consulted and runs feel incoherent instead, composed rules need names of their own, not checkboxes.',
      href: 'play.html?world=choosey',
    },
  ];
  const LAYOUT_EXPERIMENTS = [
    {
      name: 'Hex lattice',
      tagline: 'six neighbours, three ways onward',
      how: 'Same variants, same worlds — the board just becomes hexes, so every tile has six neighbours and every row of signs has three exits.',
      meta: 'layout experiment (?layout=hex) · square stays the default · updated 2026-10-01 · notebook: layouts/hex.md',
      hypothesis:
        'You will plan further ahead when each tile offers three ways onward instead of two, and the six-key mapping (Q E Z C take the diagonals; swipes snap to the nearest of six) will feel honest rather than approximate. If the wider search reads as overwhelming or the keys fight your hand, the square grid keeps the board.',
      href: 'play.html?layout=hex&variant=verbs',
    },
  ];
  if (BENCH.length || LAYOUT_EXPERIMENTS.length) {
    const h = document.createElement('h2');
    h.className = 'group-label';
    h.textContent = 'lab bench: the board and the rules, up to you';
    root.appendChild(h);
    for (const e of [...BENCH, ...LAYOUT_EXPERIMENTS]) {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = e.href;
      a.innerHTML = `
        <h2></h2>
        <p class="tagline"></p>
        <p class="how"></p>
        <p class="meta"></p>
        <p class="hypothesis"></p>
        <p class="play">play →</p>`;
      setText(a, 'h2', e.name === 'Hex lattice' ? `⬡ ${e.name}` : e.name);
      setText(a, '.tagline', e.tagline);
      setText(a, '.how', e.how);
      setText(a, '.meta', e.meta);
      setText(a, '.hypothesis', e.hypothesis);
      root.appendChild(a);
    }
  }

  const refHost = document.getElementById('rules-ref');
  if (refHost) renderRulesReference(refHost, (v) => `play.html?variant=${v.id}`);
}
