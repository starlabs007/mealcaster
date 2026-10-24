/**
 * The keys MealCaster owns among all of localStorage's: those with its prefix, apart from the ones to keep.
 * @param {Iterable<string | null>} keys @param {string} prefix @param {Set<string>} keep
 */
export function ownedKeys(keys, prefix, keep) {
  const owned = [];
  for (const key of keys) if (key?.startsWith(prefix) && !keep.has(key)) owned.push(key);
  return owned;
}
