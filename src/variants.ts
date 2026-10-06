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
  updated: string;
  collapse?: boolean;
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
    updated: '2026-09-30',
  },
  accretion: {
    name: 'Accretion',
    tagline: 'everything you touch sticks; only growth keeps you alive',
    how: 'Whatever number you touch adds to you. A zero or a sign does nothing, and doing nothing ends the run.',
    rule: 'add',
    fail: 'notUp',
    world: 'a',
    hypothesis: 'You can keep this going by picking a path where every tile grows you. If it turns into bookkeeping once your number passes 40, plain addition is not enough on its own.',
    updated: '2026-09-30',
  },
  becoming: {
    name: 'Becoming',
    tagline: 'you become what you touch; touch smaller and the run ends',
    how: 'Touch a number and become it. Touch one your size or smaller, or a sign, and the run ends.',
    rule: 'replace',
    fail: 'notUp',
    world: 'c',
    hypothesis: 'You will feel every move as a commitment, because your number is rented, never owned. If you reduce it to chasing the biggest neighbour, the tightrope is just a greed walk.',
    updated: '2026-09-30',
  },
  rehearsal: {
    name: 'Rehearsal',
    tagline: 'the full verb grammar, with the stakes removed',
    how: 'Touch a number to hold it, then let the signs act on it. Nothing can end the run, so try anything.',
    rule: 'eval',
    fail: 'none',
    world: 'b',
    hypothesis: 'With nothing to lose, you decide what the game is. If you keep hunting bigger numbers anyway, curiosity was never about the stakes. If you drift and stop, failure was doing the work all along.',
    updated: '2026-09-30',
  },
  hoarder: {
    name: 'Hoarder',
    tagline: 'everything sticks, nothing can hurt you',
    how: 'Every number you touch adds to you, and nothing can hurt you. Grow as big as the grid allows.',
    rule: 'add',
    fail: 'none',
    world: 'full',
    hypothesis: 'You keep choosing paths even with no threat, or you drift once dying is impossible. Either way you tell us whether growing for its own sake is enough to keep you moving.',
    updated: '2026-09-30',
  },
  masquerade: {
    name: 'Masquerade',
    tagline: 'try on any identity, answer to none',
    how: 'Touch a number and become it. No stakes here, so tour the grid, chase a number, or make up your own game.',
    rule: 'replace',
    fail: 'none',
    world: 'full',
    hypothesis: 'Once survival is off the table, you make up your own goals, and that is the evidence that the premise generates play by itself. If you just wander, becoming needs stakes to matter.',
    updated: '2026-09-30',
  },
  plateau: {
    name: 'Plateau',
    tagline: 'you become what you touch; only a downward step ends the run',
    how: 'Touch a number and become it. Touch one smaller than you and the run ends. Equal numbers, signs, and floor are safe ground.',
    rule: 'replace',
    fail: 'down',
    world: 'c',
    hypothesis: 'With flat ground allowed, becoming stops being a strict-increase tightrope: equal numbers and operator tiles become resting squares you can plan from. If play still reduces to chasing the biggest neighbour, the tightrope was the game; if you route through flat squares, "up" alone was never the point.',
    updated: '2026-10-02',
  },
  cadence: {
    name: 'Cadence',
    tagline: 'operators are verbs; only a downward step ends the run',
    how: 'Touch a number to hold it, then let the signs act on it. A flat result — floor, or a number equal to yours — is safe; only Number going down, or a sign that yields no Number, ends the run.',
    rule: 'eval',
    fail: 'down',
    world: 'b',
    hypothesis: 'Once standing still is safe, the verb grammar can be experimented with instead of feared, with no dying to every operator or equal number. If runs still collapse in a few moves, strict UP was not what made Verbs hard; if they lengthen into composition, the flat death was punishing learning, not play.',
    updated: '2026-10-02',
  },
  fallout: {
    name: 'Fallout',
    tagline: 'every tile burns out behind you; routing is the game',
    how: 'Walk like Verbs, but every tile you touch collapses to floor and re-entry ends the run. Plan a route that never revisits.',
    rule: 'eval',
    fail: 'notUp',
    world: 'full',
    hypothesis: 'With re-entry fatal, you will plan routes instead of mashing loops. If world full becomes a 5-move puzzle with a best Number near 243, finiteness reads as routing, not as shortness.',
    updated: '2026-10-02',
    collapse: true,
  },
  relay: {
    name: 'Relay',
    tagline: 'numbers trade places; signs ride on you until spent',
    how: 'Walk onto a number unarmed and you two swap places. Walk onto a sign to pick it up, now armed; the next number you touch takes its operator and is consumed, leaving a hole nothing can enter.',
    rule: 'relay',
    fail: 'down',
    world: 'full',
    hypothesis: 'You will start authoring collisions instead of reading them: grab a sign only when you already know which number it should hit, and use swap as free position-economy since nothing is ever a wall until you eat a hole into it. If the board still reads as a static obstacle field you dodge, possession needs stakes to become strategy.',
    updated: '2026-10-06',
  },
} satisfies Record<string, Variant>;

export type VariantId = keyof typeof VARIANTS;

export type ResolvedVariant = Variant & { id: VariantId };

function isVariantId(id: string): id is VariantId {
  return Object.prototype.hasOwnProperty.call(VARIANTS, id);
}

export const VARIANT_ORDER: VariantId[] = Object.keys(VARIANTS).filter(isVariantId);

// Index page reads this: newest `updated` first, registry order breaks ties
// (Array.sort is stable). Layout experiments stay pinned to the lab bench.
export const GALLERY_ORDER: VariantId[] = [...VARIANT_ORDER].sort(
  (a, b) => VARIANTS[b].updated.localeCompare(VARIANTS[a].updated),
);

export function getVariant(id: string): ResolvedVariant | null {
  if (!isVariantId(id)) return null;
  return { id, ...VARIANTS[id] };
}

export function variantFor(
  ruleKey: string,
  failKey: string,
  collapse = false,
): ResolvedVariant | null {
  for (const id of VARIANT_ORDER) {
    const v: Variant = VARIANTS[id];
    if (v.rule === ruleKey && v.fail === failKey && (v.collapse ?? false) === collapse)
      return { id, ...v };
  }
  return null;
}
