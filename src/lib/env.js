// Dev data comes from the `virtual:sample-data` plugin in vite.config.js:
//   npm run dev        → generated sample recipes, ingredients, plan, favorites and grocery extras
//                        (SAMPLE_COUNT, default 60; SAMPLE_SEED, default 1)
//   npm run dev:empty  → starts empty, like production (same as SAMPLE_COUNT=0)
//   npm run build      → production, never any sample data

import { sampleKey } from 'virtual:sample-data';

/** localStorage key, e.g. storageKey('weeklyPlan.v1'). */
export const storageKey = (name) => `mealcaster.${name}`;

// Saved device data, cleared when switching dev modes. Sheets settings (linked
// spreadsheet, tab names, column mapping) are kept. The sync base must go with
// the data: kept on its own, the next sync would read the empty device as
// "everything was deleted here" and delete the rows from the sheet. Without
// it, the next sync is a first sync and simply brings the sheet's data back.
const DEVICE_DATA = [
  'ingredients.v1',
  'recipeBox.v2',
  'weeklyPlan.v2',
  'favorites.v2',
  'grocery.v4',
  'groceryEvery.v1',
  'settings.v2',
  'recipeDraft.v2',
  'recipeEditDrafts.v1',
  'recipePrep.v1',
  'syncBase.v2',
];

// Data saved before schema version 2 (ingredients in their own tab). Nothing reads it any more, so
// it's removed on load: it would only use up the origin's shared storage. A device starts empty and
// takes the converted spreadsheet on its next first sync (the old sync base goes too, so its rows
// are never mistaken for deletions).
const OLD_DATA = [
  'recipeBox.v1',
  'customRecipes.v1',
  'weeklyPlan.v1',
  'favorites.v1',
  'grocery.v2',
  'groceryExtras.v1',
  'groceryGlobal.v1',
  // Per-recipe-line grocery lists of the first v2 builds (before lines merged by ingredient).
  'grocery.v3',
  'groceryGlobal.v2',
  'settings.v1',
  'tagColors.v1',
  'recipeDraft.v1',
  'syncBase.v1',
];
try {
  for (const key of OLD_DATA) localStorage.removeItem(storageKey(key));
} catch {
  // Storage unavailable: nothing to remove.
}

// Dev only (dropped from production builds). Production runs on its own origin,
// so its localStorage is never visible here anyway. The mark names the sample data the device's saved
// data started from (`sampleKey`, or 'empty'); when the data changes (another seed or count, a new
// generator version, dev ↔ dev:empty), the saved data is cleared so it matches. Old builds marked
// 'sample' for the hand-written samples, which counts as a change too.
if (import.meta.env.DEV) {
  const MARK = storageKey('devDataMode');
  const mode = sampleKey || 'empty';
  try {
    // No mark yet means the data came from the old sample mode.
    if ((localStorage.getItem(MARK) ?? 'sample') !== mode) {
      for (const key of DEVICE_DATA) localStorage.removeItem(storageKey(key));
      console.info(`[MealCaster] ${describe(mode)} — cleared this device’s saved data.`);
    }
    localStorage.setItem(MARK, mode);
  } catch {
    // Storage unavailable: nothing saved to clear.
  }
}

/** "Sample data changed (seed 1, 60 recipes)" or "Switched to npm run dev:empty". @param {string} mode */
function describe(mode) {
  if (mode === 'empty') return 'Switched to npm run dev:empty (no sample data)';
  const [, seed, count] = mode.split(':');
  return `Sample data changed (seed ${seed}, ${count} recipes)`;
}
