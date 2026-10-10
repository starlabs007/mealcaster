// Moves the viewed week and the grocery lists onto the weeks of the current start day. Call after
// the setting changes (Profile) or arrives from the sheet. Plan entries are keyed by date, so
// they never move; grocery lists are keyed by week start and merge when two weeks become one.

import { addDays, fromISO, weekStartOf } from './dates.js';
import { planner } from './planner.svelte.js';
import { grocery, replaceGrocery } from './grocery.svelte.js';
import { rekeyGroceryWeeks } from './sync/codec.js';

/** @param {boolean} wasThisWeek whether the viewed week was this week before the start day changed */
export function realignWeeks(wasThisWeek) {
  // The week holding the old week's middle day, or this week if that is what was in view.
  planner.weekStart = weekStartOf(wasThisWeek ? new Date() : fromISO(addDays(planner.weekStart, 3)));
  const every = $state.snapshot(grocery.every).map((i) => (i.doneWeek ? { ...i, doneWeek: weekStartOf(fromISO(i.doneWeek)) } : i));
  replaceGrocery(rekeyGroceryWeeks($state.snapshot(grocery.weeks)), every);
}
