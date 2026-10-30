import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copiedEntries, dayStatus, dinnerPool, pickTier, resetDays, restoreDays, snapshotDays } from '../src/lib/planDays.js';

// Week of Mon 19 – Sun 25 Oct 2026; today is Wednesday and its dinner is done.
const days = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
const today = '2026-10-21';
const recipes = new Set(['risotto', 'ragu', 'pho', 'dal', 'tacos']);

const week = () => ({
  // Last week: Wednesday empty, Thursday a meal, Friday a night off, Saturday a meal, Sunday a deleted recipe.
  '2026-10-12': { recipeId: 'dal' },
  '2026-10-15': { recipeId: 'pho' },
  '2026-10-16': { diningOut: true },
  '2026-10-17': { recipeId: 'tacos' },
  '2026-10-18': { recipeId: 'gone' },
  // This week
  '2026-10-19': { recipeId: 'risotto' },
  '2026-10-21': { recipeId: 'ragu', completed: true, notes: 'double batch' },
  '2026-10-22': { notes: 'use the leftover rice' },
  '2026-10-24': { recipeId: 'risotto' },
});
const statusIn = (entries) => (iso) => dayStatus(entries[iso], iso, today, (id) => recipes.has(id));

test('day statuses: past, a finished today, planned, open and deleted recipes', () => {
  const entries = week();
  const status = statusIn(entries);
  assert.equal(status('2026-10-19'), 'completed');
  assert.equal(status('2026-10-20'), 'missed');
  assert.equal(status('2026-10-21'), 'completed');
  assert.equal(status('2026-10-24'), 'planned');
  assert.equal(status('2026-10-25'), 'open');
  assert.equal(dayStatus({ recipeId: 'gone' }, '2026-10-25', today, (id) => recipes.has(id)), 'open');
  assert.equal(dayStatus({ diningOut: true }, '2026-10-16', today, () => true), 'diningOut');
});

test('Copy Last Week fills only open upcoming evenings', () => {
  const entries = week();
  assert.deepEqual(copiedEntries(entries, days, today, statusIn(entries)), {
    '2026-10-22': { recipeId: 'pho', notes: 'use the leftover rice' }, // keeps its own note
    '2026-10-23': { diningOut: true },
  });
  // Today (done, last Wednesday empty), Saturday (planned) and past Monday aren't touched; nor is
  // Sunday, whose last-week recipe was deleted.
});

test('Copy Last Week with no open evening changes nothing', () => {
  const entries = { ...week(), '2026-10-22': { recipeId: 'dal' }, '2026-10-23': { recipeId: 'dal' }, '2026-10-25': { diningOut: true } };
  assert.deepEqual(copiedEntries(entries, days, today, statusIn(entries)), {});
});

test('a today not yet done is copied over like any open evening', () => {
  const entries = { ...week(), '2026-10-21': undefined, '2026-10-14': { recipeId: 'dal' } };
  assert.deepEqual(copiedEntries(entries, days, today, statusIn(entries))['2026-10-21'], { recipeId: 'dal' });
});

test('Reset Week clears upcoming evenings and leaves a finished today alone', () => {
  const entries = { ...week(), '2026-10-23': { diningOut: true } };
  assert.deepEqual(resetDays(entries, days, today, statusIn(entries)), ['2026-10-22', '2026-10-23', '2026-10-24']);
});

test('Reset Week clears today while its dinner is still to cook', () => {
  const entries = { ...week(), '2026-10-21': { recipeId: 'ragu' } };
  assert.ok(resetDays(entries, days, today, statusIn(entries)).includes('2026-10-21'));
});

test('Undo puts the exact previous week back after Copy and after Reset', () => {
  const entries = week();
  const before = structuredClone(entries);
  const status = statusIn(entries);

  let saved = snapshotDays(entries, days);
  Object.assign(entries, copiedEntries(entries, days, today, status));
  assert.notDeepEqual(entries, before);
  restoreDays(entries, saved);
  assert.deepEqual(entries, before);

  saved = snapshotDays(entries, days);
  for (const iso of resetDays(entries, days, today, status)) delete entries[iso];
  restoreDays(entries, saved);
  assert.deepEqual(entries, before);
});

