// The device side of a sync pass: which rows are sent, what device data a merge becomes, when passes run, and the
// messages for a failed one (src/lib/sync/deviceMerge.js, schedule.js, errors.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA } from '../src/lib/schema.js';
import * as codec from '../src/lib/sync/codec.js';
import * as merge from '../src/lib/sync/deviceMerge.js';
import * as schedule from '../src/lib/sync/schedule.js';
import { errorMessage, versionMessage } from '../src/lib/sync/errors.js';
import { ingredient, recipe } from './fakes.js';

const grocery = (extra = {}) => ({
  key: 'ing:milk', ingredientId: 'milk', name: 'Milk', amount: '1 l', optional: false, dept: 'dairy', status: 'need',
  sources: [], pushed: [], added: undefined, every: undefined, ...extra,
});

describe('rows the device sends', () => {
  it('flag favourites on recipe rows', () => {
    const rows = merge.recipeRows([recipe('a', 'A'), recipe('b', 'B')], ['b']);
    assert.deepEqual([...rows.keys()], ['a', 'b']);
    assert.deepEqual([rows.get('a').Favorite_Flag, rows.get('b').Favorite_Flag], [false, true]);
  });

  it('send plan days that have something in them, in date order', () => {
    const rows = merge.planRows({ '2026-10-22': { diningOut: true }, '2026-10-20': { recipeId: 'a' }, '2026-10-21': {}, '2026-10-23': { completed: true } });
    assert.deepEqual([...rows.keys()], ['2026-10-20', '2026-10-22', '2026-10-23']);
  });

  it('send one grocery row per line, keyed by week and line, with in-stock lines as At home', () => {
    const rows = merge.provisionRows([
      { week: '2026-10-17', lines: [grocery(), grocery({ key: 'ing:egg', name: 'Egg' })], hidden: [grocery({ key: 'ing:salt', name: 'Salt' })] },
      { week: '2026-10-24', lines: [grocery()], hidden: [] },
    ]);
    assert.deepEqual([...rows.keys()], ['2026-10-17|ing:milk', '2026-10-17|ing:egg', '2026-10-17|ing:salt', '2026-10-24|ing:milk']);
    assert.equal(rows.get('2026-10-17|ing:salt').Status, codec.provisionToRow('2026-10-17', grocery(), true).Status);
    assert.equal(rows.get('2026-10-17|ing:milk').Status, codec.provisionToRow('2026-10-17', grocery()).Status);
  });
});

