import { createEngine, FAILURE_RULES, isOperator, RULES, type FailureName, type MoveEvent, type RuleName } from './engine.ts';
import { createCollapseState, createMatterState, findStart, generateWorld, HOLE, WORLDS, WORLD_ORDER, type MatterState, type World, type WorldKey } from './world.ts';
import { getVariant, variantFor } from './variants.ts';
import { createHexLattice, createSquareLattice, type Lattice, type Pos } from './lattice.ts';
import { formatMoveLog, formatRunDump, summariseRun, type RunContext } from './debug.ts';
import { createSoundKit, type Signal } from './sound.ts';
import { APP_VERSION } from './version.ts';

type PlayWorld = WorldKey | 'gen';

function mustEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing #${id}`);
  return el;
}

function isKeyOf<T extends Record<string, unknown>>(pool: T, key: string): key is keyof T & string {
  return Object.prototype.hasOwnProperty.call(pool, key);
}

function pickKey<T extends Record<string, unknown>>(key: string | null, pool: T, fallback: keyof T & string): keyof T & string {
  return key !== null && isKeyOf(pool, key) ? key : fallback;
}

function isWorldKey(key: string): key is WorldKey {
  return isKeyOf(WORLDS, key);
}

const params = new URLSearchParams(location.search);
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
const IS_HEX = params.get('layout') === 'hex';

const variantParam = params.get('variant');
const rawWorld = params.get('world');
const rawVariant = variantParam ? getVariant(variantParam) : null;
const rawCollapse = params.get('collapse');
const ruleKey: RuleName = rawVariant ? rawVariant.rule : pickKey(params.get('rule'), RULES, 'eval');
const failKey: FailureName = rawVariant ? rawVariant.fail : pickKey(params.get('fail'), FAILURE_RULES, 'notUp');
const collapseDefault = rawVariant ? (rawVariant.collapse ?? false) : rawCollapse === '1';
let collapseOn = collapseDefault && rawCollapse !== '0';

function resolveWorldKey(raw: string | null, variantWorld: WorldKey | undefined): PlayWorld {
  if (raw === 'gen') return 'gen';
  if (raw !== null && isWorldKey(raw)) return raw;
  return variantWorld ?? 'full';
}

const state: {
  worldKey: PlayWorld;
  genSeed: number | null;
  ruleKey: RuleName;
  failKey: FailureName;
  debug: boolean;
  number: number;
  pos: Pos;
  over: boolean;
  engine: ReturnType<typeof createEngine>;
  spent: ReturnType<typeof createCollapseState>;
  matter: MatterState;
} = {
  worldKey: resolveWorldKey(rawWorld, rawVariant?.world),
  genSeed: null,
  ruleKey,
  failKey,
  debug: params.get('debug') === '1',
  number: 0,
  pos: { x: 2, y: 2 },
  over: false,
  engine: createEngine(ruleKey, failKey),
  spent: createCollapseState(),
  matter: createMatterState(),
};

if (state.worldKey === 'gen') {
  const s = parseInt(params.get('seed') ?? '', 10);
  state.genSeed = Number.isInteger(s) && s > 0 ? s : Math.floor(Math.random() * 99999) + 1;
}

const CELL = 100;
const CANVAS = 500;

const sound = createSoundKit();

function hexRadius(cols: number, rows: number): number {
  return Math.min(CANVAS / (Math.sqrt(3) * (cols + 0.5)), CANVAS / (1.5 * rows + 0.5));
}

function buildLattice(cols: number, rows: number): Lattice {
  if (!IS_HEX) return createSquareLattice(cols, rows, CELL);
  return createHexLattice(cols, rows, hexRadius(cols, rows));
}

let lat: Lattice = createSquareLattice(5, 5, CELL);
let unit = CELL;

