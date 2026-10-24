// "Disconnect & erase local data" (Profile → Danger Zone): signs out of Google and removes everything
// MealCaster saved in this browser, then reloads so every store starts fresh. The Google Sheet itself
// is never touched.

import { signOut } from './google/auth.svelte.js';
import { storageKey } from './env.js';
import { showToast } from './toast.svelte.js';
import { text } from './text.js';
import { ownedKeys } from './localKeys.js';

const WIPED_FLAG = storageKey('wiped');
// The dev-mode marker only records which build flavour wrote the data; keeping it stops the dev
// server from announcing a "switch" and clearing things a second time.
const KEEP = new Set([storageKey('devDataMode')]);

/** localStorage keys MealCaster owns. */
export function localDataKeys() {
  try {
    return ownedKeys(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)), storageKey(''), KEEP);
  } catch {
    // Storage unavailable: nothing to erase.
    return [];
  }
}

/** Signs out, erases this browser's MealCaster data and reloads. */
export function wipeLocalData() {
  signOut();
  for (const key of localDataKeys()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Keep going.
    }
  }
  try {
    sessionStorage.setItem(WIPED_FLAG, '1');
  } catch {
    // The confirmation toast is optional.
  }
  location.hash = '#/';
  location.reload();
}

// After the reload: say what happened.
try {
  if (sessionStorage.getItem(WIPED_FLAG)) {
    sessionStorage.removeItem(WIPED_FLAG);
    showToast(text.profile.wipe.toast);
  }
} catch {
  // No storage, no toast.
}
