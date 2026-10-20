// Mirrors the Favorite_Flag column of the [Recipes] tab; cached locally.

import { samples } from 'virtual:sample-data';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';

const STORAGE_KEY = storageKey('favorites.v2');
// Sample favorites (dev only) point at the sample recipes.
/** @type {string[]} */
const SEED = samples.favorites;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fall back to the seed favorites.
  }
  return [...SEED];
}

export const favorites = $state({ /** @type {string[]} */ ids: load() });

/** @param {string} id */
export const isFavorite = (id) => favorites.ids.includes(id);

/** @param {string} id */
export function toggleFavorite(id) {
  setFavorites(isFavorite(id) ? favorites.ids.filter((x) => x !== id) : [...favorites.ids, id]);
}

/** @param {string[]} ids */
export function setFavorites(ids) {
  favorites.ids = ids;
  // In memory only if it doesn't fit (storage.svelte.js notes it).
  saveItem(STORAGE_KEY, JSON.stringify(favorites.ids));
}
