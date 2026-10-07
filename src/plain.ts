// num-dn2: one shared register of plain words for both pages. The registry
// keys (add, eval, notUp,…) stay technical in URLs and debug notebooks; this
// module is the ELI8 translation layer the game and the reference chart read.
import { RULES, FAILURE_RULES, type RuleName, type FailureName } from './engine.ts';
import { WORLDS, type WorldKey } from './world.ts';
import { VARIANT_ORDER, VARIANTS, type ResolvedVariant, type Variant } from './variants.ts';

type WorldRef = WorldKey | 'gen';

// What touching a tile does (touch rule = collision rule).
export const RULE_LONG: Record<RuleName, string> = {
  replace: 'Touch a number and become it: your whole number is traded for what you touched. Signs and empty ground do nothing.',
  add: 'Every number you touch is added onto yours. Signs and empty ground do nothing.',
  eval: "Touch a number to pick it up and hold it, and the signs will use it. Touch a sign (+ − × ÷) and it does its thing to you with the number you're holding: + grows you by it, − shrinks you, × multiplies, ÷ splits you down.",
  relay: 'Numbers trade places with you when you step on them. Sign tiles hop onto you — you carry one, and the next number you touch, the sign spends itself on that number and eats it, leaving a pit nothing can enter.',
};

export const RULE_SHORT: Record<RuleName, string> = {
  replace: 'become the tile',
  add: 'tiles add up',
  eval: 'signs act',
  relay: 'trade & pocket',
};

// What ends the run (failure rule).
export const FAILURE_LONG: Record<FailureName, string> = {
  none: 'Nothing can end the run. Walk as long as you like.',
  notUp: 'Growth is the only safe step: if your number does not get bigger — flat, smaller, or an impossible move — the run ends.',
  down: 'Only a smaller number ends the run. Standing flat is safe.',
};

export const FAILURE_SHORT: Record<FailureName, string> = {
  none: 'nothing can end it',
  notUp: 'only growing counts',
  down: 'only shrinking ends it',
};

// Board behaviors.
export const COLLAPSE_LONG =
  'Tiles you have stepped on vanish behind you. Stepping back on one does nothing.';
export const COLLAPSE_SHORT = 'tiles vanish';

// World one-liners ("world" = the map).
export const WORLD_LONG: Record<WorldRef, string> = {
  full: 'A bit of everything: numbers and all four signs.',
  a: 'Nothing but numbers — the zeros are the walls.',
  b: 'A number ring at the start, and a good long run of plus signs.',
  c: 'Numbers climb away from the start; the biggest neighbours are quietly traps.',
  d: 'Built to test losing on purpose: a sign beside the start has no number to act on, and a 0 sits beside a ÷.',
  choosey: 'The rules are not fixed — tick them on and off in the boxes under the board.',
  gen: 'A random 5×5 map. The same seed always makes the same map.',
};

export function rulesJoined(rules: readonly string[]): string {
  return rules.map((r) => RULE_SHORT[r as RuleName] ?? r).join(' + ') || 'nothing ticked';
}

export function failsJoined(fails: readonly string[]): string {
  return fails.map((f) => FAILURE_SHORT[f as FailureName] ?? f).join(' + ') || 'nothing can end it';
}

// The few words the game uses, in plain terms.
export const GLOSSARY: [string, string][] = [
  ['you', 'the amber numeral on the board — it IS your number, and it grows in steps as you do.'],
  ['sign', 'any of the four math tiles: + − × ÷.'],
  ['holding a number', 'you picked a number up by touching it; the next sign will use it.'],
  ['carrying a sign', 'you stepped on a sign and it came with you, waiting to be spent.'],
  ['pit', 'a tile that got eaten — nothing can move onto it again.'],
  ['run', 'one walk, from the start until a run-ender fires (or forever).'],
  ['world', 'the map you are walking: full, a, b, c, d, choosey, or a generated one.'],
  ['variant', 'a named pairing of touch rules + run-ender + starting map, on the front page.'],
];

