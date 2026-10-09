// Row-level sync between on-device data and one Google Sheets tab.
//
// Every row has a key (Ingredient_ID, Recipe_ID, Date_ISO, Week_Of + Line_Key, Section + Name). For each key
// we compare three versions: the sheet now, the device now, and fingerprints of
// both as of the last sync (the "base"). The Google Sheet is the source of
// truth: if the sheet's row changed since the last sync it wins, and only rows
// the sheet didn't touch take the device's edits. With no base (first sync of
// this tab) that becomes a merge — rows on both sides keep the sheet's version,
// rows only on the device are added to the sheet.
//
// Rows are updated in place and only the columns MealCaster knows are written,
// so extra columns people add to the sheet stay lined up with their rows.

import { SCHEMA } from '../schema.js';
import { COLUMN_INFO, sameHeader, statusOf, suggestMapping } from '../schemaCheck.js';
import { cellText, isBlankRow, isoDate, newIngredientIdFor, newRecipeIdFor, provisionKey, settingKey } from './codec.js';

/** @typedef {import('../schema.js').TabKey} TabKey */
/** @typedef {import('./codec.js').Row} Row */
/** @typedef {'sync' | 'sheetOnly' | 'pushOnly'} Strategy */
/** @typedef {Record<string, [string, string]>} TabBase key → [sheet fingerprint, device fingerprint] */

// ---- Fingerprints -----------------------------------------------------------

