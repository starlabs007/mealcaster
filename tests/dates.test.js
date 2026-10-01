import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, formatLastMade } from '../src/lib/dates.js';

test('daysBetween counts calendar days', () => {
  assert.equal(daysBetween('2026-09-28', '2026-10-01'), 3);
  assert.equal(daysBetween('2026-10-01', '2026-09-28'), -3);
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2); // across a DST change
});

test('formatLastMade reads naturally', () => {
  const today = '2026-10-01';
  const ago = (days) => {
    const d = new Date(2026, 9, 1 - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  assert.equal(formatLastMade(undefined, today), 'Not made yet');
  assert.equal(formatLastMade(today, today), 'Last made today');
  assert.equal(formatLastMade(ago(1), today), 'Last made yesterday');
  assert.equal(formatLastMade(ago(2), today), 'Last made 2 days ago');
  assert.equal(formatLastMade(ago(13), today), 'Last made 13 days ago');
  assert.equal(formatLastMade(ago(14), today), 'Last made 2 weeks ago');
  assert.equal(formatLastMade(ago(75), today), 'Last made 2 months ago');
  assert.equal(formatLastMade(ago(400), today), 'Last made over a year ago');
});
