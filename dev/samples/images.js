// TheMealDB photo list for the sample generator, cached in .cache/sample-images.json (gitignored: no TheMealDB data
// is committed). Fetched once through the official JSON API with the free development key `1`; the website itself
// may not be scraped, so use the API only.
//
// Recipe data and imagery: TheMealDB (https://www.themealdb.com/)
//
// `url` is the API's strMealThumb. Square size variants: append `/small` (200 px), `/medium` (350 px) or
// `/large` (500 px).
//
// Plain JS (no runes), runnable under Node: `npm run samples:images` refreshes the cache.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API = 'https://www.themealdb.com/api/json/v1/1';

/** Default cache file: repo/.cache/sample-images.json. */
export const CACHE_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../.cache/sample-images.json');

/** Waits before retrying a request the API rate-limited (HTTP 429), in ms. The free API limits bursts. */
const RETRY_DELAYS = [1000, 2000, 4000, 8000];

/** @typedef {{ id: string, name: string, category: string, area: string, url: string }} Photo */

/**
 * The photo list, sorted by meal id: read from the cache, or fetched and cached when the cache is missing or
 * `refresh` is set. Never throws: on any failure it warns once and returns `[]`, without writing the cache.
 * `wait(ms)` is how it pauses before a retry (tests pass one that doesn't).
 * @param {{ refresh?: boolean, file?: string, fetch?: typeof globalThis.fetch, wait?: (ms: number) => Promise<void> }} [options]
 * @returns {Promise<Photo[]>}
 */
export async function loadImages({ refresh = false, file = CACHE_FILE, fetch = globalThis.fetch, wait = sleep } = {}) {
  if (!refresh) {
    const cached = await readCache(file);
    if (cached) return cached;
  }
  try {
    const photos = await fetchPhotos(fetch, wait);
    await mkdir(dirname(file), { recursive: true });
    // Write a temporary file and rename it, so a failed write never leaves a partial cache.
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(photos, null, 1) + '\n');
    await rename(tmp, file);
    return photos;
  } catch (err) {
    console.warn(`Sample photos unavailable, generating recipes without photos: ${err?.message ?? err}`);
    return [];
  }
}

/** The cached list, or null when there's no readable cache. @param {string} file */
async function readCache(file) {
  try {
    const list = JSON.parse(await readFile(file, 'utf8'));
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

/**
 * Fetches every category's and area's list, one request at a time.
 * @param {typeof globalThis.fetch} fetch
 * @param {(ms: number) => Promise<void>} wait
 */
async function fetchPhotos(fetch, wait) {
  const get = async (path) => {
    let res = await fetch(`${API}/${path}`);
    for (const ms of RETRY_DELAYS) {
      if (res.status !== 429) break;
      await wait(ms);
      res = await fetch(`${API}/${path}`);
    }
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    const body = await res.json();
    // TheMealDB answers `{ meals: null }` for a filter with no matches.
    return body?.meals ?? body?.categories ?? [];
  };

  const categories = (await get('categories.php')).map((c) => c.strCategory).filter(Boolean);
  if (!categories.length) throw new Error('no categories');

  /** @type {Map<string, Photo>} */
  const byId = new Map();
  const lists = await inSequence(categories, (c) => get(`filter.php?c=${encodeURIComponent(c)}`));
  categories.forEach((category, i) => {
    for (const m of lists[i]) {
      if (!m?.idMeal || !m.strMealThumb || byId.has(m.idMeal)) continue;
      byId.set(m.idMeal, {
        id: m.idMeal,
        name: m.strMeal ?? '',
        category,
        area: knownArea(m.strArea),
        url: m.strMealThumb,
      });
    }
  });
  if (!byId.size) throw new Error('no meals');

  // Category lists only carry an area for some meals; the area lists fill in the rest.
  const areas = (await get('list.php?a=list')).map((a) => knownArea(a.strArea)).filter(Boolean);
  const areaLists = await inSequence(areas, (a) => get(`filter.php?a=${encodeURIComponent(a)}`));
  areas.forEach((area, i) => {
    for (const m of areaLists[i]) {
      const photo = byId.get(m?.idMeal);
      if (photo && !photo.area) photo.area = area;
    }
  });

  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
}

/** TheMealDB's area, with its "Unknown" placeholder as ''. @param {unknown} area */
const knownArea = (area) => (typeof area === 'string' && area !== 'Unknown' ? area : '');

/**
 * Runs `fn` over `items` one at a time, so the free API isn't hammered; results in input order.
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 */
async function inSequence(items, fn) {
  /** @type {R[]} */
  const out = [];
  for (const item of items) out.push(await fn(item));
  return out;
}

/** @param {number} ms */
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// `npm run samples:images`: refresh the cache.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const photos = await loadImages({ refresh: true });
  if (photos.length) {
    const withArea = photos.filter((p) => p.area).length;
    console.log(`Saved ${photos.length} sample photos (${withArea} with an area) to ${CACHE_FILE}`);
  } else {
    process.exitCode = 1;
  }
}
