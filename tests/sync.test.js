// Full sync passes (src/lib/sync/run.js) against an in-memory spreadsheet.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBase, runSync } from '../src/lib/sync/run.js';
import { SCHEMA_VERSION } from '../src/lib/schema.js';
import { SETTINGS_TAB, TABS, fakeDevice, fakeSheet, recipe, syncOptions } from './fakes.js';

const RECIPE_HEADERS = ['Recipe_ID', 'Title', 'Ingredients_JSON', 'Method_Steps'];

describe('a spreadsheet kept in sync over several passes', () => {
  // Each step builds on the previous one, like a real spreadsheet over time.
  const sheet = fakeSheet();
  const device = fakeDevice({
    recipes: [recipe('r1', 'Pasta'), recipe('r2', 'Soup')],
    favorites: ['r2'],
    plan: { '2026-10-05': { recipeId: 'r1' }, '2026-10-06': { diningOut: true } },
    provisions: [{ Week_Of: '2026-10-05', Item: 'Milk', Detail: '1 l', Department: 'Dairy', Status: 'To buy', Source: 'Added by you', Line_Key: 'custom:1' }],
  });
  let base = emptyBase('S1');
  const sync = async () => {
    const result = await runSync(syncOptions(sheet, device, base));
    assert.equal(result.status, 'done');
    base = result.base;
    return result;
  };
  const cell = (tab, row, header) => {
    const grid = sheet.find(tab).grid;
    return [grid[row], grid[0].indexOf(header)];
  };

  it('fills an empty spreadsheet: tabs, headers and rows', async () => {
    const result = await sync();
    assert.deepEqual(sheet.state.tabs.map((t) => t.title), ['Recipes', 'WeeklyPlan', 'Provisions']);
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Pasta', 'Soup']);
    assert.deepEqual(sheet.column('Recipes', 'Favorite_Flag'), [false, true]);
    assert.deepEqual(sheet.column('WeeklyPlan', 'Custom_Notes'), ['', 'Dining out']);
    assert.deepEqual(sheet.column('Provisions', 'Item'), ['Milk']);
    assert.equal(result.pushed, 5);
  });

  it('writes nothing when nothing changed', async () => {
    const writes = sheet.calls.writes;
    const result = await sync();
    assert.equal(result.pushed, 0);
    assert.equal(result.pulled, 0);
    assert.equal(sheet.calls.writes, writes);
  });

  it('pulls a sheet edit and keeps details the sheet cannot hold', async () => {
    const [row, i] = cell('Recipes', 1, 'Title');
    row[i] = 'Pasta Night';
    const result = await sync();
    assert.equal(result.pulled, 1);
    assert.equal(result.pushed, 0);
    const r1 = device.recipes.find((r) => r.id === 'r1');
    assert.equal(r1.title, 'Pasta Night');
    assert.equal(r1.steps[0].minutes, 10);
  });

  it('pushes a device edit to just that row', async () => {
    device.recipes[1] = { ...device.recipes[1], description: 'Hearty' };
    const before = sheet.calls.ranges.length;
    const result = await sync();
    assert.equal(result.pushed, 1);
    assert.deepEqual(sheet.calls.ranges.slice(before), ["'Recipes'!A3"]);
    assert.deepEqual(sheet.column('Recipes', 'Description'), ['d', 'Hearty']);
  });

  it('lets the sheet win when both sides edited the same row', async () => {
    const [row, i] = cell('Recipes', 2, 'Description');
    row[i] = 'From sheet';
    device.recipes[1] = { ...device.recipes[1], description: 'From device' };
    const result = await sync();
    assert.equal(device.recipes[1].description, 'From sheet');
    assert.equal(result.pushed, 0);
    assert.deepEqual(sheet.column('Recipes', 'Description'), ['d', 'From sheet']);
  });

  it('keeps extra sheet columns lined up with their rows through deletes and appends', async () => {
    const grid = sheet.find('Recipes').grid;
    grid[0][20] = 'My_Rating';
    grid[1][20] = 5; // Pasta
    grid[2][20] = 3; // Soup
    device.recipes = device.recipes.filter((r) => r.id !== 'r1');
    device.recipes.push(recipe('r3', 'Tacos'));
    await sync();
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Soup', 'Tacos']);
    assert.deepEqual(sheet.column('Recipes', 'My_Rating'), [3, '']);
  });

  it('drops rows deleted in the sheet and gives typed-in rows an ID', async () => {
    const grid = sheet.find('Recipes').grid;
    const headers = grid[0];
    grid.splice(1, 1); // delete Soup
    const typed = [];
    typed[headers.indexOf('Title')] = 'Typed In Sheet';
    typed[headers.indexOf('Ingredients_JSON')] = '[{"name":"Rice","qty":"200g","dept":"Pantry"}]';
    typed[headers.indexOf('Method_Steps')] = '1. Rinse rice\n2. Cook (15 min): Simmer';
    grid.push(typed);

    await sync();
    assert.deepEqual(device.recipes.map((r) => r.title), ['Tacos', 'Typed In Sheet']);
    const added = device.recipes[1];
    assert.match(added.id, /^custom-typed-in-sheet-/);
    assert.equal(sheet.column('Recipes', 'Recipe_ID')[1], added.id);
    assert.deepEqual(added.ingredients[0].items[0], { qty: 200, unit: 'g', text: 'Rice', tag: 'Pantry' });
    assert.deepEqual(
      added.steps.map((s) => [s.title, s.minutes, s.text]),
      [['Step 1', 0, 'Rinse rice'], ['Cook', 15, 'Simmer']],
    );
    // Only the ID cell was written; the typed cells stay exactly as typed.
    assert.equal(sheet.column('Recipes', 'Method_Steps')[1], '1. Rinse rice\n2. Cook (15 min): Simmer');
  });

  it('does not push parsed sheet rows back in a normalized form', async () => {
    const result = await sync();
    assert.equal(result.pushed, 0);
  });

  it('syncs grocery lines by week and line key', async () => {
    const [row, i] = cell('Provisions', 1, 'Status');
    row[i] = 'Bought';
    await sync();
    assert.equal(device.provisions.get('2026-10-05|custom:1').Status, 'Bought');
  });
});

