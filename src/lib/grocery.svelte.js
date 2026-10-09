// Quick Grocery & Provisions list, one per week (mirrors a [Provisions] sheet tab).
//
// Lines come from three sources:
//  1. Automatic — every ingredient of the week's dinners, past days and ones marked done included (so items
//     bought for them stay, here and in the sheet), except ingredients in stock (ingredients store).
//  2. Pushed — ingredients sent from a Recipe Detail page ("Add to List" /
//     "Push Unchecked to Grocery"), even for recipes not on the plan.
//  3. Custom — free-text items added on the grocery screen, for one week or (global) for every week.
//     A global item shows in every week until it is bought / marked on hand; from then on it shows only in
//     the week it was acquired in (as acquired) and disappears from the other weeks.
//
// Each line is 'need' (to buy), 'bought' (checked off) or 'owned' (already on hand).
// Ingredient keys are `${recipeId}:${groupIndex}:${itemIndex}`.

import { recipeById } from './recipes.svelte.js';
import { ingredientOf } from './ingredients.svelte.js';
import { shoppingName, unitLabel } from './ingredients.js';
import { planner, currentWeek } from './planner.svelte.js';
import { formatQty } from './format.js';
import { formatWeekday } from './dates.js';
import { departments } from './data/departments.js';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { rekeyGroceryWeeks } from './sync/codec.js';

const STORAGE_KEY = storageKey('grocery.v3');
const GLOBAL_KEY = storageKey('groceryGlobal.v2');

/**
 * @typedef {'need' | 'bought' | 'owned'} LineStatus
 * @typedef {'produce' | 'meat' | 'dairy' | 'pantry' | 'other'} Dept
 * @typedef {{ id: string, name: string, note: string, dept: Dept }} CustomItem
 * @typedef {CustomItem & { status: LineStatus, doneWeek: string }} GlobalItem  `doneWeek` is the week it was acquired in ('' while still to buy)
 * @typedef {{ extras: string[], status: Record<string, LineStatus>, custom: CustomItem[] }} WeekList
 * @typedef {{
 *   key: string,
 *   name: string,
 *   detail: string,
 *   dept: Dept,
 *   status: LineStatus,
 *   source: { label: string, tone: string },
 *   recipeId?: string,
 *   custom?: boolean,
 *   global?: boolean,
 * }} GroceryLine
 */

export { departments };

/** Ingredient tag → store department. */
const TAG_DEPT = {
  Produce: 'produce',
  Herbs: 'produce',
  Fresh: 'meat',
  Dairy: 'dairy',
  Frozen: 'dairy',
  Pantry: 'pantry',
  Spices: 'pantry',
  Bakery: 'pantry',
  Other: 'other',
};

/** Store department for an ingredient aisle tag. @param {string} tag @returns {Dept} */
export const deptOfTag = (tag) => TAG_DEPT[tag] ?? 'pantry';

// Source-tag colors cycle by weekday so each dinner reads distinctly.
const DAY_TONES = ['neutral', 'paprika', 'sage', 'saffron', 'paprika', 'sage', 'saffron'];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return rekeyGroceryWeeks(JSON.parse(raw));
  } catch {
    // Start empty.
  }
  return {};
}

function loadGlobal() {
  try {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Start empty.
  }
  return [];
}

/** @type {{ weeks: Record<string, WeekList>, global: GlobalItem[] }} */
export const grocery = $state({ weeks: load(), global: loadGlobal() });

$effect.root(() => {
  $effect(() => {
    // In memory only if they don't fit (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(grocery.weeks));
    saveItem(GLOBAL_KEY, JSON.stringify(grocery.global));
  });
});

/** The viewed week's list, created on first write. */
function weekList() {
  return (grocery.weeks[planner.weekStart] ??= { extras: [], status: {}, custom: [] });
}

const readWeek = (weekStart) => grocery.weeks[weekStart] ?? { extras: [], status: {}, custom: [] };

/** @param {string} key */
function lookup(key) {
  const [recipeId, g, i] = key.split(':');
  const recipe = recipeById.get(recipeId);
  const item = recipe?.ingredients[+g]?.items[+i];
  return item ? { recipe, item } : undefined;
}

/** All ingredient keys of a recipe. */
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

/** Lines of the viewed week's list (or of `weekStart`'s). @returns {GroceryLine[]} */
export const groceryLines = (weekStart = planner.weekStart) => buildWeek(weekStart).lines;

/** The week's ingredients kept off it because they're in stock. @returns {{ key: string, name: string, detail: string, source: string }[]} */
export const stockHiddenLines = (weekStart = planner.weekStart) => buildWeek(weekStart).hidden;

