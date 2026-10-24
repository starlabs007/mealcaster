// What the Recipe Catalog shows (catalogQuery.js): sort orders, filters and search, filter lists, the filter count, and
// which day is being planned.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SORT_IDS,
  activeFilterCount,
  categoryFilters,
  placeKey,
  plannedIdsOf,
  searchRecipes,
  sortCompare,
  tagFilters,
  targetDay,
} from '../src/lib/catalogQuery.js';
import { recipe } from './fakes.js';

const r = (id, title, extra = {}) => recipe(id, title, { custom: undefined, tags: [], ...extra });
const history = (made = {}) => ({
  timesMade: (id) => made[id]?.[0] ?? 0,
  lastMadeOn: (id) => made[id]?.[1],
});
const ingredients = { rice: { name: 'rice', plural: 'rices' }, scallion: { name: 'scallion', plural: 'scallions' } };
const base = {
  query: '', sort: 'name', tags: [], category: '', favoritesOnly: false, favoriteIds: [], hideRecent: false, hidePlanned: false, plannedIds: new Set(),
};
const lookup = (made = {}, recent = []) => ({ ingredientOf: (id) => ingredients[id], madeRecently: (id) => recent.includes(id), ...history(made) });
const ids = (list) => list.map((x) => x.id);

describe('sort orders', () => {
  const list = [r('b', 'Bún', { minutes: 40, addedAt: '2026-03-01' }), r('a', 'apple pie', { minutes: 0, addedAt: '2026-05-01' }), r('c', 'Curry', { minutes: 15, addedAt: '2026-01-01' })];

  it('knows its five orders', () => {
    assert.deepEqual(SORT_IDS, ['most-cooked', 'quickest', 'name', 'name-desc', 'recent']);
    assert.throws(() => sortCompare('nope', history()), /Unknown sort/);
  });

  it('sorts by name without case, and reversed', () => {
    assert.deepEqual(ids([...list].sort(sortCompare('name', history()))), ['a', 'b', 'c']);
    assert.deepEqual(ids([...list].sort(sortCompare('name-desc', history()))), ['c', 'b', 'a']);
  });

  it('puts the quickest first and a recipe with no time last', () => {
    assert.deepEqual(ids([...list].sort(sortCompare('quickest', history()))), ['c', 'b', 'a']);
  });

  it('puts the most recently added first', () => {
    assert.deepEqual(ids([...list].sort(sortCompare('recent', history()))), ['a', 'b', 'c']);
  });

  it('puts the most cooked first; ties go to the one made last, then A–Z', () => {
    const made = { a: [2, '2026-09-01'], b: [2, '2026-10-01'], c: [5, '2026-01-01'], d: [0, undefined], e: [0, undefined] };
    const all = ['a', 'b', 'c', 'd', 'e'].map((id) => r(id, id === 'd' ? 'Zed' : id === 'e' ? 'Eve' : id));
    assert.deepEqual(ids([...all].sort(sortCompare('most-cooked', history(made)))), ['c', 'b', 'a', 'e', 'd']);
  });
});

describe('filters', () => {
  const list = [
    r('pho', 'Phở', { tags: ['Soup', 'Vegetarian'], badge: { label: 'Dinner' } }),
    r('cake', 'Cake', { tags: ['Sweet'], badge: { label: 'Dessert' } }),
    r('stew', 'Stew', { tags: ['Soup'], badge: { label: 'Dinner' } }),
  ];
  const run = (filters, l = lookup()) => ids(searchRecipes(list, { ...base, ...filters }, l));

  it('shows everything with no filters', () => {
    assert.deepEqual(run({}), ['cake', 'pho', 'stew']);
  });

  it('needs every chosen tag, and the one category', () => {
    assert.deepEqual(run({ tags: ['Soup'] }), ['pho', 'stew']);
    assert.deepEqual(run({ tags: ['Soup', 'Vegetarian'] }), ['pho']);
    assert.deepEqual(run({ category: 'Dessert' }), ['cake']);
    assert.deepEqual(run({ tags: ['Soup'], category: 'Dessert' }), []);
  });

  it('keeps favourites only', () => {
    assert.deepEqual(run({ favoritesOnly: true, favoriteIds: ['stew'] }), ['stew']);
    assert.deepEqual(run({ favoritesOnly: false, favoriteIds: ['stew'] }), ['cake', 'pho', 'stew']);
  });

  it('hides recently made ones only when asked', () => {
    assert.deepEqual(run({ hideRecent: true }, lookup({}, ['pho'])), ['cake', 'stew']);
    assert.deepEqual(run({ hideRecent: false }, lookup({}, ['pho'])), ['cake', 'pho', 'stew']);
  });

  it('hides planned ones only when asked', () => {
    assert.deepEqual(run({ hidePlanned: true, plannedIds: new Set(['cake']) }), ['pho', 'stew']);
    assert.deepEqual(run({ hidePlanned: false, plannedIds: new Set(['cake']) }), ['cake', 'pho', 'stew']);
  });

  it('does not change the list it is given', () => {
    const before = ids(list);
    run({ sort: 'name-desc' });
    assert.deepEqual(ids(list), before);
  });
});

