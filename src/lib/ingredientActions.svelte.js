// Merging and deleting ingredients (the Ingredients manager in Profile). They touch the ingredient list, recipe lines
// and grocery lists together, so each returns an undo that puts all three back.

import { ingredientOf, ingredients, removeIngredient, replaceIngredients, updateIngredient } from './ingredients.svelte.js';
import { recipes, relinkIngredient, restoreTagged } from './recipes.svelte.js';
import { freezePastWeeks, grocery, relinkGrocery, replaceGrocery } from './grocery.svelte.js';

/** How many recipes use each ingredient id. @returns {Map<string, number>} */
export function ingredientUses() {
  const uses = new Map();
  for (const r of recipes) {
    const ids = new Set(r.ingredients.flatMap((g) => g.items.map((item) => item.id)));
    for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return uses;
}

function snapshot() {
  // Recipes and past grocery weeks change below, so past weeks keep what they showed.
  freezePastWeeks();
  return {
    ingredients: $state.snapshot(ingredients),
    weeks: $state.snapshot(grocery.weeks),
    every: $state.snapshot(grocery.every),
  };
}

/** @param {ReturnType<typeof snapshot>} saved @param {import('./recipes.svelte.js').Recipe[]} recipesBefore */
const undoer = (saved, recipesBefore) => () => {
  replaceIngredients(saved.ingredients);
  restoreTagged(recipesBefore);
  replaceGrocery(saved.weeks, saved.every);
};

/**
 * Merges ingredient `from` into `into`: every recipe line and grocery mark of `from` moves to `into`, which is in
 * stock if either was, and `from` is removed (its sheet row goes on the next sync).
 * @param {string} from @param {string} into
 * @returns {(() => void) | undefined} undo
 */
export function mergeIngredient(from, into) {
  const a = ingredientOf(from);
  const b = ingredientOf(into);
  if (!a || !b || from === into) return undefined;
  const saved = snapshot();
  if (a.onHand && !b.onHand) updateIngredient(into, { onHand: true });
  const recipesBefore = relinkIngredient(from, into);
  relinkGrocery(from, into);
  removeIngredient(from);
  return undoer(saved, recipesBefore);
}

/**
 * Deletes an ingredient no recipe uses, and drops it from grocery lists.
 * @param {string} id
 * @returns {(() => void) | undefined} undo
 */
export function deleteIngredient(id) {
  if (!ingredientOf(id) || ingredientUses().has(id)) return undefined;
  const saved = snapshot();
  relinkGrocery(id, '');
  removeIngredient(id);
  return undoer(saved, []);
}
