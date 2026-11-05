// What the Recipe Catalog shows, on plain data (routes/Catalog.svelte holds the state, paging and scroll): the sort
// orders, the filter and search pipeline, the filter lists, which filters are on, and which day is being planned.

import { foldKey } from './ingredients.js';
import { normalizeTags, tagChoices } from './tags.js';
import { hasAnyMeal, mealFilters, normalizeMeals } from './meals.js';

/** @typedef {import('./data/recipes.js').Recipe} Recipe */

/** The catalog's sort orders, in the order they are offered. */
export const SORT_IDS = ['most-cooked', 'quickest', 'name', 'name-desc', 'recent'];

/** The order the catalog opens in. */
export const DEFAULT_SORT = 'name';

const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/**
 * The comparison for a sort order. Most cooked comes from the plan history: ties go to the one made most recently,
 * then A–Z. Quickest puts recipes with no time (0 minutes) last.
 * @param {string} id
 * @param {{ timesMade: (id: string) => number, lastMadeOn: (id: string) => string | undefined }} history
 * @returns {(a: Recipe, b: Recipe) => number}
 */
export function sortCompare(id, { timesMade, lastMadeOn }) {
  switch (id) {
    case 'most-cooked':
      return (a, b) => timesMade(b.id) - timesMade(a.id) || (lastMadeOn(b.id) ?? '').localeCompare(lastMadeOn(a.id) ?? '') || a.title.localeCompare(b.title);
    case 'quickest':
      return (a, b) => (a.minutes || Infinity) - (b.minutes || Infinity) || 0;
    case 'name':
      return byTitle;
    case 'name-desc':
      return (a, b) => byTitle(b, a);
    case 'recent':
      return (a, b) => b.addedAt.localeCompare(a.addedAt);
    default:
      throw new Error(`Unknown sort: ${id}`);
  }
}

/**
 * The recipes that match the filters and the search, in the chosen order. A recipe matches a search when every word
 * is in its title, description, category, tags or ingredient names (and plurals), accents and case aside:
 * "bun cha" finds Bún chả.
 * @param {Recipe[]} recipes
 * @param {{
 *   query: string, sort: string, tags: string[], meals: string[],
 *   favoritesOnly: boolean, favoriteIds: string[],
 *   hideRecent: boolean, hidePlanned: boolean, plannedIds: Set<string>,
 * }} filters
 * @param {{
 *   ingredientOf: (id: string) => { name: string, plural?: string } | undefined,
 *   nearby: (id: string) => boolean,
 *   timesMade: (id: string) => number, lastMadeOn: (id: string) => string | undefined,
 * }} lookup
 */
export function searchRecipes(recipes, filters, lookup) {
  const { query, sort, tags, meals, favoritesOnly, favoriteIds, hideRecent, hidePlanned, plannedIds } = filters;
  const words = foldKey(query).split(' ').filter(Boolean);
  return recipes
    .filter((r) => !favoritesOnly || favoriteIds.includes(r.id))
    .filter((r) => !hideRecent || !lookup.nearby(r.id))
    .filter((r) => !hidePlanned || !plannedIds.has(r.id))
    .filter((r) => hasAnyMeal(r.meals, meals))
    .filter((r) => tags.every((t) => r.tags.includes(t)))
    .filter((r) => {
      if (!words.length) return true;
      const haystack = [
        r.title,
        r.description,
        ...r.meals,
        ...r.tags,
        ...r.ingredients.flatMap((g) =>
          g.items.flatMap((i) => {
            const ingredient = lookup.ingredientOf(i.id);
            return ingredient ? [ingredient.name, ingredient.plural] : [];
          }),
        ),
      ];
      const searchable = foldKey(haystack.join(' '));
      return words.every((w) => searchable.includes(w));
    })
    .sort(sortCompare(sort, lookup));
}

/** One filter per tag in use (suggested tags first); an active tag stays listed even with no recipes. @param {Recipe[]} recipes @param {string[]} active */
export const tagFilters = (recipes, active) =>
  tagChoices([...recipes.flatMap((r) => r.tags), ...active]).filter((t) => active.includes(t) || recipes.some((r) => r.tags.includes(t)));

