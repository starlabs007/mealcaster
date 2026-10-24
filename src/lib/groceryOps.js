// Edits to the stored grocery lists, as plain functions on `{ weeks, every }` (the store's state, or any object of that
// shape). They change it in place, like the store did. grocery.svelte.js adds the saving and the stores they need;
// groceryList.js does the merging into lines.

import { emptyWeek, everyWeekShows } from './groceryList.js';

/** @typedef {{ weeks: Record<string, import('./groceryList.js').WeekList>, every: import('./groceryList.js').EveryWeekItem[] }} GroceryState */

// ---- Recipe line keys ---------------------------------------------------------

/** All line keys of a recipe: `recipeId:group:item`. @param {{ id: string, ingredients: { items: unknown[] }[] }} recipe */
export const lineKeysOf = (recipe) => recipe.ingredients.flatMap((group, g) => group.items.map((_, i) => `${recipe.id}:${g}:${i}`));

/** @param {string} key a recipe line key @returns {{ recipeId: string, group: number, item: number }} */
export function parseLineKey(key) {
  const [recipeId, g, i] = key.split(':');
  return { recipeId, group: +g, item: +i };
}

/**
 * Recipe line keys of recipes that have a line on `lines` for the same ingredient (the key says which ingredient only
 * through its recipe, so a line counts for every line of that recipe using that ingredient).
 * @param {{ ingredientId: string, sources: { recipeId?: string }[] }[]} lines the week's lines
 * @param {(recipeId: string) => string[]} keysOf line keys of a recipe
 * @param {(key: string) => string | undefined} ingredientIdOf ingredient a recipe line key points at
 */
export function listedLineKeys(lines, keysOf, ingredientIdOf) {
  const pairs = new Set();
  for (const line of lines) for (const s of line.sources) if (s.recipeId) pairs.add(`${s.recipeId}:${line.ingredientId}`);
  const keys = new Set();
  for (const pair of pairs) {
    const recipeId = pair.slice(0, pair.indexOf(':'));
    for (const key of keysOf(recipeId)) if (`${recipeId}:${ingredientIdOf(key)}` === pair) keys.add(key);
  }
  return keys;
}

// ---- Edits ----------------------------------------------------------------------

/** The week's list, created on first write. @param {GroceryState} state @param {string} week */
export const weekListOf = (state, week) => (state.weeks[week] ??= emptyWeek());

/**
 * Puts recipe lines on the week's list ("Add to List").
 * @param {GroceryState} state @param {string} week
 * @param {{ key: string, recipeId: string, ingredientId: string }[]} lines the lines that exist (unknown keys left out by the caller)
 * @param {Set<string>} onList line keys already on the week's list
 * @returns {number} how many ingredients were newly added
 */
export function pushLines(state, week, lines, onList) {
  const list = weekListOf(state, week);
  const fresh = new Set();
  for (const { key, recipeId, ingredientId } of lines) {
    if (onList.has(key)) continue;
    const pair = `${recipeId}:${ingredientId}`;
    if (list.pushed.includes(pair)) continue;
    list.pushed.push(pair);
    list.status[ingredientId] = 'need';
    fresh.add(ingredientId);
  }
  return fresh.size;
}

/**
 * Marks an ingredient's line on `week` bought, to buy or skipped. An every-week item that shows on that week follows
 * (bought or to buy); a skip is for the week only, so the every-week item stays to buy and shows again next week.
 * @param {GroceryState} state @param {string} week @param {string} thisWeek
 * @param {string} ingredientId @param {import('./groceryList.js').LineStatus} status
 */
export function setStatus(state, week, thisWeek, ingredientId, status) {
  weekListOf(state, week).status[ingredientId] = status;
  if (status === 'skipped') return;
  for (const item of state.every) {
    if (item.ingredientId !== ingredientId || !everyWeekShows(item, week, thisWeek)) continue;
    item.status = status;
    item.doneWeek = status === 'need' ? '' : week;
  }
}

