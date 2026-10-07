import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ok, strictEqual } from 'node:assert/strict';
import { APP_VERSION } from '../src/version.ts';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

// Each page stamps its own bundle; the object doubles as the page→bundle map.
const PAGES = { 'index.html': 'gallery.js', 'play.html': 'play.js' };

test('APP_VERSION mirrors the package.json version', () => {
  strictEqual(APP_VERSION, pkg.version);
});

for (const [page, bundle] of Object.entries(PAGES)) {
  test(`${page} cache-bust ?v= matches the package.json version`, () => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    const seen = [...html.matchAll(/dist\/([a-z]+)\.js\?v=([^"' ]+)/g)]
      .map((m) => ({ bundle: `${m[1]}.js`, v: m[2] }));
    ok(
      seen.some((s) => s.bundle === bundle),
      `${page}: no script tag loading dist/${bundle}?v=<version>`,
    );
    for (const { v } of seen) {
      strictEqual(
        v,
        pkg.version,
        `${page}: loads dist/*.js?v=${v} but package.json is ${pkg.version} — bump the ?v= query so returning visitors get the fresh bundle`,
      );
    }
  });
}
