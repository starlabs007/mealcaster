// What the Grocery screen shows (groceryView.js): counts and completion, sections and aisle tabs, per-dinner counts, the
// shared text, and the store-mode menu.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activeAisle, aisleTabs, groceryStats, sectionsOf, shareText, sourceCounts, storeMenuPlan } from '../src/lib/groceryView.js';
import { aisleFor } from '../src/lib/ingredients.js';

const line = (name, status, dept = 'produce', extra = {}) => ({ name, status, dept, sources: [], ...extra });
const departments = [{ id: 'produce' }, { id: 'dairy' }, { id: 'pantry' }];

describe('counts and completion', () => {
  it('has nothing listed and 0% for an empty list', () => {
    const s = groceryStats([]);
    assert.equal(s.nothingListed, true);
    assert.equal(s.allBought, false);
    assert.equal(s.completion, 0);
  });

  it('counts a partial list: bought and skipped are handled, to buy is not', () => {
    const s = groceryStats([line('a', 'need'), line('b', 'bought'), line('c', 'skipped'), line('d', 'need')]);
    assert.deepEqual([s.toBuy, s.bought, s.skipped], [2, 1, 1]);
    assert.equal(s.completion, 50);
    assert.equal(s.allBought, false);
    assert.equal(s.nothingListed, false);
    assert.deepEqual(s.shopping.map((l) => l.name), ['a', 'd']);
    assert.deepEqual(s.acquired.map((l) => l.name), ['b']);
    assert.deepEqual(s.passed.map((l) => l.name), ['c']);
  });

  it('rounds the percentage', () => {
    assert.equal(groceryStats([line('a', 'bought'), line('b', 'need'), line('c', 'need')]).completion, 33);
    assert.equal(groceryStats([line('a', 'bought'), line('b', 'bought'), line('c', 'need')]).completion, 67);
  });

  it('is all bought, at 100%, when only skipped lines remain with the bought ones', () => {
    const s = groceryStats([line('a', 'skipped'), line('b', 'skipped')]);
    assert.equal(s.allBought, true);
    assert.equal(s.completion, 100);
    assert.equal(s.nothingListed, false);
  });
});

describe('sections and aisle tabs', () => {
  const shopping = [line('apple', 'need', 'produce'), line('milk', 'need', 'dairy'), line('pear', 'need', 'produce')];

  it('groups lines by department in the departments\' order, empty ones kept, with the screen\'s wording', () => {
    const s = sectionsOf(shopping, departments, { produce: { label: 'Produce', short: 'Prod' }, dairy: { label: 'Dairy', short: 'Dairy' } });
    assert.deepEqual(s.map((x) => [x.id, x.items.map((l) => l.name)]), [['produce', ['apple', 'pear']], ['dairy', ['milk']], ['pantry', []]]);
    assert.equal(s[0].label, 'Produce');
    assert.equal(s[2].label, undefined);
  });

  it('offers All and only the departments with something left', () => {
    const s = sectionsOf(shopping, departments, { produce: { short: 'Prod' }, dairy: { short: 'Dairy' }, pantry: { short: 'Pantry' } });
    assert.deepEqual(aisleTabs(s, 'All'), [
      { id: 'all', short: 'All', count: 3 },
      { id: 'produce', short: 'Prod', count: 2 },
      { id: 'dairy', short: 'Dairy', count: 1 },
    ]);
  });

  it('drops the tab of an aisle that emptied, and the chosen aisle falls back to All', () => {
    const before = aisleTabs(sectionsOf(shopping, departments, { produce: { short: 'P' }, dairy: { short: 'D' } }), 'All');
    assert.equal(activeAisle(before, 'dairy'), 'dairy');
    const after = aisleTabs(sectionsOf(shopping.filter((l) => l.dept !== 'dairy'), departments, { produce: { short: 'P' } }), 'All');
    assert.equal(activeAisle(after, 'dairy'), 'all');
    assert.equal(activeAisle(after, 'all'), 'all');
  });

  it('has only All, with 0, for a list with nothing to buy', () => {
    assert.deepEqual(aisleTabs(sectionsOf([], departments), 'All'), [{ id: 'all', short: 'All', count: 0 }]);
  });
});

describe('lines per dinner', () => {
  it('counts the lines still to buy that each dinner brings', () => {
    const dinners = [{ recipe: { id: 'pho' } }, { recipe: { id: 'bun' } }, { recipe: { id: 'none' } }];
    const shopping = [
      line('a', 'need', 'produce', { sources: [{ recipeId: 'pho' }, { recipeId: 'bun' }] }),
      line('b', 'need', 'produce', { sources: [{ recipeId: 'pho' }, { recipeId: 'pho' }] }),
      line('c', 'need', 'produce', { sources: [{ label: 'Added by you' }] }),
    ];
    assert.deepEqual(sourceCounts(dinners, shopping).map((s) => s.count), [2, 1, 0]);
    assert.equal(sourceCounts(dinners, shopping)[0].day, dinners[0]);
  });
});

describe('the shared text', () => {
  it('lists each department that has lines, with amounts, under the heading', () => {
    const sections = [
      { label: 'Produce', items: [{ name: 'Apple', amount: '2' }, { name: 'Pear' }] },
      { label: 'Dairy', items: [] },
      { label: 'Pantry', items: [{ name: 'Rice', amount: '1 cup' }] },
    ];
    assert.equal(shareText(sections, 'Grocery list'), 'Grocery list\n\nProduce\n☐ Apple — 2\n☐ Pear\n\nPantry\n☐ Rice — 1 cup');
  });

  it('is just the heading for an empty list', () => {
    assert.equal(shareText([{ label: 'Produce', items: [] }], 'Grocery list'), 'Grocery list\n\n');
  });
});

describe('the store menu', () => {
  const plan = (state) => storeMenuPlan(state).map((i) => (i.divider ? `|${i.id}` : i.id));

  it('this week: add, next week, earlier, later, then share / print / full list, with rules before the week group, share and full list', () => {
    assert.deepEqual(plan({ pastWeek: false, offset: 0, nothingListed: false }), ['add', '|next-week', 'earlier', 'later', '|share', 'print', '|full']);
  });

  it('next week offers this week instead', () => {
    assert.deepEqual(plan({ pastWeek: false, offset: 1, nothingListed: false }), ['add', '|this-week', 'earlier', 'later', '|share', 'print', '|full']);
  });

  it('another week offers both', () => {
    assert.deepEqual(plan({ pastWeek: false, offset: 3, nothingListed: false }), ['add', '|this-week', 'next-week', 'earlier', 'later', '|share', 'print', '|full']);
  });

  it('leaves out Print for an empty list', () => {
    assert.equal(plan({ pastWeek: false, offset: 0, nothingListed: true }).includes('print'), false);
  });

  it('a past week has no Add Item and no extra rule inside the week group', () => {
    assert.deepEqual(plan({ pastWeek: true, offset: -1, nothingListed: false }), ['this-week', 'next-week', 'earlier', 'later', '|share', 'print', '|full']);
  });
});

describe('the aisle a name field shows', () => {
  it('the same rule the editor uses: existing, else picked, else the guess', () => {
    assert.equal(aisleFor({ existing: { aisle: 'Dairy' }, picked: false, current: 'Produce', guess: 'Pantry' }), 'Dairy');
    assert.equal(aisleFor({ picked: true, current: 'Produce', guess: 'Pantry' }), 'Produce');
    assert.equal(aisleFor({ picked: false, current: 'Produce', guess: 'Pantry' }), 'Pantry');
  });
});