function el(tag: string, cls: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function variantSuffix(collapse: boolean): string {
  return collapse ? ' ⚛' : '';
}

// The lookup chart: touch rules × run-enders → the named variants that test
// that pairing; then the run-enders, the worlds, and the note on custom
// pairings. Both pages render straight from the registries, so the chart can
// never drift from the catalogue.
export function renderRulesReference(target: HTMLElement, hrefFor: (v: ResolvedVariant) => string): void {
  target.textContent = '';

  target.appendChild(el('h3', 'ref-title', 'A few words'));
  const glossary = el('ul', 'ref-list');
  for (const [term, plain] of GLOSSARY) {
    const item = el('li', 'ref-item');
    item.appendChild(el('span', 'ref-key', term));
    item.appendChild(el('span', 'ref-plain', plain));
    glossary.appendChild(item);
  }
  target.appendChild(glossary);

  const rules = Object.keys(RULES) as RuleName[];
  const fails = Object.keys(FAILURE_RULES) as FailureName[];

  target.appendChild(el('h3', 'ref-title', 'Touch rules — what touching a tile does'));
  const rulesList = el('ul', 'ref-list');
  for (const key of rules) {
    const item = el('li', 'ref-item');
    item.appendChild(el('span', 'ref-key', `${key} — ${RULE_SHORT[key]}`));
    item.appendChild(el('span', 'ref-plain', RULE_LONG[key]));
    rulesList.appendChild(item);
  }
  target.appendChild(rulesList);

  target.appendChild(el('h3', 'ref-title', 'Run-enders — what can end the run'));
  const endersList = el('ul', 'ref-list');
  for (const key of fails) {
    const item = el('li', 'ref-item');
    item.appendChild(el('span', 'ref-key', `${key}: ${FAILURE_SHORT[key]}`));
    item.appendChild(el('span', 'ref-plain', FAILURE_LONG[key]));
    endersList.appendChild(item);
  }
  target.appendChild(endersList);

  target.appendChild(el('h3', 'ref-title', 'Lookup — every named rules pairing'));
  const table = el('table', 'ref-table');
  const head = el('tr', 'ref-row');
  head.appendChild(el('th', 'ref-cell head', 'touch rule'));
  for (const key of fails) head.appendChild(el('th', 'ref-cell head', FAILURE_SHORT[key]));
  table.appendChild(head);
  for (const ruleKey of rules) {
    const row = el('tr', 'ref-row');
    row.appendChild(el('th', 'ref-cell head', `${ruleKey} — ${RULE_SHORT[ruleKey]}`));
    for (const failKey of fails) {
      const names: HTMLElement[] = [];
      for (const id of VARIANT_ORDER) {
        const v: Variant = VARIANTS[id];
        if (v.rule === ruleKey && v.fail === failKey) {
          const a = el('a', 'ref-link', `${v.name}${variantSuffix(v.collapse ?? false)}`);
          a.setAttribute('href', hrefFor({ id, ...v }));
          names.push(a);
        }
      }
      const cell = el('td', 'ref-cell');
      if (!names.length) {
        cell.textContent = '— (custom)';
      } else {
        names.forEach((a, i) => {
          if (i > 0) cell.appendChild(el('span', 'ref-sep', ' · '));
          cell.appendChild(a);
        });
      }
      row.appendChild(cell);
    }
    table.appendChild(row);
  }
  target.appendChild(table);
  target.appendChild(el('p', 'ref-note', '⚛ = the tiles also vanish behind you after you step on them.'));

  target.appendChild(el('h3', 'ref-title', 'Worlds — the maps'));
  const worldsList = el('ul', 'ref-list');
  for (const key of Object.keys(WORLDS) as WorldKey[]) {
    const item = el('li', 'ref-item');
    item.appendChild(el('span', 'ref-key', `${key} — ${WORLDS[key].name}`));
    item.appendChild(el('span', 'ref-plain', WORLD_LONG[key]));
    const openers: string[] = VARIANT_ORDER.filter((id) => VARIANTS[id].world === key).map((id) => VARIANTS[id].name);
    item.appendChild(el('span', 'ref-meta', openers.length ? `opens for: ${openers.join(', ')}` : 'opens for: choosey + any custom pairing you point here'));
    worldsList.appendChild(item);
  }
  target.appendChild(worldsList);

  target.appendChild(el('p', 'ref-note', 'Any other pairing plays as "custom". URL params: ?rule=replace|add|eval|relay &fail=notUp|down|none &world=full|a|b|c|d|choosey|gen &seed=N &variant=<name>.'));
}
