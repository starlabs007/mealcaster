// Day statuses, the evenings a bulk action (Copy Last Week, Reset Week) may change, and which recipes Auto-fill and
// Surprise Me pick from first. Plain JS so node tests can load it; planner.svelte.js passes in its state.

import { addDays } from './dates.js';
import { foldKey } from './ingredients.js';
import { missedHeadsUps } from './headsUps.js';

/**
 * @param {import('./planner.svelte.js').PlanEntry | undefined} entry
 * @param {string} iso @param {string} today
 * @param {(recipeId: string) => boolean} hasRecipe assignments whose recipe no longer exists count as empty
 * @returns {import('./planner.svelte.js').DayStatus}
 */
export function dayStatus(entry, iso, today, hasRecipe) {
  const past = iso < today;
  if (entry?.recipeId && hasRecipe(entry.recipeId)) return past || entry.completed ? 'completed' : 'planned';
  if (entry?.diningOut) return 'diningOut';
  return past ? 'missed' : 'open';
}

/**
 * Evenings a bulk action may touch: today onward, minus a today already marked done (history stays true).
 * @param {string[]} days @param {string} today @param {(iso: string) => string} statusOf
 */
export const upcomingDays = (days, today, statusOf) =>
  days.filter((iso) => iso >= today && statusOf(iso) !== 'completed');

/**
 * Copy Last Week: each open upcoming evening takes the meal or night off from a week before.
 * Planned evenings, nights off and finished ones are never changed. Notes aren't copied; an
 * evening keeps its own.
 * @param {Record<string, import('./planner.svelte.js').PlanEntry>} entries
 * @param {string[]} days @param {string} today @param {(iso: string) => string} statusOf
 * @returns {Record<string, import('./planner.svelte.js').PlanEntry>} only the evenings that change
 */
export function copiedEntries(entries, days, today, statusOf) {
  /** @type {Record<string, import('./planner.svelte.js').PlanEntry>} */
  const changes = {};
  for (const iso of upcomingDays(days, today, statusOf)) {
    if (statusOf(iso) !== 'open') continue;
    const from = addDays(iso, -7);
    const status = statusOf(from);
    if (status === 'missed' || status === 'open') continue;
    const notes = entries[iso]?.notes;
    const copied = status === 'diningOut' ? { diningOut: true } : { recipeId: entries[from].recipeId };
    changes[iso] = notes ? { ...copied, notes } : copied;
  }
  return changes;
}

/** Reset Week: upcoming evenings that hold something. @param {Record<string, object>} entries */
export const resetDays = (entries, days, today, statusOf) =>
  upcomingDays(days, today, statusOf).filter((iso) => entries[iso]);

/** The given evenings as they are now, for Undo. @param {Record<string, object>} entries @param {string[]} days */
export const snapshotDays = (entries, days) => Object.fromEntries(days.map((iso) => [iso, entries[iso]]));

/** Put evenings back from a snapshot; ones that were empty are emptied again. */
export function restoreDays(entries, saved) {
  for (const [iso, entry] of Object.entries(saved)) {
    if (entry) entries[iso] = entry;
    else delete entries[iso];
  }
}

/**
 * What Auto-fill and Surprise Me draw from: dinners and uncategorised recipes; every recipe when there are none.
 * @template {{ badge: { label: string } }} R
 * @param {R[]} recipes
 * @returns {R[]}
 */
export function dinnerPool(recipes) {
  const dinners = recipes.filter((r) => ['', 'dinner'].includes(foldKey(r.badge?.label)));
  return dinners.length ? dinners : recipes;
}

/**
 * The recipes Auto-fill and Surprise Me pick from for `iso`: the first non-empty tier of `pool`, best first.
 * Recipes neither on the week's menu (`used`) nor made recently come first, then ones just not on the menu, then any;
 * within that order, recipes whose heads-up would already be late on `iso` come after all the ones still in time
 * (doing the prep this evening for tomorrow is in time). Empty only when `pool` is.
 * @template {import('./data/recipes.js').Recipe} R
 * @param {R[]} pool @param {string} iso @param {string} today
 * @param {{ used: Set<string | undefined>, madeRecently: (recipeId: string) => boolean }} history
 * @returns {R[]}
 */
export function pickTier(pool, iso, today, { used, madeRecently }) {
  const byHistory = [pool.filter((r) => !used.has(r.id) && !madeRecently(r.id)), pool.filter((r) => !used.has(r.id)), pool];
  const inTime = (r) => !missedHeadsUps(r, iso, today).length;
  return [...byHistory.map((tier) => tier.filter(inTime)), ...byHistory].find((tier) => tier.length) ?? [];
}
