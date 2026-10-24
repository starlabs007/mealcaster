// Small display preferences remembered on this device only (never synced).

import { storageKey } from './env.js';
import { THEME_COLOR, resolveTheme, themeChoice } from './theme.js';

const HIDE_RECENT_KEY = storageKey('catalogHideRecent.v1');
const HIDE_PLANNED_KEY = storageKey('catalogHidePlanned.v1');
const GROCERY_HINT_KEY = storageKey('groceryHintSeen.v1');
// index.html reads this key too (as 'mealcaster.theme.v1'), to set the theme before the first paint.
const THEME_KEY = storageKey('theme.v1');

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

function readHintSeen() {
  try {
    return localStorage.getItem(GROCERY_HINT_KEY) === 'true';
  } catch {
    return false;
  }
}

function readTheme() {
  try {
    return themeChoice(localStorage.getItem(THEME_KEY));
  } catch {
    return themeChoice(null);
  }
}

export const devicePrefs = $state({
  /** Appearance: Light, Dark, or System (follow the device's setting). */
  theme: readTheme(),
  /** Grocery list: the "tap an item" hint was dismissed. */
  groceryHintSeen: readHintSeen(),
  /** Catalog: hide recipes made in the last week ("Not made recently", 7 days). */
  hideRecent: readHideRecent(),
  /** Catalog: hide recipes the viewed week already has planned or completed. On by default. */
  hidePlanned: readHidePlanned(),
  /** Planner: minimal view. Kept while the app is open (survives switching tabs), not saved. */
  plannerMinimal: false,
  /** Grocery list: minimal view (no On Hand section or sidebar). Same lifetime as plannerMinimal. */
  groceryMinimal: false,
  /** Grocery list on touch screens: the full list instead of store mode, for this visit (same lifetime, not saved). */
  groceryFull: false,
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

/** The grocery tap hint stays gone once dismissed. */
export function setGroceryHintSeen() {
  devicePrefs.groceryHintSeen = true;
  try {
    localStorage.setItem(GROCERY_HINT_KEY, 'true');
  } catch {
    // In-memory only.
  }
}

const systemDark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

/** Shows the theme the choice resolves to: data-theme on <html> (src/theme.css) and the theme-color meta. */
function showTheme() {
  const theme = resolveTheme(devicePrefs.theme, Boolean(systemDark?.matches));
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/** Keeps the page on the chosen theme, following the device's setting while the choice is System. Called once at start. */
export function followTheme() {
  showTheme();
  systemDark?.addEventListener('change', showTheme);
}

/** @param {import('./theme.js').ThemeChoice} choice */
export function setTheme(choice) {
  devicePrefs.theme = themeChoice(choice);
  showTheme();
  try {
    localStorage.setItem(THEME_KEY, devicePrefs.theme);
  } catch {
    // In-memory only.
  }
}
