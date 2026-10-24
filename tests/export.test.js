// The data export (src/lib/sheetsExport.js): every tab is built with the sync codec in the sheet's column order.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA } from '../src/lib/schema.js';
import { exportRows, exportSheets } from '../src/lib/sheetsExport.js';
import * as codec from '../src/lib/sync/codec.js';
import { ingredient, recipe } from './fakes.js';

const line = (extra = {}) => ({
  key: 'ing:pasta',
  ingredientId: 'pasta',
  name: 'Pasta',
  amount: '1 lb',
  optional: false,
  dept: 'pantry',
  status: 'need',
  sources: [{ label: 'Carbonara', tone: 'sage' }],
  pushed: [],
  added: undefined,
  every: undefined,
  ...extra,
});

const soup = recipe('soup', 'Soup', {
  image: 'data:image/jpeg;base64,AAAA',
  headsUps: [{ text: 'Soak the chickpeas.', daysBefore: 1 }],
  steps: [
    { title: 'Chop', minutes: 5, text: 'Chop the onion.' },
    { title: 'Simmer', minutes: 0, text: 'Simmer.\n- Stir often\n- Season' },
  ],
});

const data = {
  recipes: [soup, recipe('toast', 'Toast', { image: 'https://example.com/toast.jpg' })],
  favorites: ['toast'],
  ingredients: [ingredient('pasta', { plural: 'pastas', onHand: true })],
  plan: {
    '2026-10-21': { diningOut: true },
    '2026-10-20': { recipeId: 'soup' },
    '2026-10-22': { notes: 'Guests at 7' },
    '2026-10-23': { completed: true },
    '2026-10-24': {},
  },
  provisions: [{ week: '2026-10-17', line: line() }, { week: '2026-10-17', line: line({ key: 'ing:rice', name: 'Rice' }), inStock: true }],
  settings: { tagColors: { Vegetarian: 'sage' }, returnToPlanner: false, weekStartDay: 6 },
};

/** A tab's data rows as the codec's Row objects, keyed by header. @param {keyof typeof SCHEMA} tab */
const asRows = (tab) => exportRows(data)[tab].slice(1).map((values) => Object.fromEntries(SCHEMA[tab].map((c, i) => [c, values[i]])));

describe('export rows', () => {
  it('start with the sheet headers, and every row has one value per column', () => {
    const rows = exportRows(data);
    for (const tab of Object.keys(SCHEMA)) {
      assert.deepEqual(rows[tab][0], SCHEMA[tab], tab);
      for (const row of rows[tab]) assert.equal(row.length, SCHEMA[tab].length, `${tab}: ${row[0]}`);
    }
    assert.equal(rows.recipes.length, 3);
    assert.equal(rows.provisions.length, 3);
  });

  it('write a recipe the way sync does: heads-ups, step minutes and multi-line steps read back', () => {
    const [row] = asRows('recipes');
    assert.equal(row.Heads_Up_JSON, '[{"text":"Soak the chickpeas.","daysBefore":1}]');
    const { recipe: back } = codec.recipeFromRow(row, undefined, {
      columns: SCHEMA.recipes,
      favorites: new Set(),
      today: '2026-10-20',
    });
    assert.deepEqual(back.steps, soup.steps);
    assert.deepEqual(back.headsUps, soup.headsUps);
    assert.deepEqual(back.ingredients, soup.ingredients);
  });

  it('leave an uploaded photo (a data: URL that only lives on this device) out, and flag favourites', () => {
    const [first, second] = asRows('recipes');
    assert.equal(first.Image_URL, '');
    assert.equal(second.Image_URL, 'https://example.com/toast.jpg');
    assert.deepEqual([first.Favorite_Flag, second.Favorite_Flag], [false, true]);
  });

  it('keep every plan day with something in it, in date order, with its notes', () => {
    const plan = asRows('weeklyPlan');
    assert.deepEqual(plan.map((r) => r.Date_ISO), ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
    assert.equal(plan[1].Custom_Notes, codec.planToRow('2026-10-21', { diningOut: true }).Custom_Notes);
    assert.equal(plan[2].Custom_Notes, 'Guests at 7');
    assert.equal(plan[3].Completed_Flag, true);
  });

  it('write grocery rows with their status, and in-stock lines as At home', () => {
    const [need, home] = asRows('provisions');
    assert.deepEqual([need.Line_Key, need.Status], ['ing:pasta', codec.provisionToRow('2026-10-17', line()).Status]);
    assert.equal(home.Status, codec.provisionToRow('2026-10-17', line(), true).Status);
  });

  it('write the settings rows, tag colours included', () => {
    const rows = asRows('settings');
    assert.ok(rows.some((r) => r.Section === codec.TAG_COLOUR_SECTION && r.Name === 'Vegetarian'));
    assert.ok(rows.some((r) => r.Section === codec.RETURN_TO_PLANNER.Section && r.Value === false));
  });
});

describe('export sheets', () => {
  const tabs = { ingredients: ' Pantry ', weeklyPlan: 'Plan', recipes: 'Dishes', provisions: 'Shop', settings: 'Prefs' };

  it('use the mapped tab names, trimmed, in the sync order', () => {
    const names = exportSheets(data, { tabs, syncProvisions: true }).map((s) => s.name);
    assert.deepEqual(names, ['Pantry', 'Plan', 'Dishes', 'Shop', 'Prefs']);
  });

  it('leave the grocery tab out when it does not sync', () => {
    const names = exportSheets(data, { tabs, syncProvisions: false }).map((s) => s.name);
    assert.deepEqual(names, ['Pantry', 'Plan', 'Dishes', 'Prefs']);
  });
});
