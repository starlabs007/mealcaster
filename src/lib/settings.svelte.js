// Profile settings that travel with the household and sync to the [Settings] tab of the Google
// Sheet: tag colours, the week start day and whether choosing a meal in the catalog returns to the
// planner. (Ingredients and their stock are their own tab; per-device preferences such as print
// options live in their own stores and are never synced.)

import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { DEFAULT_WEEK_START_DAY, setWeekStartDay as applyWeekStartDay } from './dates.js';
import { TONES } from './tags.js';

const STORAGE_KEY = storageKey('settings.v2');

/** @typedef {{ tagColors: Record<string, string>, returnToPlanner: boolean, weekStartDay: number }} Settings */

/** @returns {Settings} */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      return {
        returnToPlanner: saved.returnToPlanner !== false,
        weekStartDay: validDay(saved.weekStartDay),
        tagColors: tones(saved.tagColors),
      };
    }
  } catch {
    // Start empty.
  }
  return { tagColors: {}, returnToPlanner: true, weekStartDay: DEFAULT_WEEK_START_DAY };
}

/** Keeps the entries with a known tone. @param {unknown} map @returns {Record<string, string>} */
const tones = (map) =>
  map && typeof map === 'object' ? Object.fromEntries(Object.entries(map).filter(([tag, tone]) => tag && TONES.includes(tone))) : {};

const validDay = (d) => (Number.isInteger(d) && d >= 0 && d <= 6 ? d : DEFAULT_WEEK_START_DAY);

export const settings = $state(load());
applyWeekStartDay(settings.weekStartDay);

$effect.root(() => {
  $effect(() => {
    // In memory only if it doesn't fit (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(settings));
  });
});

/** Whether choosing a meal in the catalog goes back to the planner (otherwise a toast confirms it). @param {boolean} on */
export function setReturnToPlanner(on) {
  settings.returnToPlanner = on;
}

/** The weekday weeks start on, 0 (Sunday) – 6 (Saturday). Re-key the plan and grocery weeks afterwards (`weekStart.svelte.js`). @param {number} day */
export function setWeekStartDay(day) {
  settings.weekStartDay = validDay(day);
  applyWeekStartDay(settings.weekStartDay);
}

/** Replaces the synced settings (used by Google Sheets sync). @param {Omit<Settings, 'tagColors'> & Partial<Settings>} next */
export function replaceSettings(next) {
  settings.tagColors = next.tagColors ?? {};
  settings.returnToPlanner = next.returnToPlanner;
  setWeekStartDay(next.weekStartDay);
}
