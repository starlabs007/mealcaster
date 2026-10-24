// Edits to the stored grocery lists (src/lib/groceryOps.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addByHand, freezePast, lineKeysOf, listedLineKeys, parseLineKey, pushLines, relink, removeAdded, setStatus } from '../src/lib/groceryOps.js';

const THIS = '2026-10-17';
const NEXT = '2026-10-24';
const week = (extra = {}) => ({ pushed: [], status: {}, added: {}, ...extra });
const item = (ingredientId, status = 'need', doneWeek = '', note = '') => ({ ingredientId, note, status, doneWeek });
const state = (weeks = {}, every = []) => ({ weeks, every });

describe('recipe line keys', () => {
  const recipe = { id: 'pho', ingredients: [{ items: [{}, {}] }, { items: [{}] }] };

  it('number every line by group and position, and read a key back', () => {
    assert.deepEqual(lineKeysOf(recipe), ['pho:0:0', 'pho:0:1', 'pho:1:0']);
    assert.deepEqual(parseLineKey('pho:1:0'), { recipeId: 'pho', group: 1, item: 0 });
  });

  it('count a line as listed for every line of that recipe with the same ingredient', () => {
    const ingredientOf = { 'pho:0:0': 'beef', 'pho:0:1': 'onion', 'pho:1:0': 'beef', 'stew:0:0': 'beef' };
    const lines = [{ ingredientId: 'beef', sources: [{ recipeId: 'pho' }, { label: 'Added by you' }] }];
    const keysOf = (id) => (id === 'pho' ? lineKeysOf(recipe) : ['stew:0:0']);
    assert.deepEqual([...listedLineKeys(lines, keysOf, (k) => ingredientOf[k])].sort(), ['pho:0:0', 'pho:1:0']);
  });
});

describe('add to list', () => {
  const lines = [{ key: 'pho:0:0', recipeId: 'pho', ingredientId: 'beef' }, { key: 'pho:0:1', recipeId: 'pho', ingredientId: 'onion' }];

  it('pushes new ingredients to buy, and counts them', () => {
    const s = state();
    assert.equal(pushLines(s, THIS, lines, new Set()), 2);
    assert.deepEqual(s.weeks[THIS], week({ pushed: ['pho:beef', 'pho:onion'], status: { beef: 'need', onion: 'need' } }));
  });

  it('skips lines already on the list and pairs already pushed, and counts an ingredient once', () => {
    const s = state({ [THIS]: week({ pushed: ['pho:onion'], status: { onion: 'bought' } }) });
    const twice = [...lines, { key: 'stew:0:0', recipeId: 'stew', ingredientId: 'beef' }];
    assert.equal(pushLines(s, THIS, twice, new Set(['pho:0:0'])), 1); // pho beef is listed; pho onion pushed; only stew beef is new
    assert.deepEqual(s.weeks[THIS].pushed, ['pho:onion', 'stew:beef']);
    assert.equal(s.weeks[THIS].status.onion, 'bought'); // untouched
  });
});

describe('line status', () => {
  it('marks the week’s line', () => {
    const s = state();
    setStatus(s, THIS, THIS, 'milk', 'bought');
    assert.equal(s.weeks[THIS].status.milk, 'bought');
  });

  it('carries bought and to buy to an every-week item showing that week, with the week it was bought in', () => {
    const s = state({}, [item('salt')]);
    setStatus(s, THIS, THIS, 'salt', 'bought');
    assert.deepEqual(s.every[0], item('salt', 'bought', THIS));
    setStatus(s, THIS, THIS, 'salt', 'need');
    assert.deepEqual(s.every[0], item('salt'));
  });

  it('leaves an every-week item alone on a week it does not show on', () => {
    const s = state({}, [item('salt', 'bought', THIS)]);
    setStatus(s, NEXT, THIS, 'salt', 'need'); // bought items show only on the week they were bought in
    assert.deepEqual(s.every[0], item('salt', 'bought', THIS));
    const older = state({}, [item('rice')]);
    setStatus(older, '2026-10-10', THIS, 'rice', 'bought'); // to-buy items show from this week on, not before
    assert.deepEqual(older.every[0], item('rice'));
  });

  it('skips for the week only: the every-week item stays to buy', () => {
    const s = state({}, [item('salt')]);
    setStatus(s, THIS, THIS, 'salt', 'skipped');
    assert.equal(s.weeks[THIS].status.salt, 'skipped');
    assert.deepEqual(s.every[0], item('salt'));
  });
});

describe('adding by hand', () => {
  it('adds for the week only, with its note', () => {
    const s = state();
    addByHand(s, THIS, 'milk', '2 l', false);
    assert.deepEqual(s.weeks[THIS], week({ added: { milk: '2 l' }, status: { milk: 'need' } }));
    assert.deepEqual(s.every, []);
  });

  it('adds an every-week item, and an added one again goes back to buy with the new note', () => {
    const s = state({}, [item('milk', 'bought', THIS, 'old')]);
    addByHand(s, THIS, 'milk', '2 l', true);
    assert.deepEqual(s.every, [item('milk', 'need', '', '2 l')]);
    addByHand(s, THIS, 'eggs', '', true);
    assert.deepEqual(s.every.map((i) => i.ingredientId), ['milk', 'eggs']);
    assert.equal(s.weeks[THIS].status.eggs, 'need');
    assert.deepEqual(s.weeks[THIS].added, {}); // an every-week item has no week note
  });
});

