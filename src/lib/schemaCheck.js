// Column conflict detection: compares the header row of a sheet tab with the
// columns MealCaster expects (SCHEMA) and suggests a mapping for renamed ones.
// Rows come from the connected sheet, or from a copy/paste of the tab when not signed in.

import { SCHEMA } from './schema.js';

/**
 * What each expected column holds, whether sync can work without it, and other
 * names people commonly give it (used for fuzzy matching).
 * @type {Record<keyof typeof SCHEMA, Record<string, { note: string, required?: boolean, aliases: string[] }>>}
 */
export const COLUMN_INFO = {
  weeklyPlan: {
    Date_ISO: { note: 'The dinner’s date, e.g. 2026-10-21.', required: true, aliases: ['date', 'dinner date', 'planned date', 'day date'] },
    Day_Of_Week: { note: 'Weekday name, for reading the sheet.', aliases: ['day', 'weekday', 'day name'] },
    Recipe_ID_Assigned: { note: 'Recipe_ID of the dinner planned that day.', required: true, aliases: ['recipe id', 'recipe', 'dinner', 'meal', 'meal id', 'recipe assigned'] },
    Completed_Flag: { note: 'TRUE once the dinner has been cooked.', aliases: ['completed', 'done', 'cooked', 'complete'] },
    Custom_Notes: { note: 'Free-text notes for that evening.', aliases: ['notes', 'note', 'comments'] },
  },
  recipes: {
    Recipe_ID: { note: 'Unique ID the weekly plan points to.', required: true, aliases: ['id', 'recipe id', 'slug', 'key'] },
    Title: { note: 'Recipe name shown on cards.', required: true, aliases: ['name', 'recipe name', 'recipe title', 'dish'] },
    Description: { note: 'One or two sentences about the dish.', aliases: ['summary', 'about', 'blurb', 'intro'] },
    Ingredients_JSON: { note: 'Item names, amounts and grocery aisle tags.', required: true, aliases: ['ingredients', 'ingredient list', 'ingredients list'] },
    Method_Steps: { note: 'Numbered step-by-step prep & cooking.', required: true, aliases: ['steps', 'instructions', 'method', 'directions', 'preparation', 'preparation steps', 'instructions arr'] },
    Image_URL: { note: 'Link to a photo of the dish.', aliases: ['image', 'photo', 'picture', 'img', 'photo url'] },
    Tags: { note: 'Comma-separated dietary & pacing flags (e.g. Pescatarian, 30m).', aliases: ['tags csv', 'labels', 'dietary labels', 'flags', 'diet'] },
    Favorite_Flag: { note: 'TRUE for starred recipes.', aliases: ['favorite', 'favourite', 'starred', 'fav', 'favourite flag'] },
    Category: { note: 'Badge such as Seafood or Vegetarian.', aliases: ['course', 'type', 'course type', 'meal type'] },
    Servings: { note: 'How many people the recipe feeds.', aliases: ['serves', 'yield', 'portions'] },
    Prep_Minutes: { note: 'Hands-on prep time in minutes.', aliases: ['prep', 'prep time', 'prep mins'] },
    Cook_Minutes: { note: 'Cooking time in minutes.', aliases: ['cook', 'cook time', 'cooking time', 'cook mins'] },
    Notes: { note: 'Cook’s secrets, in Markdown.', aliases: ['recipe notes', 'tips', 'comments'] },
  },
  provisions: {
    Week_Of: { note: 'Monday of the grocery week.', required: true, aliases: ['week', 'week start', 'week starting'] },
    Item: { note: 'Ingredient or product to buy.', required: true, aliases: ['ingredient', 'name', 'product', 'item name'] },
    Detail: { note: 'Amount and notes, e.g. 450 g.', aliases: ['qty', 'quantity', 'amount', 'details'] },
    Department: { note: 'Store aisle the item is filed under.', aliases: ['aisle', 'section', 'dept'] },
    Status: { note: 'To buy, Bought or In pantry.', aliases: ['state', 'bought', 'checked'] },
    Source: { note: 'Recipe the item is for, or “Added by you”.', aliases: ['recipe', 'for', 'from'] },
    Line_Key: { note: 'MealCaster’s ID for the line — leave it as is.', required: true, aliases: ['key', 'line id', 'id'] },
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
 * @param {string} text
 * @returns {string[][]}
 */
export function parsePastedRows(text) {
  const delimiter = text.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') cell += text[++i];
      else quoted = false;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
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
