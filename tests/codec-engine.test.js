// Unit tests for the row codec (src/lib/sync/codec.js) and the pieces of
// src/lib/sync/engine.js that decide columns and row outcomes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as codec from '../src/lib/sync/codec.js';
import { fingerprint, reconcile, resolveColumns } from '../src/lib/sync/engine.js';
import { SCHEMA } from '../src/lib/schema.js';
import { recipe } from './fakes.js';

describe('codec', () => {
  it('round-trips Markdown steps with lists and paragraphs', () => {
    const steps = [
      { title: 'Prep', minutes: 5, text: 'Gather:\n\n1. **Salt**\n2. Oil\n\nThen rest.' },
      { title: 'Cook', minutes: 0, text: 'Sear.' },
    ];
    assert.deepEqual(codec.parseSteps(codec.formatSteps(steps)), steps);
  });
  it('round-trips method steps, including colons and multi-line text', () => {
    const steps = [
      { title: 'Sear', minutes: 8, text: 'Hot pan: very hot', critical: true },
      { title: 'Rest', minutes: 0, text: 'Wait.\nThen slice.' },
    ];
    assert.deepEqual(codec.parseSteps(codec.formatSteps(steps)), steps);
  });

  it('reads plain numbered steps typed in the sheet', () => {
    assert.deepEqual(codec.parseSteps('1. Boil water\n2) Add pasta'), [
      { title: 'Step 1', minutes: 0, text: 'Boil water' },
      { title: 'Step 2', minutes: 0, text: 'Add pasta' },
    ]);
  });

  it('reads ingredient groups and flat line lists, and rejects bad JSON', () => {
    const groups = [{ title: 'Main', category: '1 item', items: [{ id: 'beef', qty: 1, unit: 'lb', note: 'flank or ribeye', prep: 'sliced', optional: true }] }];
    assert.deepEqual(codec.parseIngredients(JSON.stringify(groups)), groups);
    assert.deepEqual(codec.parseIngredients('[{"id":"wild-trout","qty":"450g"}]'), [
      { title: 'Ingredients', category: '1 items', items: [{ id: 'wild-trout', qty: 450, unit: 'g' }] },
    ]);
    assert.deepEqual(codec.parseIngredients(''), []);
    assert.equal(codec.parseIngredients('not json'), null);
  });

  it('stores units in their canonical form and leaves out empty fields', () => {
    const [group] = codec.parseIngredients('[{"title":"Main","items":[{"id":"water","qty":2,"unit":"Cups","note":" ","prep":"","optional":false}]}]');
    assert.deepEqual(group.items, [{ id: 'water', qty: 2, unit: 'cup' }]);
  });

  it('skips nulls, bare values and lines without an ingredient id', () => {
    assert.deepEqual(codec.parseIngredients('[{"title":"Main","items":[null,"rice",{"text":"salt"},{"id":"salt"}]}]'), [
      { title: 'Main', category: '1 item', items: [{ id: 'salt' }] },
    ]);
    assert.deepEqual(codec.parseIngredients('[null,{"id":"salt"}]'), [
      { title: 'Ingredients', category: '1 items', items: [{ id: 'salt' }] },
    ]);
  });

  it('tells old-layout ingredient lines (text, no id) from new ones', () => {
    assert.equal(codec.isOldIngredientsJSON('[{"title":"Main","items":[{"qty":1,"text":"onion","tag":"Produce"}]}]'), true);
    assert.equal(codec.isOldIngredientsJSON('[{"name":"Wild Trout"}]'), true);
    assert.equal(codec.isOldIngredientsJSON('[{"title":"Main","items":[{"id":"onion","qty":1}]}]'), false);
    assert.equal(codec.isOldIngredientsJSON(''), false);
    assert.equal(codec.isOldIngredientsJSON('not json'), false);
  });

  it('round-trips ingredient rows, writing the aisle by its label', () => {
    const onion = { id: 'onion', name: 'onion', plural: 'onions', aisle: 'Fresh', onHand: true };
    const row = codec.ingredientToRow(onion);
    assert.deepEqual(row, { Ingredient_ID: 'onion', Name: 'onion', Plural: 'onions', Aisle: 'Meat & Seafood', On_Hand: true });
    assert.deepEqual(codec.ingredientFromRow(row, undefined, SCHEMA.ingredients), onion);
  });

  it('reads ingredient rows the way people type them', () => {
    const read = (row, existing) => codec.ingredientFromRow({ Ingredient_ID: 'rau-ram', ...row }, existing, SCHEMA.ingredients);
    assert.deepEqual(read({ Name: '  Rau  Răm ', Plural: '', Aisle: 'herbs', On_Hand: 'yes' }), {
      id: 'rau-ram', name: 'rau răm', plural: '', aisle: 'Herbs', onHand: true,
    });
    // A blank name falls back to the id; an unknown aisle keeps the one it had.
    const existing = { id: 'rau-ram', name: 'rau răm', plural: '', aisle: 'Herbs', onHand: false };
    assert.equal(read({ Name: '', Aisle: 'Aisle 9' }, existing).aisle, 'Herbs');
    assert.equal(read({ Name: '', Aisle: 'Herbs' }).name, 'rau ram');
    // Columns the sheet doesn't have leave the device's values alone.
    const partial = codec.ingredientFromRow({ Ingredient_ID: 'rau-ram', Name: 'rau răm' }, { ...existing, onHand: true }, ['Ingredient_ID', 'Name']);
    assert.equal(partial.onHand, true);
  });

  it('gives new recipes readable ids, accents folded', () => {
    assert.match(codec.newRecipeIdFor('Bún chả', new Set()), /^custom-bun-cha-[a-z0-9]{4}$/);
    assert.match(codec.newRecipeIdFor('Meat Omelet (Trứng Đúc)', new Set()), /^custom-meat-omelet-trung-duc-[a-z0-9]{4}$/);
    assert.match(codec.newRecipeIdFor('', new Set()), /^custom-recipe-[a-z0-9]{4}$/);
  });

  it('parses dates, statuses and departments the way people type them', () => {
    assert.equal(codec.isoDate('2026-10-21'), '2026-10-21');
    assert.equal(codec.isoDate('10/21/2026'), '2026-10-21');
    assert.equal(codec.isoDate(46300), '2026-10-05'); // Sheets serial: days since 1899-12-30
    assert.equal(codec.isoDate('soon'), '');
    assert.equal(codec.parseStatus('On hand'), 'owned');
    assert.equal(codec.parseStatus('In pantry'), 'owned'); // earlier builds
    assert.equal(codec.parseStatus(true), 'bought');
    assert.equal(codec.parseStatus(''), 'need');
    assert.equal(codec.parseDept('Seafood & Meat'), 'meat');
    assert.equal(codec.parseDept('Veg'), 'produce');
    assert.equal(codec.parseDept('anything else'), 'pantry');
    assert.equal(codec.parseDept('Other'), 'other');
  });

  it('keeps fields of unchanged cells and re-reads changed ones', () => {
    const existing = recipe('r1', 'Pasta', { prep: { label: 'Mise en place', text: 'Chop', icon: 'x', tone: 'tertiary' }, hero: 'hero.jpg', image: 'a.jpg' });
    const row = codec.recipeToRow(existing, new Set());
    row.Description = 'New description';
    const { recipe: next, favorite } = codec.recipeFromRow(row, existing, { columns: SCHEMA.recipes, favorites: new Set(), today: '2026-09-30' });
    assert.equal(next.description, 'New description');
    assert.deepEqual(next.prep, existing.prep);
    assert.equal(next.hero, 'hero.jpg', 'the hero shot stays while the image is unchanged');
    assert.equal(favorite, undefined, 'an unchanged flag leaves favorites alone');
  });

  it('does not write photos that are still waiting to upload', () => {
    const row = codec.recipeToRow(recipe('r1', 'Pasta', { image: 'data:image/jpeg;base64,AAAA' }), new Set());
    assert.equal(row.Image_URL, '');
  });

  it('only reads https image links from the sheet', () => {
    const read = (url) =>
      codec.recipeFromRow({ ...codec.recipeToRow(recipe('r1', 'Pasta'), new Set()), Image_URL: url }, undefined, {
        columns: SCHEMA.recipes,
        favorites: new Set(),
        today: '2026-09-30',
      }).recipe.image;
    assert.equal(read(' https://lh3.googleusercontent.com/d/abc '), 'https://lh3.googleusercontent.com/d/abc');
    for (const url of ['data:text/html;base64,PGgxPg==', 'data:image/jpeg;base64,AAAA', 'http://example.com/a.jpg', 'javascript:alert(1)', 'a.jpg']) {
      assert.equal(read(url), undefined, url);
    }
  });

  it('reads an optional, tidied category from the sheet', () => {
    const read = (category) =>
      codec.recipeFromRow({ ...codec.recipeToRow(recipe('r1', 'Pasta'), new Set()), Category: category }, undefined, {
        columns: SCHEMA.recipes,
        favorites: new Set(),
        today: '2026-09-30',
      }).recipe.badge.label;
    assert.equal(read(''), '', 'blank means no category');
    assert.equal(read('  sunday brunch '), 'Sunday Brunch');
    assert.equal(read('Dessert'), 'Dessert');
  });

  it('round-trips plan entries, dining out and notes', () => {
    const columns = SCHEMA.weeklyPlan;
    const read = (row) => codec.planFromRow(row, undefined, columns);
    for (const entry of [{ recipeId: 'r1' }, { diningOut: true }, { recipeId: 'r1', completed: true, notes: 'Guests' }]) {
      assert.deepEqual(read(codec.planToRow('2026-10-05', entry)), entry);
    }
    assert.deepEqual(read({ Date_ISO: '2026-10-05', Recipe_ID_Assigned: '', Custom_Notes: 'Dining out at Luigi’s' }), {
      diningOut: true,
      notes: 'Dining out at Luigi’s',
    });
    assert.equal(read({ Date_ISO: '2026-10-05', Day_Of_Week: 'Monday' }), null, 'a row that plans nothing');
  });

  it('rebuilds grocery weeks from provisions rows', () => {
    const rows = [
      { Week_Of: '2026-10-10', Item: 'Basil', Status: 'Bought', Line_Key: 'ing:basil' },
      { Week_Of: '2026-10-10', Item: 'Lemons', Status: 'To buy', Line_Key: 'ing:lemon', Added: '{"recipes":["tart"],"week":"3"}' },
      { Week_Of: '2026-10-10', Item: 'Eggs', Status: 'On hand', Line_Key: 'ing:egg' }, // this week: stock is the ingredient's
      { Week_Of: '2026-10-05', Item: 'Milk', Detail: '1 l', Department: 'Dairy', Status: 'To buy', Line_Key: 'custom:1' }, // typed in
      { Week_Of: '2026-10-03', Item: 'Salt', Status: 'On hand', Line_Key: 'ing:salt' }, // a past week's frozen stock
    ];
    const names = [];
    const idForName = (name, dept) => (names.push([name, dept]), 'milk');
    assert.deepEqual(codec.groceryFromRows(rows, { thisWeek: '2026-10-10', idForName }), {
      weeks: {
        '2026-10-10': { pushed: ['tart:lemon'], status: { basil: 'bought', lemon: 'need' }, added: { lemon: '3' } },
        '2026-10-03': { pushed: [], status: { milk: 'need' }, added: { milk: '1 l' }, stock: ['salt'] }, // the Monday row lands on its Saturday
      },
      every: [],
    });
    assert.deepEqual(names, [['Milk', 'dairy']]);
  });

  it('marks a past week with rows but nothing in stock as frozen', () => {
    const rows = [{ Week_Of: '2026-10-03', Item: 'Basil', Status: 'Bought', Line_Key: 'ing:basil' }];
    const { weeks } = codec.groceryFromRows(rows, { thisWeek: '2026-10-10', idForName: () => '' });
    assert.deepEqual(weeks['2026-10-03'].stock, []);
  });

  it('rebuilds every-week grocery items from provisions rows', () => {
    const row = (week, status) => ({ Week_Of: week, Item: 'Salt', Status: status, Line_Key: 'ing:salt', Added: '{"every":"1 box"}' });
    const read = (rows) => codec.groceryFromRows(rows, { thisWeek: '2026-10-03', idForName: () => '' }).every;
    assert.deepEqual(read([row('2026-10-03', 'To buy'), row('2026-10-10', 'To buy')]), [
      { ingredientId: 'salt', note: '1 box', status: 'need', doneWeek: '' },
    ]);
    assert.deepEqual(read([row('2026-10-10', 'Bought')]), [{ ingredientId: 'salt', note: '1 box', status: 'bought', doneWeek: '2026-10-10' }]);
  });

  it('writes one row per merged line, with what was added by hand', () => {
    const line = {
      key: 'ing:beef',
      ingredientId: 'beef',
      name: 'Beef',
      amount: '2 lb',
      optional: false,
      dept: 'meat',
      status: 'need',
      sources: [{ label: 'Mon: Phở', tone: 'paprika', note: 'eye round', recipeId: 'pho' }, { label: 'Stew', tone: 'neutral', recipeId: 'stew' }],
      pushed: ['stew'],
      added: undefined,
      every: '',
    };
    assert.deepEqual(codec.provisionToRow('2026-10-10', line), {
      Week_Of: '2026-10-10',
      Item: 'Beef',
      Detail: '2 lb',
      Department: 'Seafood & Meat',
      Status: 'To buy',
      Source: 'Mon: Phở (eye round), Stew',
      Line_Key: 'ing:beef',
      Added: '{"recipes":["stew"],"every":""}',
    });
    assert.equal(codec.provisionToRow('2026-10-10', { ...line, pushed: [], every: undefined }, true).Status, 'On hand');
    assert.equal(codec.provisionToRow('2026-10-10', { ...line, pushed: [], every: undefined }).Added, '');
  });

  it('moves Monday-keyed grocery weeks onto their Saturday', () => {
    assert.deepEqual(
      codec.rekeyGroceryWeeks({
        '2026-09-28': { pushed: ['tart:lemon'], status: { lemon: 'bought' }, added: { milk: '' }, stock: ['salt'] },
        '2026-09-26': { pushed: ['tart:lemon', 'pesto:basil'], status: { basil: 'need' }, added: {} },
        '2026-10-03': { pushed: [], status: {}, added: {} },
      }),
      {
        '2026-09-26': {
          pushed: ['tart:lemon', 'pesto:basil'],
          status: { basil: 'need', lemon: 'bought' },
          added: { milk: '' },
          stock: ['salt'],
        },
        '2026-10-03': { pushed: [], status: {}, added: {} },
      },
    );
  });
});

