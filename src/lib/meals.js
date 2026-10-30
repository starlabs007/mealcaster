// The meals a recipe can belong to: a short fixed list, several per recipe, always in this order.
// Stored as `meals: string[]` ([] = none). In the sheet's Category column they are comma-separated
// ("Lunch, Dinner"), so an older single value reads as a one-item list. Plain JS (no runes).

import { foldKey } from './ingredients.js';
import { normalizeTag } from './tags.js';

/** The fixed list, in display order. Other = the rest (sauces, dressings, stocks): never a dinner. */
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert', 'Other'];

/**
 * Splits a stored meals list or a sheet cell ("lunch, Dinner") into the known meals (in MEALS order, no
 * duplicates) and any other values, tidied like tags, in the order given. Old single categories and
 * unknown values both come through: the first as meals, the second as `extra`.
 * @param {unknown} value an array, or comma-separated text
 * @returns {{ meals: string[], extra: string[] }}
 */
export function parseMeals(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',');
  const found = new Set();
  /** @type {string[]} */
  const extra = [];
  for (const part of parts) {
    const key = foldKey(String(part ?? ''));
    const meal = MEALS.find((m) => foldKey(m) === key);
    if (meal) found.add(meal);
    else {
      const tag = normalizeTag(String(part ?? ''));
      if (tag && !extra.includes(tag)) extra.push(tag);
    }
  }
  return { meals: MEALS.filter((m) => found.has(m)), extra };
}

/** Just the known meals, in order. @param {unknown} value */
export const normalizeMeals = (value) => parseMeals(value).meals;

/** The sheet cell for a recipe's meals. @param {string[]} meals */
export const formatMeals = (meals) => meals.join(', ');

/** Whether a recipe is a dinner candidate: Dinner among its meals, or no meals at all. @param {string[] | undefined} meals */
export const isDinner = (meals) => !meals?.length || meals.includes('Dinner');

/** Whether a recipe has any of the chosen meals (no choice = every recipe). @param {string[] | undefined} meals @param {string[]} chosen */
export const hasAnyMeal = (meals, chosen) => !chosen.length || chosen.some((m) => meals?.includes(m));

/** Meals in use among the recipes, in list order; the active ones stay listed even with no recipes. @param {Iterable<string[]>} lists @param {string[]} active */
export function mealFilters(lists, active) {
  const used = new Set([...lists].flat());
  return MEALS.filter((m) => used.has(m) || active.includes(m));
}
