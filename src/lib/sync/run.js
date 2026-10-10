// One sync pass against the connected spreadsheet. The Google API and the
// on-device stores are passed in, so this runs (and is tested) without either.

import { a1, fingerprint, readTable, reconcile, resolveColumns, rowCells } from './engine.js';
import { isOldIngredientsJSON, isoDate, settingsFromRows } from './codec.js';
import { SCHEMA_VERSION } from '../schema.js';

/** @typedef {import('../schema.js').TabKey} TabKey */
/** @typedef {import('./codec.js').Row} Row */
/** @typedef {import('./engine.js').Strategy} Strategy */

/**
 * @typedef {{
 *   getMeta: (id: string) => Promise<{ title: string, tabs: { title: string, sheetId: number, rowCount: number, columnCount: number }[] }>,
 *   getValues: (id: string, tabs: string[]) => Promise<unknown[][][]>,
 *   batchUpdate: (id: string, requests: object[]) => Promise<unknown>,
 *   writeValues: (id: string, data: { range: string, values: unknown[][] }[]) => Promise<unknown>,
 * }} SheetsApi
 *
 * @typedef {{
 *   localRows: (tab: TabKey) => Map<string, Row>,
 *   apply: (tab: TabKey, final: Map<string, Row>, fromSheet: Set<string>, columns: string[]) => void,
 * }} LocalAdapter
 *
 * @typedef {{ spreadsheetId: string, initialized: boolean, tabs: Partial<Record<TabKey, { name: string, rows: import('./engine.js').TabBase }>> }} SyncBase
 *
 * @typedef {{ ingredients: number, recipes: number, weeklyPlan: number, provisions: number, settings: number }} Counts
 *
 * @typedef {
 *   | { status: 'done', base: SyncBase, title: string, pushed: number, pulled: number }
 *   | { status: 'conflict', tab: TabKey, columns: string[], title: string }
 *   | { status: 'choose', sheet: Counts, device: Counts, title: string, backup: boolean }
 *   | { status: 'version', sheetVersion: number, title: string }
 * } SyncResult
 * `version`: the spreadsheet is in another layout (`Schema | Version`, or old-style recipe lines when
 * it has no version row); nothing was read into the device or written.
 */

export const emptyBase = (spreadsheetId) => ({ spreadsheetId, initialized: false, tabs: {} });

/**
 * @param {{
 *   api: SheetsApi,
 *   spreadsheetId: string,
 *   tabs: { key: TabKey, name: string }[],
 *   schemaCheck: Partial<Record<TabKey, import('../sheets.svelte.js').SchemaCheck>>,
 *   autoAppendOptional: boolean,
 *   direction: 'bidirectional' | 'pushOnly',
 *   base: SyncBase,
 *   choice?: 'merge' | 'sheetOnly' | 'confirm',
 *   local: LocalAdapter,
 *   provisionsSince?: string,
 * }} options
 * `provisionsSince` (ISO date): grocery rows of weeks before it aren't synced — they are neither
 * read nor changed in the sheet, and the device leaves them out of its rows too.
 * @returns {Promise<SyncResult>}
 */
