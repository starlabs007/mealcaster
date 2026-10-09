import { test } from 'node:test';
import assert from 'node:assert/strict';
import { switchedEntries } from '../src/lib/switchDays.js';

test('two planned meals trade places, notes travelling with them', () => {
  const entries = {
    '2026-10-06': { recipeId: 'risotto', notes: 'double batch' },
    '2026-10-08': { recipeId: 'ragu' },
  };
  assert.deepEqual(switchedEntries(entries, '2026-10-06', '2026-10-08'), {
    '2026-10-06': { recipeId: 'ragu' },
    '2026-10-08': { recipeId: 'risotto', notes: 'double batch' },
  });
  assert.deepEqual(entries['2026-10-06'], { recipeId: 'risotto', notes: 'double batch' }); // input untouched
});

test('switching with an open day moves the meal and empties its old evening', () => {
  assert.deepEqual(switchedEntries({ '2026-10-06': { recipeId: 'risotto' } }, '2026-10-06', '2026-10-09'), {
    '2026-10-06': undefined,
    '2026-10-09': { recipeId: 'risotto' },
  });
});

test('a night off swaps like a meal', () => {
  const entries = { '2026-10-06': { recipeId: 'risotto' }, '2026-10-07': { diningOut: true } };
  assert.deepEqual(switchedEntries(entries, '2026-10-06', '2026-10-07'), {
    '2026-10-06': { diningOut: true },
    '2026-10-07': { recipeId: 'risotto' },
  });
});

test('the completed flag stays behind', () => {
  const entries = { '2026-10-06': { recipeId: 'risotto', completed: true }, '2026-10-07': { completed: true } };
  assert.deepEqual(switchedEntries(entries, '2026-10-06', '2026-10-07'), {
    '2026-10-06': undefined,
    '2026-10-07': { recipeId: 'risotto' },
  });
});
