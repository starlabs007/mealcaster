// The list of device data keys decides what a dev-mode switch erases, and the sync base has to go with the data.
// These tests read the source for every key a store uses, so a new key can't be left out of the lists by accident.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEVICE_DATA, KEPT, OLD_DATA } from '../src/lib/storageKeys.js';

/** Every file under a folder. @param {string} dir @returns {string[]} */
const files = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]));

const usedKeys = new Set(
  files('src')
    .filter((f) => /\.(js|svelte)$/.test(f) && !f.endsWith('storageKeys.js'))
    .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/storageKey\('([^']+)'\)/g)].map((m) => m[1])),
);

describe('storage keys', () => {
  it('finds the keys the stores use (the scan itself works)', () => {
    for (const key of ['weeklyPlan.v2', 'syncBase.v2', 'recipeDraft.v2', 'sheetsSettings.v1']) assert.ok(usedKeys.has(key), key);
  });

  it('every key a store uses is device data or kept, so a mode switch decides about it on purpose', () => {
    const known = new Set([...DEVICE_DATA, ...KEPT]);
    const unlisted = [...usedKeys].filter((key) => !known.has(key));
    assert.deepEqual(unlisted, [], 'add each to DEVICE_DATA or KEPT in src/lib/storageKeys.js');
  });

  it('every listed key is used by a store (a renamed or dropped key is removed from the list)', () => {
    const stale = [...DEVICE_DATA, ...KEPT].filter((key) => !usedKeys.has(key));
    assert.deepEqual(stale, []);
  });

  it('the sync base is cleared with the data, or the next sync would delete rows from the sheet', () => {
    assert.ok(DEVICE_DATA.includes('syncBase.v2'));
  });

  it('the lists do not overlap, and none repeats a key', () => {
    for (const list of [DEVICE_DATA, KEPT, OLD_DATA]) assert.equal(new Set(list).size, list.length);
    const current = new Set([...DEVICE_DATA, ...KEPT]);
    assert.deepEqual(OLD_DATA.filter((key) => current.has(key)), [], 'a current key in OLD_DATA would be erased on every load');
    assert.deepEqual(DEVICE_DATA.filter((key) => KEPT.includes(key)), []);
  });

  it('old keys are no longer used by any store', () => {
    assert.deepEqual(OLD_DATA.filter((key) => usedKeys.has(key)), []);
  });
});
