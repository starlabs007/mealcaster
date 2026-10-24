// The Recipe page's rules on plain data (routes/RecipeDetail.svelte holds the state, focus, wake lock and toasts): which
// day the page is about, the prepped and done ticks, what is missing from the grocery list, the step cook view points
// at, which heads-ups show, and the time stats.

import { byLead } from './headsUps.js';

/**
 * The day a recipe is opened for. `day` is the one it is planned on: the day passed in the URL while that day still
 * has this recipe, else the day the plan has it on. `planningDay` is a day passed in the URL that isn't the recipe's
 * (opened from the catalog while planning that day), which the catalog tab carries back.
 * @param {string} recipeId @param {string | undefined} dayParam
 * @param {Record<string, { recipeId?: string } | undefined>} entries @param {(recipeId: string) => string | undefined} dayOfRecipe
 */
export function resolveDay(recipeId, dayParam, entries, dayOfRecipe) {
  const onDay = !!dayParam && entries[dayParam]?.recipeId === recipeId;
  return { day: onDay ? dayParam : dayOfRecipe(recipeId), planningDay: dayParam && !onDay ? dayParam : undefined };
}

/** The list with `value` taken out when it is there, else added at the end. @template T @param {T[]} list @param {T} value */
export const toggleIn = (list, value) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

/**
 * The ticks after "tick all" / "clear all": everything ticked is cleared, anything else ticks every line.
 * @param {string[]} ticked @param {string[]} all
 */
export const toggleAll = (ticked, all) => (all.every((k) => ticked.includes(k)) ? [] : [...all]);

/** The lines still to add to the grocery list: not on it yet and not at home. @param {string[]} all @param {Set<string>} onList @param {string[]} atHome */
export const missingKeys = (all, onList, atHome) => all.filter((k) => !onList.has(k) && !atHome.includes(k));

/** The first step not done yet, or -1 when all are. @param {number} count @param {number[]} done */
export function nextStepIndex(count, done) {
  for (let i = 0; i < count; i++) if (!done.includes(i)) return i;
  return -1;
}

/**
 * The heads-ups to show, furthest ahead first. Cook view shows only what is due on the day: earlier ones were for the
 * days before.
 * @param {{ text: string, daysBefore: number }[] | undefined} headsUps @param {boolean} cook
 */
export const visibleHeadsUps = (headsUps, cook) => (headsUps?.length ? byLead(headsUps).filter((h) => !cook || !h.daysBefore) : []);

/**
 * Prep, cook and total time, leaving out a time nobody entered (0).
 * @param {{ prepMinutes: number, cookMinutes: number, minutes: number }} recipe
 * @returns {{ kind: 'prep' | 'cook' | 'total', minutes: number }[]}
 */
export const timeStats = (recipe) =>
  /** @type {const} */ ([
    { kind: 'prep', minutes: recipe.prepMinutes },
    { kind: 'cook', minutes: recipe.cookMinutes },
    { kind: 'total', minutes: recipe.minutes },
  ]).filter((s) => s.minutes > 0);

/**
 * A time as words: an hour or more as "1 hr" / "3.5 hrs", less as the screen's own "15 mins" / "1 min".
 * @param {number} minutes @param {{ long: (m: number) => string, short: (m: number) => string }} words
 */
export const minutesText = (minutes, { long, short }) => (minutes >= 60 ? long(minutes) : short(minutes));
