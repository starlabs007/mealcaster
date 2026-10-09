// Plain ingredient helpers (src/lib/ingredients.js): comparing names, ids, units and how recipe lines read.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as ing from '../src/lib/ingredients.js';

const onion = { id: 'onion', name: 'onion', plural: 'onions', aisle: 'Produce', onHand: false };
const greenOnion = { id: 'green-onion', name: 'green onion', plural: 'green onions', aisle: 'Produce', onHand: false };
const sugar = { id: 'sugar', name: 'sugar', plural: '', aisle: 'Pantry', onHand: true };
const rauRam = { id: 'rau-ram', name: 'rau răm', plural: '', aisle: 'Herbs', onHand: false };

describe('comparing text', () => {
  it('ignores case, accents (đ too) and spacing', () => {
    assert.equal(ing.foldKey('  Rau  Răm '), 'rau ram');
    assert.equal(ing.foldKey('Trứng Đúc'), 'trung duc');
    assert.equal(ing.foldKey('Bún chả'), 'bun cha');
    assert.equal(ing.foldKey(null), '');
  });
  it('folds a plural ending for names', () => {
    assert.equal(ing.nameKey('Green Onions'), 'green onion');
    assert.equal(ing.nameKey('tomatoes'), 'tomato');
    assert.equal(ing.nameKey('peaches'), 'peach');
    assert.equal(ing.nameKey('glass'), 'glass');
    assert.equal(ing.nameKey('msg'), 'msg');
  });
  it('finds an ingredient by name or plural, accents and case aside', () => {
    const list = [onion, greenOnion, rauRam];
    assert.equal(ing.findByName(list, 'Onions'), onion);
    assert.equal(ing.findByName(list, 'green onion'), greenOnion);
    assert.equal(ing.findByName(list, 'RAU RAM'), rauRam);
    assert.equal(ing.findByName(list, 'red onion'), undefined);
    assert.equal(ing.findByName(list, ''), undefined);
  });
  it('stores names tidy and lowercase', () => {
    assert.equal(ing.tidyIngredientName('  Chả  Lụa '), 'chả lụa');
  });
});

describe('ids', () => {
  it('slugs drop accents instead of turning them into hyphens', () => {
    assert.equal(ing.slugify('Bún chả'), 'bun-cha');
    assert.equal(ing.slugify('Meat Omelet (Trứng Đúc)'), 'meat-omelet-trung-duc');
    assert.equal(ing.slugify('Chả cá Lã Vọng'), 'cha-ca-la-vong');
    assert.equal(ing.slugify('***'), '');
    assert.equal(ing.slugify('a'.repeat(39) + ' b'), 'a'.repeat(39));
  });
  it('recipe ids are custom-<slug>-<4 random>, never taken', () => {
    const taken = new Set();
    for (let i = 0; i < 20; i++) {
      const id = ing.recipeIdFor('Cháo', (x) => taken.has(x));
      assert.match(id, /^custom-chao-[a-z0-9]{4}$/);
      assert.equal(taken.has(id), false);
      taken.add(id);
    }
  });
  it('ingredient ids are the slug, then -2, -3… when taken', () => {
    const taken = new Set(['nuoc-mam', 'nuoc-mam-2']);
    assert.equal(ing.ingredientIdFor('Nước mắm', (x) => taken.has(x)), 'nuoc-mam-3');
    assert.equal(ing.ingredientIdFor('Rau răm', (x) => taken.has(x)), 'rau-ram');
    assert.equal(ing.ingredientIdFor('', () => false), 'ingredient');
  });
});

describe('units', () => {
  it('have one canonical form', () => {
    assert.equal(ing.canonicalUnit('Cups'), 'cup');
    assert.equal(ing.canonicalUnit('lbs'), 'lb');
    assert.equal(ing.canonicalUnit('tablespoons'), 'tbsp');
    assert.equal(ing.canonicalUnit('pc'), 'piece');
    assert.equal(ing.canonicalUnit(' stalks '), 'stalk');
    assert.equal(ing.canonicalUnit('thumb'), 'thumb', 'unknown units are kept');
    assert.equal(ing.canonicalUnit(undefined), '');
  });
  it('take their plural above 1 when they are words', () => {
    assert.equal(ing.unitLabel('cup', 2), 'cups');
    assert.equal(ing.unitLabel('cup', 1), 'cup');
    assert.equal(ing.unitLabel('bunch', 1.5), 'bunches');
    assert.equal(ing.unitLabel('lb', 2), 'lb');
    assert.equal(ing.unitLabel('large', 4), 'large');
    assert.equal(ing.unitLabel('thumb', 2), 'thumb');
  });
});

describe('recipe lines', () => {
  it('use the plural except for a single item', () => {
    assert.equal(ing.ingredientName(onion, 1), 'onion');
    assert.equal(ing.ingredientName(onion, 0.5), 'onion');
    assert.equal(ing.ingredientName(onion, 1, 'large'), 'onion');
    assert.equal(ing.ingredientName(onion, 2), 'onions');
    assert.equal(ing.ingredientName(onion, 1, 'lb'), 'onions');
    assert.equal(ing.ingredientName(greenOnion, undefined), 'green onions');
    assert.equal(ing.ingredientName(sugar, 2, 'tbsp'), 'sugar', 'no plural: always the name');
    assert.equal(ing.ingredientName(undefined, 1), ing.UNKNOWN_INGREDIENT);
  });
  it('read amount, name, note, prep and optional', () => {
    const beef = { id: 'beef', name: 'beef', plural: '', aisle: 'Fresh', onHand: false };
    assert.equal(ing.formatLine({ id: 'beef', qty: 1, unit: 'lb', note: 'flank or ribeye', prep: 'sliced' }, beef), '1 lb beef (flank or ribeye), sliced');
    assert.equal(ing.formatLine({ id: 'tendon', qty: 0.5, unit: 'piece', optional: true }, { ...beef, name: 'tendon' }), '1/2 piece tendon (optional)');
    assert.equal(ing.formatLine({ id: 'green-onion' }, greenOnion), 'green onions');
    assert.equal(ing.formatLine({ id: 'gone', qty: 2 }, undefined), `2 ${ing.UNKNOWN_INGREDIENT}`);
  });
  it('decide singular or plural after scaling by servings', () => {
    assert.equal(ing.formatLine({ id: 'onion', qty: 1 }, onion), '1 onion');
    assert.equal(ing.formatLine({ id: 'onion', qty: 1 }, onion, 2), '2 onions');
    assert.equal(ing.formatLine({ id: 'water', qty: 1, unit: 'cup' }, { ...sugar, name: 'water' }, 3), '3 cups water');
  });
  it('shop by the plural name', () => {
    assert.equal(ing.shoppingName(onion), 'onions');
    assert.equal(ing.shoppingName(sugar), 'sugar');
  });
});
