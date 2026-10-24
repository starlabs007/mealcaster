// Column conflict detection: compares the header row of a sheet tab with the
// columns MealCaster expects (SCHEMA) and suggests a mapping for renamed ones.
// Rows come from the connected sheet, or from a copy/paste of the tab when not signed in.

import { SCHEMA } from './schema.js';
import { text } from './text.js';

/**
 * What each expected column holds, whether sync can work without it, and other
 * names people commonly give it (used for fuzzy matching).
 * @type {Record<keyof typeof SCHEMA, Record<string, { note: string, required?: boolean, aliases: string[] }>>}
 */
export const COLUMN_INFO = {
  ingredients: {
    Ingredient_ID: { note: text.sheets.columns.notes.ingredients.Ingredient_ID, required: true, aliases: ['id', 'ingredient id', 'key', 'slug'] },
    Name: { note: text.sheets.columns.notes.ingredients.Name, required: true, aliases: ['ingredient', 'ingredient name', 'item', 'singular'] },
    Plural: { note: text.sheets.columns.notes.ingredients.Plural, aliases: ['plural name', 'plural form', 'plurals'] },
    Aisle: { note: text.sheets.columns.notes.ingredients.Aisle, aliases: ['department', 'section', 'dept', 'store aisle'] },
    On_Hand: { note: text.sheets.columns.notes.ingredients.On_Hand, aliases: ['at home', 'in stock', 'stock', 'have', 'on hand', 'have it'] },
  },
  weeklyPlan: {
    Date_ISO: { note: text.sheets.columns.notes.weeklyPlan.Date_ISO, required: true, aliases: ['date', 'dinner date', 'planned date', 'day date'] },
    Day_Of_Week: { note: text.sheets.columns.notes.weeklyPlan.Day_Of_Week, aliases: ['day', 'weekday', 'day name'] },
    Recipe_ID_Assigned: { note: text.sheets.columns.notes.weeklyPlan.Recipe_ID_Assigned, required: true, aliases: ['recipe id', 'recipe', 'dinner', 'meal', 'meal id', 'recipe assigned'] },
    Completed_Flag: { note: text.sheets.columns.notes.weeklyPlan.Completed_Flag, aliases: ['completed', 'done', 'cooked', 'complete'] },
    Custom_Notes: { note: text.sheets.columns.notes.weeklyPlan.Custom_Notes, aliases: ['notes', 'note', 'comments'] },
  },
  recipes: {
    Recipe_ID: { note: text.sheets.columns.notes.recipes.Recipe_ID, required: true, aliases: ['id', 'recipe id', 'slug', 'key'] },
    Title: { note: text.sheets.columns.notes.recipes.Title, required: true, aliases: ['name', 'recipe name', 'recipe title', 'dish'] },
    Description: { note: text.sheets.columns.notes.recipes.Description, aliases: ['summary', 'about', 'blurb', 'intro'] },
    Ingredients_JSON: { note: text.sheets.columns.notes.recipes.Ingredients_JSON, required: true, aliases: ['ingredients', 'ingredient list', 'ingredients list'] },
    Method_Steps: { note: text.sheets.columns.notes.recipes.Method_Steps, required: true, aliases: ['steps', 'instructions', 'method', 'directions', 'preparation', 'preparation steps', 'instructions arr'] },
    Image_URL: { note: text.sheets.columns.notes.recipes.Image_URL, aliases: ['image', 'photo', 'picture', 'img', 'photo url'] },
    Tags: { note: text.sheets.columns.notes.recipes.Tags, aliases: ['tags csv', 'labels', 'dietary labels', 'flags', 'diet'] },
    Favorite_Flag: { note: text.sheets.columns.notes.recipes.Favorite_Flag, aliases: ['favorite', 'favourite', 'starred', 'fav', 'favourite flag'] },
    Category: { note: text.sheets.columns.notes.recipes.Category, aliases: ['course', 'type', 'course type', 'meal type'] },
    Servings: { note: text.sheets.columns.notes.recipes.Servings, aliases: ['serves', 'yield', 'portions'] },
    Prep_Minutes: { note: text.sheets.columns.notes.recipes.Prep_Minutes, aliases: ['prep', 'prep time', 'prep mins'] },
    Cook_Minutes: { note: text.sheets.columns.notes.recipes.Cook_Minutes, aliases: ['cook', 'cook time', 'cooking time', 'cook mins'] },
    Notes: { note: text.sheets.columns.notes.recipes.Notes, aliases: ['recipe notes', 'tips', 'comments'] },
    Heads_Up_JSON: { note: text.sheets.columns.notes.recipes.Heads_Up_JSON, aliases: ['heads up', 'heads-ups', 'prep ahead', 'make ahead', 'reminder', 'reminders'] },
  },
  provisions: {
    Week_Of: { note: text.sheets.columns.notes.provisions.Week_Of, required: true, aliases: ['week', 'week start', 'week starting'] },
    Item: { note: text.sheets.columns.notes.provisions.Item, required: true, aliases: ['ingredient', 'name', 'product', 'item name'] },
    Detail: { note: text.sheets.columns.notes.provisions.Detail, aliases: ['qty', 'quantity', 'amount', 'details'] },
    Department: { note: text.sheets.columns.notes.provisions.Department, aliases: ['aisle', 'section', 'dept'] },
    Status: { note: text.sheets.columns.notes.provisions.Status, aliases: ['state', 'bought', 'checked'] },
    Source: { note: text.sheets.columns.notes.provisions.Source, aliases: ['recipe', 'for', 'from'] },
    Line_Key: { note: text.sheets.columns.notes.provisions.Line_Key, required: true, aliases: ['key', 'line id', 'id'] },
    Added: { note: text.sheets.columns.notes.provisions.Added, aliases: ['added by hand'] },
  },
  settings: {
    Section: { note: text.sheets.columns.notes.settings.Section, required: true, aliases: ['group', 'type', 'category', 'kind'] },
    Name: { note: text.sheets.columns.notes.settings.Name, required: true, aliases: ['key', 'setting', 'item'] },
    Value: { note: text.sheets.columns.notes.settings.Value, required: true, aliases: ['setting value', 'val'] },
  },
};

