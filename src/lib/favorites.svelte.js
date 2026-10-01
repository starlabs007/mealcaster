// Mirrors the Favorite_Flag column of the [Recipes] tab; cached locally.

import { sampleData, storageKey } from './env.js';

const STORAGE_KEY = storageKey('favorites.v1');
// Sample favorites exist only alongside the sample recipes.
const SEED = sampleData ? ['sheet-pan-chicken', 'salmon-risotto', 'sourdough-pizza'] : [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Fall back to the seed favorites.
  }
  return SEED;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.ids));
  } catch {
    // In-memory only.
  }
}
