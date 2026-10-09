// Live recipe list: the sample pool (sample dev build only) plus the user's own
// recipes. Every recipe is editable: edits to a sample are saved under the
// sample's id and deleted samples are remembered. This is the on-device cache;
// when a Google Sheet is connected, sync replaces it with the sheet's recipes.

import { SvelteMap } from 'svelte/reactivity';
import { sampleRecipes } from './data/recipes.js';
import { migrateNotes } from './markdown.js';
import { normalizeCategory, normalizeTags, retag } from './tags.js';
import { aisles } from './data/aisles.js';
import { recipeIdFor } from './ingredients.js';
import { restoreSampleIngredients } from './ingredients.svelte.js';
import { cellText, recipeToRow } from './sync/codec.js';
import { sampleData, storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';

export { formatMinutes } from './data/recipes.js';
export { suggestedTags, isSuggestedTag, tagIcon, normalizeTag, normalizeTags, tagChoices, TAG_MAX, normalizeCategory, categoryChoices } from './tags.js';

/** @typedef {import('./data/recipes.js').Recipe} Recipe */
/** @typedef {Omit<Recipe, 'minutes'> & { edited?: boolean }} SavedRecipe */

const STORAGE_KEY = storageKey('recipeBox.v2');

// Sample recipes are development data only (`npm run dev`) — production starts empty.
const builtIn = sampleData ? sampleRecipes : [];
const sampleById = new Map(builtIn.map((r) => [r.id, r]));
export const isSample = (id) => sampleById.has(id);

/** @param {SavedRecipe} r @returns {Recipe} */
const withMinutes = (r) => ({ ...r, minutes: r.prepMinutes + r.cookMinutes });

/** Brings a recipe saved by an earlier build up to date. @param {SavedRecipe} r */
const migrate = (r) => {
  // Mock-only sample fields, since removed (cook counts now come from the plan).
  const { highlight, prep, stat, rating, ratings, cookCount, ...rest } = migrateNotes(r);
  return {
    ...rest,
    badge: { label: normalizeCategory(rest.badge?.label ?? 'Dinner') },
    tags: normalizeTags(r.tags),
    ingredients: (rest.ingredients ?? []).map((g) => ({ ...g, items: (g.items ?? []).filter((i) => i?.id) })),
  };
};

/** @returns {{ saved: SavedRecipe[], deleted: string[] }} */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const box = JSON.parse(raw);
      return { ...box, saved: box.saved.map(migrate) };
    }
  } catch {
    // Start from the samples.
  }
  return { saved: [], deleted: [] };
}

const box = load();
const savedById = new Map(box.saved.map((r) => [r.id, r]));
/** Sample ids the user deleted. */
const deleted = new Set(box.deleted);

/** @type {Recipe[]} */
export const recipes = $state([
  ...builtIn.filter((r) => !deleted.has(r.id)).map((r) => (savedById.has(r.id) ? withMinutes(savedById.get(r.id)) : r)),
  ...box.saved.filter((r) => !isSample(r.id)).map(withMinutes),
]);

/** @type {Map<string, Recipe>} */
export const recipeById = new SvelteMap(recipes.map((r) => [r.id, r]));

export const customRecipeCount = () => recipes.filter((r) => r.custom).length;

/** @returns {boolean} whether the recipes fit on this device */
function store() {
  const saved = recipes.filter((r) => r.custom || r.edited).map(({ minutes, ...r }) => r);
  return saveItem(STORAGE_KEY, JSON.stringify({ saved, deleted: [...deleted] }));
}

function persist() {
  // Most likely the quota — large uploaded photos are the usual culprit.
  if (!store()) throw new Error('This device ran out of space for saved recipes. Try a smaller photo or an image link.');
}

/**
 * Adds or replaces a recipe. Saving over a sample marks it `edited`.
 * @param {SavedRecipe} recipe
 */
export function saveRecipe(recipe) {
  const next = withMinutes(isSample(recipe.id) ? { ...recipe, edited: true } : recipe);
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
  const before = [];
  for (const [i, r] of recipes.entries()) {
    if (!r.tags.includes(from)) continue;
    before.push($state.snapshot(r));
    recipes[i] = { ...r, tags: retag(r.tags, from, to), ...(isSample(r.id) && { edited: true }) };
    recipeById.set(r.id, recipes[i]);
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

/** Undo for `retagRecipes` (recipes deleted since are left out). @param {Recipe[]} before */
export function restoreTagged(before) {
  putBack(before);
  persist();
}

/** Same content as far as the Google Sheet can tell (favorites aside). */
function sameInSheet(a, b) {
  const none = new Set();
  const [ra, rb] = [recipeToRow(a, none), recipeToRow(b, none)];
  return Object.keys(ra).every((col) => cellText(ra[col]) === cellText(rb[col]));
}

/**
 * Replaces the whole recipe list with the synced one. Sample recipes that match
 * the built-in version are stored as plain samples; changed ones as edits.
 * @param {Recipe[]} list
 */
export function replaceRecipes(list) {
  const ids = new Set(list.map((r) => r.id));
  deleted.clear();
  for (const sample of builtIn) if (!ids.has(sample.id)) deleted.add(sample.id);
  const next = list.map((r) => {
    const sample = sampleById.get(r.id);
    if (!sample) return { ...r, custom: true };
    if (sameInSheet(r, sample)) return sample;
    const { custom, ...rest } = r;
    return { ...rest, edited: true };
  });
  recipes.splice(0, recipes.length, ...next);
  recipeById.clear();
  for (const r of recipes) recipeById.set(r.id, r);
  // A sync shows the sheet's recipes even when they don't fit; it holds back the sync base
  // until they're stored (sync.svelte.js), so the next pass still sees them as unsaved.
  store();
}

/** @param {string} title */
export const newRecipeId = (title) => recipeIdFor(title, (id) => recipeById.has(id));

// ---- Ingredient text helpers -------------------------------------------------

export { parseQty, guessAisle, parseIngredientLines } from './ingredientText.js';
export { aisles };

/** Display name for an ingredient tag; tags outside the aisle list show as-is. @param {string} tag */
export const aisleLabel = (tag) => aisles.find((a) => a.tag === tag)?.label ?? tag;
