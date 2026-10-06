import { classify, type MoveEvent } from './engine.ts';

export interface RunTotals {
  turns: number;
  peak: number | null;
  final: number | null;
  up: number;
  down: number;
  flat: number;
  invalid: number;
}

export interface RunContext {
  ruleKey: string;
  ruleName: string;
  failKey: string;
  failName: string;
  worldKey: string;
  worldName: string;
  variantLabel: string;
  seed: number | null;
  url: string;
  number: number;
  variantUpdated?: string;
  variantHypothesis?: string;
  pending?: number | null;
  carried?: string | null;
  appVersion?: string;
}

function fmtNum(n: number): string {
  return Number.isFinite(n) ? String(n) : 'INVALID';
}

function fmtPending(p: number | null): string {
  return p === null ? '—' : String(p);
}

export function summariseRun(history: MoveEvent[]): RunTotals {
  const totals: RunTotals = {
    turns: history.length,
    peak: null,
    final: null,
    up: 0,
    down: 0,
    flat: 0,
    invalid: 0,
  };
  let peak: number | null = null;
  const consider = (n: number) => {
    if (!Number.isFinite(n)) return;
    if (peak === null || n > peak) peak = n;
  };
  for (const ev of history) {
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
  const last = history[history.length - 1];
  totals.final = last === undefined || !last.valid ? null : last.result;
  return totals;
}

export interface LoggedFrom {
  x: number;
  y: number;
}

export function formatMoveLog(history: MoveEvent[], from?: (LoggedFrom | null)[]): string[] {
  return history.map((ev, i) => {
    const outcome = ev.valid
      ? `→ ${ev.result} (Δ ${ev.delta > 0 ? '+' : ''}${ev.delta}) ${ev.wentUp ? 'UP' : 'not up'}`
      : '→ INVALID';
    const kind = ev.destinationTile === '.' ? 'start' : classify(ev.destinationTile);
    const at = from?.[i];
    const pos = at === undefined || at === null ? '' : ` from ${at.x},${at.y}`;
    const fail = ev.failed && ev.failReason ? `  ☠ ${ev.failReason}` : '';
    const arm = ev.carriedAtEntry == null ? '' : ` arm=${ev.carriedAtEntry}`;
    return `${String(ev.turn).padStart(3)} ${ev.direction.padEnd(5)}${pos} ${fmtNum(ev.oldNumber)} ${ev.destinationTile} [${kind}] ${outcome} pending=${fmtPending(ev.pendingAtEntry)}${arm}${fail}`;
  });
}

export function formatRunDump(ctx: RunContext, history: MoveEvent[], from?: (LoggedFrom | null)[]): string {
  const totals = summariseRun(history);
  const lines = [
    'NUMBER UP — run dump',
    ...(ctx.appVersion !== undefined ? [`Version: ${ctx.appVersion}`] : []),
    `Variant: ${ctx.variantLabel}`,
    ...(ctx.variantUpdated !== undefined ? [`Experiment updated: ${ctx.variantUpdated}`] : []),
    ...(ctx.variantHypothesis !== undefined ? [`Hypothesis: ${ctx.variantHypothesis}`] : []),
    `World: ${ctx.worldKey} — ${ctx.worldName}`,
    `Collision rule: ${ctx.ruleKey} (${ctx.ruleName})`,
    `Failure rule: ${ctx.failKey} (${ctx.failName})`,
    `Seed: ${ctx.seed === null ? '—' : String(ctx.seed)}`,
    `URL: ${ctx.url}`,
    `Number: ${fmtNum(ctx.number)}`,
    ...(ctx.carried ? [`Armed operator: ${ctx.carried}`] : []),
    `Turns ${totals.turns} · peak ${totals.peak === null ? '—' : totals.peak} · final ${totals.final === null ? '—' : totals.final} · up ${totals.up} · down ${totals.down} · flat ${totals.flat} · invalid ${totals.invalid}`,
    '',
    'Log:',
    ...formatMoveLog(history, from),
  ];
  return lines.join('\n');
}
