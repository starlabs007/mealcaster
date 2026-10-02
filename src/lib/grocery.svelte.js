// Quick Grocery & Provisions list, one per week (mirrors a [Provisions] sheet tab).
//
// Lines come from three sources:
//  1. Automatic — every ingredient of the week's upcoming dinners. Staples
//     (oil, salt, spices) start out "owned" so they sit in the On Hand ledger.
//  2. Pushed — ingredients sent from a Recipe Detail page ("Add to List" /
//     "Push Unchecked to Grocery"), even for recipes not on the plan.
//  3. Custom — free-text items added on the grocery screen.
//
// Each line is 'need' (to buy), 'bought' (checked off) or 'owned' (already on hand).
// Ingredient keys are `${recipeId}:${groupIndex}:${itemIndex}`.

import { recipeById } from './recipes.svelte.js';
import { planner, currentWeek } from './planner.svelte.js';
import { formatQty } from './format.js';
import { formatWeekday } from './dates.js';
import { departments } from './data/departments.js';
import { storageKey } from './env.js';
import { rekeyGroceryWeeks } from './sync/codec.js';

const STORAGE_KEY = storageKey('grocery.v2');
const LEGACY_KEY = storageKey('groceryExtras.v1');

/**
 * @typedef {'need' | 'bought' | 'owned'} LineStatus
 * @typedef {'produce' | 'meat' | 'dairy' | 'pantry' | 'other'} Dept
 * @typedef {{ id: string, name: string, note: string, dept: Dept }} CustomItem
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

// Source-tag colors cycle by weekday so each dinner reads distinctly.
const DAY_TONES = ['neutral', 'paprika', 'sage', 'saffron', 'paprika', 'sage', 'saffron'];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return rekeyGroceryWeeks(JSON.parse(raw));
    // Migrate v1 (a flat list of pushed keys) into the current week.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const extras = JSON.parse(legacy);
      const status = Object.fromEntries(extras.map((k) => [k, 'need']));
      return { [planner.weekStart]: { extras, status, custom: [] } };
    }
  } catch {
    // Start empty.
  }
  return {};
}

/** @type {{ weeks: Record<string, WeekList> }} */
export const grocery = $state({ weeks: load() });

$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(grocery.weeks);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {
      // In-memory only.
    }
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

/** Lines of the viewed week's list (or of `weekStart`'s). @returns {GroceryLine[]} */
export function groceryLines(weekStart = planner.weekStart) {
  const week = readWeek(weekStart);
  /** @type {Map<string, GroceryLine>} */
  const lines = new Map();

  /** @param {string} key @param {{ iso: string, weekday: number }} [day] */
  const addIngredient = (key, day) => {
    if (lines.has(key)) return;
    const found = lookup(key);
    if (!found) return;
    const { recipe, item } = found;
    const amount =
      item.qty == null ? 'To taste' : item.unit ? `${formatQty(item.qty)} ${item.unit}` : `Qty ${formatQty(item.qty)}`;
    lines.set(key, {
      key,
      name: item.text.charAt(0).toUpperCase() + item.text.slice(1),
      detail: amount,
      dept: TAG_DEPT[item.tag] ?? 'pantry',
      status: week.status[key] ?? (item.staple ? 'owned' : 'need'),
      source: day
        ? { label: `${formatWeekday(day.iso).slice(0, 3)}: ${recipe.shortTitle}`, tone: DAY_TONES[day.weekday] }
        : { label: recipe.shortTitle, tone: 'neutral' },
      recipeId: recipe.id,
    });
  };

  for (const day of currentWeek(weekStart)) {
    if (day.status === 'planned' && day.recipe) ingredientKeys(day.recipe.id).forEach((k) => addIngredient(k, day));
  }
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
  return [...lines.values()];
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
  weekList().status[key] = status;
}

/** @param {{ name: string, note: string, dept: Dept }} item */
export function addCustomItem(item) {
  weekList().custom.push({ id: `custom:${Date.now()}`, ...item });
}

/** @param {string} id */
export function removeCustomItem(id) {
  const week = weekList();
  week.custom = week.custom.filter((c) => c.id !== id);
  delete week.status[id];
}

/** Replaces every week's list (used by Google Sheets sync). @param {Record<string, WeekList>} weeks */
export function replaceGrocery(weeks) {
  grocery.weeks = weeks;
}
