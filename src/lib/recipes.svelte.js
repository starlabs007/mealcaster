// Live recipe list: the generated sample recipes (dev only, `virtual:sample-data`) plus the user's own
// recipes. Every recipe is editable: edits to a sample are saved under the
// sample's id and deleted samples are remembered. This is the on-device cache;
// when a Google Sheet is connected, sync replaces it with the sheet's recipes.

import { SvelteMap } from 'svelte/reactivity';
import { samples } from 'virtual:sample-data';
import { aisles } from './data/aisles.js';
import { recipeIdFor } from './ingredients.js';
import { parseBox, startingRecipes, recipesToSave, recipeToStore, retagChanges, relinkChanges, classifySynced } from './recipeBox.js';
import { restoreSampleIngredients } from './ingredients.svelte.js';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { text } from './text.js';

export { formatMinutes } from './data/recipes.js';
export { suggestedTags, isSuggestedTag, tagIcon, normalizeTag, normalizeTags, tagChoices, TAG_MAX } from './tags.js';
export { MEALS, normalizeMeals } from './meals.js';

/** @typedef {import('./data/recipes.js').Recipe} Recipe */
/** @typedef {Omit<Recipe, 'minutes'> & { edited?: boolean }} SavedRecipe */

const STORAGE_KEY = storageKey('recipeBox.v2');

// Sample recipes are development data only (`npm run dev`) — production builds get none.
/** @type {Recipe[]} */
const builtIn = samples.recipes;
const sampleById = new Map(builtIn.map((r) => [r.id, r]));
export const isSample = (id) => sampleById.has(id);

const box = parseBox(localStorage.getItem(STORAGE_KEY));
/** Sample ids the user deleted. */
const deleted = new Set(box.deleted);

/** @type {Recipe[]} */
export const recipes = $state(startingRecipes(builtIn, box));

/** @type {Map<string, Recipe>} */
export const recipeById = new SvelteMap(recipes.map((r) => [r.id, r]));

export const customRecipeCount = () => recipes.filter((r) => r.custom).length;

/** @returns {boolean} whether the recipes fit on this device */
function store() {
  return saveItem(STORAGE_KEY, JSON.stringify({ saved: recipesToSave(recipes), deleted: [...deleted] }));
}

function persist() {
  // Most likely the quota — large uploaded photos are the usual culprit.
  if (!store()) throw new Error(text.catalog.errors.outOfSpace);
}

/**
 * Adds or replaces a recipe. Saving over a sample marks it `edited`.
 * @param {SavedRecipe} recipe
 */
export function saveRecipe(recipe) {
  const next = recipeToStore(recipe, isSample(recipe.id));
  const index = recipes.findIndex((r) => r.id === recipe.id);
  const previous = index >= 0 ? recipes[index] : undefined;
  if (index >= 0) recipes[index] = next;
  else recipes.push(next);
  const at = index >= 0 ? index : recipes.length - 1;
  try {
    persist();
  } catch (error) {
    // Roll back so memory matches what's stored.
    if (previous) recipes[at] = previous;
    else recipes.splice(at, 1);
    throw error;
  }
  recipeById.set(recipe.id, recipes[at]);
}

/** Puts an edited sample back to its built-in version. @param {string} id */
export function revertSample(id) {
  const index = recipes.findIndex((r) => r.id === id);
  if (index < 0 || !isSample(id)) return;
  recipes[index] = sampleById.get(id);
  // Its lines must resolve, even if one of its ingredients was deleted meanwhile.
  restoreSampleIngredients(recipes[index].ingredients.flatMap((g) => g.items.map((i) => i.id)));
  recipeById.set(id, recipes[index]);
  persist();
}

/**
 * @param {string} id
 * @returns {{ recipe: Recipe, index: number } | undefined} what was removed, for `restoreRecipe`
 */
export function deleteRecipe(id) {
  const index = recipes.findIndex((r) => r.id === id);
  if (index < 0) return undefined;
  const [removed] = recipes.splice(index, 1);
  recipeById.delete(id);
  if (isSample(id)) deleted.add(id);
  persist();
  return { recipe: $state.snapshot(removed), index };
}

/** Undo for `deleteRecipe`. @param {{ recipe: Recipe, index: number }} removed */
export function restoreRecipe({ recipe, index }) {
  deleted.delete(recipe.id);
  const at = Math.min(index, recipes.length);
  recipes.splice(at, 0, recipe);
  recipeById.set(recipe.id, recipes[at]);
  persist();
}

/**
 * Renames a tag on every recipe that has it, or removes it when `to` is ''. Samples it touches
 * are marked edited.
 * @param {string} from @param {string} to
 * @returns {Recipe[]} the recipes as they were, for `restoreTagged`
 */
export function retagRecipes(from, to) {
  return applyChanges(retagChanges(recipes, from, to, isSample));
}

/**
 * Points every recipe line using ingredient `from` at ingredient `to` (merging two ingredients). Samples it touches
 * are marked edited.
 * @param {string} from @param {string} to
 * @returns {Recipe[]} the recipes as they were, for `restoreTagged`
 */
export function relinkIngredient(from, to) {
  return applyChanges(relinkChanges(recipes, from, to, isSample));
}

/**
 * @param {{ index: number, recipe: Recipe }[]} changes
 * @returns {Recipe[]} the recipes as they were
 */
function applyChanges(changes) {
  const before = [];
  for (const { index, recipe } of changes) {
    before.push($state.snapshot(recipes[index]));
    recipes[index] = recipe;
    recipeById.set(recipe.id, recipes[index]);
  }
  try {
    persist();
  } catch (error) {
    // Roll back so memory matches what's stored.
    putBack(before);
    throw error;
  }
  return before;
}

/** @param {Recipe[]} before */
function putBack(before) {
  for (const old of before) {
    const i = recipes.findIndex((r) => r.id === old.id);
    if (i < 0) continue;
    recipes[i] = old;
    recipeById.set(old.id, recipes[i]);
  }
}

/** Undo for `retagRecipes` and `relinkIngredient` (recipes deleted since are left out). @param {Recipe[]} before */
export function restoreTagged(before) {
  putBack(before);
  persist();
}

/**
 * Replaces the whole recipe list with the synced one. Sample recipes that match
 * the built-in version are stored as plain samples; changed ones as edits.
 * @param {Recipe[]} list
 */
export function replaceRecipes(list) {
  const synced = classifySynced(list, builtIn);
  deleted.clear();
  for (const id of synced.deleted) deleted.add(id);
  recipes.splice(0, recipes.length, ...synced.recipes);
  recipeById.clear();
  for (const r of recipes) recipeById.set(r.id, r);
  // A sync shows the sheet's recipes even when they don't fit; it holds back the sync base
  // until they're stored (sync.svelte.js), so the next pass still sees them as unsaved.
  store();
}

/** @param {string} title */
export const newRecipeId = (title) => recipeIdFor(title, (id) => recipeById.has(id));

// ---- Ingredient text helpers -------------------------------------------------

export { parseQty, guessAisle, matchAisle, parseIngredientLines } from './ingredientText.js';
export { aisles };

/** Display name for an ingredient tag; tags outside the aisle list show as-is. @param {string} tag */
export const aisleLabel = (tag) => aisles.find((a) => a.tag === tag)?.label ?? tag;
