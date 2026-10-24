// What a day card offers (dayCard.js): which evenings have a meal or can move, and the ⋯ menu's action ids by status.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayActionGroups, hasMeal, isMovable } from '../src/lib/dayCard.js';
import { groupedActions } from '../src/lib/menuGroups.js';

const STATUSES = ['open', 'planned', 'completed', 'missed', 'diningOut'];

// The menu as the card shows it: ids in order, a "|" before an item that starts a new group.
const menu = (day) =>
  groupedActions(dayActionGroups({ isToday: false, movable: true, canSwitch: true, ...day }).map((group) => group.map((id) => ({ id })))).map((a) => (a.divider ? `|${a.id}` : a.id));

describe('meal and movable', () => {
  it('has a meal when planned or completed', () => {
    assert.deepEqual(STATUSES.filter(hasMeal), ['planned', 'completed']);
  });

  it('moves only a planned meal that another evening can take', () => {
    assert.equal(isMovable('planned', 1), true);
    assert.equal(isMovable('planned', 0), false);
    for (const status of STATUSES.filter((s) => s !== 'planned')) assert.equal(isMovable(status, 3), false, status);
  });
});

describe('the ⋯ menu by status', () => {
  it('an open evening has Night Off only', () => {
    assert.deepEqual(menu({ status: 'open' }), ['nightOff']);
  });

  it('a planned evening groups change · move · take out of the plan', () => {
    assert.deepEqual(menu({ status: 'planned' }), ['swap', 'surprise', '|switch', '|nightOff', 'clear']);
  });

  it('leaves out Switch Days, and its rule, when the meal cannot move or the screen cannot switch', () => {
    assert.deepEqual(menu({ status: 'planned', movable: false }), ['swap', 'surprise', '|nightOff', 'clear']);
    assert.deepEqual(menu({ status: 'planned', canSwitch: false }), ['swap', 'surprise', '|nightOff', 'clear']);
  });

  it('completed, missed and dining out have no menu', () => {
    for (const status of ['completed', 'missed', 'diningOut']) assert.deepEqual(menu({ status }), [], status);
  });
});

describe('Minimal view', () => {
  it('keeps the menu on tonight only', () => {
    assert.deepEqual(menu({ status: 'planned', minimal: true, isToday: false }), []);
    assert.deepEqual(menu({ status: 'open', minimal: true, isToday: false }), []);
    assert.deepEqual(menu({ status: 'planned', minimal: true, isToday: true }), ['swap', 'surprise', '|switch', '|nightOff', 'clear']);
    assert.deepEqual(menu({ status: 'open', minimal: true, isToday: true }), ['nightOff']);
  });

  it('is off by default, so the grid card never hides its menu', () => {
    assert.deepEqual(menu({ status: 'planned', isToday: false }), ['swap', 'surprise', '|switch', '|nightOff', 'clear']);
  });
});
