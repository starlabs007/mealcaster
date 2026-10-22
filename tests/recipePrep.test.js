// The recipe page's prepped ticks: kept for today only, per recipe.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepOfDay, withPrepped } from '../src/lib/recipePrep.js';

describe('recipe prep', () => {
  it('reads nothing from another day or bad data', () => {
    assert.deepEqual(prepOfDay({ date: '2026-10-21', recipes: { pho: ['pho:0:0'] } }, '2026-10-22'), {});
    assert.deepEqual(prepOfDay(null, '2026-10-22'), {});
    assert.deepEqual(prepOfDay({ date: '2026-10-22' }, '2026-10-22'), {});
  });

  it('keeps recipes apart and drops other days on write', () => {
    let state = withPrepped({ date: '2026-10-21', recipes: { old: ['old:0:0'] } }, '2026-10-22', 'pho', ['pho:0:0', 'pho:0:0']);
    state = withPrepped(state, '2026-10-22', 'bun', ['bun:1:2']);
    assert.deepEqual(state, { date: '2026-10-22', recipes: { pho: ['pho:0:0'], bun: ['bun:1:2'] } });
    assert.deepEqual(prepOfDay(withPrepped(state, '2026-10-22', 'pho', []), '2026-10-22'), { bun: ['bun:1:2'] });
  });
});
