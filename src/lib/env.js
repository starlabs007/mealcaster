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
  'recipeBox.v1',
  'customRecipes.v1',
  'weeklyPlan.v1',
  'favorites.v1',
  'grocery.v2',
  'groceryExtras.v1',
  'recipeDraft.v1',
  'syncBase.v1',
];

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
