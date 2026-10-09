// Reading typed and pasted ingredient text (src/lib/ingredientText.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { guessAisle, parseIngredientLine, parseIngredientLines, parseQty } from '../src/lib/ingredientText.js';

const line = (text, fields) => assert.deepEqual(parseIngredientLine(text), { qty: '', unit: '', text: '', note: '', prep: '', optional: false, ...fields });

describe('amounts', () => {
  it('read whole numbers, decimals and fractions', () => {
    assert.equal(parseQty('2'), 2);
    assert.equal(parseQty('1.5'), 1.5);
    assert.equal(parseQty('1 1/2'), 1.5);
    assert.equal(parseQty('1½'), 1.5);
    assert.equal(parseQty(''), undefined);
    assert.ok(Number.isNaN(parseQty('a few')));
  });
});

describe('pasted lines', () => {
  it('split brackets into note and prep', () => {
    line('1 lb beef (flank or ribeye, sliced)', { qty: '1', unit: 'lb', text: 'beef', note: 'flank or ribeye', prep: 'sliced' });
    line('ginger (thumb-sized)', { text: 'ginger', note: 'thumb-sized' });
    line('8oz package silken (soft) tofu', { qty: '1', unit: 'package', text: 'silken tofu', note: '8 oz, soft' });
  });
  it('take prep after a comma or before the name', () => {
    line('1 French shallot, finely minced', { qty: '1', text: 'french shallot', prep: 'finely minced' });
    line('shredded chicken', { text: 'chicken', prep: 'shredded' });
    line('2 large eggs, at room temperature', { qty: '2', unit: 'large', text: 'eggs', prep: 'at room temperature' });
  });
  it('mark optional lines', () => {
    line('tendon (optional)', { text: 'tendon', optional: true });
    line('Mashed potatoes (optional)', { text: 'potatoes', prep: 'mashed', optional: true });
    line('cilantro, optional', { text: 'cilantro', optional: true });
  });
  it('turn containers into the unit, with the size as a note', () => {
    line('6 oz can of tomato paste', { qty: '1', unit: 'can', text: 'tomato paste', note: '6 oz' });
    line('1 head of cabbage', { qty: '1', unit: 'head', text: 'cabbage' });
    line('1 bag of fried tofu', { qty: '1', unit: 'bag', text: 'fried tofu' });
    line('2 cups of water', { qty: '2', unit: 'cup', text: 'water' });
  });
  it('keep names that only look like containers or prep', () => {
    line('ground pork', { text: 'ground pork' });
    line('1 head cheese', { qty: '1', unit: 'head', text: 'cheese' });
  });
  it('group lines under "Name:" headings and guess a new ingredient’s aisle', () => {
    const rows = parseIngredientLines('Sauce:\n- 2 tbsp fish sauce\n\n1. 3 cloves garlic, minced', 'Main');
    assert.deepEqual(rows.map((r) => [r.group, r.qty, r.unit, r.text, r.prep, r.aisle]), [
      ['Sauce', '2', 'tbsp', 'fish sauce', '', 'Pantry'],
      ['Sauce', '3', 'clove', 'garlic', 'minced', 'Produce'],
    ]);
    assert.equal(guessAisle('Thai basil'), 'Herbs');
    assert.equal(guessAisle('tendon'), 'Pantry');
    assert.equal(guessAisle('tomato paste'), 'Pantry');
    assert.equal(guessAisle('garlic powder'), 'Spices');
    assert.equal(guessAisle('salmon fillet'), 'Fresh');
  });
});