describe('resolveColumns', () => {
  const options = (extra = {}) => ({ autoAppendOptional: true, hasData: true, ...extra });

  it('finds columns by name in any order and spelling', () => {
    const plan = resolveColumns('weeklyPlan', ['recipe id assigned', 'Date_ISO', 'Notes?', 'Completed_Flag', 'Day_Of_Week', 'Custom_Notes'], options());
    assert.equal(plan.index.Recipe_ID_Assigned, 0);
    assert.equal(plan.index.Date_ISO, 1);
    assert.equal(plan.index.Custom_Notes, 5);
    assert.deepEqual(plan.conflicts, []);
    assert.deepEqual(plan.append, []);
  });

  it('adds missing optional columns after the last header', () => {
    const plan = resolveColumns('weeklyPlan', ['Date_ISO', 'Recipe_ID_Assigned'], options());
    assert.deepEqual(plan.append, ['Day_Of_Week', 'Completed_Flag', 'Custom_Notes']);
    assert.deepEqual([plan.index.Day_Of_Week, plan.index.Completed_Flag, plan.index.Custom_Notes], [2, 3, 4]);
  });

  it('flags missing required columns and likely renames once the tab has data', () => {
    assert.deepEqual(resolveColumns('weeklyPlan', ['Recipe_ID_Assigned'], options()).conflicts, ['Date_ISO']);
    // "Notes" looks like Custom_Notes, so it isn't silently added as a new column.
    assert.deepEqual(resolveColumns('weeklyPlan', ['Date_ISO', 'Recipe_ID_Assigned', 'Notes'], options()).conflicts, ['Custom_Notes']);
    assert.deepEqual(resolveColumns('weeklyPlan', ['Recipe_ID_Assigned'], options({ hasData: false })).conflicts, []);
  });

  it('follows the saved Column Conflicts decisions', () => {
    const saved = { headers: [], sample: [], map: { Custom_Notes: 'Notes' }, append: [], ignore: ['Day_Of_Week'], checkedAt: '' };
    const plan = resolveColumns('weeklyPlan', ['Date_ISO', 'Recipe_ID_Assigned', 'Notes'], options({ saved, autoAppendOptional: false }));
    assert.equal(plan.index.Custom_Notes, 2);
    assert.ok(!plan.columns.includes('Day_Of_Week'), 'ignored columns are neither read nor written');
    assert.deepEqual(plan.conflicts, ['Completed_Flag']);
  });
});

