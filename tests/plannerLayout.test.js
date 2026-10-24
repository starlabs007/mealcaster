// The planner's week grid (plannerLayout.js): narrow past tiles, tonight's width, which track each card takes below xl,
// and the look of a card while a meal is dragged.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GRID_TRACKS, columnTemplate, dropState, gridPlan } from '../src/lib/plannerLayout.js';

/** A week of seven with `past` days before tonight (past = 7 is a fully past week, -1 a future week). */
const week = (past) =>
  Array.from({ length: 7 }, (_, i) => ({
    iso: `d${i}`,
    isToday: past >= 0 && past < 7 && i === past,
    isPast: past >= 7 ? true : past < 0 ? false : i < past,
  }));

const tracksOf = (plan) => plan.map((p) => p.tracks);

describe('the grid plan', () => {
  it('shows past days beside a live week as narrow tiles, and tonight wider', () => {
    const plan = gridPlan(week(2));
    assert.deepEqual(plan.map((p) => p.compact), [true, true, false, false, false, false, false]);
    assert.deepEqual(plan.map((p) => p.column), ['0.55fr', '0.55fr', '1.6fr', '1fr', '1fr', '1fr', '1fr']);
    assert.equal(columnTemplate(plan), '0.55fr 0.55fr 1.6fr 1fr 1fr 1fr 1fr');
  });

  it('keeps full cards in a fully past or a future week', () => {
    assert.ok(gridPlan(week(7)).every((p) => !p.compact && p.tracks === 2 && p.column === '1fr'));
    assert.ok(gridPlan(week(-1)).every((p) => !p.compact && p.tracks === 2 && p.column === '1fr'));
  });

  it('starts the week with tonight first: no tiles, two tracks, 1.6 wide', () => {
    const plan = gridPlan(week(0));
    assert.deepEqual(tracksOf(plan), [2, 2, 2, 2, 2, 2, 2]);
    assert.equal(plan[0].column, '1.6fr');
    assert.equal(plan[0].wideTonight, false);
  });

  it('gives tonight three tracks after an odd number of tiles, two after an even number', () => {
    for (const past of [1, 3, 5]) {
      const tonight = gridPlan(week(past))[past];
      assert.equal(tonight.wideTonight, true, `after ${past}`);
      assert.equal(tonight.tracks, 3);
    }
    for (const past of [0, 2, 4, 6]) {
      const tonight = gridPlan(week(past))[past];
      assert.equal(tonight.wideTonight, false, `after ${past}`);
      assert.equal(tonight.tracks, 2);
    }
  });

  it('takes one track for a tile and only tonight is ever wide', () => {
    const plan = gridPlan(week(3));
    assert.deepEqual(tracksOf(plan), [1, 1, 1, 3, 2, 2, 2]);
    assert.equal(plan.filter((p) => p.wideTonight).length, 1);
  });

  it('puts tonight in the first row of the 8-track grid whatever day of the week it is', () => {
    for (let past = 0; past <= 6; past++) {
      const plan = gridPlan(week(past));
      const before = plan.slice(0, past).reduce((n, p) => n + p.tracks, 0);
      assert.ok(before + plan[past].tracks <= GRID_TRACKS, `tonight is the ${past + 1}th day`);
    }
  });

  it('has no tonight in a week without one, and an empty week gives an empty plan', () => {
    assert.ok(gridPlan(week(7)).every((p) => !p.wideTonight));
    assert.deepEqual(gridPlan([]), []);
    assert.equal(columnTemplate([]), '');
  });
});

describe('the look of a card while dragging', () => {
  const drag = { from: 'a', over: 'c', targets: ['b', 'c'] };

  it('has no look when nothing is dragged', () => {
    for (const iso of ['a', 'b', 'z']) assert.equal(dropState({ from: '', over: '', targets: [] }, iso), '');
  });

  it('tells the source, the card under the pointer, the cards it can go to, and the rest', () => {
    assert.equal(dropState(drag, 'a'), 'source');
    assert.equal(dropState(drag, 'c'), 'over');
    assert.equal(dropState(drag, 'b'), 'target');
    assert.equal(dropState(drag, 'z'), 'off');
  });

  it('shows the source as the source even when the pointer is back over it', () => {
    assert.equal(dropState({ from: 'a', over: 'a', targets: ['b'] }, 'a'), 'source');
  });
});