/**
 * Adds an ingredient by hand, for `week` only or every week until bought. (The caller takes it off the at-home list:
 * adding it means you need it.)
 * @param {GroceryState} state @param {string} week @param {string} ingredientId @param {string} note @param {boolean} everyWeek
 */
export function addByHand(state, week, ingredientId, note, everyWeek) {
  if (everyWeek) {
    const existing = state.every.find((i) => i.ingredientId === ingredientId);
    if (existing) Object.assign(existing, { note, status: 'need', doneWeek: '' });
    else state.every.push({ ingredientId, note, status: 'need', doneWeek: '' });
  } else {
    weekListOf(state, week).added[ingredientId] = note;
  }
  weekListOf(state, week).status[ingredientId] = 'need';
}

/**
 * Removes what you added of an ingredient: the week's own item, and its every-week item (from every week).
 * @param {GroceryState} state @param {string} week @param {string} ingredientId
 * @returns {() => void} undo
 */
export function removeAdded(state, week, ingredientId) {
  const list = state.weeks[week];
  const hadNote = list && ingredientId in list.added;
  const note = hadNote ? list.added[ingredientId] : undefined;
  const everyBefore = state.every;
  if (list) delete list.added[ingredientId];
  state.every = state.every.filter((i) => i.ingredientId !== ingredientId);
  return () => {
    if (hadNote) weekListOf(state, week).added[ingredientId] = note;
    state.every = everyBefore;
  };
}

/**
 * Saves, for each past week without one yet, which ingredients it left off as in stock — called just before stock
 * changes, so a past week's list stays as it was. Weeks with neither a dinner nor saved changes are left alone.
 * @param {GroceryState} state @param {string} thisWeek
 * @param {string[]} planWeeks start of every week the plan has a day in
 * @param {(week: string) => boolean} hasDinners whether the week has a dinner whose ingredients go on the list
 * @param {(week: string) => string[]} stockedIds ingredient ids the week's list leaves off as in stock right now
 */
export function freezePast(state, thisWeek, planWeeks, hasDinners, stockedIds) {
  for (const week of new Set([...Object.keys(state.weeks), ...planWeeks])) {
    if (week >= thisWeek || state.weeks[week]?.stock) continue;
    if (!hasDinners(week) && !state.weeks[week]) continue;
    weekListOf(state, week).stock = stockedIds(week);
  }
}

/** The status when two marks of an ingredient meet (a merge): still to buy wins, then bought. @param {string | undefined} a @param {string | undefined} b */
const mergedStatus = (a, b) => ([a, b].includes('need') ? 'need' : [a, b].includes('bought') ? 'bought' : 'skipped');

/**
 * Moves every grocery mark of ingredient `from` onto `to` (two ingredients merged), or drops them when `to` is ''
 * (an ingredient deleted). Where both have one, what's still to buy wins and notes are joined.
 * @param {GroceryState} state @param {string} from @param {string} to
 */
export function relink(state, from, to) {
  const swap = (/** @type {string} */ id) => (id === from ? to : id);
  for (const list of Object.values(state.weeks)) {
    list.pushed = [
      ...new Set(
        list.pushed
          .map((pair) => {
            const [recipeId, id] = pair.split(':');
            return id === from ? (to ? `${recipeId}:${to}` : '') : pair;
          })
          .filter(Boolean),
      ),
    ];
    if (from in list.status) {
      if (to) list.status[to] = mergedStatus(list.status[to], list.status[from]);
      delete list.status[from];
    }
    if (from in list.added) {
      if (to) list.added[to] = [list.added[to], list.added[from]].filter(Boolean).join(', ');
      delete list.added[from];
    }
    if (list.stock) list.stock = [...new Set(list.stock.map(swap).filter(Boolean))];
  }
  const kept = state.every.find((i) => i.ingredientId === to);
  state.every = state.every.filter((i) => i.ingredientId !== from || (to && !kept));
  for (const item of state.every) if (item.ingredientId === from) item.ingredientId = to;
}
