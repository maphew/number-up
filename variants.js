(function () {
  'use strict';

  // A variant names one candidate answer to "what does superposition mean?":
  // a collision rule × a failure rule, a suggested starting world, and the
  // hypothesis it exists to test. The front-page gallery renders from this
  // registry; long-form tracking (feedback, musings) lives in variants/<id>.md.
  const VARIANTS = {
    verbs: {
      name: 'Verbs',
      tagline: 'operators are verbs, numbers are fuel',
      rule: 'eval',
      fail: 'notUp',
      world: 'b',
      hypothesis: 'Operators will read as verbs you invoke, not obstacles you hit. Watch for players composing chains.',
    },
    accretion: {
      name: 'Accretion',
      tagline: 'everything you touch sticks; only growth keeps you alive',
      rule: 'add',
      fail: 'notUp',
      world: 'a',
      hypothesis: 'Plain addition is already the whole game. Pure make-number-go-up, where route choice is the only skill.',
    },
    becoming: {
      name: 'Becoming',
      tagline: 'you become what you touch; touch smaller and the run ends',
      rule: 'replace',
      fail: 'notUp',
      world: 'c',
      hypothesis: 'The most literal superposition, identity swap, plays as a tightrope where every move is a commitment.',
    },
    rehearsal: {
      name: 'Rehearsal',
      tagline: 'the full verb grammar, with the stakes removed',
      rule: 'eval',
      fail: 'none',
      world: 'b',
      hypothesis: 'Without failure, does curiosity need a different anchor, or does the grammar itself pull play forward?',
    },
    hoarder: {
      name: 'Hoarder',
      tagline: 'everything sticks, nothing can hurt you',
      rule: 'add',
      fail: 'none',
      world: 'full',
      hypothesis: 'Growth with no threat. Does accumulation compel on its own, and if so, when does the pull decay?',
    },
    masquerade: {
      name: 'Masquerade',
      tagline: 'try on any identity, answer to none',
      rule: 'replace',
      fail: 'none',
      world: 'full',
      hypothesis: 'With survival out of the picture, players invent their own goals. Evidence the premise generates play by itself.',
    },
  };

  const VARIANT_ORDER = ['verbs', 'accretion', 'becoming', 'rehearsal', 'hoarder', 'masquerade'];

  function getVariant(id) {
    if (!Object.prototype.hasOwnProperty.call(VARIANTS, id)) return null;
    return Object.assign({ id }, VARIANTS[id]);
  }

  function variantFor(ruleKey, failKey) {
    for (const id of VARIANT_ORDER) {
      const v = VARIANTS[id];
      if (v.rule === ruleKey && v.fail === failKey) return Object.assign({ id }, v);
    }
    return null;
  }

  globalThis.NumberUpVariants = { VARIANTS, VARIANT_ORDER, getVariant, variantFor };
})();