describe('reconcile', () => {
  const columns = ['Recipe_ID', 'Title'];
  const row = (id, title) => ({ Recipe_ID: id, Title: title });
  const sheetOf = (...rows) => ({ rows: new Map(rows.map((r, i) => [r.Recipe_ID, { index: i + 1, row: r }])), keyFixes: [] });
  const baseOf = (sheetRows, localRows = sheetRows) =>
    Object.fromEntries(sheetRows.map((r, i) => [r.Recipe_ID, [fingerprint(r, columns), fingerprint(localRows[i], columns)]]));

  it('applies each side’s changes, with the sheet winning a clash', () => {
    const synced = [row('a', 'A'), row('b', 'B'), row('c', 'C'), row('d', 'D')];
    const result = reconcile({
      sheet: sheetOf(row('a', 'A sheet'), row('b', 'B'), row('c', 'C sheet'), row('d', 'D'), row('e', 'E new in sheet')),
      local: new Map([['a', row('a', 'A')], ['b', row('b', 'B device')], ['c', row('c', 'C device')], ['f', row('f', 'F new on device')]]),
      base: baseOf(synced),
      columns,
      strategy: 'sync',
    });
    assert.deepEqual([...result.fromSheet].sort(), ['a', 'c', 'e']);
    assert.deepEqual(result.updates.map((u) => u.row.Title), ['B device']);
    assert.deepEqual(result.appends.map((r) => r.Title), ['F new on device']);
    assert.deepEqual(result.deletes, [4], 'd was deleted on the device and untouched in the sheet');
    assert.deepEqual([...result.final.keys()], ['a', 'b', 'c', 'e', 'f']);
  });
});
