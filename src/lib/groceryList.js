// A week's grocery list, one line per ingredient: every recipe line of the week's dinners and of recipes
// pushed from a recipe page, plus what you added yourself (for that week, or every week until bought).
// Ingredients in stock are left off (listed apart). Plain module (no runes) so it can be tested;
// grocery.svelte.js feeds it the stores.

import { shoppingName, unitLabel } from './ingredients.js';
import { formatQty } from './format.js';
import { formatWeekday, fromISO } from './dates.js';

/**
 * @typedef {'need' | 'bought'} LineStatus
 * @typedef {'produce' | 'meat' | 'dairy' | 'pantry' | 'other'} Dept
 * @typedef {{
 *   pushed: string[],
 *   status: Record<string, LineStatus>,
 *   added: Record<string, string>,
 *   stock?: string[],
 * }} WeekList
 *   `pushed`: `recipeId:ingredientId` pairs sent from a recipe page. `status` and `added` are keyed by ingredient id;
 *   `added` holds the note of an item you added for this week only. `stock` (past weeks): the ingredients left off as
 *   in stock, saved before stock last changed, so a past week's list never changes.
 * @typedef {{ ingredientId: string, note: string, status: LineStatus, doneWeek: string }} EveryWeekItem
 *   Added for every week: shows on this week and later ones until bought, then only on the week it was bought in.
 * @typedef {{ label: string, tone: string, note?: string, recipeId?: string }} LineSource
 * @typedef {{
 *   key: string,
 *   ingredientId: string,
 *   name: string,
 *   amount: string,
 *   optional: boolean,
 *   dept: Dept,
 *   status: LineStatus,
 *   sources: LineSource[],
 *   pushed: string[],
 *   added: string | undefined,
 *   every: string | undefined,
 * }} GroceryLine  `pushed`: recipe ids sent from a recipe page; `added` / `every`: the note of what you added (this week / every week)
 */

export const emptyWeek = () => /** @type {WeekList} */ ({ pushed: [], status: {}, added: {} });

/** Line key of an ingredient's line (also its `[Provisions]` Line_Key). */
export const lineKey = (ingredientId) => `ing:${ingredientId}`;

/** Ingredient id of a line key, or '' for other keys. @param {string} key */
export const ingredientOfKey = (key) => (key.startsWith('ing:') ? key.slice(4) : '');

/** Ingredient aisle tag → store department. */
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
export const deptOfTag = (tag) => /** @type {Dept} */ (TAG_DEPT[tag] ?? 'pantry');

/** Aisle tag a new ingredient gets from a store department (a row typed into the sheet). */
export const AISLE_OF_DEPT = { produce: 'Produce', meat: 'Fresh', dairy: 'Dairy', pantry: 'Pantry', other: 'Other' };

// Source-tag colors cycle by weekday so each dinner reads distinctly.
const DAY_TONES = ['neutral', 'paprika', 'sage', 'saffron', 'paprika', 'sage', 'saffron'];

/** Whether an every-week item is on week `week`'s list. @param {EveryWeekItem} item @param {string} week @param {string} thisWeek */
export const everyWeekShows = (item, week, thisWeek) =>
  item.status === 'need' ? week >= thisWeek : item.doneWeek === week;

/**
 * Amounts added up per unit, in the order they first appear: "2 lb + 2 tbsp", "3 + 1 lb" (a count has no unit).
 * Amounts without a quantity ("to taste") only show when there's nothing else.
 * @param {{ qty?: number | null, unit?: string }[]} parts
 */
export function mergeAmounts(parts) {
  /** @type {Map<string, number>} */
  const sums = new Map();
  for (const { qty, unit = '' } of parts) if (qty != null) sums.set(unit, (sums.get(unit) ?? 0) + qty);
  if (!sums.size) return parts.length ? 'to taste' : '';
  return [...sums].map(([unit, qty]) => (unit ? `${formatQty(qty)} ${unitLabel(unit, qty)}` : formatQty(qty))).join(' + ');
}