test('dinner pool: recipes with Dinner among their meals and ones with no meals, or everything when there are none', () => {
  const r = (id, ...meals) => ({ id, meals });
  const mixed = [r('a', 'Dinner'), r('b', 'Lunch', 'Dinner'), r('c'), r('d', 'Breakfast'), r('e', 'Dessert'), r('f', 'Lunch'), r('h', 'Other')];
  assert.deepEqual(dinnerPool(mixed).map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(dinnerPool([{ id: 'g' }]).map((x) => x.id), ['g'], 'a recipe saved without meals counts as having none');
  const noDinners = [r('d', 'Breakfast'), r('e', 'Dessert')];
  assert.deepEqual(dinnerPool(noDinners), noDinners);
  assert.deepEqual(dinnerPool([]), []);
});

test('a single-day snapshot takes back Mark Done, a new pick and a cleared evening', () => {
  const entries = week();
  for (const [iso, change] of [
    ['2026-10-22', () => (entries['2026-10-22'] = { ...entries['2026-10-22'], recipeId: 'pho', completed: true })],
    ['2026-10-23', () => (entries['2026-10-23'] = { recipeId: 'dal' })],
    ['2026-10-24', () => delete entries['2026-10-24']],
  ]) {
    const before = entries[iso] && { ...entries[iso] };
    const saved = snapshotDays(entries, [iso]);
    change();
    restoreDays(entries, saved);
    assert.deepEqual(entries[iso], before);
    assert.equal(iso in entries, before !== undefined);
  }
});

// Auto-fill and Surprise Me: which recipes they pick from for an evening.
const meal = (id, daysBefore) => ({ id, meals: ['Dinner'], ...(daysBefore !== undefined && { headsUps: [{ text: `Prep ${id}`, daysBefore }] }) });
const ids = (tier) => tier.map((r) => r.id);
const history = ({ used = [], recent = [] } = {}) => ({ used: new Set(used), madeRecently: (id) => recent.includes(id) });

test('pickTier: a recipe whose heads-up is already late loses to one still in time', () => {
  // Tomorrow (Thursday): a heads-up due the day before is in time (tonight); two days before was yesterday.
  const pool = [meal('soak', 1), meal('order', 2), meal('pasta')];
  assert.deepEqual(ids(pickTier(pool, '2026-10-22', today, history())), ['soak', 'pasta']);
  // Tonight: even the day-before one is late.
  assert.deepEqual(ids(pickTier(pool, today, today, history())), ['pasta']);
  // A same-day heads-up is never late.
  assert.deepEqual(ids(pickTier([meal('butter', 0), meal('soak', 1)], today, today, history())), ['butter']);
});

test('pickTier: a late recipe is still picked when nothing else fits', () => {
  assert.deepEqual(ids(pickTier([meal('order', 2)], today, today, history())), ['order']);
  assert.deepEqual(pickTier([], today, today, history()), []);
});

test('pickTier: in time comes first, then not on the menu, then not made recently', () => {
  const pool = [meal('fresh'), meal('recent'), meal('onMenu'), meal('late', 1)];
  const h = history({ used: ['onMenu'], recent: ['recent'] });
  assert.deepEqual(ids(pickTier(pool, today, today, h)), ['fresh']);
  // Without a fresh one: in time but made recently beats a fresh recipe that's late.
  assert.deepEqual(ids(pickTier([meal('recent'), meal('onMenu'), meal('late', 1)], today, today, h)), ['recent']);
  // Only the week's own meal is in time: it still beats a late one not on the menu.
  assert.deepEqual(ids(pickTier([meal('onMenu'), meal('late', 1)], today, today, h)), ['onMenu']);
  // Every recipe late: back to the usual order.
  assert.deepEqual(ids(pickTier([meal('lateA', 1), meal('lateB', 2)], today, today, history({ recent: ['lateA'] }))), ['lateB']);
});
