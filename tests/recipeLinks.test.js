// Recipe links (recipeLinks.js, #300): ingredient lines that point at another recipe.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batchesOf, isLink, linkName, linkTarget, linkedIds, linkedTargets, usedIn, withLinkNames } from '../src/lib/recipeLinks.js';
import { recipe } from './fakes.js';

const lines = (...items) => [{ title: 'Main', items }];
const sauce = recipe('nuoc-cham', 'Nước Chấm', { meals: ['Other'] });
const pickles = recipe('pickles', 'Pickled Carrots', { meals: ['Other'] });
const banhXeo = recipe('banh-xeo', 'Bánh Xèo', {
  ingredients: lines({ id: 'rice-flour', qty: 1, unit: 'cup' }, { recipe: 'nuoc-cham', name: 'Nuoc Cham', qty: 2 }, { recipe: 'pickles', name: 'Pickled Carrots' }),
});
const all = [sauce, pickles, banhXeo];
const recipeOf = (id) => all.find((r) => r.id === id);

describe('a linked line', () => {
  it('is one with a recipe id; ingredient lines and odd values are not', () => {
    assert.equal(isLink({ recipe: 'nuoc-cham' }), true);
    for (const line of [{ id: 'salt' }, { recipe: '' }, { recipe: 3 }, null, undefined]) assert.equal(isLink(/** @type {any} */ (line)), false);
  });

  it('points at its target, but not at the recipe it is in or at a recipe that is gone', () => {
    assert.equal(linkTarget({ recipe: 'nuoc-cham' }, 'banh-xeo', recipeOf), sauce);
    assert.equal(linkTarget({ recipe: 'banh-xeo' }, 'banh-xeo', recipeOf), undefined);
    assert.equal(linkTarget({ recipe: 'gone' }, 'banh-xeo', recipeOf), undefined);
    assert.equal(linkTarget({ id: 'salt' }, 'banh-xeo', recipeOf), undefined);
  });

  it("shows the target's current title, else the copy it kept", () => {
    assert.equal(linkName({ recipe: 'nuoc-cham', name: 'Nuoc Cham' }, recipeOf), 'Nước Chấm');
    assert.equal(linkName({ recipe: 'gone', name: 'Old Sauce' }, recipeOf), 'Old Sauce');
    assert.equal(linkName({ recipe: 'gone' }, recipeOf), '');
  });

  it('asks for its qty in batches, one when it has none', () => {
    assert.equal(batchesOf({ recipe: 'x', qty: 2 }), 2);
    assert.equal(batchesOf({ recipe: 'x', qty: 0.5 }), 0.5);
    assert.equal(batchesOf({ recipe: 'x' }), 1);
  });
});

describe("a recipe's links", () => {
  it('list each target once, in line order, without the recipe itself', () => {
    const r = recipe('a', 'A', {
      ingredients: [
        { title: 'One', items: [{ recipe: 'b' }, { id: 'salt' }, { recipe: 'a' }] },
        { title: 'Two', items: [{ recipe: 'c' }, { recipe: 'b' }] },
      ],
    });
    assert.deepEqual(linkedIds(r), ['b', 'c']);
  });

  it('bring their existing targets with the batches asked for, one level only', () => {
    // The sauce links back to the dish: following it would loop, so the dish's targets stop at the sauce.
    const loopy = recipe('nuoc-cham', 'Nước Chấm', { ingredients: lines({ id: 'fish-sauce', qty: 2, unit: 'tbsp' }, { recipe: 'banh-xeo' }) });
    const withGone = { ...banhXeo, ingredients: [...banhXeo.ingredients, { title: 'Extra', items: [{ recipe: 'gone', name: 'Gone' }, { recipe: 'banh-xeo' }] }] };
    const of = (id) => (id === 'nuoc-cham' ? loopy : recipeOf(id));
    assert.deepEqual(
      linkedTargets(withGone, of).map(({ target, batches }) => [target.id, batches]),
      [['nuoc-cham', 2], ['pickles', 1]],
    );
  });
});

describe('Used in', () => {
  it('lists the recipes linking to a recipe, A–Z, never itself', () => {
    const another = recipe('bun', 'Bún Chả', { ingredients: lines({ recipe: 'nuoc-cham' }) });
    const self = { ...sauce, ingredients: lines({ recipe: 'nuoc-cham' }) };
    assert.deepEqual(usedIn([self, banhXeo, another, pickles], 'nuoc-cham').map((r) => r.id), ['banh-xeo', 'bun']);
    assert.deepEqual(usedIn(all, 'banh-xeo'), []);
  });
});

describe('saving the title copies', () => {
  it("updates each copy to its target's title and keeps copies of missing targets", () => {
    const r = { ...banhXeo, ingredients: [...banhXeo.ingredients, { title: 'Extra', items: [{ recipe: 'gone', name: 'Gone' }] }] };
    const saved = withLinkNames(r, recipeOf);
    assert.deepEqual(saved.ingredients[0].items[1], { recipe: 'nuoc-cham', name: 'Nước Chấm', qty: 2 });
    assert.equal(saved.ingredients[0].items[0], r.ingredients[0].items[0]);
    assert.equal(saved.ingredients[1], r.ingredients[1], 'unchanged groups stay the same object');
  });

  it('returns the same recipe when every copy is current', () => {
    const current = withLinkNames(banhXeo, recipeOf);
    assert.equal(withLinkNames(current, recipeOf), current);
  });
});
