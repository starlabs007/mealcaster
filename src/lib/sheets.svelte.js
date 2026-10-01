// Google Sheets connection settings (Connection & Settings modal), saved on
// this device. The sign-in token itself is never stored (see google/auth).

const STORAGE_KEY = 'mealcaster.sheetsSettings.v1';

import { SCHEMA } from './schema.js';

export { SCHEMA };

/**
 * @typedef {'bidirectional' | 'pushOnly'} SyncDirection
 * @typedef {{
 *   spreadsheet: string,
 *   spreadsheetName: string,
 *   accountEmail: string,
 *   photosFolderId: string,
 *   tabs: { weeklyPlan: string, recipes: string, provisions: string },
 *   syncProvisions: boolean,
 *   autoDetect: boolean,
 *   direction: SyncDirection,
 *   instantPush: boolean,
 *   snapshots: boolean,
 *   autoAppendOptional: boolean,
 *   schemaCheck: Partial<Record<keyof typeof SCHEMA, SchemaCheck>>,
 *   savedAt: string | null,
 * }} SheetsSettings
 */

/**
 * Result of the Column Conflict check for one tab: the sheet's header row and
 * how MealCaster should read it (expected column → sheet header, or null when
 * the column is missing), plus missing columns to add or leave out.
 * @typedef {{
 *   headers: string[],
 *   sample: string[][],
 *   map: Record<string, string | null>,
 *   append: string[],
 *   ignore: string[],
 *   checkedAt: string,
 * }} SchemaCheck
 */

/** @returns {SheetsSettings} */
export const defaultSettings = () => ({
  spreadsheet: '',
  spreadsheetName: '',
  accountEmail: '',
  photosFolderId: '',
  tabs: { weeklyPlan: 'WeeklyPlan', recipes: 'Recipes', provisions: 'Provisions' },
  syncProvisions: true,
  autoDetect: true,
  direction: 'bidirectional',
  instantPush: true,
  snapshots: true,
  autoAppendOptional: true,
  schemaCheck: {},
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

/**
 * Saves some fields straight away (connection details, found while syncing).
 * @param {Partial<SheetsSettings>} fields
 */
export function updateSheetsSettings(fields) {
  Object.assign(sheets, fields);
  persist();
}

/**
 * Saves the Column Conflict results without touching the rest of the settings.
 * @param {SheetsSettings['schemaCheck']} schemaCheck @param {boolean} autoAppendOptional
 */
export function saveSchemaCheck(schemaCheck, autoAppendOptional) {
  Object.assign(sheets, { schemaCheck: structuredClone(schemaCheck), autoAppendOptional });
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
