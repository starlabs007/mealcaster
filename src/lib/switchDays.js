// "Switch Days…": two evenings of the plan trade places. Plain JS so node tests can load it.

/**
 * The plan entries for `a` and `b` after switching them. Each meal (or night off) takes its notes along;
 * the completed flag stays behind, since a moved meal hasn't been cooked on its new evening.
 * `undefined` means the day ends up empty.
 * @param {Record<string, import('./planner.svelte.js').PlanEntry>} entries
 * @param {string} a @param {string} b
 */
export function switchedEntries(entries, a, b) {
  const moved = (entry) => {
    if (!entry) return undefined;
    const { completed, ...rest } = entry;
    return Object.keys(rest).length ? rest : undefined;
  };
  return { [a]: moved(entries[b]), [b]: moved(entries[a]) };
}