const mail = document.getElementById('feedback-mail');
const els = {
  number: mustEl('number'),
  variantSub: document.getElementById('variant-sub-text'),
  position: mustEl('position'),
  ruleLabel: mustEl('rule-label'),
  failLabel: mustEl('fail-label'),
  worldLabel: mustEl('world-label'),
  observation: mustEl('observation'),
  noteMeta: document.getElementById('note-meta'),
  noteTotals: document.getElementById('note-totals'),
  noteLog: document.getElementById('note-log'),
  feedbackLink: mail instanceof HTMLAnchorElement ? mail : null,
};
const svg = mustEl('grid');
const copyBtn = document.getElementById('note-copy');
const issueBtn = document.getElementById('note-issue');
const copyRunBtn = document.getElementById('copy-run');
const openIssueBtn = document.getElementById('open-issue');
const historyPre = mustEl('history');
let fromLog: (Pos | null)[] = [];

let tileNodes: (SVGElement | null)[][] = [];
let playerNode: SVGElement;
let playerNumberNode: SVGElement;
let playerCarriedNode: SVGElement;
let fxLayer: SVGElement;

function world(): World {
  if (state.worldKey === 'gen') {
    const seed = state.genSeed;
    if (seed === null) throw new Error('generated world has no seed');
    return generateWorld(seed);
  }
  return WORLDS[state.worldKey];
}

function currentVariant() {
  return variantFor(state.ruleKey, state.failKey, collapseOn);
}

function tileAt(x: number, y: number): string {
  const row = world().rows[y];
  const tile = row?.[x];
  if (tile === undefined) throw new Error(`no tile at ${x},${y}`);
  const matter = state.matter.at(tile, x, y);
  if (matter !== tile) return matter;
  return collapseOn ? state.spent.tile(tile, x, y) : tile;
}

function ns<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  return node;
}

function cellCenter(x: number, y: number) {
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
  svg.setAttribute('viewBox', `${b.minX} ${b.minY} ${b.width} ${b.height}`);
  svg.classList.toggle('hex', lat.id === 'hex');
  svg.style.setProperty('--u', `${unit}px`);

  if (lat.id === 'square') {
    for (let i = 0; i <= rows.length; i++) {
      svg.appendChild(ns('line', { x1: 0, y1: i * unit, x2: rows.length * unit, y2: i * unit, class: 'cell-line' }));
      svg.appendChild(ns('line', { x1: i * unit, y1: 0, x2: i * unit, y2: rows.length * unit, class: 'cell-line' }));
    }
  } else {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      if (row === undefined) continue;
      for (let x = 0; x < row.length; x++) {
        const { cx, cy } = lat.centre(x, y);
        const d = lat.cellPath(cx, cy);
        if (d === null) continue;
        svg.appendChild(ns('path', { d, class: 'cell-line' }));
      }
    }
  }

  paintCollapsedTiles(rows);

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    if (row === undefined) continue;
    const nodes: (SVGElement | null)[] = [];
    tileNodes.push(nodes);
    for (let x = 0; x < row.length; x++) {
      const { cx, cy } = lat.centre(x, y);
      const glyph = row[x];
      if (glyph === undefined) continue;
      // Empty ground gets an (invisible) node too, so relay board edits can
      // paint swapped-in numbers onto cells the world never had a glyph for.
      const text = ns('text', { x: cx, y: cy, class: isOperator(glyph) ? 'tile op' : 'tile' });
      if (glyph !== '.') text.textContent = glyph;
      svg.appendChild(text);
      nodes.push(text);
    }
  }

  fxLayer = ns('g', { id: 'fx' });
  svg.appendChild(fxLayer);

  playerNode = ns('g', { id: 'player' });
  playerNode.appendChild(ns('circle', { cx: 0, cy: 0, r: unit * 0.3, class: 'dot' }));
  playerNumberNode = ns('text', { x: 0, y: 1, class: 'pnum' });
  playerNode.appendChild(playerNumberNode);
  playerCarriedNode = ns('text', { x: 0, y: -unit * 0.42, class: 'carried' });
  playerNode.appendChild(playerCarriedNode);
  svg.appendChild(playerNode);
}

