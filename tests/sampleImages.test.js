// Tests for the TheMealDB photo cache (dev/samples/images.js). A fake fetch and a temporary folder: no network.

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadImages } from '../dev/samples/images.js';

const thumb = (id) => `https://www.themealdb.com/images/media/meals/m${id}.jpg`;
const meal = (id, area) => ({ idMeal: id, strMeal: `Meal ${id}`, strMealThumb: thumb(id), ...(area && { strArea: area }) });

/** A tiny TheMealDB: two categories (one meal in both), two areas plus Unknown. */
const API = {
  'categories.php': { categories: [{ strCategory: 'Seafood' }, { strCategory: 'Vegan' }] },
  'filter.php?c=Seafood': { meals: [meal('52900', 'Vietnamese'), meal('52100'), meal('53010')] },
  'filter.php?c=Vegan': { meals: [meal('52100'), meal('9')] },
  'list.php?a=list': { meals: [{ strArea: 'Chinese' }, { strArea: 'Vietnamese' }, { strArea: 'Unknown' }] },
  'filter.php?a=Chinese': { meals: [meal('52100'), meal('9')] },
  'filter.php?a=Vietnamese': { meals: [meal('52900')] },
  'filter.php?a=Unknown': { meals: [meal('53010')] },
};

/**
 * Fake fetch over API; `fail` makes a path answer `status` (500 by default), the first `times` times (always by
 * default). Records the paths it was asked for.
 */
function fakeFetch({ fail, status = 500, times = Infinity } = {}) {
  const calls = [];
  const fetch = async (url) => {
    const path = url.replace('https://www.themealdb.com/api/json/v1/1/', '');
    calls.push(path);
    if (path === fail && times-- > 0) return { ok: false, status, json: async () => ({}) };
    if (!(path in API)) return { ok: true, status: 200, json: async () => ({ meals: null }) };
    return { ok: true, status: 200, json: async () => structuredClone(API[path]) };
  };
  return { fetch, calls };
}

let dir, file, warnings, realWarn;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mealcaster-images-'));
  file = join(dir, '.cache', 'sample-images.json');
  warnings = [];
  realWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
});
afterEach(async () => {
  console.warn = realWarn;
  await rm(dir, { recursive: true, force: true });
});

describe('loadImages', () => {
  it('fetches, sorts by meal id, dedupes, fills areas and writes the cache', async () => {
    const { fetch } = fakeFetch();
    const photos = await loadImages({ file, fetch });
    assert.deepEqual(
      photos.map((p) => [p.id, p.category, p.area]),
      [
        ['9', 'Vegan', 'Chinese'],
        ['52100', 'Seafood', 'Chinese'],
        ['52900', 'Seafood', 'Vietnamese'],
        ['53010', 'Seafood', ''],
      ],
    );
    assert.deepEqual(photos[0], { id: '9', name: 'Meal 9', category: 'Vegan', area: 'Chinese', url: thumb('9') });
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), photos);
    assert.deepEqual(warnings, []);
  });

  it('uses the cache when present, without fetching', async () => {
    await loadImages({ file, fetch: fakeFetch().fetch });
    const { fetch, calls } = fakeFetch();
    const photos = await loadImages({ file, fetch });
    assert.equal(photos.length, 4);
    assert.deepEqual(calls, []);
  });

  it('refetches with refresh', async () => {
    await loadImages({ file, fetch: fakeFetch().fetch });
    await writeFile(file, '[]');
    const { fetch, calls } = fakeFetch();
    const photos = await loadImages({ file, fetch, refresh: true });
    assert.equal(photos.length, 4);
    assert.ok(calls.includes('categories.php'));
    assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 4);
  });

  it('refetches when the cache is unreadable', async () => {
    await loadImages({ file, fetch: fakeFetch().fetch });
    await writeFile(file, '{ not json');
    const photos = await loadImages({ file, fetch: fakeFetch().fetch });
    assert.equal(photos.length, 4);
  });

  for (const fail of ['categories.php', 'filter.php?c=Vegan', 'filter.php?a=Vietnamese']) {
    it(`returns [] with one warning and writes nothing when ${fail} fails`, async () => {
      const photos = await loadImages({ file, fetch: fakeFetch({ fail }).fetch });
      assert.deepEqual(photos, []);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /^Sample photos unavailable, generating recipes without photos: /);
      await assert.rejects(readdir(join(dir, '.cache')));
    });
  }

  it('returns [] with one warning when the network is down', async () => {
    const fetch = async () => {
      throw new TypeError('fetch failed');
    };
    assert.deepEqual(await loadImages({ file, fetch }), []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /fetch failed/);
  });

  it('retries a rate-limited request after waiting', async () => {
    const waits = [];
    const wait = async (ms) => void waits.push(ms);
    const { fetch, calls } = fakeFetch({ fail: 'filter.php?a=Chinese', status: 429, times: 2 });
    const photos = await loadImages({ file, fetch, wait });
    assert.equal(photos.length, 4);
    assert.deepEqual(waits, [1000, 2000]);
    assert.equal(calls.filter((c) => c === 'filter.php?a=Chinese').length, 3);
    assert.deepEqual(warnings, []);
  });

  it('gives up when the API stays rate-limited', async () => {
    const wait = async () => {};
    const { fetch } = fakeFetch({ fail: 'filter.php?c=Seafood', status: 429 });
    assert.deepEqual(await loadImages({ file, fetch, wait }), []);
    assert.match(warnings.join('\n'), /HTTP 429/);
    await assert.rejects(readdir(join(dir, '.cache')));
  });

  it('keeps an existing cache when a refresh fails', async () => {
    await loadImages({ file, fetch: fakeFetch().fetch });
    const before = await readFile(file, 'utf8');
    assert.deepEqual(await loadImages({ file, fetch: fakeFetch({ fail: 'list.php?a=list' }).fetch, refresh: true }), []);
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(await readdir(join(dir, '.cache')), ['sample-images.json']);
  });
});
