// What the Profile screen works out from its data: the tags in use, a merge by renaming, the export summary and the
// storage figures. Plain data in, results out; the screen keeps the state, saving and toasts.

import { normalizeTag } from './tags.js';

/**
 * The tags in use with how many recipes carry each, in the order of `choices` (built-in suggestions first).
 * Choices no recipe has are left out.
 * @param {string[]} choices @param {{ tags: string[] }[]} recipes
 * @returns {{ tag: string, count: number }[]}
 */
export function tagUsage(choices, recipes) {
  const counts = new Map();
  for (const r of recipes) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return choices.map((tag) => ({ tag, count: counts.get(tag) ?? 0 })).filter((t) => t.count);
}

/**
 * The other tag a rename would merge into: the typed name, tidied, is already a tag.
 * @param {{ tag: string }[]} rows @param {string} from @param {string} typed
 */
export const mergeTarget = (rows, from, typed) => rows.find((t) => t.tag !== from && t.tag === normalizeTag(typed));

/**
 * "a, b and c" from a list: the last comma becomes `and` (which carries its own spaces).
 * @param {string[]} parts @param {string} and
 */
export const listWords = (parts, and) => parts.join(', ').replace(/, ([^,]*)$/, `${and}$1`);

/** Characters of stored text as a size: "12 KB" under a million, "1.4 MB" above. @param {number} chars */
export const sizeText = (chars) => (chars < 1_000_000 ? `${Math.max(1, Math.round(chars / 1000))} KB` : `${(chars / 1_000_000).toFixed(1)} MB`);

/**
 * How full the device storage is. Some browsers allow more than the usual 5 MB; past the budget the estimate says
 * nothing useful, so `over` is set and `share` stops at 1.
 * @param {number} used @param {number} budget
 */
export const storageShare = (used, budget) => ({ over: used > budget, share: Math.min(1, used / budget) });