function paintCollapsedTiles(rows: World['rows']) {
  if (!collapseOn) return;
  for (let y = 0; y < rows.length; y++) {
    const nodes = tileNodes[y];
    if (nodes === undefined) continue;
    for (let x = 0; x < (rows[y]?.length ?? 0); x++) {
      if (!state.spent.has(x, y)) continue;
      const text = nodes[x];
      if (text) {
        text.textContent = '';
        text.classList.add('spent');
      }
    }
  }
}

function collapseTileNode(x: number, y: number) {
  const row = tileNodes[y];
  const node = row?.[x] ?? null;
  if (node) {
    node.textContent = '';
    node.classList.add('spent');
  }
}

function placePlayer() {
  const { cx, cy } = cellCenter(state.pos.x, state.pos.y);
  playerNode.style.transform = `translate(${cx}px, ${cy}px)`;
}

function fmtNumber(n: number): string {
  if (!Number.isFinite(n)) return '✕';
  const s = String(n);
  return s.length > 6 ? n.toExponential(2) : s;
}

function renderPnum() {
  playerNumberNode.textContent = fmtNumber(state.number);
  playerNumberNode.classList.toggle('long', playerNumberNode.textContent.length > 4);
}

function renderCarried() {
  const op = state.engine.carried;
  playerCarriedNode.textContent = op ?? '';
  playerNode.classList.toggle('armed', op !== null);
}

function statusClass(ev: MoveEvent): string {
  if (!ev.valid) return 'down';
  if (ev.delta > 0) return 'up';
  if (ev.delta < 0) return 'down';
  return 'flat';
}

function flashStatus(cls: string) {
  els.number.classList.remove('up', 'down', 'flat');
  void els.number.offsetWidth;
  if (cls) els.number.classList.add(cls);
  setTimeout(() => els.number.classList.remove(cls), 450);
}

function deltaGlyph(ev: MoveEvent): string {
  if (!ev.valid) return '✕ invalid';
  if (ev.delta > 0) return `↑ +${ev.delta}`;
  if (ev.delta < 0) return `↓ ${ev.delta}`;
  return '— ±0';
}

function setTileNode(x: number, y: number, glyph: string) {
  const node = tileNodes[y]?.[x] ?? null;
  if (!node) return;
  node.textContent = glyph;
  node.classList.toggle('hole', glyph === HOLE);
}

// applyEffect turns the rule's board effect into the matter overlay and
// SVG state, so tileAt (and every re-render) sees the same board as play.ts.
function applyEffect(ev: MoveEvent, from: Pos, to: Pos) {
  switch (ev.effect.kind) {
    case 'swap':
      state.matter.set(from.x, from.y, ev.destinationTile);
      state.matter.set(to.x, to.y, '');
      setTileNode(from.x, from.y, ev.destinationTile);
      setTileNode(to.x, to.y, '');
      break;
    case 'pickup':
      state.matter.set(to.x, to.y, '');
      setTileNode(to.x, to.y, '');
      break;
    case 'opswap':
      state.matter.set(to.x, to.y, ev.effect.dropped);
      setTileNode(to.x, to.y, ev.effect.dropped);
      break;
    case 'consume':
      state.matter.set(to.x, to.y, HOLE);
      setTileNode(to.x, to.y, HOLE);
      break;
    case 'none':
      break;
  }
}

function fly(glyph: string, from: Pos, to: Pos) {
  const { cx: fx, cy: fy } = cellCenter(from.x, from.y);
  const { cx: tx, cy: ty } = cellCenter(to.x, to.y);
  const node = ns('text', { x: 0, y: 0, class: 'fly', transform: `translate(${fx}px, ${fy}px)` });
  node.textContent = glyph;
  fxLayer.appendChild(node);
  requestAnimationFrame(() => {
    node.style.transform = `translate(${fx}px, ${fy}px)`;
    requestAnimationFrame(() => {
      node.style.transform = `translate(${tx}px, ${ty}px)`;
      node.style.opacity = '0';
    });
  });
  setTimeout(() => node.remove(), 500);
}

