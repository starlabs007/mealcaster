// Today's prepped ingredient lines on the recipe page (see recipePrep.js), saved on this device.

import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';
import { planner } from './planner.svelte.js';
import { prepOfDay, withPrepped } from './recipePrep.js';

const KEY = storageKey('recipePrep.v1');

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

const prep = $state({ stored: read() });

/** Line keys of the recipe ticked as prepped today. @param {string} recipeId */
export const preppedKeys = (recipeId) => prepOfDay(prep.stored, planner.today)[recipeId] ?? [];

/** @param {string} recipeId @param {string[]} keys */
export function setPrepped(recipeId, keys) {
  prep.stored = withPrepped(prep.stored, planner.today, recipeId, keys);
  saveItem(KEY, JSON.stringify(prep.stored));
}