/** Meals in use (in list order); an active one stays listed even with no recipes. @param {Recipe[]} recipes @param {string[]} active */
export const mealOptions = (recipes, active) => mealFilters(recipes.map((r) => r.meals), active);

/** How many filters are on (each tag, each meal, favourites, hide recent, hide planned). @param {{ tags: string[], meals: string[], favoritesOnly: boolean, hideRecent: boolean, hidePlanned: boolean }} f */
export const activeFilterCount = ({ tags, meals, favoritesOnly, hideRecent, hidePlanned }) =>
  tags.length + meals.length + (favoritesOnly ? 1 : 0) + (hideRecent ? 1 : 0) + (hidePlanned ? 1 : 0);

/**
 * The filters that are on, in the order the panel lists them (the switches, then meals, then tags), for the chips
 * under the search. `value` is the meal or tag.
 * @param {{ tags: string[], meals: string[], favoritesOnly: boolean, hideRecent: boolean, hidePlanned: boolean }} f
 * @returns {{ kind: 'favorites' | 'unplanned' | 'recent' | 'meal' | 'tag', value?: string }[]}
 */
export const activeFilters = ({ tags, meals, favoritesOnly, hideRecent, hidePlanned }) => [
  ...(favoritesOnly ? [{ kind: /** @type {const} */ ('favorites') }] : []),
  ...(hidePlanned ? [{ kind: /** @type {const} */ ('unplanned') }] : []),
  ...(hideRecent ? [{ kind: /** @type {const} */ ('recent') }] : []),
  ...meals.map((value) => ({ kind: /** @type {const} */ ('meal'), value })),
  ...tags.map((value) => ({ kind: /** @type {const} */ ('tag'), value })),
];

/**
 * The day being planned: the one in the URL while it can still be planned, else the first open day.
 * @param {string | undefined} queryDay @param {string[]} plannable days of the viewed week from today on @param {string | undefined} firstOpen
 */
export const targetDay = (queryDay, plannable, firstOpen) => (queryDay && plannable.includes(queryDay) ? queryDay : firstOpen);

/**
 * The recipes the viewed week already has (planned or completed), except the target day's own: swapping it should
 * still show the current pick.
 * @param {{ status: string, iso: string, recipe?: { id: string } }[]} days @param {string | undefined} target
 */
export const plannedIdsOf = (days, target) =>
  new Set(days.filter((d) => (d.status === 'planned' || d.status === 'completed') && d.recipe && d.iso !== target).map((d) => d.recipe.id));

/** The search as shown, to tell whether the catalog comes back to the same one. @param {{ q?: string, filter?: string, meals?: string, category?: string }} query @param {string | undefined} day */
export const placeKey = (query, day) => JSON.stringify([query.q ?? '', query.filter ?? '', query.meals ?? query.category ?? '', day ?? '']);

/** @typedef {{ tags: string[], meals: string[], favoritesOnly: boolean, sort: string }} CatalogFilters */

/**
 * The catalog's tag, meal and favourites filters and its sort, as saved on this device (#286), tidied: anything
 * unreadable falls back to no filters, A–Z.
 * @param {unknown} value the parsed saved value
 * @returns {CatalogFilters}
 */
export function savedFilters(value) {
  const v = /** @type {Record<string, unknown>} */ (value && typeof value === 'object' ? value : {});
  return {
    tags: normalizeTags(v.tags),
    meals: Array.isArray(v.meals) ? normalizeMeals(v.meals) : [],
    favoritesOnly: v.favoritesOnly === true,
    sort: SORT_IDS.includes(/** @type {string} */ (v.sort)) ? /** @type {string} */ (v.sort) : DEFAULT_SORT,
  };
}

/**
 * The filters the catalog opens with. A link that names tags or meals (a recipe's tag link, an older `category` link)
 * sets both, none for the one it leaves out; any other visit (header tab, breadcrumb, "Swap") gets the saved ones.
 * Favourites and the sort are never in a link, so they always come from the saved filters.
 * @param {{ filter?: string, meals?: string, category?: string }} query @param {CatalogFilters} saved
 * @returns {CatalogFilters}
 */
export function openingFilters(query, saved) {
  if (!(query.filter || query.meals || query.category)) return saved;
  return { ...saved, tags: normalizeTags(query.filter?.split(',')), meals: normalizeMeals(query.meals ?? query.category) };
}