// The felt signal of a move: feeds both the sound cue and the vignette.
function cueFor(ev: MoveEvent): Signal {
  if (ev.failed) return 'over';
  if (!ev.valid) return 'sad';
  switch (ev.effect.kind) {
    case 'pickup':
    case 'opswap':
      return 'pickup';
    default: {
      if (ev.delta > 0) return 'happy';
      if (ev.delta < 0) return 'sad';
      return 'flat';
    }
  }
}

function flashVignette(sig: Signal) {
  const v = document.getElementById('vignette');
  if (!v) return;
  v.className = `cue-${sig}`;
  void v.offsetWidth;
  v.classList.add('on');
}

// Sounds stagger when two phrases belong to one action (a chomp, then its
// emotional colour), never overlapping on the same onset.
function playCue(sig: Signal, delayed: Signal | null = null) {
  sound.play(sig);
  if (delayed !== null && sound.enabled) setTimeout(() => sound.play(delayed), 75);
}

function animateSuperpose(ev: MoveEvent, from: Pos, to: Pos) {
  applyEffect(ev, from, to);
  const { cx: tx, cy: ty } = cellCenter(to.x, to.y);

  if (ev.effect.kind === 'swap') {
    fly(ev.destinationTile, to, from);
    fly(fmtNumber(ev.oldNumber), from, to);
  } else if (ev.effect.kind === 'opswap') {
    fly(ev.effect.dropped, from, to);
  } else if (ev.effect.kind === 'pickup') {
    fly(ev.destinationTile, to, to);
  } else if (ev.effect.kind === 'none') {
    const dest = tileNodes[to.y]?.[to.x] ?? null;
    if (dest && dest.textContent !== '') fly(ev.destinationTile, from, to);
  }

  playerNumberNode.textContent = fmtNumber(state.number);
  playerNumberNode.classList.toggle('long', (playerNumberNode.textContent ?? '').length > 4);
  playerNumberNode.classList.remove('pop');
  void playerNumberNode.getBoundingClientRect();
  playerNumberNode.classList.add('pop');

  const cls = statusClass(ev);
  const delta = ns('text', { x: 0, y: 0, class: `delta ${cls}` });
  delta.style.transform = `translate(${tx}px, ${ty - unit * 0.44}px)`;
  delta.textContent = deltaGlyph(ev);
  fxLayer.appendChild(delta);
  setTimeout(() => delta.remove(), 700);

  const resultText = ns('text', { x: 0, y: 0, class: `result-eq ${cls}` });
  resultText.style.transform = `translate(${tx + unit * 0.34}px, ${ty + unit * 0.06}px)`;
  resultText.textContent = `= ${fmtNumber(ev.valid ? ev.result : NaN)}`;
  fxLayer.appendChild(resultText);
  setTimeout(() => resultText.remove(), 900);

  flashStatus(cls);
}

function line(cls: string, text: string): HTMLDivElement {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  return div;
}

function showBlocked(direction: string) {
  const obs = els.observation;
  obs.textContent = '';
  obs.appendChild(line('', `You moved ${direction}.`));
  obs.appendChild(line('', ''));
  obs.appendChild(line('flat', 'Blocked — edge of world.'));
}

function showBlockedHole(direction: string) {
  const obs = els.observation;
  obs.textContent = '';
  obs.appendChild(line('', `You moved ${direction}.`));
  obs.appendChild(line('', ''));
  obs.appendChild(line('flat', 'Blocked — a hole. Consumed numbers cannot be moved onto.'));
}

function verboseObservation(move: MoveEvent): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(line('', `You moved ${move.direction}.`));
  frag.appendChild(line('', ''));
  frag.appendChild(line('', 'SUPERPOSITION'));
  frag.appendChild(line('', ''));
  frag.appendChild(line('', `${fmtNumber(move.oldNumber)}  ${move.destinationTile}`));
  frag.appendChild(line('', `Pending: ${move.pendingAtEntry === null ? '—' : move.pendingAtEntry}`));
  frag.appendChild(line('', `Armed: ${move.carriedAtEntry ?? '—'}`));
  frag.appendChild(line('', `Effect: ${move.effect.kind}${move.effect.kind === 'opswap' ? ` (drops ${move.effect.dropped})` : ''}`));
  frag.appendChild(line('', `Result: ${move.valid ? fmtNumber(move.result) : 'INVALID'}`));
  const deltaNote = move.valid ? `  (Δ ${move.delta > 0 ? '+' : ''}${move.delta})` : '';
  frag.appendChild(line(
    move.valid ? statusClass(move) : 'down',
    `Number went UP: ${move.valid ? (move.wentUp ? 'YES' : 'NO') : '—'}${deltaNote}`
  ));
  return frag;
}

