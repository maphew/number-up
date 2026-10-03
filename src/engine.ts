export type Operator = '+' | '−' | '×' | '÷';

export type TileKind = 'op' | 'num' | 'floor';

export interface MoveContext {
  pending: number | null;
  noOperand?: string;
}

export interface CollisionRule {
  name: string;
  superpose(currentNumber: number, tile: string, ctx: MoveContext): number;
}

export interface AttemptBase {
  turn: number;
  direction: string;
  oldNumber: number;
  destinationTile: string;
  rule: string;
  pendingAtEntry: number | null;
}

export interface ValidAttempt extends AttemptBase {
  valid: true;
  result: number;
  delta: number;
  wentUp: boolean;
}

export interface InvalidAttempt extends AttemptBase {
  valid: false;
  result: null;
  delta: null;
  wentUp: false;
  noOperand?: string;
}

export type AttemptOutcome = ValidAttempt | InvalidAttempt;

export type MoveEvent = AttemptOutcome & {
  failed: boolean;
  failReason: string | null;
};

export interface FailureRule {
  name: string;
  failed(ev: AttemptOutcome): string | null;
}

const OPS: Record<Operator, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? NaN : a / b),
};

export function isOperator(tile: string): tile is Operator {
  return Object.prototype.hasOwnProperty.call(OPS, tile);
}

export function classify(tile: string): TileKind {
  if (isOperator(tile)) return 'op';
  const n = Number(tile);
  return Number.isFinite(n) ? 'num' : 'floor';
}

function round(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (Number.isInteger(x) && Math.abs(x) <= Number.MAX_SAFE_INTEGER) return x;
  return Math.round(x * 1e6) / 1e6;
}

export const RULES = {
  replace: {
    name: 'replacement',
    superpose(currentNumber, tile, ctx) {
      const kind = classify(tile);
      if (kind !== 'num') return currentNumber;
      ctx.pending = Number(tile);
      return Number(tile);
    },
  },
  add: {
    name: 'addition',
    superpose(currentNumber, tile, ctx) {
      const kind = classify(tile);
      if (kind === 'op' || kind === 'floor') return currentNumber;
      ctx.pending = Number(tile);
      return currentNumber + Number(tile);
    },
  },
  eval: {
    name: 'operator evaluation',
    superpose(currentNumber, tile, ctx) {
      const kind = classify(tile);
      if (kind === 'floor') return currentNumber;
      if (kind === 'num') {
        ctx.pending = Number(tile);
        return Number(tile);
      }
      if (!isOperator(tile)) return NaN;
      if (ctx.pending === null) {
        ctx.noOperand = tile;
        return NaN;
      }
      return OPS[tile](currentNumber, ctx.pending);
    },
  },
  } satisfies Record<string, CollisionRule>;

export type RuleName = keyof typeof RULES;

export const FAILURE_RULES = {
  none: {
    name: 'no failure',
    failed() {
      return null;
    },
  },
  notUp: {
    name: 'NUMBER NOT UP',
    failed(ev) {
      if (!ev.valid) {
        if (ev.noOperand !== undefined) return `${ev.noOperand} had nothing to act on`;
        return 'Number became invalid — UP is undefined here';
      }
      if (ev.result < ev.oldNumber) return 'Number went DOWN';
      if (ev.result === ev.oldNumber) return 'Number did not go UP';
      return null;
    },
  },
  down: {
    name: 'NUMBER WENT DOWN',
    failed(ev) {
      if (!ev.valid) {
        if (ev.noOperand !== undefined) return `${ev.noOperand} had nothing to act on`;
        return 'Number became invalid — there is no Number left to compare';
      }
      if (ev.result < ev.oldNumber) return 'Number went DOWN';
      return null;
    },
  },
} satisfies Record<string, FailureRule>;

export type FailureName = keyof typeof FAILURE_RULES;

export interface Engine {
  readonly rule: CollisionRule;
  readonly failure: FailureRule;
  readonly ruleName: RuleName;
  readonly failureName: FailureName;
  readonly turn: number;
  readonly history: MoveEvent[];
  readonly pending: number | null;
  reset(): void;
  attempt(currentNumber: number, direction: string, tile: string): MoveEvent;
}

function named<T extends Record<string, unknown>>(
  table: T,
  key: string,
  fallback: keyof T & string,
): keyof T & string {
  return Object.prototype.hasOwnProperty.call(table, key) ? key : fallback;
}

export function createEngine(ruleName: string, failureName: string): Engine {
  const resolvedRule: RuleName = named(RULES, ruleName, 'eval');
  const resolvedFailure: FailureName = named(FAILURE_RULES, failureName, 'notUp');
  const rule: CollisionRule = RULES[resolvedRule];
  const failure: FailureRule = FAILURE_RULES[resolvedFailure];
  let pending: number | null = null;
  let turn = 0;
  const history: MoveEvent[] = [];

  return {
    get rule() {
      return rule;
    },
    get failure() {
      return failure;
    },
    get ruleName() {
      return resolvedRule;
    },
    get failureName() {
      return resolvedFailure;
    },
    get turn() {
      return turn;
    },
    get history() {
      return history;
    },
    get pending() {
      return pending;
    },
    reset() {
      pending = null;
      turn = 0;
      history.length = 0;
    },
    attempt(currentNumber, direction, tile) {
      const pendingBefore = pending;
      const ctx: MoveContext = { pending };
      let result: number;
      try {
        result = rule.superpose(currentNumber, tile, ctx);
      } catch {
        result = NaN;
      }
      pending = ctx.pending;
      const noOperand = ctx.noOperand;
      const valid = typeof result === 'number' && Number.isFinite(result);
      const base = {
        turn: ++turn,
        direction,
        oldNumber: currentNumber,
        destinationTile: tile,
        rule: rule.name,
        pendingAtEntry: pendingBefore,
        noOperand,
      };
      const rounded = valid ? round(result) : null;
      const delta = valid ? round(result - currentNumber) : null;
      const ev: AttemptOutcome = valid
        ? {
            ...base,
            valid: true,
            result: rounded ?? result,
            delta: delta ?? result - currentNumber,
            wentUp: result > currentNumber,
          }
        : { ...base, valid: false, result: null, delta: null, wentUp: false };
      const failReason = failure.failed(ev);
      const move: MoveEvent = { ...ev, failed: failReason !== null, failReason };
      history.push(move);
      if (history.length > 500) history.shift();
      return move;
    },
  };
}
