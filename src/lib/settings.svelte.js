// Profile settings that travel with the household and sync to the [Settings] tab of the
// Google Sheet: the person's ingredient → aisle mappings, and whether choosing a meal in the
// catalog returns to the planner. (Per-device preferences such as print options live in their
// own stores and are never synced.)

import { storageKey } from './env.js';
import { mappingKey, tidyName, withMapping } from './aisleMap.js';
import { withHave, withoutHave } from './haveList.js';
import { DEFAULT_WEEK_START_DAY, setWeekStartDay as applyWeekStartDay } from './dates.js';

const STORAGE_KEY = storageKey('settings.v1');

/** @typedef {import('./aisleMap.js').AisleMapping} AisleMapping */

/** @returns {{ aisles: AisleMapping[], have: string[], returnToPlanner: boolean, weekStartDay: number }} */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.aisles)) {
      return {
        returnToPlanner: saved.returnToPlanner !== false,
        weekStartDay: validDay(saved.weekStartDay),
        have: names(saved.have),
        aisles: saved.aisles
          .filter((m) => m && typeof m.name === 'string' && typeof m.tag === 'string' && tidyName(m.name))
          .map((m) => ({ name: tidyName(m.name), tag: m.tag })),
      };
    }
  } catch {
    // Start empty.
  }
  return { aisles: [], have: [], returnToPlanner: true, weekStartDay: DEFAULT_WEEK_START_DAY };
}

const names = (list) => (Array.isArray(list) ? list.filter((n) => typeof n === 'string' && tidyName(n)).map(tidyName) : []);

const validDay = (d) => (Number.isInteger(d) && d >= 0 && d <= 6 ? d : DEFAULT_WEEK_START_DAY);

export const settings = $state(load());
applyWeekStartDay(settings.weekStartDay);

$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(settings);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {
      // In-memory only.
    }
  });
});

/** Adds a mapping, or changes the aisle of one with the same name. @param {string} name @param {string} tag */
export function setAisleMapping(name, tag) {
  settings.aisles = withMapping($state.snapshot(settings.aisles), name, tag);
}

/** @param {string} name */
export function removeAisleMapping(name) {
  settings.aisles = settings.aisles.filter((m) => mappingKey(m.name) !== mappingKey(name));
}

/** Marks an ingredient as one you always have (off the grocery list) or not. @param {string} name @param {boolean} on */
export function setHave(name, on) {
  const have = $state.snapshot(settings.have);
  settings.have = on ? withHave(have, name) : withoutHave(have, name);
}

/** Whether choosing a meal in the catalog goes back to the planner (otherwise a toast confirms it). @param {boolean} on */
export function setReturnToPlanner(on) {
  settings.returnToPlanner = on;
}

/** The weekday weeks start on, 0 (Sunday) – 6 (Saturday). Re-key the plan and grocery weeks afterwards (`weekStart.svelte.js`). @param {number} day */
export function setWeekStartDay(day) {
  settings.weekStartDay = validDay(day);
  applyWeekStartDay(settings.weekStartDay);
}

/** Replaces the synced settings (used by Google Sheets sync). @param {{ aisles: AisleMapping[], have?: string[], returnToPlanner: boolean, weekStartDay: number }} next */
export function replaceSettings(next) {
  settings.aisles = next.aisles;
  settings.have = next.have ?? [];
  settings.returnToPlanner = next.returnToPlanner;
  setWeekStartDay(next.weekStartDay);
}
