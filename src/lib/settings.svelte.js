// Profile settings that travel with the household and sync to the [Settings] tab of the
// Google Sheet: the person's ingredient → aisle mappings, and whether choosing a meal in the
// catalog returns to the planner. (Per-device preferences such as print options live in their
// own stores and are never synced.)

import { storageKey } from './env.js';
import { mappingKey, tidyName, withMapping } from './aisleMap.js';

const STORAGE_KEY = storageKey('settings.v1');

/** @typedef {import('./aisleMap.js').AisleMapping} AisleMapping */

/** @returns {{ aisles: AisleMapping[], returnToPlanner: boolean }} */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.aisles)) {
      return {
        returnToPlanner: saved.returnToPlanner !== false,
        aisles: saved.aisles
          .filter((m) => m && typeof m.name === 'string' && typeof m.tag === 'string' && tidyName(m.name))
          .map((m) => ({ name: tidyName(m.name), tag: m.tag })),
      };
    }
  } catch {
    // Start empty.
  }
  return { aisles: [], returnToPlanner: true };
}

export const settings = $state(load());

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

/** Whether choosing a meal in the catalog goes back to the planner (otherwise a toast confirms it). @param {boolean} on */
export function setReturnToPlanner(on) {
  settings.returnToPlanner = on;
}

/** Replaces the synced settings (used by Google Sheets sync). @param {{ aisles: AisleMapping[], returnToPlanner: boolean }} next */
export function replaceSettings(next) {
  settings.aisles = next.aisles;
  settings.returnToPlanner = next.returnToPlanner;
}
