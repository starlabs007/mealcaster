// What the Grocery screen shows, on plain data (routes/Grocery.svelte holds the state, focus and toasts): the counts and
// completion of a week's list, its department sections and aisle tabs, how many lines each dinner brings, the text that
// is shared, and which items the store-mode menu has.

/** @typedef {import('./groceryList.js').GroceryLine} GroceryLine */

/**
 * Lines by status and the counts the header shows. A skipped line is handled for the week: it counts toward done, but
 * not as bought.
 * @param {GroceryLine[]} lines
 */
export function groceryStats(lines) {
  // Bought lines leave the aisle lists for the Bought ledger.
  const shopping = lines.filter((l) => l.status === 'need');
  const acquired = lines.filter((l) => l.status === 'bought');
  const passed = lines.filter((l) => l.status === 'skipped');
  const [toBuy, bought, skipped] = [shopping.length, acquired.length, passed.length];
  const total = toBuy + bought + skipped;
  return {
    shopping,
    acquired,
    passed,
    toBuy,
    bought,
    skipped,
    /** Nothing on the list at all. */
    nothingListed: total === 0,
    /** Everything ticked off (or skipped). */
    allBought: toBuy === 0 && bought + skipped > 0,
    /** Percent of the list handled, 0 when it is empty. */
    completion: total ? Math.round(((bought + skipped) / total) * 100) : 0,
  };
}

/**
 * The lines to buy under each department, in the departments' order, empty ones included.
 * @param {GroceryLine[]} shopping
 * @param {{ id: string }[]} departments
 * @param {Record<string, object>} [extra] more fields for a department's section, by its id (its wording)
 */
export const sectionsOf = (shopping, departments, extra = {}) =>
  departments.map((d) => ({ ...d, ...extra[d.id], items: shopping.filter((l) => l.dept === d.id) }));

/**
 * The aisle tabs: All, then only the departments with something left to buy.
 * @param {{ id: string, short: string, items: unknown[] }[]} sections @param {string} allLabel
 */
export const aisleTabs = (sections, allLabel) => [
  { id: 'all', short: allLabel, count: sections.reduce((n, s) => n + s.items.length, 0) },
  ...sections.filter((s) => s.items.length).map((s) => ({ id: s.id, short: s.short, count: s.items.length })),
];

/** The chosen aisle, or All once it has emptied. @param {{ id: string }[]} tabs @param {string} chosen */
export const activeAisle = (tabs, chosen) => (tabs.some((t) => t.id === chosen) ? chosen : 'all');

/**
 * How many lines still to buy each of the week's dinners brings.
 * @template {{ recipe: { id: string } }} Dinner
 * @param {Dinner[]} dinners @param {GroceryLine[]} shopping
 */
export const sourceCounts = (dinners, shopping) =>
  dinners.map((day) => ({ day, count: shopping.filter((l) => l.sources.some((s) => s.recipeId === day.recipe.id)).length }));

/**
 * The list as plain text for the Share sheet: the heading, then each department that has lines, one "☐ name — amount"
 * per line.
 * @param {{ label: string, items: { name: string, amount?: string }[] }[]} sections @param {string} heading
 */
export function shareText(sections, heading) {
  const body = sections
    .filter((s) => s.items.length)
    .map((s) => `${s.label}\n${s.items.map((l) => `☐ ${l.name}${l.amount ? ` — ${l.amount}` : ''}`).join('\n')}`)
    .join('\n\n');
  return `${heading}\n\n${body}`;
}

/**
 * The items of the store-mode menu, in order, with where a rule goes: Add Item (not on a past week), the other of
 * This / Next week, a step earlier or later, then Share, Print (when there is a list) and Full List. A rule sits
 * between Add Item and the week group, and before Share and Full List.
 * @param {{ pastWeek: boolean, offset: number, nothingListed: boolean }} state
 * @returns {{ id: string, divider: boolean }[]}
 */
export function storeMenuPlan({ pastWeek, offset, nothingListed }) {
  const ids = [
    ...(pastWeek ? [] : ['add']),
    ...(offset !== 0 ? ['this-week'] : []),
    ...(offset !== 1 ? ['next-week'] : []),
    'earlier',
    'later',
    'share',
    ...(nothingListed ? [] : ['print']),
    'full',
  ];
  const ruleBefore = new Set(['share', 'full', ...(pastWeek ? [] : [ids[1]])]);
  return ids.map((id) => ({ id, divider: ruleBefore.has(id) }));
}
