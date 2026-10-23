// The recipe page's remembered servings: per recipe, on this device.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { servingsFor, withServings } from '../src/lib/recipeServings.js';

describe('recipe servings', () => {
  it('opens at the remembered count, else the recipe’s own', () => {
    assert.equal(servingsFor({ pho: 6 }, 'pho', 4), 6);
    assert.equal(servingsFor({ pho: 6 }, 'bun', 4), 4);
    assert.equal(servingsFor(null, 'pho', 4), 4);
    assert.equal(servingsFor({ pho: 'six' }, 'pho', 4), 4);
    assert.equal(servingsFor([6], 'pho', 4), 4);
  });

  it('keeps counts within the stepper’s range', () => {
    assert.equal(servingsFor({ pho: 40 }, 'pho', 4), 12);
    assert.equal(servingsFor({ pho: 0 }, 'pho', 4), 1);
    assert.deepEqual(withServings({}, 'pho', 99, 4), { pho: 12 });
  });

  it('stores only a change from the default', () => {
    let stored = withServings({}, 'pho', 6, 4);
    assert.deepEqual(stored, { pho: 6 });
    stored = withServings(stored, 'bun', 2, 2);
    assert.deepEqual(stored, { pho: 6 });
    assert.deepEqual(withServings(stored, 'pho', 4, 4), {});
  });

  it('drops recipes that no longer exist', () => {
    const stored = { pho: 6, gone: 3 };
    assert.deepEqual(withServings(stored, 'bun', 5, 2, (id) => id !== 'gone'), { pho: 6, bun: 5 });
  });
});
