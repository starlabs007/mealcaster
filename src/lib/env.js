// Dev data comes from the `virtual:sample-data` plugin in vite.config.js:
//   npm run dev        → generated sample recipes, ingredients, plan, favorites and grocery extras
//                        (SAMPLE_COUNT, default 60; SAMPLE_SEED, default 1)
//   npm run dev:empty  → starts empty, like production (same as SAMPLE_COUNT=0)
//   npm run build      → production, never any sample data

import { sampleKey } from 'virtual:sample-data';
import { DEVICE_DATA, OLD_DATA } from './storageKeys.js';

/** localStorage key, e.g. storageKey('weeklyPlan.v2'). */
export const storageKey = (name) => `mealcaster.${name}`;

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