/**
 * @param {{
 *   week: string,
 *   thisWeek: string,
 *   list: WeekList,
 *   dinners: { iso: string, recipe: { id: string, shortTitle: string, ingredients: { items: import('./ingredients.js').RecipeLine[] }[] } }[],
 *   recipeOf: (id: string) => { id: string, shortTitle: string, ingredients: { items: import('./ingredients.js').RecipeLine[] }[] } | undefined,
 *   ingredientOf: (id: string) => import('./ingredients.js').Ingredient | undefined,
 *   every: EveryWeekItem[],
 * }} input
 * @returns {{ lines: GroceryLine[], hidden: GroceryLine[] }} `hidden`: lines left off because the ingredient is in stock
 */
export function buildWeekList({ week, thisWeek, list, dinners, recipeOf, ingredientOf, every }) {
  const frozen = week < thisWeek && list.stock ? new Set(list.stock) : null;
  const inStock = (id) => (frozen ? frozen.has(id) : !!ingredientOf(id)?.onHand);

  /** @type {Map<string, { amounts: { qty?: number, unit?: string }[], optional: boolean, sources: LineSource[], pushed: string[], added?: string, every?: string }>} */
  const byId = new Map();
  const entry = (id) => {
    let e = byId.get(id);
    if (!e) byId.set(id, (e = { amounts: [], optional: true, sources: [], pushed: [] }));
    return e;
  };

  /** Every line of `recipe` (or only those of `onlyId`) under one source. */
  const addRecipe = (recipe, source, onlyId) => {
    /** @type {Map<string, string[]>} ingredient id → notes */
    const seen = new Map();
    for (const group of recipe.ingredients) {
      for (const item of group.items) {
        if (onlyId && item.id !== onlyId) continue;
        const e = entry(item.id);
        e.amounts.push({ qty: item.qty, unit: item.unit });
        if (!item.optional) e.optional = false;
        const notes = seen.get(item.id);
        if (notes) {
          if (item.note) notes.push(item.note);
        } else seen.set(item.id, item.note ? [item.note] : []);
      }
    }
    for (const [id, notes] of seen) {
      entry(id).sources.push({ ...source, recipeId: recipe.id, ...(notes.length ? { note: notes.join(', ') } : {}) });
    }
  };

  const planned = new Set();
  for (const day of dinners) {
    planned.add(day.recipe.id);
    const weekday = fromISO(day.iso).getDay();
    addRecipe(day.recipe, { label: `${formatWeekday(day.iso).slice(0, 3)}: ${day.recipe.shortTitle}`, tone: DAY_TONES[weekday] });
  }
  for (const pair of list.pushed) {
    const [recipeId, ingredientId] = pair.split(':');
    const recipe = recipeOf(recipeId);
    // A pushed recipe that's also one of the week's dinners is already counted.
    if (!recipe || planned.has(recipeId)) continue;
    const before = byId.get(ingredientId)?.sources.length ?? 0;
    addRecipe(recipe, { label: recipe.shortTitle, tone: 'neutral' }, ingredientId);
    if ((byId.get(ingredientId)?.sources.length ?? 0) > before) entry(ingredientId).pushed.push(recipeId);
  }
  for (const [id, note] of Object.entries(list.added)) {
    const e = entry(id);
    e.optional = false;
    e.added = note;
    e.sources.push({ label: 'Added by you', tone: 'neutral', ...(note ? { note } : {}) });
  }
  for (const item of every) {
    if (!everyWeekShows(item, week, thisWeek)) continue;
    const e = entry(item.ingredientId);
    e.optional = false;
    e.every = item.note;
    e.sources.push({ label: 'Every week', tone: 'neutral', ...(item.note ? { note: item.note } : {}) });
  }

  const lines = [];
  const hidden = [];
  for (const [id, e] of byId) {
    const ingredient = ingredientOf(id);
    const shopping = shoppingName(ingredient);
    const boughtEvery = every.some((i) => i.ingredientId === id && i.status === 'bought' && i.doneWeek === week);
    /** @type {GroceryLine} */
    const line = {
      key: lineKey(id),
      ingredientId: id,
      name: shopping.charAt(0).toUpperCase() + shopping.slice(1),
      amount: mergeAmounts(e.amounts),
      optional: e.optional,
      dept: deptOfTag(ingredient?.aisle ?? 'Pantry'),
      status: list.status[id] ?? (boughtEvery ? 'bought' : 'need'),
      sources: e.sources,
      pushed: e.pushed,
      added: e.added,
      every: e.every,
    };
    (inStock(id) ? hidden : lines).push(line);
  }
  return { lines, hidden };
}
