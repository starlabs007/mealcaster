// The servings chosen on each recipe page (see recipeServings.js), saved on this device.

import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { recipeById } from './recipes.svelte.js';
import { servingsFor, withServings } from './recipeServings.js';

const KEY = storageKey('recipeServings.v1');

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

const servings = $state({ stored: read() });

/** The servings to open the recipe at. @param {{ id: string, serves: number }} recipe */
export const rememberedServings = (recipe) => servingsFor(servings.stored, recipe.id, recipe.serves);

/** @param {{ id: string, serves: number }} recipe @param {number} count */
export function rememberServings(recipe, count) {
  servings.stored = withServings(servings.stored, recipe.id, count, recipe.serves, (id) => recipeById.has(id));
  saveItem(KEY, JSON.stringify(servings.stored));
}