function quietObservation(move: MoveEvent): DocumentFragment {
  const frag = document.createDocumentFragment();
  const glyph = move.valid ? (move.wentUp ? '↑' : move.delta < 0 ? '↓' : '—') : '✕';
  const held: string[] = [];
  if (move.pendingAtEntry !== null) held.push(`[${move.pendingAtEntry}]`);
  const armed = state.engine.carried;
  if (armed !== null) held.push(`⌁${armed}`);
  const tail = held.length ? ` ${held.join(' ')}` : '';
  frag.appendChild(line(move.valid ? statusClass(move) : 'down', `${glyph} ${fmtNumber(state.number)}${tail}`));
  return frag;
}

function showObservation(move: MoveEvent, extra?: DocumentFragment | null) {
  const obs = els.observation;
  obs.textContent = '';
  obs.appendChild(state.debug ? verboseObservation(move) : quietObservation(move));
  if (extra) {
    obs.appendChild(line('', ''));
    obs.appendChild(extra);
  }
}

function showRunOver(ev: MoveEvent): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.appendChild(line('over', `RUN OVER — ${ev.failReason}.`));
  const survived = Math.max(0, ev.turn - 1);
  frag.appendChild(line('', `Died on move ${ev.turn}, survived ${survived} move${survived === 1 ? '' : 's'}, final Number ${fmtNumber(state.number)}.`));
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
  els.worldLabel.textContent = `${state.worldKey} — ${world().name}${collapseOn ? ' +collapse' : ''}`;
  const issueUrl = issueHref();
  const issueLink = document.getElementById('feedback-issue');
  if (issueLink instanceof HTMLAnchorElement) issueLink.href = issueUrl;
}

function issueHref(): string {
  const dump = formatRunDump(runContext(), state.engine.history, fromLog);
  const body = `${dump}\n\nWhat happened / what should have happened:\n`;
  return `https://github.com/maphew/number-up/issues/new?${new URLSearchParams({ title: 'NUMBER UP feedback', body })}`;
}

function openIssue() {
  window.open(issueHref(), '_blank', 'noopener');
}

function feedbackHref(): string {
  const lines = [
    `World: ${state.worldKey} — ${world().name}`,
    `Variant: ${variantLabel()}`,
    `Collision rule: ${state.ruleKey} (${state.engine.rule.name})`,
    `Failure rule: ${state.failKey} (${state.engine.failure.name})`,
    `Number: ${fmtNumber(state.number)} after ${state.engine.turn} move${state.engine.turn === 1 ? '' : 's'}`,
    '',
    'Last moves:',
    ...formatMoveLog(state.engine.history.slice(-10), fromLog.slice(-10)),
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
  historyPre.textContent = rows.join('\n');
}

function variantLabel(): string {
  const v = currentVariant();
  if (v) return `${v.name} (${v.id})`;
  return collapseOn ? `custom — ${state.ruleKey} × ${state.failKey} + collapse` : `custom — ${state.ruleKey} × ${state.failKey}`;
}

function runContext(): RunContext {
  const v = currentVariant();
  return {
    ruleKey: state.ruleKey,
    ruleName: state.engine.rule.name,
    failKey: state.failKey,
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
    appVersion: APP_VERSION,
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
      `Variant: ${ctx.variantLabel}${v?.updated !== undefined ? ` (updated ${v.updated})` : ''}`,
      `Rule ${ctx.ruleKey} · fail ${ctx.failKey} · world ${ctx.worldKey}${ctx.seed === null ? '' : ` seed ${ctx.seed}`}${collapseOn ? ' · collapse-to-floor' : ''}`,
      IS_HEX
        ? 'Layout hex (pointy-top odd-r, 6 neighbours) — ←→/AD = W E · Q/E = NW/NE · Z/C = SW/SE · numpad 7/9/1/3 diagonals · swipe snaps to nearest of 6 (straight up/down → NE/SE)'
        : 'Layout square (4 neighbours) — arrows / WASD / numpad · swipe dominant axis',
      `URL: ${ctx.url}`,
      `Pending: ${state.engine.pending === null ? '—' : state.engine.pending}`,
      `Armed: ${state.engine.carried ?? '—'}`,
      v ? `Hypothesis: ${v.hypothesis}` : 'Custom rule × fail pairing.',
    ].join('\n');
  }
  if (els.noteTotals) {
    const t = summariseRun(state.engine.history);
    els.noteTotals.textContent =
      `Turns ${t.turns} · peak ${t.peak === null ? '—' : t.peak} · final ${t.final === null ? '—' : t.final} · up ${t.up} · down ${t.down} · flat ${t.flat} · invalid ${t.invalid}`;
  }
  if (els.noteLog) {
    els.noteLog.textContent = formatMoveLog(state.engine.history, fromLog).join('\n');
  }
}

