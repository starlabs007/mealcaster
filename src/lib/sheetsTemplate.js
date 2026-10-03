// Starter spreadsheet: the PRD tabs with headers, pre-filled with what's saved
// on this device so importing it into Google Sheets carries the data across.

import { recipes } from './recipes.svelte.js';
import { planner } from './planner.svelte.js';
import { favorites } from './favorites.svelte.js';
import { departments, groceryLines } from './grocery.svelte.js';
import { formatWeekday } from './dates.js';
import { SCHEMA } from './sheets.svelte.js';
import { settings as profile } from './settings.svelte.js';
import { settingsToRows } from './sync/codec.js';
import { buildXlsx } from './xlsx.js';

const STATUS_LABEL = { need: 'To buy', bought: 'Bought', owned: 'On hand' };

/** @param {import('./sheets.svelte.js').SheetsSettings} settings */
export function starterWorkbook(settings) {
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

  const sheets = [
    { name: settings.tabs.weeklyPlan.trim(), rows: [SCHEMA.weeklyPlan, ...planRows] },
    { name: settings.tabs.recipes.trim(), rows: [SCHEMA.recipes, ...recipeRows] },
  ];
  if (settings.syncProvisions) {
    sheets.push({ name: settings.tabs.provisions.trim(), rows: [SCHEMA.provisions, ...provisionRows] });
  }
  const settingRows = [...settingsToRows($state.snapshot(profile)).values()].map((r) => SCHEMA.settings.map((c) => r[c]));
  sheets.push({ name: settings.tabs.settings.trim(), rows: [SCHEMA.settings, ...settingRows] });
  return buildXlsx(sheets);
}