export async function runSync({ api, spreadsheetId, tabs, schemaCheck, autoAppendOptional, direction, base, choice, local, provisionsSince }) {
  const meta = await api.getMeta(spreadsheetId);
  const existing = new Map(meta.tabs.map((t) => [t.title, t]));
  const present = tabs.filter((t) => existing.has(t.name));
  const values = present.length ? await api.getValues(spreadsheetId, present.map((t) => t.name)) : [];
  const valuesOf = new Map(present.map((t, i) => [t.key, values[i] ?? []]));

  // Columns first: a conflict anywhere stops the whole pass before anything changes.
  const plans = {};
  for (const { key } of tabs) {
    const rows = valuesOf.get(key) ?? [];
    const hasData = rows.slice(1).some((r) => r.some((c) => c !== '' && c != null));
    const plan = resolveColumns(key, rows[0] ?? [], { saved: schemaCheck[key], autoAppendOptional, hasData });
    if (plan.conflicts.length) return { status: 'conflict', tab: key, columns: plan.conflicts, title: meta.title };
    plans[key] = plan;
  }
  const tables = Object.fromEntries(tabs.map(({ key }) => [key, readTable(key, valuesOf.get(key) ?? [], plans[key])]));
  if (provisionsSince && tables.provisions) {
    const old = (row) => isoDate(row.Week_Of) < provisionsSince;
    for (const [key, { row }] of tables.provisions.rows) if (old(row)) tables.provisions.rows.delete(key);
    tables.provisions.keyFixes = tables.provisions.keyFixes.filter((fix) => !old(fix.row));
  }

  // A sheet in another layout would be misread (and then overwritten): stop before anything changes.
  if (tables.settings) {
    const sheetVersion = settingsFromRows([...tables.settings.rows.values()].map((r) => r.row)).schemaVersion;
    const oldLines = () => [...(tables.recipes?.rows.values() ?? [])].some(({ row }) => isOldIngredientsJSON(row.Ingredients_JSON));
    if (sheetVersion ? sheetVersion !== SCHEMA_VERSION : oldLines()) return { status: 'version', sheetVersion, title: meta.title };
  }

  // First sync of this spreadsheet: ask before anything is lost. Only ingredients, recipes, plan and
  // grocery rows count as data: the device always has settings rows (defaults), so they say nothing.
  // Bidirectional with data on both sides: merge or replace the device. Backup sync (push-only)
  // with a spreadsheet that has data: the sheet's rows would be overwritten or deleted to match
  // the device, so confirm.
  if (!base.initialized && !choice) {
    const sheet = /** @type {Counts} */ ({ ingredients: 0, recipes: 0, weeklyPlan: 0, provisions: 0, settings: 0 });
    const device = /** @type {Counts} */ ({ ingredients: 0, recipes: 0, weeklyPlan: 0, provisions: 0, settings: 0 });
    for (const { key } of tabs) {
      sheet[key] = tables[key].rows.size;
      device[key] = local.localRows(key).size;
    }
    const userData = (c) => c.ingredients + c.recipes + c.weeklyPlan + c.provisions > 0;
    if (direction === 'bidirectional' && userData(sheet) && userData(device)) return { status: 'choose', sheet, device, title: meta.title, backup: false };
    if (direction === 'pushOnly' && userData(sheet)) return { status: 'choose', sheet, device, title: meta.title, backup: true };
  }

  /** @type {Strategy} */
  const strategy = direction === 'pushOnly' ? 'pushOnly' : choice === 'sheetOnly' ? 'sheetOnly' : 'sync';
  const tabBase = (key, name) => (base.initialized && base.tabs[key]?.name === name ? base.tabs[key].rows : {});

  // Reconcile tab by tab, applying each before the next reads the device: the grocery rows depend
  // on the ingredients, recipes and plan that were just pulled.
  const results = {};
  let pulled = 0;
  for (const { key, name } of tabs) {
    const plan = plans[key];
    const result = reconcile({
      sheet: tables[key],
      local: local.localRows(key),
      base: tabBase(key, name),
      columns: plan.columns,
      strategy,
    });
    local.apply(key, result.final, result.fromSheet, plan.columns);
    results[key] = result;
    pulled += result.fromSheet.size;
  }

  // Structure: missing tabs, room for new rows and columns.
  const structure = [];
  for (const { key, name } of tabs) {
    const plan = plans[key];
    const tab = existing.get(name);
    const rowsNeeded = (valuesOf.get(key)?.length || 1) + results[key].appends.length;
    const colsNeeded = Math.max(...plan.columns.map((c) => plan.index[c])) + 1;
    if (!tab) {
      structure.push({
        addSheet: {
          properties: {
            title: name,
            gridProperties: { rowCount: Math.max(1000, rowsNeeded + 100), columnCount: Math.max(26, colsNeeded), frozenRowCount: 1 },
          },
        },
      });
      continue;
    }
    if (rowsNeeded > tab.rowCount) {
      structure.push({ appendDimension: { sheetId: tab.sheetId, dimension: 'ROWS', length: rowsNeeded - tab.rowCount + 100 } });
    }
    if (colsNeeded > tab.columnCount) {
      structure.push({ appendDimension: { sheetId: tab.sheetId, dimension: 'COLUMNS', length: colsNeeded - tab.columnCount } });
    }
  }
  if (structure.length) await api.batchUpdate(spreadsheetId, structure);

  // Cells: headers MealCaster adds, changed rows, new rows.
  const data = [];
  let pushed = 0;
  for (const { key, name } of tabs) {
    const plan = plans[key];
    const result = results[key];
    const firstAppend = Math.max(valuesOf.get(key)?.length ?? 0, 1);
    if (plan.append.length) {
      const header = Array(Math.max(...plan.append.map((c) => plan.index[c])) + 1).fill(null);
      for (const col of plan.append) header[plan.index[col]] = col;
      data.push({ range: a1(name, 0), values: [header] });
    }
    for (const u of result.updates) data.push({ range: a1(name, u.index), values: [rowCells(u.row, plan, u.only)] });
    if (result.appends.length) {
      data.push({ range: a1(name, firstAppend), values: result.appends.map((r) => rowCells(r, plan)) });
    }
    pushed += result.updates.filter((u) => !u.only).length + result.appends.length + result.deletes.length;
  }
  if (data.length) await api.writeValues(spreadsheetId, data);

  // Deletions last, bottom-up so row numbers stay valid.
  const deletes = [];
  for (const { key, name } of tabs) {
    const tab = existing.get(name);
    for (const index of [...results[key].deletes].sort((a, b) => b - a)) {
      deletes.push({ deleteDimension: { range: { sheetId: tab.sheetId, dimension: 'ROWS', startIndex: index, endIndex: index + 1 } } });
    }
  }
  if (deletes.length) await api.batchUpdate(spreadsheetId, deletes);

  // New base: the sheet as it now stands, and the device as it now stands.
  /** @type {SyncBase} */
  const next = { spreadsheetId, initialized: true, tabs: {} };
  for (const { key, name } of tabs) {
    const { columns } = plans[key];
    const device = local.localRows(key);
    const rows = {};
    for (const [k, row] of results[key].final) {
      rows[k] = [fingerprint(row, columns), device.has(k) ? fingerprint(device.get(k), columns) : ''];
    }
    next.tabs[key] = { name, rows };
  }
  return { status: 'done', base: next, title: meta.title, pushed, pulled };
}
