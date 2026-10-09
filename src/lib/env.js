/* global __SAMPLE_DATA__ */
// Build flavour, set in vite.config.js:
//   npm run dev        → sample recipes, plan and favorites
//   npm run dev:empty  → starts empty, like production
//   npm run build      → production, never any sample data

/** Whether the sample recipes, plan and favorites are built in. */
export const sampleData = __SAMPLE_DATA__;

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
  'grocery.v3',
  'groceryGlobal.v2',
  'settings.v2',
  'recipeDraft.v2',
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
// so its localStorage is never visible here anyway.
if (import.meta.env.DEV) {
  const MARK = storageKey('devDataMode');
  const mode = sampleData ? 'sample' : 'empty';
  try {
    // No mark yet means the data came from the sample mode (older dev builds).
    if ((localStorage.getItem(MARK) ?? 'sample') !== mode) {
      for (const key of DEVICE_DATA) localStorage.removeItem(storageKey(key));
      console.info(`[MealCaster] Switched to ${mode === 'empty' ? 'npm run dev:empty' : 'npm run dev'} — cleared this device’s saved data.`);
    }
    localStorage.setItem(MARK, mode);
  } catch {
    // Storage unavailable: nothing saved to clear.
  }
}