/** Weakest similarity still offered as a suggestion. */
const SUGGEST_AT = 0.6;

const words = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const compact = (s) => words(s).join('');

/** Same header apart from case, spacing and punctuation ("recipe id" = "Recipe_ID"). */
export const sameHeader = (a, b) => compact(a) !== '' && compact(a) === compact(b);

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = next;
  }
  return prev[b.length];
}

/** 0–1 likeness of two header names. */
function likeness(a, b) {
  const ca = compact(a);
  const cb = compact(b);
  if (!ca || !cb) return 0;
  if (ca === cb) return 1;
  const edit = 1 - levenshtein(ca, cb) / Math.max(ca.length, cb.length);
  // One name inside the other ("date" / "dateiso"), unless it's a small part of it ("cook" / "cookingmethod").
  const [short, long] = ca.length < cb.length ? [ca, cb] : [cb, ca];
  const contains = short.length >= 4 && short.length / long.length >= 0.5 && long.includes(short) ? 0.85 : 0;
  const wa = new Set(words(a));
  const wb = words(b);
  const shared = wb.filter((w) => wa.has(w)).length;
  const overlap = shared ? (0.9 * shared) / Math.max(wa.size, wb.length) : 0;
  return Math.max(edit, contains, overlap);
}

/** Best score of a sheet header against an expected column or any of its aliases. */
const score = (header, column, aliases) =>
  Math.max(likeness(header, column), ...aliases.map((alias) => 0.97 * likeness(header, alias)));

