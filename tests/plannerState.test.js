// The planner's rules (plannerState.js): made history, rolling today forward, the week summary, where a meal can move,
// the week's neighbours, the too-soon lookup, and the one-level undo slot.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createUndoSlot, firstTooSoon, madeIndex, nextPlannedAfter, onPlanNear, planDates, rollToday, summarize, switchTargets, weekOffset } from '../src/lib/plannerState.js';
import { setWeekStartDay } from '../src/lib/dates.js';

setWeekStartDay(6); // weeks start on Saturday, as the app's default

describe('made history', () => {
  const today = '2026-10-23';

  it('counts dinners on past days and keeps the latest date', () => {
    const index = madeIndex({ '2026-10-10': { recipeId: 'pho' }, '2026-10-20': { recipeId: 'pho' }, '2026-10-15': { recipeId: 'bun' } }, today);
    assert.deepEqual(index.get('pho'), { last: '2026-10-20', count: 2 });
    assert.deepEqual(index.get('bun'), { last: '2026-10-15', count: 1 });
  });

  it('does not count the order the days are listed in', () => {
    const index = madeIndex({ '2026-10-20': { recipeId: 'pho' }, '2026-10-10': { recipeId: 'pho' } }, today);
    assert.equal(index.get('pho').last, '2026-10-20');
  });

  it('counts today only once it is marked done, and never a future day', () => {
    assert.equal(madeIndex({ [today]: { recipeId: 'pho' } }, today).has('pho'), false);
    assert.equal(madeIndex({ [today]: { recipeId: 'pho', completed: true } }, today).get('pho').count, 1);
    assert.equal(madeIndex({ '2026-10-24': { recipeId: 'pho', completed: true } }, today).has('pho'), false);
  });

  it('leaves out nights off, empty days and entries with no recipe', () => {
    assert.equal(madeIndex({ '2026-10-20': { diningOut: true }, '2026-10-19': {}, '2026-10-18': undefined, '2026-10-17': { notes: 'x' } }, today).size, 0);
  });
});

describe('on the plan near an evening', () => {
  it('lists every date a recipe is on the plan, past and upcoming, made or not', () => {
    const index = planDates({ '2026-10-10': { recipeId: 'pho' }, '2026-10-30': { recipeId: 'pho' }, '2026-10-24': { recipeId: 'bun', completed: true } });
    assert.deepEqual(index.get('pho').sort(), ['2026-10-10', '2026-10-30']);
    assert.deepEqual(index.get('bun'), ['2026-10-24']);
  });

  it('leaves out nights off, empty days and entries with no recipe', () => {
    assert.equal(planDates({ '2026-10-20': { diningOut: true }, '2026-10-19': {}, '2026-10-18': undefined, '2026-10-17': { notes: 'x' } }).size, 0);
  });

  it('#287: planning next week sees a dinner later this week that is not cooked yet', () => {
    // Today Monday 2 Nov; burgers last made three weeks ago and planned for Friday 6 Nov; planning Tuesday 10 Nov.
    const dates = planDates({ '2026-10-12': { recipeId: 'burgers' }, '2026-11-06': { recipeId: 'burgers' } }).get('burgers');
    assert.equal(onPlanNear(dates, '2026-11-10', 7), true);
  });

  it('counts dinners after the evening too, both ends of the window included', () => {
    const dates = ['2026-11-09'];
    assert.equal(onPlanNear(dates, '2026-11-08', 7), true, 'the day after');
    assert.equal(onPlanNear(dates, '2026-11-02', 7), true, 'seven days after');
    assert.equal(onPlanNear(dates, '2026-11-16', 7), true, 'seven days before');
    assert.equal(onPlanNear(dates, '2026-11-01', 7), false, 'eight days after');
    assert.equal(onPlanNear(dates, '2026-11-17', 7), false, 'eight days before');
  });

  it('measures from the evening being planned, not from today', () => {
    // Made yesterday is no repeat for an evening three weeks out.
    assert.equal(onPlanNear(['2026-11-01'], '2026-11-23', 7), false);
  });

  it("leaves out the evening's own pick, so swapping it still lists the current meal", () => {
    assert.equal(onPlanNear(['2026-11-10'], '2026-11-10', 7), false);
    assert.equal(onPlanNear(['2026-11-10', '2026-11-13'], '2026-11-10', 7), true);
  });

  it('is false for a recipe that is not on the plan', () => {
    assert.equal(onPlanNear(undefined, '2026-11-10', 7), false);
  });
});

describe('rolling today forward', () => {
  // 2026-10-17 is a Saturday: that week runs 17–23, the next 24–30.
  it('changes nothing on the same day', () => {
    assert.deepEqual(rollToday({ today: '2026-10-23', weekStart: '2026-10-17' }, '2026-10-23'), { today: '2026-10-23', weekStart: '2026-10-17' });
  });

  it('a viewer on the old this-week follows into the new one at midnight on the week\'s last day', () => {
    assert.deepEqual(rollToday({ today: '2026-10-23', weekStart: '2026-10-17' }, '2026-10-24'), { today: '2026-10-24', weekStart: '2026-10-24' });
  });

  it('a viewer on the old this-week stays on it when the new day is still in it', () => {
    assert.deepEqual(rollToday({ today: '2026-10-20', weekStart: '2026-10-17' }, '2026-10-21'), { today: '2026-10-21', weekStart: '2026-10-17' });
  });

  it('a viewer on another week keeps it', () => {
    assert.deepEqual(rollToday({ today: '2026-10-23', weekStart: '2026-10-31' }, '2026-10-24'), { today: '2026-10-24', weekStart: '2026-10-31' });
    assert.deepEqual(rollToday({ today: '2026-10-23', weekStart: '2026-10-10' }, '2026-10-24'), { today: '2026-10-24', weekStart: '2026-10-10' });
  });

  it('follows after several days away too', () => {
    assert.deepEqual(rollToday({ today: '2026-10-23', weekStart: '2026-10-17' }, '2026-11-02'), { today: '2026-11-02', weekStart: '2026-10-31' });
  });
});

