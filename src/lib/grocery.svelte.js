// Quick Grocery & Provisions list, one per week (mirrors a [Provisions] sheet tab), one line per ingredient.
//
// A line merges every source of its ingredient that week:
//  1. Dinners — every ingredient of the week's dinners, past days and ones marked done included (so items
//     bought for them stay, here and in the sheet).
//  2. Pushed — ingredients sent from a Recipe Detail page ("Add to List" / "Push Unchecked to Grocery"),
//     even for recipes not on the plan.
//  3. Added by you — ingredients added on the grocery screen, for that week only or every week. An every-week
//     item shows on this week and later ones until bought; from then on only on the week it was bought in.
//
// Ingredients in stock (the ingredient's On hand flag) are left off every week's list and listed apart. A past
// week never changes: just before stock changes, each past week saves what it left off (`stock`).
// Each line is 'need' (to buy) or 'bought'. The merging itself is in groceryList.js.

import { recipeById } from './recipes.svelte.js';
import { ingredientOf, onBeforeStockChange, setOnHand } from './ingredients.svelte.js';
import { planner, currentWeek } from './planner.svelte.js';
import { fromISO, weekStartOf } from './dates.js';
import { departments } from './data/departments.js';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { rekeyGroceryWeeks } from './sync/codec.js';
import { buildWeekList, emptyWeek, everyWeekShows } from './groceryList.js';

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
    // Start empty.
  }
  return {};
}

function loadEvery() {
  try {
    const raw = localStorage.getItem(EVERY_KEY);
    if (raw) return JSON.parse(raw).filter((i) => i && typeof i.ingredientId === 'string');
  } catch {
    // Start empty.
  }
  return [];
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

/** The viewed week's list, created on first write. */
function weekList() {
  return (grocery.weeks[planner.weekStart] ??= emptyWeek());
}

/** @param {string} key a recipe line key, `${recipeId}:${groupIndex}:${itemIndex}` */
function lookup(key) {
  const [recipeId, g, i] = key.split(':');
  const recipe = recipeById.get(recipeId);
  const item = recipe?.ingredients[+g]?.items[+i];
  return item ? { recipe, item } : undefined;
}

/** All ingredient line keys of a recipe (`recipeId:group:item`). */
export function ingredientKeys(recipeId) {
  const recipe = recipeById.get(recipeId);
  if (!recipe) return [];
  return recipe.ingredients.flatMap((group, g) => group.items.map((_, i) => `${recipeId}:${g}:${i}`));
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
export function groceryKeys() {
  const on = new Set();
  for (const line of groceryLines()) for (const s of line.sources) if (s.recipeId) on.add(`${s.recipeId}:${line.ingredientId}`);
  const keys = new Set();
  for (const pair of on) {
    const recipeId = pair.slice(0, pair.indexOf(':'));
    for (const key of ingredientKeys(recipeId)) if (`${recipeId}:${lookup(key)?.item.id}` === pair) keys.add(key);
  }
  return keys;
}

/** Items still to buy — drives the header badge. */
export const groceryCount = () => groceryLines().filter((l) => l.status === 'need').length;

/**
 * Puts recipe lines on the viewed week's list.
 * @param {string[]} keys recipe line keys
 * @returns {number} how many ingredients were newly added
 */
export function addToGrocery(keys) {
  const onList = groceryKeys();
  const week = weekList();
  const fresh = new Set();
  for (const key of keys) {
    const found = lookup(key);
    if (!found || onList.has(key)) continue;
    const pair = `${found.recipe.id}:${found.item.id}`;
    if (week.pushed.includes(pair)) continue;
    week.pushed.push(pair);
    week.status[found.item.id] = 'need';
    fresh.add(found.item.id);
  }
  return fresh.size;
}

/** Marks an ingredient's line on the viewed week bought or to buy (and its every-week item with it). @param {string} ingredientId @param {LineStatus} status */
export function setLineStatus(ingredientId, status) {
  const week = planner.weekStart;
  weekList().status[ingredientId] = status;
  for (const item of grocery.every) {
    if (item.ingredientId !== ingredientId || !everyWeekShows(item, week, thisWeekStart())) continue;
    item.status = status;
    item.doneWeek = status === 'need' ? '' : week;
  }
}

/**
 * Adds an ingredient by hand. Adding it means you need it, so it's no longer in stock.
 * @param {string} ingredientId @param {string} note @param {boolean} everyWeek on every week until bought, not just the viewed one
 */
export function addItem(ingredientId, note, everyWeek) {
  setOnHand(ingredientId, false);
  if (everyWeek) {
    const existing = grocery.every.find((i) => i.ingredientId === ingredientId);
    if (existing) Object.assign(existing, { note, status: 'need', doneWeek: '' });
    else grocery.every.push({ ingredientId, note, status: 'need', doneWeek: '' });
  } else {
    weekList().added[ingredientId] = note;
  }
  weekList().status[ingredientId] = 'need';
}

/** Removes what you added of an ingredient: the viewed week's item, and its every-week item (from every week). @param {string} ingredientId */
export function removeAdded(ingredientId) {
  const week = grocery.weeks[planner.weekStart];
  if (week) delete week.added[ingredientId];
  grocery.every = grocery.every.filter((i) => i.ingredientId !== ingredientId);
}

/**
 * Saves, for each past week without one yet, what it leaves off as in stock — called just before stock changes,
 * so a past week's list stays as it was.
 */
export function freezePastWeeks() {
  const thisWeek = thisWeekStart();
  const weeks = new Set([
    ...Object.keys(grocery.weeks),
    ...Object.keys(planner.entries).map((iso) => weekStartOf(fromISO(iso))),
  ]);
  for (const week of weeks) {
    if (week >= thisWeek || grocery.weeks[week]?.stock) continue;
    if (!weekDinners(week).length && !grocery.weeks[week]) continue;
    const ids = buildWeek(week).hidden.map((l) => l.ingredientId);
    (grocery.weeks[week] ??= emptyWeek()).stock = ids;
  }
}
onBeforeStockChange(freezePastWeeks);

/**
 * Moves every grocery mark of ingredient `from` onto `to` (two ingredients merged), or drops them when `to` is ''
 * (an ingredient deleted). Where both have one, what's still to buy wins and notes are joined.
 * @param {string} from @param {string} to
 */
export function relinkGrocery(from, to) {
  const swap = (id) => (id === from ? to : id);
  for (const list of Object.values(grocery.weeks)) {
    list.pushed = [...new Set(list.pushed.map((pair) => {
      const [recipeId, id] = pair.split(':');
      return id === from ? (to ? `${recipeId}:${to}` : '') : pair;
    }).filter(Boolean))];
    if (from in list.status) {
      if (to) list.status[to] = list.status[to] === 'need' || list.status[from] === 'need' ? 'need' : 'bought';
      delete list.status[from];
    }
    if (from in list.added) {
      if (to) list.added[to] = [list.added[to], list.added[from]].filter(Boolean).join(', ');
      delete list.added[from];
    }
    if (list.stock) list.stock = [...new Set(list.stock.map(swap).filter(Boolean))];
  }
  const kept = grocery.every.find((i) => i.ingredientId === to);
  grocery.every = grocery.every.filter((i) => i.ingredientId !== from || (to && !kept));
  for (const item of grocery.every) if (item.ingredientId === from) item.ingredientId = to;
}

/** Replaces every week's list (used by Google Sheets sync). @param {Record<string, WeekList>} weeks @param {EveryWeekItem[]} [every] */
export function replaceGrocery(weeks, every = grocery.every) {
  grocery.weeks = weeks;
  grocery.every = every;
}
