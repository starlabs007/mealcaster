// Grocery list, one per week (mirrors a [Provisions] sheet tab), one line per ingredient.
//
// A line merges every source of its ingredient that week:
//  1. Dinners — every ingredient of the week's dinners, past days and ones marked done included (so items
//     bought for them stay, here and in the sheet).
//  2. Pushed — ingredients sent from a Recipe Detail page ("Add to List" / "Push Unchecked to Grocery"),
//     even for recipes not on the plan.
//  3. Added by you — ingredients added on the grocery screen, for that week only or every week. An every-week
//     item shows on this week and later ones until bought; from then on only on the week it was bought in.
//
// Ingredients at home (the ingredient's On hand flag) are left off every week's list and listed apart. A past
// week never changes: just before stock changes, each past week saves what it left off (`stock`).
// Each line is 'need' (to buy), 'bought' or 'skipped' (this week only). The merging itself is in groceryList.js.

import { recipeById } from './recipes.svelte.js';
import { ingredientOf, onBeforeStockChange, setOnHand } from './ingredients.svelte.js';
import { planner, currentWeek } from './planner.svelte.js';
import { addDays, fromISO, weekStartOf } from './dates.js';
import { departments } from './data/departments.js';
import { samples } from 'virtual:sample-data';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { rekeyGroceryWeeks } from './sync/codec.js';
import { buildWeekList, emptyWeek } from './groceryList.js';
import { addByHand, freezePast, lineKeysOf, listedLineKeys, parseLineKey, pushLines, relink, removeAdded as removeAddedFrom, setStatus } from './groceryOps.js';

export { deptOfTag } from './groceryList.js';

const STORAGE_KEY = storageKey('grocery.v4');
const EVERY_KEY = storageKey('groceryEvery.v1');

/**
 * @typedef {import('./groceryList.js').LineStatus} LineStatus
 * @typedef {import('./groceryList.js').Dept} Dept
 * @typedef {import('./groceryList.js').WeekList} WeekList
 * @typedef {import('./groceryList.js').EveryWeekItem} EveryWeekItem
 * @typedef {import('./groceryList.js').GroceryLine} GroceryLine
 */

export { departments };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return rekeyGroceryWeeks(JSON.parse(raw));
  } catch {
    // Start from the samples.
  }
  // Sample additions (dev only), placed around this week.
  const thisWeek = weekStartOf(fromISO(planner.today));
  return Object.fromEntries(
    samples.grocery.weeks.map(({ weekOffset, added }) => [addDays(thisWeek, weekOffset * 7), { ...emptyWeek(), added: { ...added } }]),
  );
}

function loadEvery() {
  try {
    const raw = localStorage.getItem(EVERY_KEY);
    if (raw) return JSON.parse(raw).filter((i) => i && typeof i.ingredientId === 'string');
  } catch {
    // Start from the samples.
  }
  return samples.grocery.every.map((i) => ({ ...i }));
}

/** @type {{ weeks: Record<string, WeekList>, every: EveryWeekItem[] }} */
export const grocery = $state({ weeks: load(), every: loadEvery() });

$effect.root(() => {
  $effect(() => {
    // In memory only if they don't fit (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(grocery.weeks));
    saveItem(EVERY_KEY, JSON.stringify(grocery.every));
  });
});

/** Start of the week today is in. */
export const thisWeekStart = () => weekStartOf(fromISO(planner.today));

/** @param {string} key a recipe line key, `${recipeId}:${groupIndex}:${itemIndex}` */
function lookup(key) {
  const { recipeId, group, item: index } = parseLineKey(key);
  const recipe = recipeById.get(recipeId);
  const item = recipe?.ingredients[group]?.items[index];
  return item ? { recipe, item } : undefined;
}

/** All ingredient line keys of a recipe (`recipeId:group:item`). */
export function ingredientKeys(recipeId) {
  const recipe = recipeById.get(recipeId);
  return recipe ? lineKeysOf(recipe) : [];
}

/**
 * The week's days with a dinner whose ingredients go on the list: planned ones, and past or done ones
 * ('completed') — the whole week, so a past day's items don't vanish from the list and the sheet.
 * @param {string} [weekStart]
 */
