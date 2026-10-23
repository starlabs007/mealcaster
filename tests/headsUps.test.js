// Heads-ups (src/lib/headsUps.js): the Heads_Up_JSON cell, lead times and the planner's reminders.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { byLead, formatHeadsUps, leadDays, missedHeadsUps, normalizeHeadsUps, parseHeadsUps, remindersOn } from '../src/lib/headsUps.js';
import * as codec from '../src/lib/sync/codec.js';
import { recipe } from './fakes.js';

const soak = { text: 'Soak the chickpeas overnight.', daysBefore: 1 };
const duck = { text: 'Order the duck.', daysBefore: 2 };
const butter = { text: 'Take the butter out.', daysBefore: 0 };

describe('Heads_Up_JSON cell', () => {
  it('round-trips a list, keeping keys it does not know', () => {
    const list = [soak, { text: 'Order the duck.', daysBefore: 2, kind: 'shopping' }];
    assert.deepEqual(parseHeadsUps(formatHeadsUps(list)), { headsUps: list });
    assert.equal(formatHeadsUps([soak]), '[{"text":"Soak the chickpeas overnight.","daysBefore":1}]');
  });

  it('is empty for no heads-ups, and reads an empty cell as none', () => {
    assert.equal(formatHeadsUps([]), '');
    assert.equal(formatHeadsUps(undefined), '');
    assert.deepEqual(parseHeadsUps(''), { headsUps: [] });
    assert.deepEqual(parseHeadsUps('  '), { headsUps: [] });
  });

  it('reads plain text as one heads-up on the day, and a single object as a list of one', () => {
    assert.deepEqual(parseHeadsUps(' Take the butter out. '), { headsUps: [butter] });
    assert.deepEqual(parseHeadsUps('{"text":"Soak the chickpeas overnight.","daysBefore":1}'), { headsUps: [soak] });
  });

  it('keeps a cell that does not parse as raw text and shows nothing', () => {
    assert.deepEqual(parseHeadsUps('[{"text": "Soak'), { headsUps: [], raw: '[{"text": "Soak' });
  });

  it('drops items without text and tidies the lead time', () => {
    assert.deepEqual(
      normalizeHeadsUps([null, 'x', { text: ' ' }, { text: 'A', daysBefore: '2' }, { text: 'B', daysBefore: -1 }, { text: 'C', daysBefore: 1.7 }, { daysBefore: 1 }]),
      [{ text: 'x', daysBefore: 0 }, { text: 'A', daysBefore: 2 }, { text: 'B', daysBefore: 0 }, { text: 'C', daysBefore: 1 }],
    );
    assert.deepEqual(normalizeHeadsUps(undefined), []);
  });
});

describe('heads-up codec column', () => {
  const options = { columns: ['Recipe_ID', 'Title', 'Heads_Up_JSON'], favorites: new Set(), today: '2026-10-23' };

  it('writes the heads-ups and reads them back', () => {
    const r = recipe('r1', 'Hummus', { headsUps: [soak] });
    const row = codec.recipeToRow(r, new Set());
    assert.equal(row.Heads_Up_JSON, formatHeadsUps([soak]));
    assert.deepEqual(codec.recipeFromRow(row, undefined, options).recipe.headsUps, [soak]);
  });

  it('writes a cell that did not parse back untouched until the recipe gets a heads-up', () => {
    const { recipe: read } = codec.recipeFromRow({ Recipe_ID: 'r1', Title: 'Hummus', Heads_Up_JSON: '[{oops' }, undefined, options);
    assert.deepEqual(read.headsUps, []);
    assert.equal(codec.recipeToRow(read, new Set()).Heads_Up_JSON, '[{oops');
    assert.equal(codec.recipeToRow({ ...read, headsUps: [soak] }, new Set()).Heads_Up_JSON, formatHeadsUps([soak]));
    // A fixed cell clears the raw copy.
    const fixed = codec.recipeFromRow({ Recipe_ID: 'r1', Title: 'Hummus', Heads_Up_JSON: 'Soak them' }, read, options).recipe;
    assert.equal(fixed.headsUpsRaw, undefined);
    assert.deepEqual(fixed.headsUps, [{ text: 'Soak them', daysBefore: 0 }]);
  });

  it('recipes without the field write an empty cell', () => {
    assert.equal(codec.recipeToRow(recipe('r1', 'Pasta'), new Set()).Heads_Up_JSON, '');
  });
});

describe('lead times and reminders', () => {
  const hummus = recipe('hummus', 'Hummus', { headsUps: [soak, butter] });
  const duckDinner = recipe('duck', 'Duck', { headsUps: [duck] });
  const pasta = recipe('pasta', 'Pasta');

  it('takes the longest lead and orders heads-ups by it', () => {
    assert.equal(leadDays(hummus), 1);
    assert.equal(leadDays(pasta), 0);
    assert.equal(leadDays(undefined), 0);
    assert.deepEqual(byLead([butter, duck, soak]), [duck, soak, butter]);
  });

  it('a heads-up is missed only when its day is before today (tonight for tomorrow is in time)', () => {
    assert.deepEqual(missedHeadsUps(hummus, '2026-10-24', '2026-10-23'), []);
    assert.deepEqual(missedHeadsUps(hummus, '2026-10-23', '2026-10-23'), [soak]);
    assert.deepEqual(missedHeadsUps(duckDinner, '2026-10-24', '2026-10-23'), [duck]);
    assert.deepEqual(missedHeadsUps(duckDinner, '2026-10-25', '2026-10-23'), []);
  });

  it('puts each heads-up on the day it is due, nearest dinner first, never on past days', () => {
    const plan = { '2026-10-24': hummus, '2026-10-26': duckDinner, '2026-10-27': pasta };
    const dinnerOn = (iso) => plan[iso];
    assert.deepEqual(remindersOn('2026-10-23', '2026-10-23', dinnerOn), [{ dinner: '2026-10-24', days: 1, recipe: hummus, headsUp: soak }]);
    assert.deepEqual(remindersOn('2026-10-24', '2026-10-23', dinnerOn), [{ dinner: '2026-10-26', days: 2, recipe: duckDinner, headsUp: duck }]);
    assert.deepEqual(remindersOn('2026-10-25', '2026-10-23', dinnerOn), []);
    assert.deepEqual(remindersOn('2026-10-22', '2026-10-23', dinnerOn), []);
  });
});