describe('device data after a merge', () => {
  const columns = SCHEMA.ingredients;

  it('keeps an ingredient only the device has, reads one from the sheet on top of the device version, and drops one that is gone', () => {
    const [a, b, d] = [ingredient('a'), ingredient('b', { plural: 'bees' }), ingredient('d')];
    const final = new Map([
      ['a', codec.ingredientToRow(a)],
      ['b', codec.ingredientToRow({ ...b, name: 'bumblebee' })],
      ['c', codec.ingredientToRow(ingredient('c'))],
    ]);
    const list = merge.applyIngredients({ final, fromSheet: new Set(['b', 'c']), existing: [a, b, d], columns });
    assert.deepEqual(list.map((i) => i.id), ['a', 'b', 'c']);
    assert.equal(list[0], a);
    assert.equal(list[1].name, 'bumblebee');
  });

  it('keeps device-only recipes and their favourites, and follows the sheet for the rest', () => {
    const [r1, r2, r3, r4] = ['r1', 'r2', 'r3', 'r4'].map((id) => recipe(id, id.toUpperCase()));
    const deviceFavorites = new Set(['r1', 'r3']);
    const final = new Map([
      ['r1', codec.recipeToRow(r1, deviceFavorites)],
      ['r2', codec.recipeToRow(r2, new Set(['r2']))], // favourited in the sheet
      ['r3', codec.recipeToRow(r3, new Set())], // un-favourited in the sheet
    ]);
    const next = merge.applyRecipes({
      final, fromSheet: new Set(['r2', 'r3']), existing: [r1, r2, r3, r4], favorites: [...deviceFavorites], columns: SCHEMA.recipes, today: '2026-10-20',
    });
    assert.deepEqual(next.recipes.map((r) => r.id), ['r1', 'r2', 'r3']);
    assert.equal(next.recipes[0], r1);
    assert.deepEqual(next.favorites, ['r1', 'r2']);
  });

  it('keeps a recipe column the sheet cannot hold when the sheet row changes', () => {
    const r = recipe('r1', 'Pasta');
    const row = { ...codec.recipeToRow(r, new Set()), Title: 'Pasta Night' };
    const next = merge.applyRecipes({ final: new Map([['r1', row]]), fromSheet: new Set(['r1']), existing: [r], favorites: [], columns: SCHEMA.recipes, today: '2026-10-20' });
    assert.equal(next.recipes[0].title, 'Pasta Night');
    assert.equal(next.recipes[0].steps[0].minutes, 10);
  });

  it('keeps a plan day only the device has, takes sheet rows, and drops days that are gone or that plan nothing', () => {
    const entries = { '2026-10-20': { recipeId: 'a' }, '2026-10-21': { recipeId: 'b' }, '2026-10-22': { recipeId: 'c' }, '2026-10-24': { diningOut: true } };
    const final = new Map([
      ['2026-10-20', codec.planToRow('2026-10-20', entries['2026-10-20'])],
      ['2026-10-21', codec.planToRow('2026-10-21', { recipeId: 'z' })],
      ['2026-10-22', { Date_ISO: '2026-10-22', Recipe_ID_Assigned: '', Completed_Flag: false, Custom_Notes: '' }],
    ]);
    const next = merge.applyPlan({ final, fromSheet: new Set(['2026-10-21', '2026-10-22']), entries, columns: SCHEMA.weeklyPlan });
    assert.deepEqual(next, { '2026-10-20': { recipeId: 'a' }, '2026-10-21': { recipeId: 'z' } });
  });

  describe('grocery lists', () => {
    const thisWeek = '2026-10-17';
    const since = '2026-08-29';
    const row = (week, key, status = 'To buy', extra = {}) => ({ Week_Of: week, Item: key, Status: status, Line_Key: `ing:${key}`, ...extra });
    const list = (status) => ({ pushed: [], status, added: {} });

    it('rebuilds the synced weeks from the rows, and keeps weeks too old to sync as they were', () => {
      const old = list({ rice: 'bought' });
      const { weeks } = merge.applyGrocery({
        final: new Map([['a', row('2026-10-17', 'milk')]]),
        since, thisWeek, idForName: () => '',
        weeks: { '2026-08-22': old, '2026-10-10': list({ egg: 'need' }) },
        every: [],
      });
      assert.deepEqual(Object.keys(weeks).sort(), ['2026-08-22', '2026-10-17']);
      assert.equal(weeks['2026-08-22'], old);
      assert.deepEqual(weeks['2026-10-17'].status, { milk: 'need' });
    });

    it('keeps an old bought every-week item unless the sheet has it, and drops a recent one the sheet lacks', () => {
      const item = (ingredientId, status, doneWeek) => ({ ingredientId, note: '', status, doneWeek });
      const every = merge.applyGrocery({
        final: new Map([['a', row('2026-10-17', 'salt', 'To buy', { Added: '{"every":"1 box"}' })]]),
        since, thisWeek, idForName: () => '',
        weeks: {},
        every: [item('rice', 'bought', '2026-08-22'), item('salt', 'bought', '2026-08-22'), item('oil', 'bought', '2026-10-10'), item('tea', 'need', '')],
      }).every;
      assert.deepEqual(every.map((i) => [i.ingredientId, i.status]), [['salt', 'need'], ['rice', 'bought']]);
    });

    it('names an ingredient typed into the sheet through idForName, with the department the row says', () => {
      const asked = [];
      const { weeks } = merge.applyGrocery({
        final: new Map([['a', { Week_Of: '2026-10-17', Item: 'Oat milk', Department: 'Dairy', Status: 'To buy', Line_Key: 'custom:1', Detail: '2' }]]),
        since, thisWeek, idForName: (name, dept) => (asked.push([name, dept]), 'oat-milk'),
        weeks: {}, every: [],
      });
      assert.deepEqual(asked, [['Oat milk', 'dairy']]);
      assert.deepEqual(weeks['2026-10-17'].added, { 'oat-milk': '2' });
    });
  });
});

describe('what a pass covers', () => {
  const now = new Date(2026, 9, 23, 12); // Fri 23 Oct; weeks start on Saturday, so this week began 17 Oct

  it('syncs grocery lists back to the 8th week counting this one', () => {
    assert.equal(schedule.provisionsSince(now), '2026-08-29');
    assert.deepEqual(
      schedule.groceryWeeks(['2026-08-22', '2026-08-29', '2026-11-07'], now),
      ['2026-08-29', '2026-10-17', '2026-11-07'],
    );
  });

  it('always includes this week, once, in order', () => {
    assert.deepEqual(schedule.groceryWeeks([], now), ['2026-10-17']);
    assert.deepEqual(schedule.groceryWeeks(['2026-10-17', '2026-10-24', '2026-10-10'], now), ['2026-10-10', '2026-10-17', '2026-10-24']);
  });
});

