// The device side of a sync pass, as plain functions: which rows a tab sends, and what device data a merged tab becomes.
// run.js merges rows; sync.svelte.js hands these the stores' data (as plain copies) and puts the results back.

import {
  groceryFromRows,
  ingredientFromRow,
  ingredientToRow,
  planEntryHasContent,
  planFromRow,
  planToRow,
  provisionKey,
  provisionToRow,
  recipeFromRow,
  recipeToRow,
} from './codec.js';

// ---- Rows the device sends ----------------------------------------------------

/** @param {import('../ingredients.js').Ingredient[]} ingredients */
export const ingredientRows = (ingredients) => new Map(ingredients.map((i) => [i.id, ingredientToRow(i)]));

/** @param {import('../data/recipes.js').Recipe[]} recipes @param {Iterable<string>} favoriteIds */
export function recipeRows(recipes, favoriteIds) {
  const favorites = new Set(favoriteIds);
  return new Map(recipes.map((r) => [r.id, recipeToRow(r, favorites)]));
}

/** Days with something in them, in date order. @param {Record<string, import('./codec.js').PlanEntry>} entries */
export const planRows = (entries) =>
  new Map(
    Object.entries(entries)
      .filter(([, e]) => planEntryHasContent(e))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, e]) => [iso, planToRow(iso, e)]),
  );

/**
 * One row per grocery line of each synced week; lines left off because the ingredient is in stock go as At home.
 * @param {{ week: string, lines: import('../groceryList.js').GroceryLine[], hidden: import('../groceryList.js').GroceryLine[] }[]} weeks
 */
export function provisionRows(weeks) {
  const rows = new Map();
  for (const { week, lines, hidden } of weeks) {
    for (const line of lines) rows.set(provisionKey(week, line.key), provisionToRow(week, line));
    for (const line of hidden) rows.set(provisionKey(week, line.key), provisionToRow(week, line, true));
  }
  return rows;
}

// ---- Device data after a merge ----------------------------------------------

// In each: `final` is the merged rows, `fromSheet` the keys whose row came from the sheet. A row only the device has
// is kept as it is; a row from the sheet is read with the device's version as the base (so details the sheet can't
// hold survive); a key missing from `final` is gone.

/**
 * @param {{ final: Map<string, any>, fromSheet: Set<string>, existing: import('../ingredients.js').Ingredient[], columns: string[] }} input
 * @returns {import('../ingredients.js').Ingredient[]}
 */
export function applyIngredients({ final, fromSheet, existing, columns }) {
  const byId = new Map(existing.map((i) => [i.id, i]));
  const list = [];
  for (const [id, row] of final) {
    if (!fromSheet.has(id)) {
      if (byId.has(id)) list.push(byId.get(id));
      continue;
    }
    list.push(ingredientFromRow(row, byId.get(id), columns));
  }
  return list;
}

/**
 * @param {{ final: Map<string, any>, fromSheet: Set<string>, existing: import('../data/recipes.js').Recipe[], favorites: string[], columns: string[], today: string }} input
 * @returns {{ recipes: import('../data/recipes.js').Recipe[], favorites: string[] }}
 */
export function applyRecipes({ final, fromSheet, existing, favorites, columns, today }) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const favs = new Set(favorites);
  const nextFavs = [];
  const recipes = [];
  for (const [id, row] of final) {
    if (!fromSheet.has(id)) {
      if (byId.has(id)) recipes.push(byId.get(id));
      if (favs.has(id)) nextFavs.push(id);
      continue;
    }
    const { recipe, favorite } = recipeFromRow(row, byId.get(id), { columns, favorites: favs, today });
    recipes.push(recipe);
    if (favorite ?? favs.has(id)) nextFavs.push(id);
  }
  return { recipes, favorites: nextFavs };
}

/**
 * @param {{ final: Map<string, any>, fromSheet: Set<string>, entries: Record<string, import('./codec.js').PlanEntry>, columns: string[] }} input
 * @returns {Record<string, import('./codec.js').PlanEntry>}
 */
export function applyPlan({ final, fromSheet, entries, columns }) {
  const next = {};
  for (const [iso, row] of final) {
    const entry = fromSheet.has(iso) ? planFromRow(row, entries[iso], columns) : entries[iso];
    if (entry) next[iso] = entry;
  }
  return next;
}

/**
 * Grocery lists from the merged rows. Weeks older than `since` are not synced: they keep their lists, and an
 * every-week item bought back then stays bought there (unless the sheet has it).
 * @param {{
 *   final: Map<string, any>, since: string, thisWeek: string,
 *   idForName: (name: string, dept: string) => string,
 *   weeks: Record<string, import('../groceryList.js').WeekList>, every: import('../groceryList.js').EveryWeekItem[],
 * }} input
 */
export function applyGrocery({ final, since, thisWeek, idForName, weeks: current, every: currentEvery }) {
  const { weeks, every } = groceryFromRows([...final.values()], { thisWeek, idForName });
  for (const [week, list] of Object.entries(current)) if (week < since) weeks[week] = list;
  for (const item of currentEvery) {
    if (item.status !== 'need' && item.doneWeek < since && !every.some((x) => x.ingredientId === item.ingredientId)) every.push(item);
  }
  return { weeks, every };
}
