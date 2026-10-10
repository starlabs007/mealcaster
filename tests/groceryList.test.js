// Unit tests for the merged grocery list (src/lib/groceryList.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekList, emptyWeek, everyWeekShows, mergeAmounts } from '../src/lib/groceryList.js';

const ING = {
  beef: { id: 'beef', name: 'beef', plural: '', aisle: 'Fresh', onHand: false },
  onion: { id: 'onion', name: 'onion', plural: 'onions', aisle: 'Produce', onHand: false },
  egg: { id: 'egg', name: 'egg', plural: 'eggs', aisle: 'Dairy', onHand: true },
  mint: { id: 'mint', name: 'mint', plural: '', aisle: 'Herbs', onHand: false },
  juice: { id: 'juice', name: 'juice', plural: '', aisle: 'Other', onHand: false },
};
const recipe = (id, shortTitle, items) => ({ id, shortTitle, ingredients: [{ items }] });
const PHO = recipe('pho', 'Phở', [
  { id: 'beef', qty: 1, unit: 'lb', note: 'eye round' },
  { id: 'onion', qty: 1 },
  { id: 'mint', optional: true },
]);
const STEW = recipe('stew', 'Stew', [
  { id: 'beef', qty: 1, unit: 'lb', note: 'flank' },
  { id: 'onion', qty: 2 },
  { id: 'egg', qty: 2 },
]);
const RECIPES = { pho: PHO, stew: STEW };

/** @param {Partial<Parameters<typeof buildWeekList>[0]>} input */
const build = (input = {}) =>
  buildWeekList({
    week: '2026-10-10',
    thisWeek: '2026-10-10',
    list: emptyWeek(),
    dinners: [{ iso: '2026-10-12', recipe: PHO }, { iso: '2026-10-14', recipe: STEW }],
    recipeOf: (id) => RECIPES[id],
    ingredientOf: (id) => ING[id],
    every: [],
    ...input,
  });
const byId = (lines) => Object.fromEntries(lines.map((l) => [l.ingredientId, l]));

describe('mergeAmounts', () => {
  it('adds up amounts in the same unit and lists the rest', () => {
    assert.equal(mergeAmounts([{ qty: 1, unit: 'lb' }, { qty: 1, unit: 'lb' }]), '2 lb');
    assert.equal(mergeAmounts([{ qty: 2, unit: 'cup' }, { qty: 2, unit: 'tbsp' }, { qty: 1, unit: 'cup' }]), '3 cups + 2 tbsp');
    assert.equal(mergeAmounts([{ qty: 1 }, { qty: 0.5 }]), '1 1/2');
  });

  it('shows "to taste" only when nothing has a quantity', () => {
    assert.equal(mergeAmounts([{ qty: 1, unit: 'lb' }, {}]), '1 lb');
    assert.equal(mergeAmounts([{}]), 'to taste');
    assert.equal(mergeAmounts([]), '');
  });
});

describe('buildWeekList', () => {
  it('merges an ingredient across dinners, each meal with its note', () => {
    const { lines } = build();
    const beef = byId(lines).beef;
    assert.equal(beef.key, 'ing:beef');
    assert.equal(beef.amount, '2 lb');
    assert.deepEqual(beef.sources.map((s) => [s.label, s.note]), [['Mon: Phở', 'eye round'], ['Wed: Stew', 'flank']]);
    assert.equal(byId(lines).onion.name, 'Onions');
    assert.equal(byId(lines).onion.amount, '3');
    assert.equal(lines.length, 3, 'beef, onion, mint');
  });

  it('leaves in-stock ingredients off, listed apart', () => {
    const { lines, hidden } = build();
    assert.ok(!byId(lines).egg);
    assert.deepEqual(hidden.map((l) => l.ingredientId), ['egg']);
  });

  it('labels a line optional only when every meal has it optional', () => {
    assert.equal(byId(build().lines).mint.optional, true);
    const both = build({ dinners: [{ iso: '2026-10-12', recipe: PHO }, { iso: '2026-10-13', recipe: recipe('x', 'X', [{ id: 'mint' }]) }] });
    assert.equal(byId(both.lines).mint.optional, false);
  });

  it('adds pushed recipes, but not one that is already a dinner', () => {
    const list = { ...emptyWeek(), pushed: ['stew:egg', 'stew:beef', 'pho:onion'] };
    const { lines } = build({ list, dinners: [{ iso: '2026-10-12', recipe: PHO }] });
    assert.deepEqual(byId(lines).beef.sources.map((s) => s.label), ['Mon: Phở', 'Stew']);
    assert.deepEqual(byId(lines).beef.pushed, ['stew']);
    assert.deepEqual(byId(lines).onion.pushed, [], 'Phở is planned');
  });

  it('merges what you added into the ingredient’s line', () => {
    const list = { ...emptyWeek(), added: { beef: 'extra for lunch', juice: '2 bottles' } };
    const { lines } = build({ list });
    assert.deepEqual(byId(lines).beef.sources.at(-1), { label: 'Added by you', tone: 'neutral', note: 'extra for lunch' });
    assert.equal(byId(lines).juice.added, '2 bottles');
    assert.equal(byId(lines).juice.amount, '');
    assert.equal(byId(lines).juice.dept, 'other');
  });

  it('shows an every-week item from this week on until bought, then only on the week it was bought', () => {
    const need = { ingredientId: 'juice', note: '', status: 'need', doneWeek: '' };
    assert.equal(everyWeekShows(need, '2026-10-10', '2026-10-10'), true);
    assert.equal(everyWeekShows(need, '2026-10-24', '2026-10-10'), true);
    assert.equal(everyWeekShows(need, '2026-10-03', '2026-10-10'), false, 'never on a past week');
    const bought = { ...need, status: 'bought', doneWeek: '2026-10-10' };
    assert.equal(everyWeekShows(bought, '2026-10-10', '2026-10-10'), true);
    assert.equal(everyWeekShows(bought, '2026-10-17', '2026-10-10'), false);
    assert.equal(byId(build({ every: [bought] }).lines).juice.status, 'bought');
  });

  it('keeps a past week as it was: its saved stock, not today’s', () => {
    const past = { week: '2026-10-03', thisWeek: '2026-10-10' };
    // No snapshot yet: today's stock.
    assert.deepEqual(build(past).hidden.map((l) => l.ingredientId), ['egg']);
    // Saved before eggs ran out and beef came in: still that.
    const list = { ...emptyWeek(), stock: ['egg'] };
    const ingredientOf = (id) => (id === 'egg' ? { ...ING.egg, onHand: false } : id === 'beef' ? { ...ING.beef, onHand: true } : ING[id]);
    const { lines, hidden } = build({ ...past, list, ingredientOf });
    assert.deepEqual(hidden.map((l) => l.ingredientId), ['egg']);
    assert.ok(byId(lines).beef);
    // This week ignores a snapshot.
    assert.deepEqual(build({ list, ingredientOf }).hidden.map((l) => l.ingredientId), ['beef']);
  });
});