describe('first sync', () => {
  it('asks when both sides have data, then merges with the sheet winning overlaps', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', ''], ['shared', 'Sheet version', '[]', '']] });
    const device = fakeDevice({ recipes: [recipe('shared', 'Device version'), recipe('b', 'Device B')] });
    const options = { tabs: [TABS[0]] };

    const ask = await runSync(syncOptions(sheet, device, emptyBase('S1'), options));
    assert.equal(ask.status, 'choose');
    assert.equal(ask.sheet.recipes, 2);
    assert.equal(ask.device.recipes, 2);
    assert.equal(sheet.calls.writes, 0, 'nothing is written before the choice');

    const merged = await runSync(syncOptions(sheet, device, emptyBase('S1'), { ...options, choice: 'merge' }));
    assert.equal(merged.status, 'done');
    assert.deepEqual(device.recipes.map((r) => r.title), ['Sheet A', 'Sheet version', 'Device B']);
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Sheet A', 'Sheet version', 'Device B']);
    assert.ok(sheet.find('Recipes').grid[0].includes('Description'), 'missing optional columns are added');
  });

  it('"use the spreadsheet only" replaces the device', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const device = fakeDevice({ recipes: [recipe('b', 'Device B')] });
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]], choice: 'sheetOnly' }));
    assert.equal(result.status, 'done');
    assert.deepEqual(device.recipes.map((r) => r.title), ['Sheet A']);
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Sheet A']);
  });

  it('does not ask when only one side has data', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const device = fakeDevice();
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]] }));
    assert.equal(result.status, 'done');
    assert.deepEqual(device.recipes.map((r) => r.title), ['Sheet A']);
  });
});

