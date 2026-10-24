// .xlsx workbooks with MealCaster's tabs: the data export (Profile), pre-filled with what's saved
// on this device so it works as a backup or an import into Google Sheets, and the empty template
// (connection step 2) with only the header rows.

import { recipes } from './recipes.svelte.js';
import { ingredients } from './ingredients.svelte.js';
import { planner } from './planner.svelte.js';
import { favorites } from './favorites.svelte.js';
import { groceryLines, stockHiddenLines } from './grocery.svelte.js';
import { SCHEMA } from './sheets.svelte.js';
import { settings as profile } from './settings.svelte.js';
import { buildXlsx } from './xlsx.js';
import { exportSheets } from './sheetsExport.js';

/** @param {import('./sheets.svelte.js').SheetsSettings} settings */
export function dataWorkbook(settings) {
  return buildXlsx(
    exportSheets(
      {
        recipes: recipes,
        favorites: favorites.ids,
        ingredients: ingredients,
        plan: planner.entries,
        // The viewed week's list, as before.
        provisions: [
          ...groceryLines().map((line) => ({ week: planner.weekStart, line })),
          ...stockHiddenLines().map((line) => ({ week: planner.weekStart, line, inStock: true })),
        ],
        settings: profile,
      },
      settings,
    ),
  );
}

/**
 * Empty template: each synced tab with only its header row, to upload to Google Drive and
 * choose as the spreadsheet.
 * @param {Pick<import('./sheets.svelte.js').SheetsSettings, 'tabs' | 'syncProvisions'>} settings
 */
export function emptyWorkbook(settings) {
  const keys = /** @type {(keyof typeof SCHEMA)[]} */ (['ingredients', 'weeklyPlan', 'recipes', ...(settings.syncProvisions ? ['provisions'] : []), 'settings']);
  return buildXlsx(keys.map((key) => ({ name: settings.tabs[key].trim(), rows: [SCHEMA[key]] })));
}
