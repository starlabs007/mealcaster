// Profile settings that travel with the household and sync to the [Settings] tab of the
// Google Sheet: today, the person's own ingredient → aisle mappings. (Per-device preferences
// such as print options live in their own stores and are never synced.)

import { storageKey } from './env.js';
import { mappingKey, tidyName, withMapping } from './aisleMap.js';

const STORAGE_KEY = storageKey('settings.v1');

/** @typedef {import('./aisleMap.js').AisleMapping} AisleMapping */

/** @returns {{ aisles: AisleMapping[] }} */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.aisles)) {
      return {
        aisles: saved.aisles
          .filter((m) => m && typeof m.name === 'string' && typeof m.tag === 'string' && tidyName(m.name))
          .map((m) => ({ name: tidyName(m.name), tag: m.tag })),
      };
    }
  } catch {
    // Start empty.
  }
  return { aisles: [] };
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

/** Replaces every mapping (used by Google Sheets sync). @param {AisleMapping[]} aisles */
export function replaceAisleMappings(aisles) {
  settings.aisles = aisles;
}