describe('clearing device data (switching dev modes)', () => {
  // Why env.js clears the sync base together with the data.
  const setUp = async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ recipes: [recipe('r1', 'Pasta'), recipe('r2', 'Soup')] });
    const { base } = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]] }));
    return { sheet, base };
  };

  it('an empty device with the old sync base would delete the sheet’s rows', async () => {
    const { sheet, base } = await setUp();
    await runSync(syncOptions(sheet, fakeDevice(), base, { tabs: [TABS[0]] }));
    assert.deepEqual(sheet.column('Recipes', 'Title'), []);
  });

  it('an empty device without a sync base pulls the sheet back instead', async () => {
    const { sheet } = await setUp();
    const device = fakeDevice();
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]] }));
    assert.equal(result.status, 'done');
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Pasta', 'Soup']);
    assert.deepEqual(device.recipes.map((r) => r.title), ['Pasta', 'Soup']);
  });
});

describe('sheet layout and options', () => {
  it('reads real date cells (serial numbers) and checkbox flags', async () => {
    const sheet = fakeSheet({
      WeeklyPlan: [['Date_ISO', 'Day_Of_Week', 'Recipe_ID_Assigned', 'Completed_Flag', 'Custom_Notes'], [46300, 'x', 'r9', true, 'Birthday']],
    });
    const device = fakeDevice();
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[1]] }));
    assert.equal(result.status, 'done');
    const [iso] = Object.keys(device.plan);
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(device.plan[iso], { recipeId: 'r9', completed: true, notes: 'Birthday' });
  });

  it('pauses on a renamed required column until it is mapped', async () => {
    const rows = [['Recipe_ID', 'Title', 'Ingredients_JSON', 'Preparation_Steps'], ['a', 'A', '[]', '1. Go: now']];
    const sheet = fakeSheet({ Recipes: rows });
    const device = fakeDevice();
    const options = { tabs: [TABS[0]] };

    const paused = await runSync(syncOptions(sheet, device, emptyBase('S1'), options));
    assert.equal(paused.status, 'conflict');
    assert.deepEqual(paused.columns, ['Method_Steps']);

    const schemaCheck = {
      recipes: { headers: rows[0], sample: [], map: { Method_Steps: 'Preparation_Steps' }, append: [], ignore: [], checkedAt: '' },
    };
    const mapped = await runSync(syncOptions(sheet, device, emptyBase('S1'), { ...options, schemaCheck }));
    assert.equal(mapped.status, 'done');
    assert.equal(device.recipes[0].steps[0].title, 'Go');
    assert.ok(!sheet.find('Recipes').grid[0].includes('Method_Steps'), 'the mapped column is not added again');
  });

  it('push-only mirrors the device into the sheet', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['x', 'Only in sheet', '[]', '']] });
    const device = fakeDevice({ recipes: [recipe('b', 'Device B')] });
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]], direction: 'pushOnly' }));
    assert.equal(result.status, 'done');
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Device B']);
    assert.deepEqual(device.recipes.map((r) => r.title), ['Device B']);
  });

  it('grows the grid for many new rows', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS] });
    sheet.find('Recipes').rowCount = 5;
    const device = fakeDevice({ recipes: Array.from({ length: 12 }, (_, i) => recipe(`r${i}`, `R${i}`)) });
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]] }));
    assert.equal(result.status, 'done');
    assert.equal(sheet.column('Recipes', 'Title').length, 12);
  });

  it('handles tab names with apostrophes', async () => {
    const sheet = fakeSheet();
    const device = fakeDevice({ recipes: [recipe('r1', 'Pasta')] });
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [{ key: 'recipes', name: "Mum's Recipes" }] }));
    assert.equal(result.status, 'done');
    assert.deepEqual(sheet.column("Mum's Recipes", 'Title'), ['Pasta']);
  });
});

