// Quick Grocery List model. Items come from two sources:
//  1. Automatic — every non-staple ingredient of this week's upcoming dinners.
//  2. Manual extras — ingredients pushed from a Recipe Detail page
//     ("Add to List" / "Push Unchecked to Grocery"), including pantry staples.
// Keys are `${recipeId}:${groupIndex}:${itemIndex}`.

import { recipeById } from './data/recipes.js';
import { currentWeek } from './planner.svelte.js';

const STORAGE_KEY = 'mealcaster.groceryExtras.v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Start empty.
  }
  return [];
}

export const grocery = $state({ /** @type {string[]} */ extras: load() });

/** All ingredient keys of a recipe, optionally only non-staples. */
export function ingredientKeys(recipeId, { skipStaples = false } = {}) {
  const recipe = recipeById.get(recipeId);
  if (!recipe) return [];
  return recipe.ingredients.flatMap((group, g) =>
    group.items.flatMap((item, i) => (skipStaples && item.staple ? [] : [`${recipeId}:${g}:${i}`])),
  );
}

/** @returns {Set<string>} */
export function groceryKeys() {
  const auto = currentWeek()
    .filter((d) => d.status === 'planned' && d.recipe)
    .flatMap((d) => ingredientKeys(d.recipe.id, { skipStaples: true }));
  return new Set([...auto, ...grocery.extras]);
}

export const groceryCount = () => groceryKeys().size;

/** @param {string[]} keys @returns {number} how many were newly added */
export function addToGrocery(keys) {
  const onList = groceryKeys();
  const fresh = keys.filter((k) => !onList.has(k));
  if (fresh.length) {
    grocery.extras = [...grocery.extras, ...fresh];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(grocery.extras));
    } catch {
      // In-memory only.
    }
  }
  return fresh.length;
}