describe('when passes run', () => {
  it('queues options for after the running pass, and the follow-up is quiet only if every request was', () => {
    assert.deepEqual(schedule.mergeQueued(null, { quiet: true }), { quiet: true });
    assert.deepEqual(schedule.mergeQueued(null, {}), { quiet: false });
    assert.equal(schedule.mergeQueued({ quiet: true }, { quiet: true }).quiet, true);
    assert.equal(schedule.mergeQueued({ quiet: true }, {}).quiet, false);
    assert.equal(schedule.mergeQueued({ quiet: false }, { quiet: true }).quiet, false);
  });

  it('does not lose a person’s choice to a later request', () => {
    const queued = schedule.mergeQueued({ choice: 'merge', quiet: false }, { quiet: true });
    assert.deepEqual(queued, { choice: 'merge', quiet: false });
    assert.equal(schedule.mergeQueued({ choice: 'merge' }, { choice: 'sheetOnly' }).choice, 'sheetOnly');
  });

  it('stores the sync base only while everything on screen is also stored (an empty base is always safe)', () => {
    assert.equal(schedule.canStoreBase({ initialized: true, allSaved: true }), true);
    assert.equal(schedule.canStoreBase({ initialized: true, allSaved: false }), false);
    assert.equal(schedule.canStoreBase({ initialized: false, allSaved: false }), true);
  });

  const ready = { instantPush: true, signedIn: true, initialized: true, waitingOnPerson: false, changed: true };

  it('pushes an edit only with Instant Push on, signed in, set up, nobody being asked something, and a change', () => {
    assert.equal(schedule.shouldSchedulePush(ready), true);
    for (const off of ['instantPush', 'signedIn', 'initialized', 'changed']) assert.equal(schedule.shouldSchedulePush({ ...ready, [off]: false }), false, off);
    assert.equal(schedule.shouldSchedulePush({ ...ready, waitingOnPerson: true }), false);
  });

  it('checks again when the push timer fires', () => {
    assert.equal(schedule.shouldRunPush({ initialized: true, waitingOnPerson: false, changed: true }), true);
    assert.equal(schedule.shouldRunPush({ initialized: true, waitingOnPerson: false, changed: false }), false); // a pass caught up
    assert.equal(schedule.shouldRunPush({ initialized: true, waitingOnPerson: true, changed: true }), false);
    assert.equal(schedule.shouldRunPush({ initialized: false, waitingOnPerson: false, changed: true }), false);
  });

  it('syncs on return only when idle, set up, and the last pass is older than 20 seconds', () => {
    const at = Date.parse('2026-10-23T12:00:00Z');
    const state = { busy: false, initialized: true, lastSyncedAt: '2026-10-23T11:59:30Z', now: at };
    assert.equal(schedule.shouldSyncOnFocus(state), true);
    assert.equal(schedule.shouldSyncOnFocus({ ...state, lastSyncedAt: '2026-10-23T11:59:41Z' }), false);
    assert.equal(schedule.shouldSyncOnFocus({ ...state, lastSyncedAt: '2026-10-23T11:59:40Z' }), false); // exactly 20 s
    assert.equal(schedule.shouldSyncOnFocus({ ...state, lastSyncedAt: null }), true);
    assert.equal(schedule.shouldSyncOnFocus({ ...state, busy: true }), false);
    assert.equal(schedule.shouldSyncOnFocus({ ...state, initialized: false }), false);
  });
});

describe('failed pass messages', () => {
  const messages = {
    sessionEnded: 'ended', noAccess: 'no access', notFound: 'not found', busy: 'busy', offline: 'offline',
    googleSaid: (m) => `google: ${m}`, syncFailed: 'failed',
    newerVersion: 'newer', olderVersion: 'older',
  };
  const api = (status, message = 'x') => Object.assign(new Error(message), { status });

  it('maps a Google status to a plain-language message', () => {
    const table = [[401, 'ended'], [403, 'no access'], [404, 'not found'], [429, 'busy'], [500, 'busy'], [503, 'busy'], [0, 'offline'], [400, 'google: x'], [409, 'google: x']];
    for (const [status, expected] of table) assert.equal(errorMessage(api(status), messages), expected, String(status));
  });

  it('shows another error’s own message, and a fallback for something that is not an error', () => {
    assert.equal(errorMessage(new Error('Disk full'), messages), 'Disk full');
    assert.equal(errorMessage('boom', messages), 'failed');
    assert.equal(errorMessage(null, messages), 'failed');
  });

  it('says whether a spreadsheet in another layout is newer or older', () => {
    assert.equal(versionMessage(3, 2, messages), 'newer');
    assert.equal(versionMessage(1, 2, messages), 'older');
    assert.equal(versionMessage(0, 2, messages), 'older');
  });
});
