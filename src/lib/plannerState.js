// The planner's rules on plain data (planner.svelte.js holds the plan, the saving and the toasts): how often and when
// each recipe was made, which recipes sit near an evening, rolling today forward, the week's summary, where a meal can move, the week's neighbours, and
// the one-level undo slot behind Cmd/Ctrl+Z.

import { byLead, missedHeadsUps } from './headsUps.js';
import { daysBetween, fromISO, weekStartOf } from './dates.js';

/** @typedef {{ recipeId?: string, diningOut?: boolean, completed?: boolean, notes?: string }} PlanEntry */

/**
 * recipe id → how often and when it was last made: past days on the plan, plus today once marked done.
 * @param {Record<string, PlanEntry | undefined>} entries @param {string} today
 * @returns {Map<string, { last: string, count: number }>}
 */
export function madeIndex(entries, today) {
  const index = new Map();
  for (const [iso, entry] of Object.entries(entries)) {
    if (!entry?.recipeId || iso > today || (iso === today && !entry.completed)) continue;
    const made = index.get(entry.recipeId);
    if (made) {
      made.count += 1;
      if (iso > made.last) made.last = iso;
    } else index.set(entry.recipeId, { last: iso, count: 1 });
  }
  return index;
}

/**
 * recipe id → every date it is on the plan: past, today and upcoming, made or not. Feeds `onPlanNear`.
 * @param {Record<string, PlanEntry | undefined>} entries
 * @returns {Map<string, string[]>}
 */
export function planDates(entries) {
  const index = new Map();
  for (const [iso, entry] of Object.entries(entries)) {
    if (!entry?.recipeId) continue;
    const dates = index.get(entry.recipeId);
    if (dates) dates.push(iso);
    else index.set(entry.recipeId, [iso]);
  }
  return index;
}

/**
 * Whether a recipe is on the plan within `days` days either side of `iso`, made or still to come, leaving out that
 * evening's own pick (#287). Measured from the evening being planned, not from today: planning next week has to see
 * this week's dinners that aren't cooked yet, and a dinner made yesterday is no repeat three weeks out.
 * @param {string[] | undefined} dates the recipe's dates from `planDates` @param {string} iso @param {number} days
 */
export const onPlanNear = (dates, iso, days) => !!dates?.some((d) => d !== iso && Math.abs(daysBetween(d, iso)) <= days);

/**
 * The date and viewed week after the date changed while the page sat open. A viewer on the week that was "this week"
 * follows it into the new one; anyone else keeps their week.
 * @param {{ today: string, weekStart: string }} view @param {string} now today's date
 */
export function rollToday({ today, weekStart }, now) {
  if (now === today) return { today, weekStart };
  const followed = weekStart === weekStartOf(fromISO(today));
  return { today: now, weekStart: followed ? weekStartOf(fromISO(now)) : weekStart };
}

/** Dinners covered, nights off and open slots of a week, from its days' statuses. @param {string[]} statuses */
export const summarize = (statuses) => ({
  planned: statuses.filter((s) => s === 'completed' || s === 'planned').length,
  off: statuses.filter((s) => s === 'diningOut').length,
  open: statuses.filter((s) => s === 'open').length,
});

/**
 * Days of a week a meal can switch with: today onward, planned, open or a night off, not the meal's own day. A past
 * night off keeps its status, so the date check is needed too.
 * @param {string} iso @param {string[]} weekDays @param {string} today @param {(iso: string) => string} statusOf
 */
export const switchTargets = (iso, weekDays, today, statusOf) =>
  weekDays.filter((d) => d !== iso && d >= today && ['planned', 'open', 'diningOut'].includes(statusOf(d)));

/** The first day after `iso` in the week that has a recipe. @param {string} iso @param {string[]} weekDays @param {(iso: string) => boolean} hasRecipe */
export const nextPlannedAfter = (iso, weekDays, hasRecipe) => weekDays.find((d) => d > iso && hasRecipe(d));

/** Weeks from this week to the viewed one: 0 this week, 1 next week, -1 last week. @param {string} thisWeek @param {string} viewed */
export const weekOffset = (thisWeek, viewed) => Math.round(daysBetween(thisWeek, viewed) / 7);

/**
 * The first of `days` whose planned meal leaves no time for one of its heads-ups (the day to do it has gone): the
 * recipe and its furthest-ahead missed heads-up.
 * @template {{ headsUps?: { text: string, daysBefore: number }[] }} R
 * @param {string[]} days @param {(iso: string) => R | undefined} recipeOn @param {string} today
 */
export function firstTooSoon(days, recipeOn, today) {
  for (const iso of days) {
    const recipe = recipeOn(iso);
    const [missed] = byLead(missedHeadsUps(recipe, iso, today));
    if (missed) return { recipe, missed };
  }
  return undefined;
}

/**
 * The last change that can still be taken back, by its toast's Undo or by Cmd/Ctrl+Z after the toast has gone. One
 * level: the next change replaces it, and a change without Undo, another week or leaving the planner clears it.
 */
export function createUndoSlot() {
  /** @type {{ message: string, run: () => void } | null} */
  let last = null;
  return {
    /** @param {string} message @param {() => void} run */
    remember(message, run) {
      last = { message, run };
    },
    /** Hands over the change and empties the slot; null when there is none. */
    take() {
      const change = last;
      last = null;
      return change;
    },
    forget() {
      last = null;
    },
    get has() {
      return last !== null;
    },
  };
}
