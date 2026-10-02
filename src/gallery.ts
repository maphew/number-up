import { VARIANTS, VARIANT_ORDER, type ResolvedVariant } from './variants.ts';
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
const gameParams = ['world', 'seed', 'rule', 'fail', 'variant', 'debug'];
if (gameParams.some((k) => params.has(k))) {
  location.replace(`play.html${location.search}`);
} else {
  const root = mustEl('gallery');
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = `v${APP_VERSION}`;

  const GROUPS = [
    { label: 'with stakes: one non-up move ends the run', fail: 'notUp' },
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
      <p class="hypothesis"></p>
      <p class="play">play →</p>`;
    setText(a, 'h2', `${v.name}${v.collapse ? ' ⚛' : ''}`);
    setText(a, '.tagline', v.tagline);
    setText(a, '.how', v.how);
    setText(a, '.meta', `collision: ${v.rule} · failure: ${v.fail} · opens in world ${v.world || 'full'}${v.collapse ? ' · collapse-to-floor' : ''} · updated ${v.updated}`);
    setText(a, '.hypothesis', v.hypothesis);
    return a;
  }

  for (const group of GROUPS) {
    const ids = VARIANT_ORDER.filter((id) => VARIANTS[id].fail === group.fail);
    if (!ids.length) continue;
    const h = document.createElement('h2');
    h.className = 'group-label';
    h.textContent = group.label;
    root.appendChild(h);
    for (const id of ids) root.appendChild(card({ id, ...VARIANTS[id] }));
  }
}