function copyRunDump() {
  const dump = formatRunDump(runContext(), state.engine.history, fromLog);
  const done = (ok: boolean) => {
    if (copyBtn instanceof HTMLElement) {
      copyBtn.textContent = ok ? 'copied' : 'copy failed';
      setTimeout(() => { copyBtn.textContent = 'copy run'; }, 1200);
    }
  };
  try {
    const clip = navigator.clipboard;
    if (clip) {
      void clip.writeText(dump).then(() => done(true), () => fallbackCopy(dump, done));
      return;
    }
  } catch { /* fall through to textarea fallback */ }
  fallbackCopy(dump, done);
}

function fallbackCopy(text: string, done: (ok: boolean) => void) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
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
  playerNode.classList.toggle('dead', state.over);
  renderStatus();
  if (els.feedbackLink) els.feedbackLink.href = feedbackHref();
  if (state.debug) renderNotebook();
}

function tryMove(name: string) {
  if (state.over) {
    const obs = els.observation;
    obs.textContent = '';
    obs.appendChild(line('', `You moved ${name.toUpperCase()}.`));
    obs.appendChild(line('', ''));
    obs.appendChild(line('flat', IS_TOUCH ? 'Run is over — tap the grid to restart.' : 'Run is over — press R to restart.'));
    return;
  }
  const next = lat.step(state.pos.x, state.pos.y, name);
  if (next === null) {
    playerNode.classList.remove('pop');
    void playerNode.getBoundingClientRect();
    playerNode.classList.add('pop');
    showBlocked(name);
    playCue('blocked');
    flashVignette('blocked');
    return;
  }

  // A hole left by a consumed number cannot be moved onto.
  if (tileAt(next.x, next.y) === HOLE) {
    playerNode.classList.remove('pop');
    void playerNode.getBoundingClientRect();
    playerNode.classList.add('pop');
    showBlockedHole(name);
    playCue('blocked');
    flashVignette('blocked');
    return;
  }

  const from = { ...state.pos };
  fromLog.push({ ...from });
  const ev = state.engine.attempt(state.number, name.toUpperCase(), tileAt(next.x, next.y));
  state.number = ev.valid ? ev.result : NaN;
  state.pos = next;
  if (collapseOn) {
    state.spent.add(state.pos.x, state.pos.y);
    collapseTileNode(state.pos.x, state.pos.y);
  }

  render();
  animateSuperpose(ev, from, state.pos);
  renderCarried();
  const cue = cueFor(ev);
  if (ev.effect.kind === 'consume' && !ev.failed) {
    playCue('consume', cue);
    flashVignette('consume');
    if (sound.enabled) setTimeout(() => flashVignette(cue), 130);
  } else {
    playCue(cue);
    flashVignette(cue);
  }
  showObservation(ev, ev.failed ? showRunOver(ev) : null);
  if (ev.failed) state.over = true;
  render();
}

