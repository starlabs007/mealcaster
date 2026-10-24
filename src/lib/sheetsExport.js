// The rows of the data export (Profile → Export): every tab built with the sync codec, so the file reads back the
// way a synced sheet does. Plain module so it can be tested; sheetsTemplate.js gathers the data from the stores.

import { SCHEMA } from './schema.js';
import { ingredientToRow, planEntryHasContent, planToRow, provisionToRow, recipeToRow, settingsToRows } from './sync/codec.js';

/** @param {keyof typeof SCHEMA} tab @param {Record<string, unknown>} row the codec's row, values in the tab's column order */
const values = (tab, row) => SCHEMA[tab].map((column) => row[column]);

/**
 * @typedef {{
 *   recipes: import('./data/recipes.js').Recipe[],
 *   favorites: string[],
 *   ingredients: import('./ingredients.js').Ingredient[],
 *   plan: Record<string, import('./sync/codec.js').PlanEntry>,
 *   provisions: { week: string, line: import('./groceryList.js').GroceryLine, inStock?: boolean }[],
 *   settings: Parameters<typeof settingsToRows>[0],
 * }} ExportData
 */

/**
 * Header row and data rows of each tab, in the sheet's column order.
 * @param {ExportData} data
 * @returns {Record<keyof typeof SCHEMA, unknown[][]>}
 */
export function exportRows(data) {
  const favorites = new Set(data.favorites);
  return {
    ingredients: [SCHEMA.ingredients, ...data.ingredients.map((i) => values('ingredients', ingredientToRow(i)))],
    weeklyPlan: [
      SCHEMA.weeklyPlan,
      ...Object.entries(data.plan)
        .filter(([, entry]) => planEntryHasContent(entry))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([iso, entry]) => values('weeklyPlan', planToRow(iso, entry))),
    ],
    recipes: [SCHEMA.recipes, ...data.recipes.map((r) => values('recipes', recipeToRow(r, favorites)))],
    provisions: [
      SCHEMA.provisions,
      ...data.provisions.map(({ week, line, inStock }) => values('provisions', provisionToRow(week, line, inStock))),
    ],
    settings: [SCHEMA.settings, ...[...settingsToRows(data.settings).values()].map((row) => values('settings', row))],
  };
}

/**
 * The workbook's tabs: the export's rows under the names the person mapped, Grocery only when it syncs.
 * @param {ExportData} data
 * @param {{ tabs: Record<keyof typeof SCHEMA, string>, syncProvisions: boolean }} sheets
 */
export function exportSheets(data, { tabs, syncProvisions }) {
  const rows = exportRows(data);
  /** @type {(keyof typeof SCHEMA)[]} */
  const keys = ['ingredients', 'weeklyPlan', 'recipes', ...(syncProvisions ? /** @type {const} */ (['provisions']) : []), 'settings'];
  return keys.map((key) => ({ name: tabs[key].trim(), rows: rows[key] }));
}
