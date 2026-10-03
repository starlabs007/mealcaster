// Small display preferences remembered on this device only (never synced).

import { storageKey } from './env.js';

const HIDE_RECENT_KEY = storageKey('catalogHideRecent.v1');

function readHideRecent() {
  try {
    return localStorage.getItem(HIDE_RECENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export const devicePrefs = $state({
  /** Catalog: hide recipes made in the last week ("Not made in 7 days"). */
  hideRecent: readHideRecent(),
  /** Planner: minimal view. Kept while the app is open (survives switching tabs), not saved. */
  plannerMinimal: false,
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
