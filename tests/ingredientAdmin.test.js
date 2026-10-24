import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canSave, filterCounts, filterIngredients, mergeOptions, sortedByName, takenBy } from '../src/lib/ingredientAdmin.js';
import { ingredient } from './fakes.js';

const list = [
  ingredient('tomato', { plural: 'tomatoes', onHand: true }),
  ingredient('basil'),
  ingredient('green-onion', { plural: 'green onions', aisle: 'Produce', onHand: true }),
];
const uses = new Map([['tomato', 2], ['basil', 1]]);

describe('sortedByName / filterCounts', () => {
  it('sorts by name without changing the list it was given', () => {
    assert.deepEqual(sortedByName(list).map((i) => i.id), ['basil', 'green-onion', 'tomato']);
    assert.equal(list[0].id, 'tomato');
  });

  it('counts the ones at home and the ones no recipe uses', () => {
    assert.deepEqual(filterCounts(list, uses), { stock: 2, unused: 1 });
  });
});

describe('filterIngredients', () => {
  it('"all" with no search is everything', () => {
    assert.equal(filterIngredients(list, uses, 'all', '').length, 3);
  });

  it('"stock" keeps what is at home; "unused" keeps what no recipe uses', () => {
    assert.deepEqual(filterIngredients(list, uses, 'stock', '').map((i) => i.id), ['tomato', 'green-onion']);
    assert.deepEqual(filterIngredients(list, uses, 'unused', '').map((i) => i.id), ['green-onion']);
  });

  it('searches the name and the plural, ignoring case and accents', () => {
    assert.deepEqual(filterIngredients(list, uses, 'all', 'TOMATOES').map((i) => i.id), ['tomato']);
    assert.deepEqual(filterIngredients(list, uses, 'all', 'onions').map((i) => i.id), ['green-onion']);
    assert.deepEqual(filterIngredients(list, uses, 'all', 'xyz'), []);
  });

  it('the filter and the search both apply', () => {
    assert.deepEqual(filterIngredients(list, uses, 'stock', 'basil'), []);
    assert.deepEqual(filterIngredients(list, uses, 'stock', 'green').map((i) => i.id), ['green-onion']);
  });
});

describe('takenBy', () => {
  it('finds another ingredient with that name or plural', () => {
    assert.equal(takenBy(list, 'Tomatoes', 'basil')?.id, 'tomato');
    assert.equal(takenBy(list, 'basil', 'tomato')?.id, 'basil');
  });

  it('the ingredient being edited does not clash with itself', () => {
    assert.equal(takenBy(list, 'tomato', 'tomato'), undefined);
    assert.equal(takenBy(list, 'tomatoes', 'tomato'), undefined);
  });

  it('a blank or unused word clashes with nothing', () => {
    assert.equal(takenBy(list, '  ', 'basil'), undefined);
    assert.equal(takenBy(list, 'ginger', 'basil'), undefined);
  });
});

describe('canSave', () => {
  const edit = { name: 'Basil' };

  it('needs a name and no clash', () => {
    assert.equal(canSave(edit, undefined, undefined), true);
    assert.equal(canSave({ name: '  ' }, undefined, undefined), false);
    assert.equal(canSave(edit, list[0], undefined), false);
    assert.equal(canSave(edit, undefined, list[0]), false);
  });
});

describe('mergeOptions', () => {
  it('lists every other ingredient with its aisle, found by plural too', () => {
    const opts = mergeOptions(list, 'basil', (a) => `[${a}]`);
    assert.deepEqual(opts.map((o) => o.value), ['tomato', 'green onion']);
    assert.deepEqual(opts[0], { value: 'tomato', label: 'tomato', hint: '[Pantry]', keys: ['tomatoes'] });
    assert.deepEqual(mergeOptions([ingredient('basil'), ingredient('mint')], 'mint', String)[0].keys, []);
  });
});
