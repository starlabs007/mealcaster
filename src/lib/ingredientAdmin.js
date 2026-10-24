// The ingredient list as the editing dialog shows it: sorted, filtered, counted, and the name clashes that stop a save.
// Plain data in, results out; the dialog keeps the state and calls the store.

import { findByName, foldKey, tidyIngredientName } from './ingredients.js';

/** @typedef {import('./ingredients.js').Ingredient} Ingredient */

/** A copy sorted by name. @param {Ingredient[]} list */
export const sortedByName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

/**
 * How many are at home and how many no recipe uses.
 * @param {Ingredient[]} list @param {Map<string, number>} uses recipes using each ingredient id
 */
export const filterCounts = (list, uses) => ({
  stock: list.filter((i) => i.onHand).length,
  unused: list.filter((i) => !uses.has(i.id)).length,
});

/**
 * The rows to show: the filter (all, at home, or unused), then a search over name and plural.
 * @param {Ingredient[]} list @param {Map<string, number>} uses @param {'all' | 'stock' | 'unused'} filter @param {string} query
 */
export function filterIngredients(list, uses, filter, query) {
  const q = foldKey(query);
  return list.filter(
    (i) =>
      (filter === 'all' || (filter === 'stock' ? i.onHand : !uses.has(i.id))) &&
      (!q || foldKey(i.name).includes(q) || foldKey(i.plural).includes(q)),
  );
}

/**
 * Another ingredient already called `word` (by name or plural), if any.
 * @param {Ingredient[]} list @param {string} word @param {string} id the one being edited
 */
export function takenBy(list, word, id) {
  const other = word.trim() ? findByName(list, word) : undefined;
  return other && other.id !== id ? other : undefined;
}

/** Whether an edit can be saved: it has a name and neither name nor plural belongs to another ingredient. */
export const canSave = (/** @type {{ name: string }} */ edit, /** @type {unknown} */ nameClash, /** @type {unknown} */ pluralClash) =>
  !nameClash && !pluralClash && Boolean(tidyIngredientName(edit.name));

/**
 * What can be merged into: every other ingredient, found by name or plural.
 * @param {Ingredient[]} list @param {string} id @param {(aisle: string) => string} aisleLabel
 */
export const mergeOptions = (list, id, aisleLabel) =>
  list.filter((i) => i.id !== id).map((i) => ({ value: i.name, label: i.name, hint: aisleLabel(i.aisle), keys: i.plural ? [i.plural] : [] }));
