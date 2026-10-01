(function () {
  'use strict';

  // Deep links written before the catalogue existed (?world=…&rule=…&seed=…)
  // belong to the game page now. Hand them over intact.
  const params = new URLSearchParams(location.search);
  const gameParams = ['world', 'seed', 'rule', 'fail', 'variant', 'debug'];
  if (gameParams.some((k) => params.has(k))) {
    location.replace(`play.html${location.search}`);
    return;
  }

  const { VARIANTS, VARIANT_ORDER } = globalThis.NumberUpVariants;
  const root = document.getElementById('gallery');

  const GROUPS = [
    { label: 'with stakes: one non-up move ends the run', fail: 'notUp' },
    { label: 'open field: nothing can hurt you', fail: 'none' },
  ];

  function card(v) {
    const q = new URLSearchParams({ variant: v.id });
    if (v.world) q.set('world', v.world);
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `play.html?${q}`;
    a.innerHTML = `
      <h2>${v.name}</h2>
      <p class="tagline"></p>
      <p class="meta"></p>
      <p class="hypothesis"></p>
      <p class="play">play →</p>`;
    a.querySelector('.tagline').textContent = v.tagline;
    a.querySelector('.meta').textContent =
      `collision: ${v.rule} · failure: ${v.fail} · opens in world ${v.world || 'full'}`;
    a.querySelector('.hypothesis').textContent = v.hypothesis;
    return a;
  }

  for (const group of GROUPS) {
    const ids = VARIANT_ORDER.filter((id) => VARIANTS[id].fail === group.fail);
    if (!ids.length) continue;
    const h = document.createElement('h2');
    h.className = 'group-label';
    h.textContent = group.label;
    root.appendChild(h);
    for (const id of ids) root.appendChild(card(Object.assign({ id }, VARIANTS[id])));
  }
})();
