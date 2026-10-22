// The recipe page's "prepped" ticks: which ingredient lines the cook has measured out today. Kept on this device for
// the day only (never synced); a stored day other than today reads as nothing prepped.

/** @typedef {{ date: string, recipes: Record<string, string[]> }} PrepState */

/**
 * Today's prepped line keys by recipe id.
 * @param {unknown} stored @param {string} today
 * @returns {Record<string, string[]>}
 */
export function prepOfDay(stored, today) {
  const state = /** @type {PrepState | null} */ (stored);
  return state && state.date === today && state.recipes && typeof state.recipes === 'object' ? state.recipes : {};
}

/**
 * The state with one recipe's prepped lines replaced; other days are dropped, an empty list removes the recipe.
 * @param {unknown} stored @param {string} today @param {string} recipeId @param {string[]} keys
 * @returns {PrepState}
 */
export function withPrepped(stored, today, recipeId, keys) {
  const recipes = { ...prepOfDay(stored, today) };
  if (keys.length) recipes[recipeId] = [...new Set(keys)];
  else delete recipes[recipeId];
  return { date: today, recipes };
}