describe('mirror mode (push-only)', () => {
  const push = { tabs: [TABS[0]], direction: 'pushOnly' };

  it('confirms before emptying a spreadsheet that has data into an empty device', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const device = fakeDevice();

    const ask = await runSync(syncOptions(sheet, device, emptyBase('S1'), push));
    assert.equal(ask.status, 'choose');
    assert.equal(ask.mirror, true);
    assert.equal(ask.sheet.recipes, 1);
    assert.equal(ask.device.recipes, 0);
    assert.equal(sheet.calls.writes + sheet.calls.batch, 0, 'nothing is changed before the confirmation');

    const done = await runSync(syncOptions(sheet, device, emptyBase('S1'), { ...push, choice: 'confirm' }));
    assert.equal(done.status, 'done');
    assert.deepEqual(sheet.column('Recipes', 'Title'), []);
  });

  it('restoring switches to bidirectional and fills the empty device from the sheet', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const device = fakeDevice();
    // What restoreFromSheet() does: direction → bidirectional, choice → sheetOnly.
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [TABS[0]], choice: 'sheetOnly' }));
    assert.equal(result.status, 'done');
    assert.deepEqual(device.recipes.map((r) => r.title), ['Sheet A']);
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['Sheet A']);
  });

  it('ignores the always-present settings rows when checking the device is empty', async () => {
    const sheet = fakeSheet({
      Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']],
      Settings: [['Section', 'Name', 'Value']],
    });
    const options = { ...push, tabs: [TABS[0], SETTINGS_TAB] };
    const ask = await runSync(syncOptions(sheet, fakeDevice(), emptyBase('S1'), options));
    assert.equal(ask.status, 'choose');
    assert.equal(ask.mirror, true);
  });

  it('does not ask when the device has data, or the spreadsheet is empty', async () => {
    const full = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const pushed = await runSync(syncOptions(full, fakeDevice({ recipes: [recipe('b', 'Device B')] }), emptyBase('S1'), push));
    assert.equal(pushed.status, 'done');
    assert.deepEqual(full.column('Recipes', 'Title'), ['Device B']);

    const empty = fakeSheet({ Recipes: [RECIPE_HEADERS] });
    const none = await runSync(syncOptions(empty, fakeDevice(), emptyBase('S1'), push));
    assert.equal(none.status, 'done');
  });

  it('does not ask again after the first sync', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Sheet A', '[]', '']] });
    const device = fakeDevice();
    const first = await runSync(syncOptions(sheet, device, emptyBase('S1'), { ...push, choice: 'confirm' }));
    sheet.find('Recipes').grid.push(['x', 'Added later', '[]', '']);
    const next = await runSync(syncOptions(sheet, device, first.base, push));
    assert.equal(next.status, 'done');
    assert.deepEqual(sheet.column('Recipes', 'Title'), []);
  });

  it('overwrites sheet edits, never pulls, and removes rows the device lacks', async () => {
    const sheet = fakeSheet({ Recipes: [RECIPE_HEADERS, ['a', 'Edited in sheet', '[]', ''], ['x', 'Only in sheet', '[]', '']] });
    const device = fakeDevice({ recipes: [recipe('a', 'From device')] });
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), push));
    assert.equal(result.pulled, 0);
    assert.deepEqual(sheet.column('Recipes', 'Title'), ['From device']);
    assert.deepEqual(device.recipes.map((r) => r.title), ['From device']);
  });

  it('removes unknown [Settings] rows and stamps the device schema version', async () => {
    const sheet = fakeSheet({
      Settings: [['Section', 'Name', 'Value'], ['Schema', 'Version', 0], ['Preference', 'Someone else', 'TRUE']],
    });
    const device = fakeDevice();
    const result = await runSync(syncOptions(sheet, device, emptyBase('S1'), { tabs: [SETTINGS_TAB], direction: 'pushOnly' }));
    assert.equal(result.status, 'done');
    assert.ok(!sheet.column('Settings', 'Name').includes('Someone else'));
    const version = sheet.column('Settings', 'Value')[sheet.column('Settings', 'Name').indexOf('Version')];
    assert.equal(Number(version), SCHEMA_VERSION);
  });
});