/** "A", "B", … "Z", "AA" for a 0-based column index. */
export function columnLetter(index) {
  let s = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * Parses cells copied from Google Sheets (tab-separated, with quoted multi-line
 * cells) or a CSV export.
 * @param {string} pasted
 * @returns {string[][]}
 */
export function parsePastedRows(pasted) {
  const delimiter = pasted.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < pasted.length; i++) {
    const c = pasted[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (pasted[i + 1] === '"') cell += pasted[++i];
      else quoted = false;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && pasted[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) rows.push([...row, cell]);
  const trimmed = rows.map((r) => r.map((v) => v.trim()));
  while (trimmed.length && trimmed.at(-1).every((v) => !v)) trimmed.pop();
  return trimmed;
}

/**
 * @typedef {'exact' | 'suggested' | 'confirmed'} MatchKind
 * @typedef {{ index: number | null, match: MatchKind | null, score: number, action: 'append' | 'ignore' | null }} Resolution
 */

/**
 * Pairs each expected column with a sheet column: exact name matches first,
 * then the likeliest renamed columns, each sheet column used at most once.
 * @param {keyof typeof SCHEMA} tab
 * @param {string[]} headers
 * @param {{ autoAppendOptional: boolean }} options
 * @returns {Record<string, Resolution>}
 */
export function suggestMapping(tab, headers, { autoAppendOptional }) {
  const info = COLUMN_INFO[tab];
  const pairs = [];
  for (const column of SCHEMA[tab]) {
    headers.forEach((header, index) => {
      if (!header) return;
      const s = sameHeader(header, column) ? 2 : score(header, column, info[column].aliases);
      if (s >= SUGGEST_AT) pairs.push({ column, index, s });
    });
  }
  pairs.sort((a, b) => b.s - a.s);

  /** @type {Record<string, Resolution>} */
  const result = Object.fromEntries(
    SCHEMA[tab].map((column) => [
      column,
      { index: null, match: null, score: 0, action: autoAppendOptional && !info[column].required ? 'append' : null },
    ]),
  );
  const used = new Set();
  for (const { column, index, s } of pairs) {
    if (result[column].index !== null || used.has(index)) continue;
    used.add(index);
    result[column] = { index, match: s === 2 ? 'exact' : 'suggested', score: Math.min(s, 1), action: null };
  }
  return result;
}

/**
 * @typedef {'bound' | 'suggested' | 'mapped' | 'append' | 'ignored' | 'missing'} ColumnStatus
 * @param {Resolution} r
 * @returns {ColumnStatus}
 */
export function statusOf(r) {
  if (r.index !== null) return r.match === 'exact' ? 'bound' : r.match === 'suggested' ? 'suggested' : 'mapped';
  return r.action === 'append' ? 'append' : r.action === 'ignore' ? 'ignored' : 'missing';
}

/** Statuses that still need a decision before the mapping can be saved. */
export const isConflict = (status) => status === 'suggested' || status === 'missing';

/**
 * Row 1 as it should read after repair: mapped columns renamed to the expected
 * names, other columns untouched, and columns marked "append" added at the end.
 * @param {keyof typeof SCHEMA} tab @param {string[]} headers @param {Record<string, Resolution>} resolution
 */
export function repairedHeaderRow(tab, headers, resolution) {
  const row = [...headers];
  for (const column of SCHEMA[tab]) {
    const r = resolution[column];
    if (r.index !== null) row[r.index] = column;
  }
  const appended = SCHEMA[tab].filter((column) => resolution[column].index === null && resolution[column].action === 'append');
  return [...row, ...appended];
}

/** Copy of a resolution that the caller can change without touching the original. @param {Record<string, Resolution>} resolution */
const copyResolution = (resolution) => Object.fromEntries(Object.entries(resolution).map(([column, r]) => [column, { ...r }]));

/**
 * Rebuilds a tab's mapping from what was saved last time.
 * @param {keyof typeof SCHEMA} tab
 * @param {{ headers: string[], map: Record<string, string | null>, append: string[], ignore: string[] }} saved
 * @returns {Record<string, Resolution>}
 */
export function resolutionFromSaved(tab, saved) {
  return Object.fromEntries(
    SCHEMA[tab].map((column) => {
      const header = saved.map[column];
      const index = header == null ? -1 : saved.headers.indexOf(header);
      if (index >= 0) {
        return [column, { index, match: sameHeader(header, column) ? 'exact' : 'confirmed', score: 1, action: null }];
      }
      const action = saved.append.includes(column) ? 'append' : saved.ignore.includes(column) ? 'ignore' : null;
      return [column, { index: null, match: null, score: 0, action }];
    }),
  );
}

/**
 * Facts about one tab's mapping: each column's status, how many still need a
 * decision, and which sheet columns nothing was matched to.
 * @param {keyof typeof SCHEMA} tab @param {string[]} headers @param {Record<string, Resolution>} resolution
 */
export function summarizeResolution(tab, headers, resolution) {
  const columns = SCHEMA[tab];
  const statuses = Object.fromEntries(columns.map((c) => [c, statusOf(resolution[c])]));
  const used = new Set(columns.map((c) => resolution[c].index).filter((i) => i !== null));
  return {
    statuses,
    conflicts: Object.values(statuses).filter(isConflict).length,
    missing: columns.filter((c) => resolution[c].index === null).length,
    renamed: columns.filter((c) => resolution[c].index !== null && resolution[c].match !== 'exact').length,
    extras: headers.map((header, index) => ({ header, index })).filter(({ header, index }) => header && !used.has(index)),
    matched: used.size,
  };
}

/**
 * Checks a tab's first rows. Pasted rows (`strict`) must look like MealCaster's,
 * to catch a copy that missed row 1; rows read from the sheet are taken as they are.
 * @param {keyof typeof SCHEMA} tab @param {unknown[][]} rows
 * @param {{ autoAppendOptional: boolean, strict?: boolean }} options
 * @returns {{ problem: 'firstRowEmpty' | 'notMealCaster' } | { problem: null, headers: string[], rows: string[][], resolution: Record<string, Resolution> }}
 */
export function analyzeRows(tab, rows, { autoAppendOptional, strict = true }) {
  const headers = (rows[0] ?? []).map((h) => String(h ?? '').trim());
  while (headers.length && !headers.at(-1)) headers.pop();
  if (!headers.length) return { problem: 'firstRowEmpty' };
  const resolution = suggestMapping(tab, headers, { autoAppendOptional });
  if (strict && !Object.values(resolution).some((r) => r.index !== null)) return { problem: 'notMealCaster' };
  const sample = rows.slice(1, 3).map((r) => headers.map((_, i) => String(r[i] ?? '')));
  return { problem: null, headers, rows: sample, resolution };
}

/**
 * Points an expected column at a sheet column ('' for none). A sheet column
 * feeds one field only, so whichever field had it loses it. Returns a new mapping.
 * @param {keyof typeof SCHEMA} tab @param {string[]} headers @param {Record<string, Resolution>} resolution
 * @param {string} column @param {string} value index as a string, or ''
 */
export function pickColumn(tab, headers, resolution, column, value) {
  const next = copyResolution(resolution);
  const none = { index: null, match: null, action: null };
  if (value === '') {
    Object.assign(next[column], none);
    return next;
  }
  const index = Number(value);
  for (const other of SCHEMA[tab]) {
    if (other !== column && next[other].index === index) Object.assign(next[other], none);
  }
  Object.assign(next[column], { index, match: sameHeader(headers[index], column) ? 'exact' : 'confirmed', action: null });
  return next;
}

/**
 * Turns "add optional columns automatically" on or off for columns with no
 * match: on makes an undecided one "append", off clears an "append".
 * Required columns and matched ones are left alone. Returns a new mapping.
 * @param {keyof typeof SCHEMA} tab @param {Record<string, Resolution>} resolution @param {boolean} on
 */
export function applyAutoAppend(tab, resolution, on) {
  const next = copyResolution(resolution);
  for (const column of SCHEMA[tab]) {
    const r = next[column];
    if (COLUMN_INFO[tab][column].required || r.index !== null) continue;
    if (on && r.action === null) r.action = 'append';
    if (!on && r.action === 'append') r.action = null;
  }
  return next;
}

/** Marks every column with no match and no decision as "append". Returns a new mapping. @param {keyof typeof SCHEMA} tab @param {Record<string, Resolution>} resolution */
export function appendUndecided(tab, resolution) {
  const next = copyResolution(resolution);
  for (const column of SCHEMA[tab]) {
    if (next[column].index === null && next[column].action === null) next[column].action = 'append';
  }
  return next;
}

/** Whether repair has anything to rename or add in row 1 (ignored columns stay out). @param {keyof typeof SCHEMA} tab @param {Record<string, Resolution>} resolution */
export function needsRepair(tab, resolution) {
  return SCHEMA[tab].some((c) => {
    const r = resolution[c];
    return r.index === null ? r.action !== 'ignore' : r.match !== 'exact';
  });
}

/** Where appended columns land: right after the last named column. @param {keyof typeof SCHEMA} tab @param {number} headerCount @param {Record<string, Resolution>} resolution */
export function appendSlots(tab, headerCount, resolution) {
  const appended = SCHEMA[tab].filter((c) => resolution[c].index === null && resolution[c].action === 'append');
  return Object.fromEntries(appended.map((c, i) => [c, columnLetter(headerCount + i)]));
}

/**
 * The mapping for a sheet whose row 1 was just repaired: the new row read
 * afresh, keeping the columns the person chose to ignore.
 * @param {keyof typeof SCHEMA} tab @param {string[]} row @param {Record<string, Resolution>} before @param {boolean} autoAppendOptional
 */
export function resolutionAfterRepair(tab, row, before, autoAppendOptional) {
  const resolution = suggestMapping(tab, row, { autoAppendOptional });
  for (const column of SCHEMA[tab]) if (before[column].action === 'ignore') resolution[column].action = 'ignore';
  return resolution;
}

/**
 * What is stored for a checked tab.
 * @param {keyof typeof SCHEMA} tab @param {{ headers: string[], rows: string[][], resolution: Record<string, Resolution> }} check @param {string} checkedAt
 */
export function toSavedCheck(tab, { headers, rows, resolution }, checkedAt) {
  const columns = SCHEMA[tab];
  return {
    headers,
    sample: rows.map((r) => r.map((v) => v.slice(0, 160))),
    map: Object.fromEntries(columns.map((c) => [c, resolution[c].index === null ? null : headers[resolution[c].index]])),
    append: columns.filter((c) => resolution[c].index === null && resolution[c].action === 'append'),
    ignore: columns.filter((c) => resolution[c].index === null && resolution[c].action === 'ignore'),
    checkedAt,
  };
}
