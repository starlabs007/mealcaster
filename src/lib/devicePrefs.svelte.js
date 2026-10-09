// Small display preferences remembered on this device only (never synced).

import { storageKey } from './env.js';

const HIDE_RECENT_KEY = storageKey('catalogHideRecent.v1');
const HIDE_PLANNED_KEY = storageKey('catalogHidePlanned.v1');

function readHideRecent() {
  try {
    return localStorage.getItem(HIDE_RECENT_KEY) === 'true';
  } catch {
    return false;
  }
}

// On unless the user switched it off.
function readHidePlanned() {
  try {
    return localStorage.getItem(HIDE_PLANNED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export const devicePrefs = $state({
  /** Catalog: hide recipes made in the last week ("Not made recently", 7 days). */
  hideRecent: readHideRecent(),
  /** Catalog: hide recipes the viewed week already has planned or completed. On by default. */
  hidePlanned: readHidePlanned(),
  /** Planner: minimal view. Kept while the app is open (survives switching tabs), not saved. */
  plannerMinimal: false,
  /** Grocery list: minimal view (no On Hand section or sidebar). Same lifetime as plannerMinimal. */
  groceryMinimal: false,
});

/** @param {boolean} on */
export function setHideRecent(on) {
  devicePrefs.hideRecent = on;
  try {
    localStorage.setItem(HIDE_RECENT_KEY, String(on));
  } catch {
    // In-memory only.
  }
}

/** @param {boolean} on */
export function setHidePlanned(on) {
  devicePrefs.hidePlanned = on;
  try {
    localStorage.setItem(HIDE_PLANNED_KEY, String(on));
  } catch {
    // In-memory only.
  }
}
