// The person's "ingredients I have" list (Profile → Ingredients I have, synced in the Settings
// tab). A recipe ingredient whose name is on it never reaches the grocery list. Names compare
// ignoring case, spacing and a plural "s"/"es". Plain JS (no runes) so the sync codec and tests
// can use it.

import { mappingKey, tidyName } from './aisleMap.js';

/** Name as compared: lower case, single spaces, no plural ending. @param {string} name */
export const haveKey = (name) =>
  mappingKey(name)
    .replace(/(?<=(?:ss|ch|sh|x|z|o))es$/, '')
    .replace(/(?<=[a-z]{2}[^s])s$/, '');

/** Whether an ingredient's name is on the list. @param {string[]} have @param {string} text */
export const isHave = (have, text) => {
  const key = haveKey(text);
  return Boolean(key) && have.some((n) => haveKey(n) === key);
};

/** Adds a name unless it's already there. @param {string[]} have @param {string} name @returns {string[]} */
export function withHave(have, name) {
  const clean = tidyName(name);
  return !clean || isHave(have, clean) ? have : [...have, clean];
}

/** Removes a name. @param {string[]} have @param {string} name @returns {string[]} */
export const withoutHave = (have, name) => have.filter((n) => haveKey(n) !== haveKey(name));
