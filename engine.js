(function () {
  'use strict';

  const OPS = {
    '+': (a, b) => a + b,
    '−': (a, b) => a - b,
    '×': (a, b) => a * b,
    '÷': (a, b) => (b === 0 ? NaN : a / b),
  };

  function isOperator(tile) {
    return Object.prototype.hasOwnProperty.call(OPS, tile);
  }

  function classify(tile) {
    if (isOperator(tile)) return 'op';
    const n = Number(tile);
    return Number.isFinite(n) ? 'num' : 'floor';
  }

  function round(x) {
    return Math.round(x * 1e6) / 1e6;
  }

  const RULES = {
    replace: {
      name: 'replacement',
      superpose(current, tile, ctx) {
        const kind = classify(tile);
        if (kind !== 'num') return current;
        ctx.pending = Number(tile);
        return Number(tile);
      },
    },
    add: {
      name: 'addition',
      superpose(current, tile, ctx) {
        const kind = classify(tile);
        if (kind === 'op' || kind === 'floor') return current;
        ctx.pending = Number(tile);
        return current + Number(tile);
      },
    },
    eval: {
      name: 'operator evaluation',
      superpose(current, tile, ctx) {
        const kind = classify(tile);
        if (kind === 'floor') return current;
        if (kind === 'num') {
          ctx.pending = Number(tile);
          return Number(tile);
        }
        if (ctx.pending === null) return NaN;
        return OPS[tile](current, ctx.pending);
      },
    },
  };

  const FAILURE_RULES = {
    none: {
      name: 'no failure',
      failed() {
        return null;
      },
    },
    notUp: {
      name: 'NUMBER NOT UP',
      failed(ev) {
        if (!ev.valid) return 'Number became invalid — UP is undefined here';
        if (ev.result < ev.oldNumber) return 'Number went DOWN';
        if (ev.result === ev.oldNumber) return 'Number did not go UP';
        return null;
      },
    },
  };

  function createEngine(ruleName, failureName) {
    const rule = RULES[ruleName] || RULES.eval;
    const failure = FAILURE_RULES[failureName] || FAILURE_RULES.notUp;
    let pending = null;
    let turn = 0;
    const history = [];

    return {
      get rule() {
        return rule;
      },
      get failure() {
        return failure;
      },
      get ruleName() {
        return rule === RULES.eval ? 'eval' : rule === RULES.add ? 'add' : 'replace';
      },
      get failureName() {
        return failure === FAILURE_RULES.notUp ? 'notUp' : 'none';
      },
      get turn() {
        return turn;
      },
      get history() {
        return history;
      },
      reset() {
        pending = null;
        turn = 0;
        history.length = 0;
      },
      attempt(currentNumber, direction, tile) {
        const ctx = { pending };
        let result;
        try {
          result = rule.superpose(currentNumber, tile, ctx);
        } catch (err) {
          result = NaN;
        }
        pending = ctx.pending;
        const valid = typeof result === 'number' && Number.isFinite(result);
        const ev = {
          turn: ++turn,
          direction,
          oldNumber: currentNumber,
          destinationTile: tile,
          result: valid ? round(result) : null,
          delta: valid ? round(result - currentNumber) : null,
          wentUp: valid && result > currentNumber,
          valid,
          rule: rule.name,
        };
        const failReason = failure.failed(ev);
        ev.failed = failReason !== null;
        ev.failReason = failReason;
        history.push(ev);
        if (history.length > 500) history.shift();
        return ev;
      },
    };
  }

  globalThis.NumberUpEngine = { OPS, RULES, FAILURE_RULES, isOperator, classify, createEngine };
})();
