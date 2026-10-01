// A variant names one candidate answer to "what does superposition mean?":
// a collision rule × a failure rule, a suggested starting world, and the
// hypothesis it exists to test. The front-page gallery renders from this
// registry; long-form tracking (feedback, musings) lives in variants/<id>.md.
// Copy convention ("shorthand plus a plain line"): the tagline stays
// aphoristic, `how` states the mechanics plainly, and `hypothesis` is the
// bet in plain second person.
import type { FailureName, RuleName } from './engine.ts';
import type { WorldKey } from './world.ts';

export interface Variant {
  name: string;
  tagline: string;
  how: string;
  rule: RuleName;
  fail: FailureName;
  world: WorldKey;
  hypothesis: string;
}

export const VARIANTS = {
  verbs: {
    name: 'Verbs',
    tagline: 'operators are verbs, numbers are fuel',
    how: 'Touch a number to hold it. Then walk a row of plus signs to add it at every step.',
    rule: 'eval',
    fail: 'notUp',
    world: 'b',
    hypothesis: 'You will read the signs as moves to make, not obstacles to hit, holding a number and then running a row of signs on purpose. If you avoid the signs instead, the verb reading is ours, not yours.',
  },
  accretion: {
    name: 'Accretion',
    tagline: 'everything you touch sticks; only growth keeps you alive',
    how: 'Whatever number you touch adds to you. A zero or a sign does nothing, and doing nothing ends the run.',
    rule: 'add',
    fail: 'notUp',
    world: 'a',
    hypothesis: 'You can keep this going by picking a path where every tile grows you. If it turns into bookkeeping once your number passes 40, plain addition is not enough on its own.',
  },
  becoming: {
    name: 'Becoming',
    tagline: 'you become what you touch; touch smaller and the run ends',
    how: 'Touch a number and become it. Touch one your size or smaller, or a sign, and the run ends.',
    rule: 'replace',
    fail: 'notUp',
    world: 'c',
    hypothesis: 'You will feel every move as a commitment, because your number is rented, never owned. If you reduce it to chasing the biggest neighbour, the tightrope is just a greed walk.',
  },
  rehearsal: {
    name: 'Rehearsal',
    tagline: 'the full verb grammar, with the stakes removed',
    how: 'Touch a number to hold it, then let the signs act on it. Nothing can end the run, so try anything.',
    rule: 'eval',
    fail: 'none',
    world: 'b',
    hypothesis: 'With nothing to lose, you decide what the game is. If you keep hunting bigger numbers anyway, curiosity was never about the stakes. If you drift and stop, failure was doing the work all along.',
  },
  hoarder: {
    name: 'Hoarder',
    tagline: 'everything sticks, nothing can hurt you',
    how: 'Every number you touch adds to you, and nothing can hurt you. Grow as big as the grid allows.',
    rule: 'add',
    fail: 'none',
    world: 'full',
    hypothesis: 'You keep choosing paths even with no threat, or you drift once dying is impossible. Either way you tell us whether growing for its own sake is enough to keep you moving.',
  },
  masquerade: {
    name: 'Masquerade',
    tagline: 'try on any identity, answer to none',
    how: 'Touch a number and become it. No stakes here, so tour the grid, chase a number, or make up your own game.',
    rule: 'replace',
    fail: 'none',
    world: 'full',
    hypothesis: 'Once survival is off the table, you make up your own goals, and that is the evidence that the premise generates play by itself. If you just wander, becoming needs stakes to matter.',
  },
} satisfies Record<string, Variant>;

export type VariantId = keyof typeof VARIANTS;

export type ResolvedVariant = Variant & { id: VariantId };

function isVariantId(id: string): id is VariantId {
  return Object.prototype.hasOwnProperty.call(VARIANTS, id);
}

export const VARIANT_ORDER: VariantId[] = Object.keys(VARIANTS).filter(isVariantId);

export function getVariant(id: string): ResolvedVariant | null {
  if (!isVariantId(id)) return null;
  return { id, ...VARIANTS[id] };
}

export function variantFor(ruleKey: string, failKey: string): ResolvedVariant | null {
  for (const id of VARIANT_ORDER) {
    const v = VARIANTS[id];
    if (v.rule === ruleKey && v.fail === failKey) return { id, ...v };
  }
  return null;
}
