(function () {
  'use strict';

  const { WORLDS, WORLD_ORDER, findStart, generateWorld } = globalThis.NumberUpWorlds;
  const Engine = globalThis.NumberUpEngine;
  const Variants = globalThis.NumberUpVariants || null;

  const params = new URLSearchParams(location.search);
  const pick = (key, pool, fallback) => (pool[key] ? key : fallback);
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

  const rawWorld = params.get('world');
  const rawVariant = Variants && params.get('variant') ? Variants.getVariant(params.get('variant')) : null;
  const state = {
    worldKey: pick(rawWorld, WORLDS, rawWorld === 'gen' ? 'gen' : (rawVariant && rawVariant.world) || 'full'),
    genSeed: null,
    ruleKey: rawVariant ? rawVariant.rule : pick(params.get('rule'), Engine.RULES, 'eval'),
    failKey: rawVariant ? rawVariant.fail : pick(params.get('fail'), Engine.FAILURE_RULES, 'notUp'),
    debug: params.get('debug') === '1',
    number: 0,
    pos: { x: 2, y: 2 },
    over: false,
    engine: null,
  };

  if (state.worldKey === 'gen') {
    const s = parseInt(params.get('seed'), 10);
    state.genSeed = Number.isInteger(s) && s > 0 ? s : Math.floor(Math.random() * 99999) + 1;
  }

  const CELL = 100;
  const els = {
    number: document.getElementById('number'),
    variantSub: document.getElementById('variant-sub-text'),
    position: document.getElementById('position'),
    ruleLabel: document.getElementById('rule-label'),
    failLabel: document.getElementById('fail-label'),
    worldLabel: document.getElementById('world-label'),
    observation: document.getElementById('observation'),
    history: document.getElementById('history'),
    feedbackLink: document.getElementById('feedback-mail'),
  };
  const svg = document.getElementById('grid');

  let tileNodes = [];
  let playerNode = null;
  let playerNumberNode = null;
  let fxLayer = null;

  function world() {
    return state.worldKey === 'gen' ? generateWorld(state.genSeed) : WORLDS[state.worldKey];
  }

  function currentVariant() {
    return Variants ? Variants.variantFor(state.ruleKey, state.failKey) : null;
  }

  function tileAt(x, y) {
    return world().rows[y][x];
  }

  function ns(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
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
      svg.appendChild(ns('line', { x1: 0, y1: i * CELL, x2: rows.length * CELL, y2: i * CELL, class: 'cell-line' }));
      svg.appendChild(ns('line', { x1: i * CELL, y1: 0, x2: i * CELL, y2: rows.length * CELL, class: 'cell-line' }));
    }

    for (let y = 0; y < rows.length; y++) {
      tileNodes.push([]);
      for (let x = 0; x < rows[y].length; x++) {
        const { cx, cy } = cellCenter(x, y);
        const glyph = rows[y][x];
        if (glyph === '.') {
          tileNodes[y].push(null);
          continue;
        }
        const text = ns('text', { x: cx, y: cy, class: glyph in Engine.OPS ? 'tile op' : 'tile' });
        text.textContent = glyph;
        svg.appendChild(text);
        tileNodes[y].push(text);
      }
    }

    fxLayer = ns('g', { id: 'fx' });
    svg.appendChild(fxLayer);

    playerNode = ns('g', { id: 'player' });
    playerNode.appendChild(ns('circle', { cx: 0, cy: 0, r: 30, class: 'dot' }));
    playerNumberNode = ns('text', { x: 0, y: 1, class: 'pnum' });
    playerNode.appendChild(playerNumberNode);
    svg.appendChild(playerNode);
  }

  function placePlayer() {
    const { cx, cy } = cellCenter(state.pos.x, state.pos.y);
    playerNode.style.transform = `translate(${cx}px, ${cy}px)`;
  }

  function fmtNumber(n) {
    return Number.isFinite(n) ? String(n) : 'INVALID';
  }

  function statusClass(ev) {
    if (!ev.valid) return 'down';
    if (ev.delta > 0) return 'up';
    if (ev.delta < 0) return 'down';
    return 'flat';
  }

  function flashStatus(cls) {
    els.number.classList.remove('up', 'down', 'flat');
    void els.number.offsetWidth;
    if (cls) els.number.classList.add(cls);
    setTimeout(() => els.number.classList.remove(cls), 450);
  }

  function deltaGlyph(ev) {
    if (!ev.valid) return '✕ invalid';
    if (ev.delta > 0) return `↑ +${ev.delta}`;
    if (ev.delta < 0) return `↓ ${ev.delta}`;
    return '— ±0';
  }

  function animateSuperpose(ev, from, to) {
    const dest = tileNodes[from.y][from.x];
    const { cx: fx, cy: fy } = cellCenter(from.x, from.y);
    const { cx: tx, cy: ty } = cellCenter(to.x, to.y);

    if (dest) {
      const fly = ns('text', { x: 0, y: 0, class: 'fly', transform: `translate(${fx}px, ${fy}px)` });
      fly.textContent = ev.destinationTile;
      fxLayer.appendChild(fly);
      requestAnimationFrame(() => {
        fly.style.transform = `translate(${fx}px, ${fy}px)`;
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${tx}px, ${ty}px)`;
          fly.style.opacity = '0';
        });
      });
      setTimeout(() => fly.remove(), 500);
    }

    playerNumberNode.textContent = fmtNumber(state.number);
    playerNumberNode.classList.remove('pop');
    void playerNumberNode.getBoundingClientRect();
    playerNumberNode.classList.add('pop');

    const cls = statusClass(ev);
    const delta = ns('text', { x: 0, y: 0, class: `delta ${cls}` });
    delta.style.transform = `translate(${tx}px, ${ty - 44}px)`;
    delta.textContent = deltaGlyph(ev);
    fxLayer.appendChild(delta);
    setTimeout(() => delta.remove(), 700);

    flashStatus(cls);
  }

  function line(cls, text) {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    return div;
  }

  function showObservation(ev, blocked, extra) {
    const obs = els.observation;
    obs.textContent = '';
    if (blocked) {
      obs.appendChild(line('', `You moved ${ev}.`));
      obs.appendChild(line('', ''));
      obs.appendChild(line('flat', 'Blocked — edge of world.'));
      return;
    }
    obs.appendChild(line('', `You moved ${ev.direction}.`));
    obs.appendChild(line('', ''));
    obs.appendChild(line('', 'SUPERPOSITION'));
    obs.appendChild(line('', ''));
    obs.appendChild(line('', `${fmtNumber(ev.oldNumber)}  ${ev.destinationTile}`));
    obs.appendChild(line('', ''));
    obs.appendChild(line('', `Result: ${ev.valid ? fmtNumber(ev.result) : 'INVALID'}`));
    obs.appendChild(line(
      ev.valid ? statusClass(ev) : 'down',
      `Number went UP: ${ev.valid ? (ev.wentUp ? 'YES' : 'NO') : '—'}${ev.valid && ev.delta !== null ? `  (Δ ${ev.delta > 0 ? '+' : ''}${ev.delta})` : ''}`
    ));
    if (extra) {
      obs.appendChild(line('', ''));
      obs.appendChild(extra);
    }
  }

  function showRunOver(ev) {
    const frag = document.createDocumentFragment();
    frag.appendChild(line('over', `RUN OVER — ${ev.failReason}.`));
    frag.appendChild(line('', `Survived ${ev.turn} move${ev.turn === 1 ? '' : 's'}, final Number ${fmtNumber(state.number)}.`));
    frag.appendChild(line('', IS_TOUCH ? 'Tap the grid (or R) to restart.' : 'Press R to restart.'));
    return frag;
  }

  function renderStatus() {
    els.number.textContent = fmtNumber(state.number);
    els.position.textContent = `${state.pos.x},${state.pos.y}`;
    if (els.variantSub) {
      const v = currentVariant();
      els.variantSub.textContent = v ? `${v.name} — ${v.tagline}` : `custom — ${state.ruleKey} × ${state.failKey}`;
      document.title = v ? `NUMBER UP — ${v.name}` : 'NUMBER UP — custom';
    }
    els.ruleLabel.textContent = `${state.ruleKey} (${state.engine.rule.name})`;
    els.failLabel.textContent = `${state.failKey} (${state.engine.failure.name})`;
    els.worldLabel.textContent = `${state.worldKey} — ${world().name}`;
  }

  function feedbackHref() {
    const v = currentVariant();
    const lines = [
      `World: ${state.worldKey} — ${world().name}`,
      `Variant: ${v ? `${v.name} (${v.id})` : `custom — ${state.ruleKey} × ${state.failKey}`}`,
      `Collision rule: ${state.ruleKey} (${state.engine.rule.name})`,
      `Failure rule: ${state.failKey} (${state.engine.failure.name})`,
      `Number: ${fmtNumber(state.number)} after ${state.engine.turn} move${state.engine.turn === 1 ? '' : 's'}`,
      '',
      'Last moves:',
      ...state.engine.history.slice(-10).map((ev) => (
        `${ev.turn} ${ev.direction} ${ev.oldNumber} ${ev.destinationTile} → ${ev.valid ? ev.result : 'INVALID'}`
      )),
      '',
      'What happened / what should have happened:',
    ];
    return `mailto:maphew+number-up@gmail.com?subject=${encodeURIComponent('NUMBER UP feedback')}&body=${encodeURIComponent(lines.join('\n'))}`;
  }

  function openFeedback() {
    location.href = feedbackHref();
  }

  function renderHistory() {
    const rows = state.engine.history.slice(-8).map((ev) => {
      const outcome = ev.valid
        ? `→ ${ev.result} (Δ ${ev.delta > 0 ? '+' : ''}${ev.delta}) ${ev.wentUp ? 'UP' : 'not up'}`
        : '→ INVALID';
      return `${String(ev.turn).padStart(3)} ${ev.direction.padEnd(5)} ${ev.oldNumber} ${ev.destinationTile} ${outcome}${ev.failed ? `  ☠ ${ev.failReason}` : ''}`;
    });
    els.history.textContent = rows.join('\n');
  }

  function render() {
    placePlayer();
    playerNumberNode.textContent = fmtNumber(state.number);
    playerNode.classList.toggle('dead', state.over);
    renderStatus();
    if (els.feedbackLink) els.feedbackLink.href = feedbackHref();
    if (state.debug) renderHistory();
  }

  const DIRECTIONS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };

  function tryMove(name) {
    if (state.over) {
      const obs = els.observation;
      obs.textContent = '';
      obs.appendChild(line('', `You moved ${name.toUpperCase()}.`));
      obs.appendChild(line('', ''));
      obs.appendChild(line('flat', IS_TOUCH ? 'Run is over — tap the grid to restart.' : 'Run is over — press R to restart.'));
      return;
    }
    const { dx, dy } = DIRECTIONS[name];
    const nx = state.pos.x + dx;
    const ny = state.pos.y + dy;
    const size = world().rows.length;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
      playerNode.classList.remove('pop');
      void playerNode.getBoundingClientRect();
      playerNode.classList.add('pop');
      showObservation(name, true);
      return;
    }

    const from = { ...state.pos };
    const ev = state.engine.attempt(state.number, name.toUpperCase(), tileAt(nx, ny));
    state.number = ev.valid ? ev.result : NaN;
    state.pos = { x: nx, y: ny };

    render();
    animateSuperpose(ev, from, state.pos);
    showObservation(ev, false, ev.failed ? showRunOver(ev) : null);
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
    const variantNote = v ? ` Variant ${v.name}.` : '';
    els.observation.textContent = message || `World ${state.worldKey} — ${world().name}.${variantNote} Number = 0.${IS_TOUCH ? ' Swipe the grid to move.' : ''}`;
    if (state.debug) renderHistory();
  }

  function syncUrl() {
    try {
      const p = new URLSearchParams(location.search);
      p.set('world', state.worldKey);
      if (state.worldKey === 'gen') p.set('seed', String(state.genSeed));
      else p.delete('seed');
      const v = currentVariant();
      if (v) p.set('variant', v.id);
      else p.delete('variant');
      p.set('rule', state.ruleKey);
      p.set('fail', state.failKey);
      history.replaceState(null, '', `${location.pathname}?${p}`);
    } catch (err) {
      /* non-serve contexts (sandboxed iframes) may block URL writes */
    }
  }

  function cycle(list, order, key) {
    return order[(order.indexOf(key) + 1) % order.length];
  }

  function nextWorld() {
    state.worldKey = cycle(WORLDS, WORLD_ORDER, state.worldKey);
    restart();
  }

  function nextGenerated() {
    state.worldKey = 'gen';
    state.genSeed = Math.floor(Math.random() * 99999) + 1;
    restart(`World gen — ${world().name}. Number = 0.`);
  }

  function nextRule() {
    state.ruleKey = cycle(Engine.RULES, ['replace', 'add', 'eval'], state.ruleKey);
    restart(`Collision rule → ${state.ruleKey} (${state.engine.rule.name}). Number = 0.`);
  }

  function nextFailure() {
    state.failKey = cycle(Engine.FAILURE_RULES, ['notUp', 'none'], state.failKey);
    restart(`Failure rule → ${state.failKey} (${state.engine.failure.name}). Number = 0.`);
  }

  function applyEngine() {
    state.engine = Engine.createEngine(state.ruleKey, state.failKey);
  }

  const KEYS = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
    Numpad8: 'up',
    Numpad2: 'down',
    Numpad4: 'left',
    Numpad6: 'right',
  };

  function toggleDebug() {
    state.debug = !state.debug;
    document.body.classList.toggle('debug', state.debug);
    document.querySelector('#help [data-action="debug"]')?.classList.toggle('on', state.debug);
    if (state.debug) renderHistory();
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const move = KEYS[e.key] || KEYS[e.code];
    if (move) {
      e.preventDefault();
      tryMove(move);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'r' || e.key === 'Enter') {
      e.preventDefault();
      restart();
    } else if (e.key === 'Escape') {
      location.href = 'index.html';
    } else if (k === '/') {
      e.preventDefault();
      toggleDebug();
    } else if (k === 'n') {
      nextWorld();
    } else if (k === 'g') {
      nextGenerated();
    } else if (k === 'c') {
      nextRule();
    } else if (k === 'f') {
      nextFailure();
    }
  });

  document.getElementById('help')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'restart') restart();
    else if (action === 'debug') toggleDebug();
    else if (action === 'catalogue') location.href = 'index.html';
    else if (action === 'world') nextWorld();
    else if (action === 'worldgen') nextGenerated();
    else if (action === 'rule') nextRule();
    else if (action === 'fail') nextFailure();
    else if (action === 'feedback') openFeedback();
  });

  let touchStart = null;
  const SWIPE_MIN = 24;

  svg.addEventListener('touchstart', (e) => {
    if (e.changedTouches.length !== 1) return;
    e.preventDefault();
    touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  svg.addEventListener('touchend', (e) => {
    if (!touchStart || e.changedTouches.length !== 1) return;
    e.preventDefault();
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_MIN) {
      if (state.over) restart();
      return;
    }
    tryMove(ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: false });

  svg.addEventListener('touchcancel', () => {
    touchStart = null;
  }, { passive: false });

  applyEngine();
  if (state.debug) document.body.classList.add('debug');
  restart();
})();
