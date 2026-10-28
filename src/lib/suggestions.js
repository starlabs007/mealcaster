// Auto-fill's suggestions (#91): a recipe proposed for an open evening, kept apart from the plan until Accept. Plain JS
// so node tests can load it; planner.svelte.js holds them in memory (never saved or synced) and passes in its state.

import { pickTier } from './planDays.js';

/** @typedef {Record<string, string>} Suggestions ISO date → recipe id */

/**
 * The evenings Auto-fill suggests for: open, today onward. Past days and finished dinners are never open.
 * @param {string[]} days @param {string} today @param {(iso: string) => string} statusOf
 */
export const suggestableDays = (days, today, statusOf) => days.filter((iso) => iso >= today && statusOf(iso) === 'open');

/**
 * One pick for `iso` from pickTier's best tier. `used` (the week's planned meals and the other evenings' suggestions)
 * counts as on the menu; `not` (the evening's current suggestion) is left out unless nothing else is left.
 * @template {import('./data/recipes.js').Recipe} R
 * @param {R[]} pool @param {string} iso @param {string} today
 * @param {{ used: Set<string | undefined>, madeRecently: (recipeId: string) => boolean, not?: string, random?: () => number }} options
 * @returns {string | undefined} undefined only when `pool` is empty
 */
export function pickSuggestion(pool, iso, today, { used, madeRecently, not, random = Math.random }) {
  const others = pool.filter((r) => r.id !== not);
  const best = pickTier(others.length ? others : pool, iso, today, { used, madeRecently });
  return best[Math.floor(random() * best.length)]?.id;
}

/**
 * A suggestion for each of `days`, each avoiding the others and the week's planned meals (`planned`). With `previous`
 * (Shuffle All), each evening also avoids what it had.
 * @param {string[]} days @param {import('./data/recipes.js').Recipe[]} pool @param {string} today
 * @param {{ planned: Iterable<string | undefined>, madeRecently: (recipeId: string) => boolean, previous?: Suggestions, random?: () => number }} options
 * @returns {Suggestions}
 */
export function suggestDays(days, pool, today, { planned, madeRecently, previous = {}, random }) {
  const used = new Set(planned);
  /** @type {Suggestions} */
  const picked = {};
  for (const iso of days) {
    const id = pickSuggestion(pool, iso, today, { used, madeRecently, not: previous[iso], random });
    if (!id) break;
    picked[iso] = id;
    used.add(id);
  }
  return picked;
}

/**
 * Another suggestion for one evening, avoiding the week's planned meals, the other suggestions and its own.
 * @param {Suggestions} suggestions @param {string} iso @param {import('./data/recipes.js').Recipe[]} pool @param {string} today
 * @param {{ planned: Iterable<string | undefined>, madeRecently: (recipeId: string) => boolean, random?: () => number }} options
 */
export function rerollDay(suggestions, iso, pool, today, { planned, madeRecently, random }) {
  const others = Object.entries(suggestions).filter(([day]) => day !== iso).map(([, id]) => id);
  return pickSuggestion(pool, iso, today, { used: new Set([...planned, ...others]), madeRecently, not: suggestions[iso], random });
}

/**
 * The suggestions that still stand: an evening that is no longer open (something planned it, a night off, the date
 * passed) or whose recipe is gone drops its own. Returns the same object when nothing changed.
 * @param {Suggestions} suggestions @param {string} today @param {(iso: string) => string} statusOf
 * @param {(recipeId: string) => boolean} hasRecipe
 */
export function liveSuggestions(suggestions, today, statusOf, hasRecipe) {
  const kept = Object.entries(suggestions).filter(([iso, id]) => iso >= today && statusOf(iso) === 'open' && hasRecipe(id));
  return kept.length === Object.keys(suggestions).length ? suggestions : Object.fromEntries(kept);
}

/** The suggestions among `days` (the viewed week), in date order. @param {Suggestions} suggestions @param {string[]} days */
export const suggestionsIn = (suggestions, days) => days.filter((iso) => suggestions[iso]);

/**
 * What Accept writes: each evening planned with its suggestion, keeping a note it already had.
 * @param {Suggestions} suggestions @param {string[]} days the evenings to accept
 * @param {Record<string, import('./planner.svelte.js').PlanEntry>} entries
 * @returns {Record<string, import('./planner.svelte.js').PlanEntry>}
 */
export function acceptedEntries(suggestions, days, entries) {
  return Object.fromEntries(
    days.map((iso) => {
      const notes = entries[iso]?.notes;
      return [iso, notes ? { recipeId: suggestions[iso], notes } : { recipeId: suggestions[iso] }];
    }),
  );
}