/** cyrb53 — small, fast string hash; collisions don't matter at this scale. */
function hash(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Fingerprint of a row over the columns the sheet has. @param {Row} row @param {string[]} columns */
export const fingerprint = (row, columns) => hash(JSON.stringify(columns.map((c) => cellText(row[c]))));

// ---- Columns ------------------------------------------------------------------

/**
 * @typedef {{
 *   index: Record<string, number>,
 *   columns: string[],
 *   append: string[],
 *   conflicts: string[],
 * }} ColumnPlan
 */

/**
 * Where each expected column is in the sheet. Uses the mapping saved on the
 * Column Conflicts screen, then exact header names. Missing columns are added
 * when that's safe (optional ones with auto-add on, ones marked "append", or
 * any column while the tab has no data yet); everything else is a conflict.
 * @param {TabKey} tab
 * @param {string[]} headers row 1 of the tab
 * @param {{ saved?: import('../sheets.svelte.js').SchemaCheck, autoAppendOptional: boolean, hasData: boolean }} options
 * @returns {ColumnPlan}
 */
export function resolveColumns(tab, headers, { saved, autoAppendOptional, hasData }) {
  const names = headers.map((h) => cellText(h).trim());
  /** @type {Record<string, number>} */
  const index = {};
  const used = new Set();
  const take = (col, i) => {
    index[col] = i;
    used.add(i);
  };
  for (const col of SCHEMA[tab]) {
    const savedName = saved?.map[col];
    const i = savedName ? names.indexOf(savedName) : -1;
    if (i >= 0 && !used.has(i)) take(col, i);
  }
  for (const col of SCHEMA[tab]) {
    if (col in index) continue;
    const i = names.findIndex((h, j) => !used.has(j) && sameHeader(h, col));
    if (i >= 0) take(col, i);
  }

  // Likely-renamed columns need a decision on the Column Conflicts screen.
  const unmapped = names.map((h, j) => (used.has(j) ? '' : h));
  const suggestions = suggestMapping(tab, unmapped, { autoAppendOptional: false });
  const append = [];
  const conflicts = [];
  for (const col of SCHEMA[tab]) {
    if (col in index) continue;
    const required = Boolean(COLUMN_INFO[tab][col].required);
    if (!required && saved?.ignore.includes(col)) continue;
    const decided = saved?.append.includes(col);
    const renamed = statusOf(suggestions[col]) === 'suggested';
    if (!hasData || decided || (!renamed && !required && autoAppendOptional)) append.push(col);
    else conflicts.push(col);
  }
  let next = names.length;
  for (const col of append) index[col] = next++;
  return { index, columns: SCHEMA[tab].filter((c) => c in index), append, conflicts };
}

// ---- Reading a tab --------------------------------------------------------------

/**
 * @typedef {{ index: number, row: Row }} SheetRow
 * @typedef {{ rows: Map<string, SheetRow>, keyFixes: { index: number, row: Row, key: string }[] }} SheetTable
 */

/** Key of a row, or '' if it has none. @param {TabKey} tab @param {Row} row */
export function rowKey(tab, row) {
  if (tab === 'ingredients') return cellText(row.Ingredient_ID).trim();
  if (tab === 'recipes') return cellText(row.Recipe_ID).trim();
  if (tab === 'weeklyPlan') return isoDate(row.Date_ISO);
  if (tab === 'settings') return cellText(row.Section).trim() && cellText(row.Name).trim() ? settingKey(row.Section, row.Name) : '';
  const week = isoDate(row.Week_Of);
  const line = cellText(row.Line_Key).trim();
  return week && line ? provisionKey(week, line) : '';
}

/** Id column of the tabs whose rows people may type without one. */
const ID_COLUMN = { recipes: 'Recipe_ID', ingredients: 'Ingredient_ID' };

/**
 * Rows of a tab keyed for sync. Rows people typed without a key get one
 * (ingredients, recipes and grocery items); those keys are written back to the sheet.
 * Later rows with a key already seen are left alone.
 * @param {TabKey} tab @param {unknown[][]} values all rows including the header @param {ColumnPlan} plan
 * @returns {SheetTable}
 */
export function readTable(tab, values, plan) {
  /** @type {Map<string, SheetRow>} */
  const rows = new Map();
  const keyFixes = [];
  const idColumn = ID_COLUMN[tab];
  const taken = new Set(
    idColumn ? values.slice(1).map((cells) => cellText(cells[plan.index[idColumn]]).trim()).filter(Boolean) : [],
  );
  values.slice(1).forEach((cells, i) => {
    /** @type {Row} */
    const row = Object.fromEntries(plan.columns.map((c) => [c, cells[plan.index[c]] ?? '']));
    if (isBlankRow(row)) return;
    let key = rowKey(tab, row);
    if (!key && tab === 'recipes' && cellText(row.Title).trim()) {
      row.Recipe_ID = newRecipeIdFor(row.Title, taken);
      taken.add(row.Recipe_ID);
      key = row.Recipe_ID;
      keyFixes.push({ index: i + 1, row, key: 'Recipe_ID' });
    } else if (!key && tab === 'ingredients' && cellText(row.Name).trim()) {
      row.Ingredient_ID = newIngredientIdFor(row.Name, taken);
      taken.add(row.Ingredient_ID);
      key = row.Ingredient_ID;
      keyFixes.push({ index: i + 1, row, key: 'Ingredient_ID' });
    } else if (!key && tab === 'provisions' && isoDate(row.Week_Of) && cellText(row.Item).trim()) {
      row.Line_Key = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      key = rowKey(tab, row);
      keyFixes.push({ index: i + 1, row, key: 'Line_Key' });
    }
    if (key && !rows.has(key)) rows.set(key, { index: i + 1, row });
  });
  return { rows, keyFixes };
}

// ---- Reconciling ----------------------------------------------------------------

/**
 * @typedef {{
 *   final: Map<string, Row>,
 *   fromSheet: Set<string>,  keys the device must take from the sheet (or drop, if not in final)
 *   updates: { index: number, row: Row, only?: string[] }[],
 *   appends: Row[],
 *   deletes: number[],
 * }} Reconciled
 */

/**
 * Decides every row's outcome.
 * @param {{
 *   sheet: SheetTable,
 *   local: Map<string, Row>,
 *   base: TabBase,
 *   columns: string[],
 *   strategy: Strategy,
 * }} input
 * @returns {Reconciled}
 */
export function reconcile({ sheet, local, base, columns, strategy }) {
  const fp = (row) => (row ? fingerprint(row, columns) : '');
  /** @type {Map<string, Row>} */
  const final = new Map();
  const fromSheet = new Set();
  const updates = [];
  const appends = [];
  const deletes = [];

  // Sheet rows first (in sheet order), then rows only the device has.
  const keys = [...sheet.rows.keys(), ...[...local.keys()].filter((k) => !sheet.rows.has(k))];
  for (const key of keys) {
    const s = sheet.rows.get(key);
    const l = local.get(key);
    const [sheetBase = '', localBase = ''] = base[key] ?? [];
    const sheetChanged = fp(s?.row) !== sheetBase;
    const localChanged = fp(l) !== localBase;

    let useLocal;
    if (strategy === 'pushOnly') useLocal = true;
    else if (strategy === 'sheetOnly') useLocal = false;
    else useLocal = !sheetChanged && localChanged;

    if (!useLocal) {
      if (s) final.set(key, s.row);
      // The device only needs updating where the sheet actually moved on.
      if (sheetChanged || strategy === 'sheetOnly') fromSheet.add(key);
      continue;
    }
    if (l) final.set(key, l);
    if (s && !l) deletes.push(s.index);
    else if (s && l && fp(s.row) !== fp(l)) updates.push({ index: s.index, row: l });
    else if (!s && l) appends.push(l);
  }

  // Keys MealCaster filled in for rows that had none: write just the key cell.
  const updated = new Set(updates.map((u) => u.index));
  const deleted = new Set(deletes);
  for (const fix of sheet.keyFixes) {
    if (!updated.has(fix.index) && !deleted.has(fix.index)) updates.push({ ...fix, only: [fix.key] });
  }

  return { final, fromSheet, updates, appends, deletes };
}

// ---- Writing --------------------------------------------------------------------

/** 'Tab name'!A1 notation with the tab name quoted. */
export const a1 = (tab, row, col = 0) => `'${tab.replace(/'/g, "''")}'!${columnLetter(col)}${row + 1}`;

function columnLetter(index) {
  let s = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * One row as cell values, positioned by the column plan. `null` leaves a cell
 * untouched (the Sheets API skips nulls), so columns MealCaster doesn't know
 * keep their values.
 * @param {Row} row @param {ColumnPlan} plan @param {string[]} [only] write just these columns
 */
export function rowCells(row, plan, only = plan.columns) {
  const width = Math.max(...plan.columns.map((c) => plan.index[c])) + 1;
  const cells = Array(width).fill(null);
  for (const col of only) cells[plan.index[col]] = row[col] ?? '';
  return cells;
}