/** Whether a recipe line's ingredient is in stock. @param {string} key */
export function isOnHandKey(key) {
  const item = lookup(key)?.item;
  return Boolean(item && ingredientOf(item.id)?.onHand);
}

/** @returns {{ lines: GroceryLine[], hidden: { key: string, name: string, detail: string, source: string }[] }} */
function buildWeek(weekStart) {
  const week = readWeek(weekStart);
  const hidden = [];
  /** @type {Map<string, GroceryLine>} */
  const lines = new Map();

  /** @param {string} key @param {{ iso: string, weekday: number }} [day] */
  const addIngredient = (key, day) => {
    if (lines.has(key) || hidden.some((h) => h.key === key)) return;
    const found = lookup(key);
    if (!found) return;
    const { recipe, item } = found;
    const ingredient = ingredientOf(item.id);
    const amount =
      item.qty == null ? 'To taste' : item.unit ? `${formatQty(item.qty)} ${unitLabel(item.unit, item.qty)}` : `Qty ${formatQty(item.qty)}`;
    const detail = [amount, item.note, item.optional && 'optional'].filter(Boolean).join(' · ');
    const shopping = shoppingName(ingredient);
    const name = shopping.charAt(0).toUpperCase() + shopping.slice(1);
    const source = day ? `${formatWeekday(day.iso).slice(0, 3)}: ${recipe.shortTitle}` : recipe.shortTitle;
    if (ingredient?.onHand) {
      hidden.push({ key, name, detail, source });
      return;
    }
    lines.set(key, {
      key,
      name,
      detail,
      dept: deptOfTag(ingredient?.aisle ?? 'Pantry'),
      status: week.status[key] ?? 'need',
      source: { label: source, tone: day ? DAY_TONES[day.weekday] : 'neutral' },
      recipeId: recipe.id,
    });
  };

  for (const day of weekDinners(weekStart)) ingredientKeys(day.recipe.id).forEach((k) => addIngredient(k, day));
  week.extras.forEach((k) => addIngredient(k));
  for (const c of week.custom) {
    lines.set(c.id, {
      key: c.id,
      name: c.name,
      detail: c.note,
      dept: c.dept,
      status: week.status[c.id] ?? 'need',
      source: { label: 'Added by you', tone: 'neutral' },
      custom: true,
    });
  }
  for (const g of grocery.global) {
    // Acquired in another week: gone from this one.
    if (g.status !== 'need' && g.doneWeek !== weekStart) continue;
    lines.set(g.id, {
      key: g.id,
      name: g.name,
      detail: g.note,
      dept: g.dept,
      status: g.status,
      source: { label: 'Standing item', tone: 'neutral' },
      custom: true,
      global: true,
    });
  }
  return { lines: [...lines.values()], hidden };
}

/** Keys currently on the shopping list (to buy or already bought). */
export function groceryKeys() {
  return new Set(groceryLines().filter((l) => l.status !== 'owned').map((l) => l.key));
}

/** Items still to buy — drives the header badge. */
export const groceryCount = () => groceryLines().filter((l) => l.status === 'need').length;

/** @param {string[]} keys @returns {number} how many were newly added */
export function addToGrocery(keys) {
  const onList = groceryKeys();
  const fresh = keys.filter((k) => !onList.has(k));
  if (!fresh.length) return 0;
  const week = weekList();
  for (const key of fresh) {
    if (!week.extras.includes(key)) week.extras.push(key);
    week.status[key] = 'need';
  }
  return fresh.length;
}

/** @param {string} key @param {LineStatus} status */
export function setLineStatus(key, status) {
  const g = grocery.global.find((i) => i.id === key);
  if (g) {
    g.status = status;
    g.doneWeek = status === 'need' ? '' : planner.weekStart;
    return;
  }
  weekList().status[key] = status;
}

/** @param {{ name: string, note: string, dept: Dept }} item @param {boolean} [everyWeek] show it in every week, not just the viewed one */
export function addCustomItem(item, everyWeek = false) {
  if (everyWeek) grocery.global.push({ id: `global:${Date.now()}`, ...item, status: 'need', doneWeek: '' });
  else weekList().custom.push({ id: `custom:${Date.now()}`, ...item });
}

/** @param {string} id */
export function removeCustomItem(id) {
  if (id.startsWith('global:')) {
    grocery.global = grocery.global.filter((g) => g.id !== id);
    return;
  }
  const week = weekList();
  week.custom = week.custom.filter((c) => c.id !== id);
  delete week.status[id];
}

/** Replaces every week's list (used by Google Sheets sync). @param {Record<string, WeekList>} weeks @param {GlobalItem[]} [global] */
export function replaceGrocery(weeks, global = grocery.global) {
  grocery.weeks = weeks;
  grocery.global = global;
}