function movementNote(): string {
  if (IS_TOUCH) {
    return IS_HEX ? ' Swipe toward a neighbour — the swipe snaps to the nearest of the six.' : ' Swipe the grid to move.';
  }
  return IS_HEX ? ' Move: A/D or ←→ = W/E · Q/E = NW/NE · Z/C = SW/SE.' : '';
}

function restart(message?: string) {
  applyEngine();
  state.number = 0;
  state.pos = findStart(world());
  state.over = false;
  fromLog = [];
  state.spent.clear();
  state.matter.clear();
  buildGrid();
  syncUrl();
  render();
  const v = currentVariant();
  const variantNote = v ? ` Variant ${v.name}.` : '';
  els.observation.textContent = message || `World ${state.worldKey} — ${world().name}.${variantNote} Number = 0.${movementNote()}`;
  if (state.debug) renderNotebook();
  playCue('start');
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
    if (collapseOn !== (v?.collapse ?? false)) p.set('collapse', collapseOn ? '1' : '0');
    else p.delete('collapse');
    if (IS_HEX) p.set('layout', 'hex');
    else p.delete('layout');
    if (state.debug) p.set('debug', '1');
    else p.delete('debug');
    history.replaceState(null, '', `${location.pathname}?${p}`);
  } catch {
    /* non-serve contexts (sandboxed iframes) may block URL writes */
  }
}

function cycle<T extends string>(order: readonly T[], key: string): T {
  const i = order.findIndex((item) => item === key);
  const next = order[(i + 1) % order.length];
  if (next === undefined) throw new Error('empty cycle');
  return next;
}

function nextWorld() {
  state.worldKey = cycle(WORLD_ORDER, state.worldKey);
  restart();
}

function nextGenerated() {
  state.worldKey = 'gen';
  state.genSeed = Math.floor(Math.random() * 99999) + 1;
  restart(`World gen — ${world().name}. Number = 0.`);
}

function nextRule() {
  if (!IS_HEX && !confirmWipe('rule')) return;
  state.ruleKey = cycle(['replace', 'add', 'eval', 'relay'], state.ruleKey);
  restart(`Collision rule → ${state.ruleKey} (${state.engine.rule.name}). Number = 0.`);
}

function nextFailure() {
  if (!IS_HEX && !confirmWipe('fail')) return;
  state.failKey = cycle(['notUp', 'down', 'none'], state.failKey);
  restart(`Failure rule → ${state.failKey} (${state.engine.failure.name}). Number = 0.`);
}

function toggleCollapse() {
  collapseOn = !collapseOn;
  restart(`Collapse-to-floor ${collapseOn ? 'ON — tiles burn out behind you' : 'OFF'}. Number = 0.`);
}

function applyEngine() {
  state.engine = createEngine(state.ruleKey, state.failKey);
}

const MOVE_KEYS: Record<string, string> = IS_HEX
  ? {
      ArrowLeft: 'W',
      ArrowRight: 'E',
      A: 'W',
      D: 'E',
      a: 'W',
      d: 'E',
      Q: 'NW',
      E: 'NE',
      q: 'NW',
      e: 'NE',
      Z: 'SW',
      C: 'SE',
      z: 'SW',
      c: 'SE',
      W: 'W',
      S: 'S',
      Numpad4: 'W',
      Numpad6: 'E',
      Numpad7: 'NW',
      Numpad9: 'NE',
      Numpad1: 'SW',
      Numpad3: 'SE',
    }
  : {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      W: 'up',
      S: 'down',
      A: 'left',
      D: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
      Numpad8: 'up',
      Numpad2: 'down',
      Numpad4: 'left',
      Numpad6: 'right',
    };

function confirmWipe(action: 'rule' | 'fail'): boolean {
  if (state.engine.turn === 0) return true;
  const label = action === 'rule' ? 'collision rule' : 'failure rule';
  return window.confirm(`Switch ${label}? This restarts the run (${state.engine.turn} moves in).`);
}