describe('the week summary', () => {
  it('counts dinners, nights off and open evenings; missed days count as none', () => {
    assert.deepEqual(summarize(['completed', 'missed', 'planned', 'diningOut', 'open', 'open', 'planned']), { planned: 3, off: 1, open: 2 });
    assert.deepEqual(summarize([]), { planned: 0, off: 0, open: 0 });
  });
});

describe('where a meal can move', () => {
  const week = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
  const statuses = { '2026-10-17': 'completed', '2026-10-18': 'diningOut', '2026-10-19': 'missed', '2026-10-20': 'planned', '2026-10-21': 'open', '2026-10-22': 'completed', '2026-10-23': 'planned' };
  const statusOf = (iso) => statuses[iso];

  it('is today onward: planned, open or a night off, never itself or a finished day', () => {
    assert.deepEqual(switchTargets('2026-10-23', week, '2026-10-20', statusOf), ['2026-10-20', '2026-10-21']);
    assert.deepEqual(switchTargets('2026-10-20', week, '2026-10-20', statusOf), ['2026-10-21', '2026-10-23']);
  });

  it('leaves out a past night off although its status says dining out', () => {
    assert.equal(switchTargets('2026-10-23', week, '2026-10-20', statusOf).includes('2026-10-18'), false);
    assert.equal(switchTargets('2026-10-23', week, '2026-10-17', statusOf).includes('2026-10-18'), true);
  });

  it('is empty when nothing else can take it', () => {
    assert.deepEqual(switchTargets('2026-10-23', week, '2026-10-23', statusOf), []);
  });
});

describe('the week\'s neighbours', () => {
  const week = ['d1', 'd2', 'd3', 'd4'];

  it('finds the next day after one that has a recipe', () => {
    const has = (d) => d === 'd3' || d === 'd4';
    assert.equal(nextPlannedAfter('d1', week, has), 'd3');
    assert.equal(nextPlannedAfter('d3', week, has), 'd4');
    assert.equal(nextPlannedAfter('d4', week, has), undefined);
  });

  it('counts weeks from this one: this, next, last, further', () => {
    assert.equal(weekOffset('2026-10-17', '2026-10-17'), 0);
    assert.equal(weekOffset('2026-10-17', '2026-10-24'), 1);
    assert.equal(weekOffset('2026-10-17', '2026-10-10'), -1);
    assert.equal(weekOffset('2026-10-17', '2026-12-05'), 7);
  });
});

describe('a meal planned too late for its heads-up', () => {
  const hummus = { title: 'Hummus', headsUps: [{ text: 'Soak the chickpeas', daysBefore: 1 }] };
  const stew = { title: 'Stew', headsUps: [{ text: 'Thaw', daysBefore: 2 }, { text: 'Marinate', daysBefore: 1 }] };
  const on = (map) => (iso) => map[iso];

  it('finds none when there is time, or no heads-ups', () => {
    assert.equal(firstTooSoon(['2026-10-25'], on({ '2026-10-25': hummus }), '2026-10-23'), undefined);
    assert.equal(firstTooSoon(['2026-10-23'], on({ '2026-10-23': { headsUps: [] } }), '2026-10-23'), undefined);
    assert.equal(firstTooSoon(['2026-10-23'], on({}), '2026-10-23'), undefined);
  });

  it('finds the meal and its furthest-ahead missed heads-up', () => {
    const late = firstTooSoon(['2026-10-23'], on({ '2026-10-23': hummus }), '2026-10-23');
    assert.equal(late.recipe, hummus);
    assert.equal(late.missed.text, 'Soak the chickpeas');
    assert.equal(firstTooSoon(['2026-10-23'], on({ '2026-10-23': stew }), '2026-10-23').missed.daysBefore, 2);
  });

  it('takes the first of several days that has one', () => {
    const late = firstTooSoon(['2026-10-25', '2026-10-23', '2026-10-24'], on({ '2026-10-25': hummus, '2026-10-23': stew, '2026-10-24': hummus }), '2026-10-23');
    assert.equal(late.recipe, stew);
  });
});

describe('the undo slot', () => {
  it('starts empty and says so', () => {
    const slot = createUndoSlot();
    assert.equal(slot.has, false);
    assert.equal(slot.take(), null);
  });

  it('hands over the change once and empties', () => {
    const slot = createUndoSlot();
    const run = () => {};
    slot.remember('Filled Monday', run);
    assert.equal(slot.has, true);
    assert.deepEqual(slot.take(), { message: 'Filled Monday', run });
    assert.equal(slot.has, false);
    assert.equal(slot.take(), null);
  });

  it('is one level: the next change replaces it', () => {
    const slot = createUndoSlot();
    slot.remember('first', () => {});
    slot.remember('second', () => {});
    assert.equal(slot.take().message, 'second');
    assert.equal(slot.take(), null);
  });

  it('is cleared by forgetting (a change without Undo, another week, leaving the planner)', () => {
    const slot = createUndoSlot();
    slot.remember('x', () => {});
    slot.forget();
    assert.equal(slot.has, false);
    assert.equal(slot.take(), null);
  });

  it('keeps separate slots apart', () => {
    const a = createUndoSlot();
    const b = createUndoSlot();
    a.remember('a', () => {});
    assert.equal(b.has, false);
  });
});
