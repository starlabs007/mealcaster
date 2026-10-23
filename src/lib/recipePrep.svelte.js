// Today's prepped ingredient lines and done method steps on the recipe page (see recipePrep.js), saved on this device.

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

// Steps share the store under their own entry, so the ingredient ticks' "all ticked" count stays theirs.
const stepsOf = (/** @type {string} */ recipeId) => `${recipeId}/steps`;

/** Indexes of the recipe's method steps marked done today. @param {string} recipeId */
export const doneSteps = (recipeId) => preppedKeys(stepsOf(recipeId)).map(Number);

/** @param {string} recipeId @param {number[]} steps */
export function setDoneSteps(recipeId, steps) {
  setPrepped(stepsOf(recipeId), steps.map(String));
}