describe('search', () => {
  const list = [
    r('bun', 'Bún chả', { description: 'Grilled pork', tags: ['Vietnamese'], badge: { label: 'Dinner' }, ingredients: [{ title: 'Main', category: '', items: [{ id: 'scallion' }] }] }),
    r('fried', 'Fried rice', { description: 'Leftovers', badge: { label: 'Lunch' }, ingredients: [{ title: 'Main', category: '', items: [{ id: 'rice' }] }] }),
  ];
  const find = (query) => ids(searchRecipes(list, { ...base, query }, lookup()));

  it('finds a title without accents or case: "bun cha" finds Bún chả', () => {
    assert.deepEqual(find('bun cha'), ['bun']);
    assert.deepEqual(find('BÚN'), ['bun']);
  });

  it('needs every word, in any order and any field', () => {
    assert.deepEqual(find('pork bun'), ['bun']);
    assert.deepEqual(find('pork rice'), []);
  });

  it('searches the description, the category, the tags and the ingredient names and plurals', () => {
    assert.deepEqual(find('leftovers'), ['fried']);
    assert.deepEqual(find('lunch'), ['fried']);
    assert.deepEqual(find('vietnamese'), ['bun']);
    assert.deepEqual(find('scallions'), ['bun']);
    assert.deepEqual(find('rice'), ['fried']);
  });

  it('ignores ingredients it does not know and blank queries', () => {
    assert.deepEqual(find('   '), ['bun', 'fried']);
    const unknown = [r('x', 'X', { ingredients: [{ title: 'Main', category: '', items: [{ id: 'ghost' }] }] })];
    assert.deepEqual(ids(searchRecipes(unknown, { ...base, query: 'ghost' }, lookup())), []);
  });
});

describe('filter lists', () => {
  const list = [r('a', 'A', { tags: ['Soup'], badge: { label: 'Dinner' } }), r('b', 'B', { tags: ['Sweet'], badge: { label: 'Dessert' } })];

  it('lists the tags in use, and keeps an active one that no recipe has', () => {
    assert.deepEqual(tagFilters(list, []).sort(), ['Soup', 'Sweet']);
    assert.ok(tagFilters(list, ['Spicy']).includes('Spicy'));
    assert.equal(tagFilters(list, []).includes('Spicy'), false);
  });

  it('lists the categories in use, and keeps the active one that no recipe has', () => {
    assert.deepEqual(categoryFilters(list, '').sort(), ['Dessert', 'Dinner']);
    assert.ok(categoryFilters(list, 'Brunch').includes('Brunch'));
    assert.equal(categoryFilters(list, '').includes('Lunch'), false);
  });

  it('counts the filters that are on', () => {
    const off = { tags: [], category: '', favoritesOnly: false, hideRecent: false, hidePlanned: false };
    assert.equal(activeFilterCount(off), 0);
    assert.equal(activeFilterCount({ tags: ['a', 'b'], category: 'Dinner', favoritesOnly: true, hideRecent: true, hidePlanned: true }), 6);
    assert.equal(activeFilterCount({ ...off, hidePlanned: true }), 1);
  });
});

describe('the day being planned', () => {
  it('is the day in the URL while it can still be planned, else the first open day', () => {
    const plannable = ['2026-10-23', '2026-10-24'];
    assert.equal(targetDay('2026-10-24', plannable, '2026-10-23'), '2026-10-24');
    assert.equal(targetDay('2026-10-20', plannable, '2026-10-23'), '2026-10-23');
    assert.equal(targetDay(undefined, plannable, '2026-10-23'), '2026-10-23');
    assert.equal(targetDay('2026-10-24', plannable, undefined), '2026-10-24');
    assert.equal(targetDay(undefined, plannable, undefined), undefined);
  });

  it('plans around the week\'s dinners, except the target day\'s own', () => {
    const days = [
      { status: 'planned', iso: '1', recipe: { id: 'a' } },
      { status: 'completed', iso: '2', recipe: { id: 'b' } },
      { status: 'planned', iso: '3', recipe: { id: 'c' } },
      { status: 'open', iso: '4' },
      { status: 'diningOut', iso: '5' },
    ];
    assert.deepEqual([...plannedIdsOf(days, '3')].sort(), ['a', 'b']);
    assert.deepEqual([...plannedIdsOf(days, undefined)].sort(), ['a', 'b', 'c']);
  });

  it('keeps the target day\'s current pick in the results when planned ones are hidden', () => {
    const list = [r('a', 'A'), r('c', 'C')];
    const days = [{ status: 'planned', iso: '1', recipe: { id: 'a' } }, { status: 'planned', iso: '3', recipe: { id: 'c' } }];
    const shown = searchRecipes(list, { ...base, hidePlanned: true, plannedIds: plannedIdsOf(days, '3') }, lookup());
    assert.deepEqual(ids(shown), ['c']);
  });

  it('keys the search by its text, filters and day', () => {
    assert.equal(placeKey({ q: 'a' }, '2026-10-23'), placeKey({ q: 'a', filter: '', category: '' }, '2026-10-23'));
    assert.notEqual(placeKey({ q: 'a' }, '2026-10-23'), placeKey({ q: 'a' }, '2026-10-24'));
    assert.notEqual(placeKey({ q: 'a' }, undefined), placeKey({ q: 'b' }, undefined));
    assert.notEqual(placeKey({ filter: 'x' }, undefined), placeKey({ category: 'x' }, undefined));
  });
});
