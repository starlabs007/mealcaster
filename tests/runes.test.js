// Svelte runes ($state, $derived, $effect…) only work in .svelte and .svelte.js files. In a plain
// .js module they aren't compiled: the build still passes, and the code throws when it runs (the
// data export crashed this way from #18 until it was found by hand). Plain modules take plain data
// as arguments instead; see "Project layout" in the README.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;

/** A rune used as a call or member: `$state(…)`, `$state.snapshot(…)`, `$effect.root(…)`. */
const RUNE = /\$(state|derived|effect|props|bindable|inspect|host)\s*[.(]/;

/** @param {string} dir @returns {string[]} */
const filesIn = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)],
  );

describe('runes', () => {
  it('recognizes rune calls', () => {
    for (const code of ['$state(0)', '$state.snapshot(profile)', '$derived.by(() => 1)', '$effect(() => {})', '$props()', '$effect.root(fn)']) {
      assert.match(code, RUNE, code);
    }
    assert.doesNotMatch('// keep $state out of plain modules', RUNE);
  });

  it('are only used in .svelte and .svelte.js files', () => {
    const plain = filesIn(SRC).filter((file) => /\.[cm]?js$/.test(file) && !/\.svelte\.[cm]?js$/.test(file));
    assert.ok(plain.length > 0, 'found no plain .js files under src/');
    const uses = plain.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) => (RUNE.test(line) ? [`src/${relative(SRC, file)}:${i + 1}: ${line.trim()}`] : [])),
    );
    assert.deepEqual(uses, [], `Runes in plain .js files (rename to .svelte.js, or pass plain data in):\n${uses.join('\n')}`);
  });
});
