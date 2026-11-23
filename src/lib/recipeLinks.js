// Recipe links (#300): an ingredient line can point at another recipe instead of an ingredient — Bánh Xèo lists
// "1 batch Nước Chấm", and that line opens the Nước Chấm recipe. A linked line is `{ recipe, name, qty, … }` with no
// `id`: `recipe` is the target's Recipe_ID, `name` a copy of its title from when the line was saved, shown when the
// target is gone. `qty` counts batches of the target at its own servings (no qty = one batch).
//
// Only one level is followed: the lines a link brings (to the grocery list) are the target's own ingredient lines,
// never the target's links in turn, so A → B → A can't loop. A recipe linking itself is ignored.
//
// Plain module (no runes) so it can be tested.

/** @typedef {import('./data/recipes.js').Recipe} Recipe */
/** @typedef {import('./ingredients.js').RecipeLine} RecipeLine */
/** @typedef {(id: string) => Recipe | undefined} RecipeOf */

/** Whether a line points at a recipe rather than an ingredient. @param {RecipeLine | null | undefined} line */
export const isLink = (line) => typeof line?.recipe === 'string' && line.recipe !== '';

/**
 * The recipe a line links to: undefined for an ingredient line, a link to the recipe itself, or a target that is gone.
 * @param {RecipeLine} line @param {string} fromId the recipe the line is in @param {RecipeOf} recipeOf
 */
export function linkTarget(line, fromId, recipeOf) {
  if (!isLink(line) || line.recipe === fromId) return undefined;
  return recipeOf(/** @type {string} */ (line.recipe));
}

/** The name a linked line shows: the target's title, else the copy kept on the line. @param {RecipeLine} line @param {RecipeOf} recipeOf */
export const linkName = (line, recipeOf) => (isLink(line) && recipeOf(/** @type {string} */ (line.recipe))?.title) || line.name || '';

/** How many batches of its target a linked line asks for. @param {RecipeLine} line */
export const batchesOf = (line) => (typeof line.qty === 'number' && line.qty > 0 ? line.qty : 1);

/** Ids of the recipes a recipe links to, once each, in line order, itself left out. @param {Recipe} recipe */
export function linkedIds(recipe) {
  const ids = [];
  for (const group of recipe.ingredients) {
    for (const line of group.items) if (isLink(line) && line.recipe !== recipe.id && !ids.includes(line.recipe)) ids.push(line.recipe);
  }
  return /** @type {string[]} */ (ids);
}

/**
 * The recipes whose lines link to `id` ("Used in" on its page), A–Z. Worked out from the links, never stored.
 * @param {Iterable<Recipe>} recipes @param {string} id
 */
export function usedIn(recipes, id) {
  return [...recipes].filter((r) => r.id !== id && linkedIds(r).includes(id)).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

/**
 * The targets a recipe's links bring along, one level deep: per linked line whose target exists, the target and the
 * batches asked for. Links to the recipe itself and to missing targets are left out.
 * @param {Recipe} recipe @param {RecipeOf} recipeOf
 * @returns {{ line: RecipeLine, target: Recipe, batches: number }[]}
 */
export function linkedTargets(recipe, recipeOf) {
  const out = [];
  for (const group of recipe.ingredients) {
    for (const line of group.items) {
      const target = linkTarget(line, recipe.id, recipeOf);
      if (target) out.push({ line, target, batches: batchesOf(line) });
    }
  }
  return out;
}

/**
 * The recipe with each linked line's `name` copy set to its target's current title (done when the recipe is saved).
 * Returns the same object when nothing changed. @param {Recipe} recipe @param {RecipeOf} recipeOf
 */
export function withLinkNames(recipe, recipeOf) {
  let changed = false;
  const ingredients = recipe.ingredients.map((group) => {
    const items = group.items.map((line) => {
      const title = isLink(line) ? recipeOf(/** @type {string} */ (line.recipe))?.title : undefined;
      if (!title || title === line.name) return line;
      changed = true;
      return { ...line, name: title };
    });
    return items.some((line, i) => line !== group.items[i]) ? { ...group, items } : group;
  });
  return changed ? { ...recipe, ingredients } : recipe;
}
