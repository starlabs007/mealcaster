// Live ingredient list (synced as the [Ingredients] tab): what recipe lines point at, with each
// ingredient's aisle and whether it's in stock. The sample build starts with the sample catalog so
// the sample recipes resolve. Helpers that don't need runes are in ingredients.js.

import { SvelteMap } from 'svelte/reactivity';
import { sampleIngredients } from './data/ingredients.js';
import { aisles } from './data/aisles.js';
import { sampleData, storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { findByName, ingredientIdFor, tidyIngredientName } from './ingredients.js';

/** @typedef {import('./ingredients.js').Ingredient} Ingredient */

const STORAGE_KEY = storageKey('ingredients.v1');

const builtIn = sampleData ? sampleIngredients : [];

const validAisle = (tag) => (aisles.some((a) => a.tag === tag) ? tag : 'Pantry');

/** A stored or synced ingredient, tidied. @param {any} i @returns {Ingredient} */
export const cleanIngredient = (i) => ({
  id: String(i.id),
  name: tidyIngredientName(i.name) || String(i.id).replace(/-/g, ' '),
  plural: tidyIngredientName(i.plural),
  aisle: validAisle(i.aisle),
  onHand: i.onHand === true,
});

/** @returns {Ingredient[]} */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw).filter((i) => i && typeof i.id === 'string' && i.id).map(cleanIngredient);
  } catch {
    // Start from the samples.
  }
  return builtIn.map((i) => ({ ...i }));
}

/** @type {Ingredient[]} */
export const ingredients = $state(load());

/** @type {Map<string, Ingredient>} */
const byId = new SvelteMap(ingredients.map((i) => [i.id, i]));

$effect.root(() => {
  $effect(() => {
    // In memory only if it doesn't fit (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(ingredients));
  });
});

/** The ingredient with this id, if there is one. @param {string} id */
export const ingredientOf = (id) => byId.get(id);

/** The ingredient a typed name means (name or plural; case, accents and plural endings ignored). @param {string} name */
export const findIngredient = (name) => findByName(ingredients, name);

function reindex() {
  byId.clear();
  for (const i of ingredients) byId.set(i.id, i);
}

/**
 * Adds an ingredient, or returns the existing one with the same name.
 * @param {{ name: string, plural?: string, aisle?: string, onHand?: boolean }} fields
 * @returns {Ingredient}
 */
export function addIngredient({ name, plural = '', aisle = 'Pantry', onHand = false }) {
  const existing = findIngredient(name);
  if (existing) return existing;
  const ingredient = cleanIngredient({ id: ingredientIdFor(name, (id) => byId.has(id)), name, plural, aisle, onHand });
  ingredients.push(ingredient);
  const added = ingredients[ingredients.length - 1];
  byId.set(added.id, added);
  return added;
}

/** Changes an ingredient's name, plural, aisle or stock. Its id never changes. @param {string} id @param {Partial<Omit<Ingredient, 'id'>>} fields */
export function updateIngredient(id, fields) {
  const index = ingredients.findIndex((i) => i.id === id);
  if (index < 0) return;
  ingredients[index] = cleanIngredient({ ...ingredients[index], ...fields, id });
  byId.set(id, ingredients[index]);
}

/** Marks an ingredient in stock (kept off the grocery list) or not. @param {string} id @param {boolean} on */
export function setOnHand(id, on) {
  if (byId.get(id)?.onHand !== on) updateIngredient(id, { onHand: on });
}

/** Puts back sample ingredients that are missing, so a reverted sample recipe resolves. @param {string[]} ids */
export function restoreSampleIngredients(ids) {
  for (const id of ids) {
    const sample = builtIn.find((i) => i.id === id);
    if (sample && !byId.has(id)) ingredients.push({ ...sample });
  }
  reindex();
}

/** Replaces the whole list with the synced one. @param {Ingredient[]} list */
export function replaceIngredients(list) {
  ingredients.splice(0, ingredients.length, ...list.map(cleanIngredient));
  reindex();
}
