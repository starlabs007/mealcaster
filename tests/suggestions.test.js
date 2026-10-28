import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dayStatus } from '../src/lib/planDays.js';
import { acceptedEntries, liveSuggestions, pickSuggestion, rerollDay, suggestDays, suggestableDays, suggestionsIn } from '../src/lib/suggestions.js';

// Week of Mon 19 – Sun 25 Oct 2026; today is Wednesday and its dinner is done.
const days = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
const today = '2026-10-21';
const meal = (id, daysBefore) => ({ id, meals: ['Dinner'], ...(daysBefore !== undefined && { headsUps: [{ text: `Prep ${id}`, daysBefore }] }) });
const pool = ['risotto', 'ragu', 'pho', 'dal', 'tacos', 'laksa'].map((id) => meal(id));
const known = new Set(pool.map((r) => r.id));
const entries = () => ({
  '2026-10-19': { recipeId: 'risotto' },
  '2026-10-21': { recipeId: 'ragu', completed: true },
  '2026-10-22': { notes: 'use the leftover rice' },
  '2026-10-24': { diningOut: true },
});
const statusIn = (e) => (iso) => dayStatus(e[iso], iso, today, (id) => known.has(id));
const never = () => false;
// Always the first of the tier, so picks are predictable.
const first = () => 0;

test('suggestions go only on open evenings from today on', () => {
  // Mon past, Tue missed, Wed done, Sat a night off.
  assert.deepEqual(suggestableDays(days, today, statusIn(entries())), ['2026-10-22', '2026-10-23', '2026-10-25']);
});

test('each suggestion avoids the planned meals and the other suggestions', () => {
  const open = ['2026-10-22', '2026-10-23', '2026-10-25'];
  const picked = suggestDays(open, pool, today, { planned: ['risotto', 'ragu'], madeRecently: never, random: first });
  assert.deepEqual(picked, { '2026-10-22': 'pho', '2026-10-23': 'dal', '2026-10-25': 'tacos' });
  // Recently made recipes come last, like Auto-fill's picks.
  const fresh = suggestDays(open, pool, today, { planned: [], madeRecently: (id) => id !== 'laksa', random: first });
  assert.equal(fresh['2026-10-22'], 'laksa');
});

test('Shuffle All gives each evening something other than what it had', () => {
  const previous = { '2026-10-22': 'pho', '2026-10-23': 'dal' };
  const picked = suggestDays(Object.keys(previous), pool, today, { planned: [], madeRecently: never, previous, random: first });
  assert.notEqual(picked['2026-10-22'], 'pho');
  assert.notEqual(picked['2026-10-23'], 'dal');
  assert.notEqual(picked['2026-10-22'], picked['2026-10-23']);
});

test('no recipes, no suggestions', () => {
  assert.deepEqual(suggestDays(['2026-10-22'], [], today, { planned: [], madeRecently: never }), {});
  assert.equal(pickSuggestion([], '2026-10-22', today, { used: new Set(), madeRecently: never }), undefined);
});

test('re-roll avoids its own suggestion, the others and the planned meals', () => {
  const suggestions = { '2026-10-22': 'pho', '2026-10-23': 'dal' };
  for (let i = 0; i < 20; i++) {
    const id = rerollDay(suggestions, '2026-10-22', pool, today, { planned: ['risotto', 'ragu'], madeRecently: never });
    assert.ok(['tacos', 'laksa'].includes(id), id);
  }
  // With one recipe it keeps that one rather than none.
  assert.equal(rerollDay({ '2026-10-22': 'pho' }, '2026-10-22', [meal('pho')], today, { planned: [], madeRecently: never }), 'pho');
});

test('re-roll prefers a recipe whose heads-up is still in time', () => {
  // Thursday: two days' notice is already late, a day's notice is not.
  const late = [meal('pho'), meal('order', 2), meal('soak', 1)];
  assert.equal(rerollDay({ '2026-10-22': 'pho' }, '2026-10-22', late, today, { planned: [], madeRecently: never }), 'soak');
});

test('a suggestion drops once its evening is no longer open', () => {
  const e = entries();
  const suggestions = { '2026-10-20': 'pho', '2026-10-22': 'pho', '2026-10-23': 'dal', '2026-10-25': 'gone' };
  // Tuesday has passed and the recipe for Sunday was deleted.
  assert.deepEqual(liveSuggestions(suggestions, today, statusIn(e), (id) => known.has(id)), { '2026-10-22': 'pho', '2026-10-23': 'dal' });
  // A meal dragged onto Thursday, a night off on Friday: both suggestions go.
  e['2026-10-22'] = { recipeId: 'tacos' };
  e['2026-10-23'] = { diningOut: true };
  assert.deepEqual(liveSuggestions({ '2026-10-22': 'pho', '2026-10-23': 'dal' }, today, statusIn(e), (id) => known.has(id)), {});
  // Unchanged: the same object, so the store isn't rewritten.
  const same = { '2026-10-25': 'pho' };
  assert.equal(liveSuggestions(same, today, statusIn(entries()), (id) => known.has(id)), same);
});

test('the viewed week shows only its own suggestions', () => {
  assert.deepEqual(suggestionsIn({ '2026-10-23': 'dal', '2026-10-22': 'pho', '2026-11-02': 'tacos' }, days), ['2026-10-22', '2026-10-23']);
});

test('Accept plans each evening with its suggestion and keeps its note', () => {
  const e = entries();
  const before = structuredClone(e);
  const accepted = acceptedEntries({ '2026-10-22': 'pho', '2026-10-23': 'dal' }, ['2026-10-22', '2026-10-23'], e);
  assert.deepEqual(accepted, {
    '2026-10-22': { recipeId: 'pho', notes: 'use the leftover rice' },
    '2026-10-23': { recipeId: 'dal' },
  });
  assert.deepEqual(e, before);
});

test('suggestions are never saved or synced before Accept', () => {
  // The plan saved on the device and pushed to the sheet is `planner.entries`; suggestions live in their own
  // in-memory state, and only acceptSuggestions writes them into the plan.
  const source = readFileSync(new URL('../src/lib/planner.svelte.js', import.meta.url), 'utf8');
  const saves = [...source.matchAll(/saveItem\(([^;]+)\);/g)].map((m) => m[1]);
  assert.deepEqual(saves, ['STORAGE_KEY, JSON.stringify(planner.entries)']);
  const writes = [...source.matchAll(/acceptedEntries\(/g)];
  assert.equal(writes.length, 1);
  assert.match(source, /export function acceptSuggestions\(\) \{[\s\S]*?acceptedEntries\(/);
  for (const line of source.split('\n').filter((l) => /planner\.entries\b.*=/.test(l) && /suggest/i.test(l))) {
    assert.match(line, /accepted/, `suggestions written into the plan outside Accept: ${line.trim()}`);
  }
});
