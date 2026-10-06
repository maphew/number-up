import { GALLERY_ORDER, VARIANTS, type ResolvedVariant } from './variants.ts';
import { WORLDS } from './world.ts';
import { APP_VERSION } from './version.ts';

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
    setText(a, '.meta', `collision: ${v.rule} · failure: ${v.fail}${v.collapse ? ' · collapse-to-floor' : ''} · variant updated ${v.updated}`);
    const w = WORLDS[v.world];
    setText(a, '.world', `opens in world ${v.world || 'full'} — ${w?.name ?? 'unknown'} · world data last modified ${w?.updated ?? '—'}`);
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

  // Layout experiments are not variants (the rules stay put; the board
  // changes), so they live outside VARIANTS and render in their own group.
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
  if (LAYOUT_EXPERIMENTS.length) {
    const h = document.createElement('h2');
    h.className = 'group-label';
    h.textContent = 'lab bench: layout experiments — the board, not the rules';
    root.appendChild(h);
    for (const e of LAYOUT_EXPERIMENTS) {
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
      setText(a, 'h2', `⬡ ${e.name}`);
      setText(a, '.tagline', e.tagline);
      setText(a, '.how', e.how);
      setText(a, '.meta', e.meta);
      setText(a, '.hypothesis', e.hypothesis);
      root.appendChild(a);
    }
  }
}
