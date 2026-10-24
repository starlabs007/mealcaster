// Test doubles for the sync tests: an in-memory Google Sheets API and a small
// stand-in for the on-device stores (built on the real codec and the real device merge).

import * as codec from '../src/lib/sync/codec.js';
import * as merge from '../src/lib/sync/deviceMerge.js';

/**
 * In-memory spreadsheet behind the same interface as google/api.js `sheetsApi`.
 * Writes outside the grid throw, like the real API, so grid growth is tested.
 * @param {Record<string, unknown[][]>} [tabs] tab title → rows (row 1 = headers)
 */
export function fakeSheet(tabs = {}) {
  let nextId = 1;
  const state = { title: 'Test Sheet', tabs: [] };
  for (const [title, grid] of Object.entries(tabs)) {
    state.tabs.push({ title, sheetId: nextId++, rowCount: 1000, columnCount: 26, grid: grid.map((r) => [...r]) });
  }
  const find = (title) => state.tabs.find((t) => t.title === title);
  const calls = { writes: 0, batch: 0, ranges: [] };

  // Like the API: trailing empty cells and rows are left out.
  const trimmed = (grid) => {
    const rows = grid.map((r) => {
      const cells = [...r].map((v) => (v == null ? '' : v));
      while (cells.length && cells.at(-1) === '') cells.pop();
      return cells;
    });
    while (rows.length && !rows.at(-1).length) rows.pop();
    return rows;
  };

  const parseRange = (range) => {
    const m = range.match(/^'((?:[^']|'')+)'!([A-Z]+)(\d+)$/);
    const col = [...m[2]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    return { tab: find(m[1].replace(/''/g, "'")), row: Number(m[3]) - 1, col };
  };

  /** @type {import('../src/lib/sync/run.js').SheetsApi} */
  const api = {
    async getMeta() {
      return {
        title: state.title,
        tabs: state.tabs.map(({ title, sheetId, rowCount, columnCount }) => ({ title, sheetId, rowCount, columnCount })),
      };
    },
    async getValues(_, names) {
      return names.map((name) => trimmed(find(name).grid));
    },
    async batchUpdate(_, requests) {
      calls.batch++;
      for (const r of requests) {
        if (r.addSheet) {
          const p = r.addSheet.properties;
          state.tabs.push({ title: p.title, sheetId: nextId++, rowCount: p.gridProperties.rowCount, columnCount: p.gridProperties.columnCount, grid: [] });
        } else if (r.appendDimension) {
          const tab = state.tabs.find((t) => t.sheetId === r.appendDimension.sheetId);
          tab[r.appendDimension.dimension === 'ROWS' ? 'rowCount' : 'columnCount'] += r.appendDimension.length;
        } else if (r.deleteDimension) {
          const { sheetId, startIndex, endIndex } = r.deleteDimension.range;
          const tab = state.tabs.find((t) => t.sheetId === sheetId);
          tab.grid.splice(startIndex, endIndex - startIndex);
          tab.rowCount -= endIndex - startIndex;
        } else throw new Error(`Unexpected request ${JSON.stringify(r)}`);
      }
    },
    async writeValues(_, data) {
      calls.writes++;
      for (const { range, values } of data) {
        calls.ranges.push(range);
        const { tab, row, col } = parseRange(range);
        values.forEach((cells, i) =>
          cells.forEach((v, j) => {
            if (v === null) return; // the API skips nulls
            const r = row + i;
            const c = col + j;
            if (r >= tab.rowCount || c >= tab.columnCount) throw new Error(`Write outside the grid: ${range}`);
            (tab.grid[r] ??= [])[c] = v;
          }),
        );
      }
    },
  };

  /** Values of one column below the header, by header name. */
  const column = (tabTitle, header) => {
    const grid = trimmed(find(tabTitle).grid);
    const i = grid[0].indexOf(header);
    return grid.slice(1).map((r) => r[i] ?? '');
  };

  return { api, state, calls, find, column };
}

/** A complete recipe with sensible defaults. */
export const recipe = (id, title, extra = {}) => ({
  id,
  title,
  shortTitle: title,
  description: 'd',
  prepMinutes: 10,
  cookMinutes: 20,
  minutes: 30,
  serves: 2,
  badge: { label: 'Dinner' },
  addedAt: '2026-01-01',
  tags: ['quick'],
  notes: '',
  ingredients: [{ title: 'Main', category: '1 item', items: [{ id: 'pasta', qty: 1, unit: 'lb' }] }],
  steps: [{ title: 'Boil', minutes: 10, text: 'Boil it.' }],
  custom: true,
  ...extra,
});

/**
 * On-device data plus the LocalAdapter runSync uses — the same shape as
 * sync.svelte.js, without Svelte. Provisions are kept as rows.
 */
export function fakeDevice({ ingredients = [], recipes = [], plan = {}, favorites = [], provisions = [], tagColors = {}, returnToPlanner = true, weekStartDay = 6 } = {}) {
  const d = {
    ingredients,
    recipes,
    plan,
    favorites: new Set(favorites),
    settings: { tagColors, returnToPlanner, weekStartDay },
    provisions: new Map(provisions.map((r) => [codec.provisionKey(r.Week_Of, r.Line_Key), r])),
  };
  /** @type {import('../src/lib/sync/run.js').LocalAdapter} */
  d.adapter = {
    localRows(tab) {
      if (tab === 'ingredients') return merge.ingredientRows(d.ingredients);
      if (tab === 'recipes') return merge.recipeRows(d.recipes, d.favorites);
      if (tab === 'weeklyPlan') return merge.planRows(d.plan);
      if (tab === 'settings') return codec.settingsToRows(d.settings);
      return new Map(d.provisions);
    },
    apply(tab, final, fromSheet, columns) {
      if (tab === 'ingredients') d.ingredients = merge.applyIngredients({ final, fromSheet, existing: d.ingredients, columns });
      else if (tab === 'recipes') {
        const next = merge.applyRecipes({ final, fromSheet, existing: d.recipes, favorites: [...d.favorites], columns, today: '2026-09-30' });
        d.recipes = next.recipes;
        d.favorites = new Set(next.favorites);
      } else if (tab === 'weeklyPlan') d.plan = merge.applyPlan({ final, fromSheet, entries: d.plan, columns });
      else if (tab === 'settings') d.settings = codec.settingsFromRows([...final.values()]);
      else d.provisions = new Map(final);
    },
  };
  return d;
}

export const TABS = /** @type {const} */ ([
  { key: 'recipes', name: 'Recipes' },
  { key: 'weeklyPlan', name: 'WeeklyPlan' },
  { key: 'provisions', name: 'Provisions' },
]);

export const SETTINGS_TAB = /** @type {const} */ ({ key: 'settings', name: 'Settings' });

export const INGREDIENTS_TAB = /** @type {const} */ ({ key: 'ingredients', name: 'Ingredients' });

/** An ingredient with defaults. */
export const ingredient = (id, extra = {}) => ({ id, name: id.replace(/-/g, ' '), plural: '', aisle: 'Pantry', onHand: false, ...extra });

/** runSync options with test defaults. */
export const syncOptions = (sheet, device, base, extra = {}) => ({
  api: sheet.api,
  spreadsheetId: 'S1',
  tabs: [...TABS],
  schemaCheck: {},
  autoAppendOptional: true,
  direction: 'bidirectional',
  base,
  local: device.adapter,
  ...extra,
});
