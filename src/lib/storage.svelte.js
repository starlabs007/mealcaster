// Saving device data to localStorage, and keeping track of saves that didn't fit. Browsers allow
// a site about 5 MB, shared by every app on the same domain (starlabs007.github.io), and a full
// store throws on save. A failed save leaves the app showing data newer than what's stored, which
// sync needs to know about (see saveBase in sync/sync.svelte.js).

/** Keys whose latest save failed. */
const failed = new Set();

export const storageState = $state({
  /** How many stores hold changes this device couldn't save. */
  unsaved: 0,
});

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean} whether it was saved
 */
export function saveItem(key, value) {
  let saved = true;
  try {
    localStorage.setItem(key, value);
    failed.delete(key);
  } catch {
    failed.add(key);
    saved = false;
  }
  if (storageState.unsaved !== failed.size) storageState.unsaved = failed.size;
  return saved;
}

/** Whether everything on screen is also stored on this device. */
export const allSaved = () => failed.size === 0;
