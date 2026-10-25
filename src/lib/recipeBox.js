// The rules of the on-device recipe box, on plain data (the store, recipes.svelte.js, holds the
// state and does the saving): reading what an earlier build saved, which recipes are kept on the
// device, bulk tag / ingredient edits, and how a synced list is classified against the samples.

import { migrateNotes } from './markdown.js';
import { normalizeTags, retag } from './tags.js';
import { parseMeals } from './meals.js';
import { normalizeHeadsUps } from './headsUps.js';
import { cellText, recipeToRow } from './sync/codec.js';

/** @typedef {import('./data/recipes.js').Recipe} Recipe */
/** @typedef {Omit<Recipe, 'minutes'> & { edited?: boolean }} SavedRecipe */

/** @param {SavedRecipe} r @returns {Recipe} */
export const withMinutes = (r) => ({ ...r, minutes: r.prepMinutes + r.cookMinutes });

/** Brings a recipe saved by an earlier build up to date. @param {SavedRecipe} r */
export function migrate(r) {
  // Mock-only sample fields, since removed (cook counts now come from the plan; `hero` was a second photo).
  const { highlight, prep, stat, rating, ratings, cookCount, hero, badge, ...rest } = migrateNotes(r);
  // `badge.label` was one free-text category: its meal becomes `meals`, any other word joins the tags.
  const { meals, extra } = parseMeals(rest.meals ?? badge?.label ?? 'Dinner');
  return {
    ...rest,
    meals,
    tags: normalizeTags([...(r.tags ?? []), ...extra]),
    ingredients: (rest.ingredients ?? []).map((g) => ({ ...g, items: (g.items ?? []).filter((i) => i?.id) })),
    headsUps: normalizeHeadsUps(rest.headsUps),
  };
}

/**
 * Reads the stored box; anything unreadable starts empty.
 * @param {string | null} raw
 * @returns {{ saved: SavedRecipe[], deleted: string[] }}
 */
export function parseBox(raw) {
  try {
    if (raw) {
      const box = JSON.parse(raw);
      return { ...box, saved: box.saved.map(migrate) };
    }
  } catch {
    // Start from the samples.
  }
  return { saved: [], deleted: [] };
}

/**
 * The recipes to start with: the samples (minus deleted ones, edited ones replaced by their saved
 * version), then the user's own.
 * @param {Recipe[]} samples @param {{ saved: SavedRecipe[], deleted: string[] }} box
 * @returns {Recipe[]}
 */
export function startingRecipes(samples, box) {
  const savedById = new Map(box.saved.map((r) => [r.id, r]));
  const deleted = new Set(box.deleted);
  const sampleIds = new Set(samples.map((r) => r.id));
  return [
    ...samples.filter((r) => !deleted.has(r.id)).map((r) => (savedById.has(r.id) ? withMinutes(savedById.get(r.id)) : r)),
    ...box.saved.filter((r) => !sampleIds.has(r.id)).map(withMinutes),
  ];
}

/** What is kept on the device: the user's own and edited recipes, without the derived `minutes`. @param {Recipe[]} recipes */
export const recipesToSave = (recipes) => recipes.filter((r) => r.custom || r.edited).map(({ minutes, ...r }) => r);

/** A recipe as it goes into the list; saving over a sample marks it `edited`. @param {SavedRecipe} recipe @param {boolean} isSample */
export const recipeToStore = (recipe, isSample) => withMinutes(isSample ? { ...recipe, edited: true } : recipe);

/**
 * Applies `change` to every recipe `affects` picks, marking samples it touches as edited.
 * @param {Recipe[]} recipes @param {(r: Recipe) => boolean} affects @param {(r: Recipe) => Recipe} change
 * @param {(id: string) => boolean} isSample
 * @returns {{ index: number, recipe: Recipe }[]} the changed recipes and where they are
 */
function changeEach(recipes, affects, change, isSample) {
  const changes = [];
  for (const [index, r] of recipes.entries()) {
    if (!affects(r)) continue;
    changes.push({ index, recipe: { ...change(r), ...(isSample(r.id) && { edited: true }) } });
  }
  return changes;
}

/**
 * Renames tag `from` on every recipe that has it, or removes it when `to` is ''.
 * @param {Recipe[]} recipes @param {string} from @param {string} to @param {(id: string) => boolean} isSample
 */
export const retagChanges = (recipes, from, to, isSample) =>
  changeEach(recipes, (r) => r.tags.includes(from), (r) => ({ ...r, tags: retag(r.tags, from, to) }), isSample);

/**
 * Points every recipe line using ingredient `from` at ingredient `to` (merging two ingredients).
 * @param {Recipe[]} recipes @param {string} from @param {string} to @param {(id: string) => boolean} isSample
 */
export const relinkChanges = (recipes, from, to, isSample) =>
  changeEach(
    recipes,
    (r) => r.ingredients.some((g) => g.items.some((item) => item.id === from)),
    (r) => ({ ...r, ingredients: r.ingredients.map((g) => ({ ...g, items: g.items.map((item) => (item.id === from ? { ...item, id: to } : item)) })) }),
    isSample,
  );

/** Same content as far as the Google Sheet can tell (favorites aside). */
function sameInSheet(a, b) {
  const none = new Set();
  const [ra, rb] = [recipeToRow(a, none), recipeToRow(b, none)];
  return Object.keys(ra).every((col) => cellText(ra[col]) === cellText(rb[col]));
}

/**
 * How a synced list is kept on the device: sample recipes that match the built-in version are
 * plain samples, changed ones are edits, the rest are the user's own; samples missing from the
 * list count as deleted.
 * @param {Recipe[]} list the synced recipes @param {Recipe[]} samples
 * @returns {{ recipes: Recipe[], deleted: string[] }}
 */
export function classifySynced(list, samples) {
  const sampleById = new Map(samples.map((r) => [r.id, r]));
  const ids = new Set(list.map((r) => r.id));
  const recipes = list.map((r) => {
    const sample = sampleById.get(r.id);
    if (!sample) return { ...r, custom: true };
    if (sameInSheet(r, sample)) return sample;
    const { custom, ...rest } = r;
    return { ...rest, edited: true };
  });
  return { recipes, deleted: samples.filter((s) => !ids.has(s.id)).map((s) => s.id) };
}
