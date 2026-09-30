// Google Sheets connection settings (Connection & Settings modal).
// Google sign-in isn't wired up yet, so these are saved locally and describe
// the spreadsheet the app will sync with once it is.

const STORAGE_KEY = 'mealcaster.sheetsSettings.v1';

/** Column headers each tab is expected to have (PRD §4.6). */
export const SCHEMA = {
  weeklyPlan: ['Date_ISO', 'Day_Of_Week', 'Recipe_ID_Assigned', 'Completed_Flag', 'Custom_Notes'],
  recipes: ['Recipe_ID', 'Title', 'Description', 'Ingredients_JSON', 'Method_Steps', 'Image_URL', 'Tags', 'Favorite_Flag'],
  provisions: ['Week_Of', 'Item', 'Detail', 'Department', 'Status', 'Source'],
};

/**
 * @typedef {'bidirectional' | 'pushOnly'} SyncDirection
 * @typedef {{
 *   spreadsheet: string,
 *   tabs: { weeklyPlan: string, recipes: string, provisions: string },
 *   syncProvisions: boolean,
 *   autoDetect: boolean,
 *   direction: SyncDirection,
 *   instantPush: boolean,
 *   snapshots: boolean,
 *   savedAt: string | null,
 * }} SheetsSettings
 */

/** @returns {SheetsSettings} */
export const defaultSettings = () => ({
  spreadsheet: '',
  tabs: { weeklyPlan: 'WeeklyPlan', recipes: 'Recipes', provisions: 'Provisions' },
  syncProvisions: true,
  autoDetect: true,
  direction: 'bidirectional',
  instantPush: true,
  snapshots: true,
  savedAt: null,
});

/** @returns {SheetsSettings} */
function load() {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...defaults, ...saved, tabs: { ...defaults.tabs, ...saved.tabs } };
    }
  } catch {
    // Fall back to defaults.
  }
  return defaults;
}

export const sheets = $state(load());

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  } catch {
    // In-memory only.
  }
}

/** @param {SheetsSettings} next */
export function saveSheetsSettings(next) {
  Object.assign(sheets, structuredClone(next), { savedAt: new Date().toISOString() });
  persist();
}

export function clearSheetsSettings() {
  Object.assign(sheets, defaultSettings());
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Pulls the spreadsheet ID out of a Google Sheets URL, or accepts a bare ID.
 * @param {string} input
 * @returns {string | null}
 */
export function spreadsheetIdFrom(input) {
  const value = input.trim();
  const fromUrl = value.match(/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]{20,})/);
  if (fromUrl) return fromUrl[1];
  return /^[\w-]{25,}$/.test(value) ? value : null;
}

export const spreadsheetUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

/** e.g. "1xK9…94pQ" */
export const shortId = (id) => (id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id);

/**
 * Google Sheets / Excel tab-name rules, plus uniqueness across the mapped tabs.
 * @param {string} name @param {string[]} others
 * @returns {string | null} error message
 */
export function tabNameError(name, others) {
  const value = name.trim();
  if (!value) return 'Enter a tab name.';
  if (value.length > 31) return 'Keep tab names to 31 characters.';
  if (/[[\]:*?/\\]/.test(value)) return 'Tab names can’t contain [ ] : * ? / \\';
  if (others.some((o) => o.trim().toLowerCase() === value.toLowerCase())) return 'Each tab needs its own name.';
  return null;
}
