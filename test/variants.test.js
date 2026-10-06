'use strict';
// Gallery/registry behaviours that need no DOM: ordering, registry integrity.
// Runner: node:test + node:assert (stdlib only). Node strips TS types natively.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GALLERY_ORDER, VARIANTS, VARIANT_ORDER, variantFor } from '../src/variants.ts';

describe('gallery order (index sorts newest at the top)', () => {
  it('is a permutation of the registry', () => {
    assert.deepEqual(
      [...GALLERY_ORDER].sort(),
      [...VARIANT_ORDER].sort(),
    );
  });

  it('is non-increasing by updated date (stable on registry order for ties)', () => {
    for (let i = 0; i < GALLERY_ORDER.length - 1; i++) {
      const a = VARIANTS[GALLERY_ORDER[i]].updated;
      const b = VARIANTS[GALLERY_ORDER[i + 1]].updated;
      assert.ok(a >= b, `order must be newest-first: ${a} < ${b} at index ${i}`);
    }
    assert.equal(GALLERY_ORDER[0], 'relay', 'the newest variant leads the page');
  });
});

describe('registry integrity', () => {
  it('every variant resolves a unique rule×fail×collapse triple', () => {
    const triples = new Set(
      VARIANT_ORDER.map((id) => {
        const v = VARIANTS[id];
        return `${v.rule}×${v.fail}×${v.collapse ?? false}`;
      }),
    );
    assert.equal(triples.size, VARIANT_ORDER.length, 'variantFor would hit the wrong variant');
  });
});

describe('relay variant registration', () => {
  it('is the named variant for relay × down (flat moves are safe ground)', () => {
    const v = variantFor('relay', 'down');
    assert.equal(v?.id, 'relay');
  });
});
