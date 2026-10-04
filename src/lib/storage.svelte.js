// Saving device data to localStorage, and keeping track of saves that didn't fit. Browsers allow
// a site about 5 MB, shared by every app on the same domain (starlabs007.github.io), and a full
// store throws on save. A failed save leaves the app showing data newer than what's stored, which
// sync needs to know about (see saveBase in sync/sync.svelte.js).

import { untrack } from 'svelte';
import { showToast } from './toast.svelte.js';
import { navigate } from './router.svelte.js';

/** What browsers allow a site, roughly, in characters; the real limit varies and isn't exposed. */
export const STORAGE_BUDGET = 5_000_000;

/** Share of STORAGE_BUDGET from which the app warns that the device is nearly full. */
export const NEARLY_FULL = 0.8;

/** Keys whose latest save failed. */
const failed = new Set();

export const storageState = $state({
  /** How many stores hold changes this device couldn't save. */
  unsaved: 0,
  /** Bumped on every save, so views showing storage use recompute. */
  saves: 0,
  /** Whether the browser agreed to keep this site's data (null: unknown or unsupported). */
  persisted: /** @type {boolean | null} */ (null),
});

const profileAction = { label: 'Details', run: () => navigate('/profile') };

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean} whether it was saved
 */
export function saveItem(key, value) {
  const wasFull = failed.size > 0;
  let saved = true;
  try {
    localStorage.setItem(key, value);
    failed.delete(key);
  } catch {
    failed.add(key);
    saved = false;
  }
  // Stores save from their own effects: reading this state there would make them depend on it.
  untrack(() => {
    if (storageState.unsaved !== failed.size) storageState.unsaved = failed.size;
    storageState.saves++;
    // Say so once each time the device fills up, not on every save after.
    if (!saved && !wasFull) {
      showToast('This device is out of storage space, so recent changes aren’t saved here.', profileAction, 10_000);
    }
  });
  return saved;
}

/** Whether everything on screen is also stored on this device. */
export const allSaved = () => failed.size === 0;

/** Characters stored by this site — every app on the domain, as they share the space. */
export function storageUsed() {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? '';
      used += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
  } catch {
    // Storage unavailable: nothing stored.
  }
  return used;
}

/**
 * Asks the browser to keep this site's data rather than clear it to free space. Firefox asks the
 * person, so there it only happens from a click (`ask`); other browsers decide by themselves.
 * @param {{ ask?: boolean }} [options]
 */
export async function protectStorage({ ask = false } = {}) {
  const storage = navigator.storage;
  if (!storage?.persisted || !storage.persist) return;
  try {
    let persisted = await storage.persisted();
    if (!persisted && (ask || !/firefox/i.test(navigator.userAgent))) persisted = await storage.persist();
    storageState.persisted = persisted;
  } catch {
    // Unsupported here: leave it unknown.
  }
}

/** At startup: protect the data and warn if the device is nearly full. */
export function checkStorage() {
  protectStorage();
  const used = storageUsed();
  // Past the budget without a failed save, this browser allows more than the estimate.
  if (used >= STORAGE_BUDGET * NEARLY_FULL && used <= STORAGE_BUDGET) {
    showToast('This device is nearly out of storage space for MealCaster.', profileAction, 10_000);
  }
}
