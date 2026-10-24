// The Recipe page's rules (recipePage.js): the day it is about, the ticks, what is missing from the grocery list, the
// step cook view points at, which heads-ups show, and the time stats.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { minutesText, missingKeys, nextStepIndex, resolveDay, timeStats, toggleAll, toggleIn, visibleHeadsUps } from '../src/lib/recipePage.js';

describe('the day the page is about', () => {
  const entries = { '2026-10-23': { recipeId: 'pho' }, '2026-10-24': { recipeId: 'bun' }, '2026-10-25': {} };
  const dayOfRecipe = (id) => ({ pho: '2026-10-23', bun: '2026-10-24' })[id];

  it('uses the plan\'s day when no day is passed', () => {
    assert.deepEqual(resolveDay('pho', undefined, entries, dayOfRecipe), { day: '2026-10-23', planningDay: undefined });
    assert.deepEqual(resolveDay('new', undefined, entries, dayOfRecipe), { day: undefined, planningDay: undefined });
  });

  it('uses the day passed while that day has this recipe (it may be planned on two days)', () => {
    assert.deepEqual(resolveDay('pho', '2026-10-23', { ...entries, '2026-10-26': { recipeId: 'pho' } }, () => '2026-10-26'), { day: '2026-10-23', planningDay: undefined });
    assert.equal(resolveDay('pho', '2026-10-26', { ...entries, '2026-10-26': { recipeId: 'pho' } }, () => '2026-10-23').day, '2026-10-26');
  });

  it('opened from the catalog for another day: that day is carried back, and the recipe keeps its own day', () => {
    assert.deepEqual(resolveDay('pho', '2026-10-24', entries, dayOfRecipe), { day: '2026-10-23', planningDay: '2026-10-24' });
    assert.deepEqual(resolveDay('new', '2026-10-25', entries, dayOfRecipe), { day: undefined, planningDay: '2026-10-25' });
  });

  it('carries a day that has no entry at all', () => {
    assert.equal(resolveDay('pho', '2026-11-01', entries, dayOfRecipe).planningDay, '2026-11-01');
  });
});

describe('ticks', () => {
  it('toggles one value in or out, keeping the rest in order', () => {
    assert.deepEqual(toggleIn(['a', 'b'], 'c'), ['a', 'b', 'c']);
    assert.deepEqual(toggleIn(['a', 'b', 'c'], 'b'), ['a', 'c']);
    assert.deepEqual(toggleIn([], 2), [2]);
  });

  it('ticks everything, then clears when everything is ticked', () => {
    assert.deepEqual(toggleAll([], ['a', 'b']), ['a', 'b']);
    assert.deepEqual(toggleAll(['a'], ['a', 'b']), ['a', 'b']);
    assert.deepEqual(toggleAll(['b', 'a'], ['a', 'b']), []);
  });

  it('does not count a stale tick as a ticked line', () => {
    assert.deepEqual(toggleAll(['a', 'gone'], ['a', 'b']), ['a', 'b']);
  });

  it('does not change the lists it is given', () => {
    const all = ['a', 'b'];
    toggleAll([], all).push('x');
    assert.deepEqual(all, ['a', 'b']);
  });
});

describe('what is missing from the grocery list', () => {
  it('leaves out lines already listed and lines at home', () => {
    assert.deepEqual(missingKeys(['a', 'b', 'c', 'd'], new Set(['b']), ['c']), ['a', 'd']);
    assert.deepEqual(missingKeys(['a'], new Set(['a']), []), []);
    assert.deepEqual(missingKeys([], new Set(), []), []);
  });
});

describe('the next step', () => {
  it('is the first one not done, or -1 when all are', () => {
    assert.equal(nextStepIndex(4, []), 0);
    assert.equal(nextStepIndex(4, [0, 1]), 2);
    assert.equal(nextStepIndex(4, [1, 0, 3]), 2);
    assert.equal(nextStepIndex(3, [0, 1, 2]), -1);
    assert.equal(nextStepIndex(0, []), -1);
  });
});

describe('heads-ups shown', () => {
  const headsUps = [{ text: 'on the day', daysBefore: 0 }, { text: 'soak', daysBefore: 2 }, { text: 'thaw', daysBefore: 1 }];

  it('lists them furthest ahead first', () => {
    assert.deepEqual(visibleHeadsUps(headsUps, false).map((h) => h.text), ['soak', 'thaw', 'on the day']);
  });

  it('shows only what is due on the day in cook view', () => {
    assert.deepEqual(visibleHeadsUps(headsUps, true).map((h) => h.text), ['on the day']);
  });

  it('shows nothing for a recipe without any', () => {
    assert.deepEqual(visibleHeadsUps(undefined, false), []);
    assert.deepEqual(visibleHeadsUps([], true), []);
  });
});

describe('time stats', () => {
  it('lists prep, cook and total, leaving out a time nobody entered', () => {
    assert.deepEqual(timeStats({ prepMinutes: 10, cookMinutes: 20, minutes: 30 }), [
      { kind: 'prep', minutes: 10 },
      { kind: 'cook', minutes: 20 },
      { kind: 'total', minutes: 30 },
    ]);
    assert.deepEqual(timeStats({ prepMinutes: 0, cookMinutes: 20, minutes: 20 }).map((s) => s.kind), ['cook', 'total']);
    assert.deepEqual(timeStats({ prepMinutes: 0, cookMinutes: 0, minutes: 0 }), []);
  });

  it('words a time: an hour or more in hours, less in minutes', () => {
    const words = { long: (m) => `long ${m}`, short: (m) => `short ${m}` };
    assert.equal(minutesText(59, words), 'short 59');
    assert.equal(minutesText(60, words), 'long 60');
    assert.equal(minutesText(1, words), 'short 1');
  });
});
