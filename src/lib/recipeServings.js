// The servings the cook last chose on a recipe page, per recipe, kept on this device (never synced: the sheet's
// Servings column stays the recipe's own). A count equal to the recipe's default isn't stored.

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 12;

/** @param {number} n */
const clamp = (n) => Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));

/** @param {unknown} stored @returns {Record<string, number>} */
function entries(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  return Object.fromEntries(Object.entries(stored).filter(([, n]) => Number.isFinite(n)));
}

/**
 * The servings to open a recipe at: the remembered count, else the recipe's own.
 * @param {unknown} stored @param {string} recipeId @param {number} serves
 */
export function servingsFor(stored, recipeId, serves) {
  const n = entries(stored)[recipeId];
  return clamp(n ?? serves);
}

/**
 * The stored counts with one recipe's choice applied. Back at the recipe's default removes it; recipes that no
 * longer exist (`isKnown` false) are dropped on the way.
 * @param {unknown} stored @param {string} recipeId @param {number} count @param {number} serves
 * @param {(id: string) => boolean} [isKnown]
 * @returns {Record<string, number>}
 */
export function withServings(stored, recipeId, count, serves, isKnown = () => true) {
  const next = Object.fromEntries(Object.entries(entries(stored)).filter(([id]) => id !== recipeId && isKnown(id)));
  const n = clamp(count);
  if (n !== clamp(serves)) next[recipeId] = n;
  return next;
}