const HEX_NO_NS_KEYS = new Set(['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S', 'Numpad8', 'Numpad2', '8', '2']);

function showHexNoNorthSouth() {
  const obs = els.observation;
  obs.textContent = '';
  obs.appendChild(line('', 'Hex rows have no north/south neighbour.'));
  obs.appendChild(line('', ''));
  obs.appendChild(line('flat', 'Diagonals: Q/E = NW/NE, Z/C = SW/SE (numpad 7 9 1 3).'));
}

function toggleDebug() {
  state.debug = !state.debug;
  document.body.classList.toggle('debug', state.debug);
  document.querySelector('#help [data-action="debug"]')?.classList.toggle('on', state.debug);
  const last = state.engine.history[state.engine.history.length - 1];
  if (state.debug) {
    renderNotebook();
    if (last !== undefined) showObservation(last, last.failed ? showRunOver(last) : null);
  } else if (last !== undefined) {
    showObservation(last, last.failed ? showRunOver(last) : null);
  }
  syncUrl();
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const direct = MOVE_KEYS[e.key];
  const move = direct ?? MOVE_KEYS[e.key.toLowerCase()] ?? MOVE_KEYS[e.code];
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
  } else if (k === 'm') {
    const on = sound.toggle();
    const btn = document.querySelector('#help [data-action="sound"]');
    if (btn instanceof HTMLElement) btn.classList.toggle('on', on);
    if (on) playCue('start');
  } else if (k === 'n') {
    nextWorld();
  } else if (k === 'g') {
    nextGenerated();
  } else if (k === 'c' || (IS_HEX && k === 'v')) {
    nextRule();
  } else if (k === 'f') {
    nextFailure();
  } else if (k === 'x') {
    toggleCollapse();
  } else if (IS_HEX && HEX_NO_NS_KEYS.has(e.key)) {
    e.preventDefault();
    showHexNoNorthSouth();
  }
});

document.getElementById('help')?.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const btn = target.closest('button[data-action]');
  if (!(btn instanceof HTMLElement)) return;
  const action = btn.getAttribute('data-action');
  if (action === 'restart') restart();
  else if (action === 'debug') toggleDebug();
  else if (action === 'catalogue') location.href = 'index.html';
  else if (action === 'world') nextWorld();
  else if (action === 'worldgen') nextGenerated();
  else if (action === 'rule') nextRule();
  else if (action === 'fail') nextFailure();
  else if (action === 'collapse') toggleCollapse();
  else if (action === 'sound') {
    const k = sound.toggle();
    btn.classList.toggle('on', k);
    if (k) playCue('start');
  }
  else if (action === 'feedback') openFeedback();
});

let touchStart: { x: number; y: number } | null = null;
const SWIPE_MIN = 24;

svg.addEventListener('touchstart', (e) => {
  if (e.changedTouches.length !== 1) return;
  e.preventDefault();
  const t = e.changedTouches.item(0);
  if (!t) return;
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: false });

svg.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

svg.addEventListener('touchend', (e) => {
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

svg.addEventListener('touchcancel', () => {
  touchStart = null;
}, { passive: false });

if (copyBtn instanceof HTMLButtonElement) {
  copyBtn.addEventListener('click', copyRunDump);
}

if (issueBtn instanceof HTMLButtonElement) {
  issueBtn.addEventListener('click', openIssue);
}

if (copyRunBtn instanceof HTMLButtonElement) {
  copyRunBtn.addEventListener('click', copyRunDump);
}

if (openIssueBtn instanceof HTMLButtonElement) {
  openIssueBtn.addEventListener('click', openIssue);
}

if (IS_HEX) {
  const keyNote = document.getElementById('key-note');
  if (keyNote) keyNote.textContent = '←→/AD = W·E · Q E Z C = NW·NE·SW·SE / swipe';
  const ruleKbd = document.querySelector('#help [data-action="rule"] kbd');
  if (ruleKbd) ruleKbd.textContent = 'V';
}

if (state.debug) document.body.classList.add('debug');
document.querySelector('#help [data-action="sound"]')?.classList.toggle('on', sound.enabled);
restart();