export const weekDinners = (weekStart = planner.weekStart) =>
  currentWeek(weekStart).filter((d) => (d.status === 'planned' || d.status === 'completed') && d.recipe);

/** @param {string} weekStart */
const buildWeek = (weekStart) =>
  buildWeekList({
    week: weekStart,
    thisWeek: thisWeekStart(),
    list: grocery.weeks[weekStart] ?? emptyWeek(),
    dinners: weekDinners(weekStart),
    recipeOf: (id) => recipeById.get(id),
    ingredientOf,
    every: grocery.every,
  });

/** Lines of the viewed week's list (or of `weekStart`'s). @returns {GroceryLine[]} */
export const groceryLines = (weekStart = planner.weekStart) => buildWeek(weekStart).lines;

/** The week's lines kept off it because their ingredient is in stock. @returns {GroceryLine[]} */
export const stockHiddenLines = (weekStart = planner.weekStart) => buildWeek(weekStart).hidden;

/** Whether a recipe line's ingredient is in stock. @param {string} key */
export function isOnHandKey(key) {
  const item = lookup(key)?.item;
  return Boolean(item && ingredientOf(item.id)?.onHand);
}

/** Recipe line keys already on the viewed week's list (to buy or bought), through their recipe and ingredient. */
export const groceryKeys = () => listedLineKeys(groceryLines(), ingredientKeys, (key) => lookup(key)?.item.id);

/** Items still to buy — drives the header badge. */
export const groceryCount = () => groceryLines().filter((l) => l.status === 'need').length;

/**
 * Puts recipe lines on the viewed week's list.
 * @param {string[]} keys recipe line keys
 * @returns {number} how many ingredients were newly added
 */
export function addToGrocery(keys) {
  const lines = keys.flatMap((key) => {
    const found = lookup(key);
    return found ? [{ key, recipeId: found.recipe.id, ingredientId: found.item.id }] : [];
  });
  return pushLines(grocery, planner.weekStart, lines, groceryKeys());
}

/** Marks an ingredient's line on the viewed week bought or to buy (and its every-week item with it). @param {string} ingredientId @param {LineStatus} status */
export function setLineStatus(ingredientId, status) {
  setStatus(grocery, planner.weekStart, thisWeekStart(), ingredientId, status);
}

/**
 * Adds an ingredient by hand. Adding it means you need it, so it's no longer in stock.
 * @param {string} ingredientId @param {string} note @param {boolean} everyWeek on every week until bought, not just the viewed one
 */
export function addItem(ingredientId, note, everyWeek) {
  setOnHand(ingredientId, false);
  addByHand(grocery, planner.weekStart, ingredientId, note, everyWeek);
}

/**
 * Removes what you added of an ingredient: the viewed week's item, and its every-week item (from every week).
 * @param {string} ingredientId
 * @returns {() => void} undo
 */
export const removeAdded = (ingredientId) => removeAddedFrom(grocery, planner.weekStart, ingredientId);

/**
 * Saves, for each past week without one yet, what it leaves off as in stock — called just before stock changes,
 * so a past week's list stays as it was.
 */
export function freezePastWeeks() {
  freezePast(
    grocery,
    thisWeekStart(),
    Object.keys(planner.entries).map((iso) => weekStartOf(fromISO(iso))),
    (week) => weekDinners(week).length > 0,
    (week) => buildWeek(week).hidden.map((l) => l.ingredientId),
  );
}
onBeforeStockChange(freezePastWeeks);

/**
 * Moves every grocery mark of ingredient `from` onto `to` (two ingredients merged), or drops them when `to` is ''
 * (an ingredient deleted). Where both have one, what's still to buy wins and notes are joined.
 * @param {string} from @param {string} to
 */
export const relinkGrocery = (from, to) => relink(grocery, from, to);

/** Replaces every week's list (used by Google Sheets sync). @param {Record<string, WeekList>} weeks @param {EveryWeekItem[]} [every] */
export function replaceGrocery(weeks, every = grocery.every) {
  grocery.weeks = weeks;
  grocery.every = every;
}