describe('removing what you added', () => {
  it('removes the week’s item and the every-week item, and undo puts both back', () => {
    const s = state({ [THIS]: week({ added: { milk: '1 l', egg: '6' } }) }, [item('milk'), item('rice')]);
    const everyBefore = s.every;
    const undo = removeAdded(s, THIS, 'milk');
    assert.deepEqual(s.weeks[THIS].added, { egg: '6' });
    assert.deepEqual(s.every.map((i) => i.ingredientId), ['rice']);
    undo();
    assert.deepEqual(s.weeks[THIS].added, { egg: '6', milk: '1 l' });
    assert.equal(s.every, everyBefore);
  });

  it('copes with a week that has no list, and undo does not invent one', () => {
    const s = state({}, [item('milk')]);
    const undo = removeAdded(s, THIS, 'milk');
    assert.deepEqual(s.every, []);
    undo();
    assert.deepEqual(s.weeks, {});
    assert.equal(s.every.length, 1);
  });
});

describe('freezing past weeks', () => {
  const run = (s, { planWeeks = [], dinners = [], stocked = ['salt'] } = {}) => {
    const asked = [];
    freezePast(s, THIS, planWeeks, (w) => dinners.includes(w), (w) => (asked.push(w), stocked));
    return asked;
  };

  it('saves what a past week leaves off as in stock, once', () => {
    const s = state({ '2026-10-03': week(), '2026-10-10': week({ stock: ['rice'] }) });
    assert.deepEqual(run(s), ['2026-10-03']);
    assert.deepEqual(s.weeks['2026-10-03'].stock, ['salt']);
    assert.deepEqual(s.weeks['2026-10-10'].stock, ['rice']);
  });

  it('leaves this week and later ones alone', () => {
    const s = state({ [THIS]: week(), [NEXT]: week() });
    assert.deepEqual(run(s), []);
    assert.equal(s.weeks[THIS].stock, undefined);
  });

  it('freezes a past week the plan has dinners in even without a list, but not an empty one', () => {
    const s = state();
    run(s, { planWeeks: ['2026-10-03', '2026-09-26'], dinners: ['2026-10-03'] });
    assert.deepEqual(Object.keys(s.weeks), ['2026-10-03']);
  });
});

describe('merging and deleting ingredients', () => {
  it('moves marks onto the other ingredient: still to buy wins, then bought, notes joined, pairs rewritten once', () => {
    const s = state({
      [THIS]: week({
        pushed: ['pho:scallion', 'pho:onion', 'stew:scallion', 'stew:onion', 'pho:scallion'],
        status: { scallion: 'bought', onion: 'need' },
        added: { scallion: '3', onion: '1 bag' },
        stock: ['scallion', 'salt', 'onion'],
      }),
      [NEXT]: week({ status: { scallion: 'skipped' } }),
    });
    relink(s, 'scallion', 'onion');
    assert.deepEqual(s.weeks[THIS], week({
      pushed: ['pho:onion', 'stew:onion'],
      status: { onion: 'need' },
      added: { onion: '1 bag, 3' },
      stock: ['onion', 'salt'],
    }));
    assert.deepEqual(s.weeks[NEXT].status, { onion: 'skipped' });
  });

  it('keeps bought over skipped when both sides have a mark', () => {
    const s = state({ [THIS]: week({ status: { a: 'skipped', b: 'bought' } }) });
    relink(s, 'a', 'b');
    assert.deepEqual(s.weeks[THIS].status, { b: 'bought' });
    const t = state({ [THIS]: week({ status: { a: 'bought', b: 'skipped' } }) });
    relink(t, 'a', 'b');
    assert.deepEqual(t.weeks[THIS].status, { b: 'bought' });
  });

  it('gives the target the marks when it had none', () => {
    const s = state({ [THIS]: week({ status: { a: 'skipped' }, added: { a: '2' } }) });
    relink(s, 'a', 'b');
    assert.deepEqual([s.weeks[THIS].status, s.weeks[THIS].added], [{ b: 'skipped' }, { b: '2' }]);
  });

  it('drops marks of a deleted ingredient (target ""), including pairs and stock', () => {
    const s = state({ [THIS]: week({ pushed: ['pho:a', 'pho:b'], status: { a: 'need', b: 'need' }, added: { a: '1' }, stock: ['a', 'b'] }) }, [item('a'), item('b')]);
    relink(s, 'a', '');
    assert.deepEqual(s.weeks[THIS], week({ pushed: ['pho:b'], status: { b: 'need' }, stock: ['b'] }));
    assert.deepEqual(s.every.map((i) => i.ingredientId), ['b']);
  });

  it('keeps one every-week item when both ingredients have one (the target’s), else renames it', () => {
    const both = state({}, [item('a', 'bought', THIS), item('b')]);
    relink(both, 'a', 'b');
    assert.deepEqual(both.every, [item('b')]);
    const only = state({}, [item('a', 'bought', THIS, 'x')]);
    relink(only, 'a', 'b');
    assert.deepEqual(only.every, [item('b', 'bought', THIS, 'x')]);
  });
});
