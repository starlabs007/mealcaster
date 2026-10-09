// .xlsx workbooks with MealCaster's tabs: the data export (Profile), pre-filled with what's saved
// on this device so it works as a backup or an import into Google Sheets, and the empty template
// (connection step 2) with only the header rows.

import { recipes } from './recipes.svelte.js';
import { ingredients } from './ingredients.svelte.js';
import { planner } from './planner.svelte.js';
import { favorites } from './favorites.svelte.js';
import { departments, groceryLines } from './grocery.svelte.js';
import { formatWeekday } from './dates.js';
import { SCHEMA } from './sheets.svelte.js';
import { settings as profile } from './settings.svelte.js';
import { ingredientToRow, settingsToRows } from './sync/codec.js';
import { buildXlsx } from './xlsx.js';

const STATUS_LABEL = { need: 'To buy', bought: 'Bought', owned: 'On hand' };

/** @param {import('./sheets.svelte.js').SheetsSettings} settings */
export function dataWorkbook(settings) {
  const recipeRows = recipes.map((r) => [
    r.id,
    r.title,
    r.description,
    JSON.stringify(r.ingredients),
    r.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`).join('\n'),
    // Uploaded photos are data: URLs that only live on this device.
    r.image?.startsWith('data:') ? '' : (r.image ?? ''),
    r.tags.join(', '),
    favorites.ids.includes(r.id),
    r.badge.label,
    r.serves,
    r.prepMinutes,
    r.cookMinutes,
    r.notes ?? '',
  ]);

  const planRows = Object.entries(planner.entries)
    .filter(([, e]) => e.recipeId || e.diningOut)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, e]) => [
      iso,
      formatWeekday(iso),
      e.recipeId ?? '',
      Boolean(e.completed),
      e.diningOut ? 'Dining out' : '',
    ]);

  const deptLabel = Object.fromEntries(departments.map((d) => [d.id, d.short]));
  const provisionRows = groceryLines().map((l) => [
    planner.weekStart,
    l.name,
    l.detail,
    deptLabel[l.dept],
    STATUS_LABEL[l.status],
    l.source.label,
  ]);

  const ingredientRows = ingredients.map((i) => {
    const row = ingredientToRow(i);
    return SCHEMA.ingredients.map((c) => row[c]);
  });

  const sheets = [
    { name: settings.tabs.ingredients.trim(), rows: [SCHEMA.ingredients, ...ingredientRows] },
    { name: settings.tabs.weeklyPlan.trim(), rows: [SCHEMA.weeklyPlan, ...planRows] },
    { name: settings.tabs.recipes.trim(), rows: [SCHEMA.recipes, ...recipeRows] },
  ];
  if (settings.syncProvisions) {
    sheets.push({ name: settings.tabs.provisions.trim(), rows: [SCHEMA.provisions, ...provisionRows] });
  }
  const settingRows = [...settingsToRows(profile).values()].map((r) => SCHEMA.settings.map((c) => r[c]));
  sheets.push({ name: settings.tabs.settings.trim(), rows: [SCHEMA.settings, ...settingRows] });
  return buildXlsx(sheets);
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
