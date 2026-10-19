// All on-screen text, in one place, so wording can be changed without searching the components.
//
// What goes here, and what doesn't
//   - Here: anything a person reads or hears in the app: buttons, headings, labels, toasts, errors, empty states,
//     and the attributes screen readers and browsers show (aria-label, placeholder, title, alt, confirm() text).
//   - Not here: text that is written to or read from the Google Sheet or the .xlsx export. It lives in
//     sheetText.js, where changing it can need a data migration. If a screen shows such a word (an aisle name, a
//     department, a tag colour), it imports it from sheetText.js rather than copying it.
//   - Not here: sample recipe content (data/recipes.js), icon names, colours, CSS classes, sheet tab and column
//     names, and the month / weekday names that Intl.DateTimeFormat produces in dates.js.
//
// Grouping
//   - `common` is text shared by two or more screens (Undo, Cancel, Close, Sync Now…).
//   - One group per screen or dialog (`planner`, `catalog`, `grocery`…). Text used on exactly one screen goes in that
//     screen's group, even when it is a button. Toasts and errors stay with their screen: there is no global toasts group.
//   - Within a group, sub-objects by kind where it helps: `buttons`, `titles`, `labels`, `toasts`, `aria`.
//   - Name keys for what the text is (`viewRecipe`, `filledSlots`), not for the words it holds.
//
// Values and plurals
//   - Text with a value, a plural or a variant is a function: `filledSlots: (n) => `Filled ${n} open ${plural(n, 'slot')}.``.
//   - Use plural() instead of an `n === 1 ? … : …` ternary.
//
// Case
//   - Write text in the case the source has. About 46 elements use the `uppercase` CSS class, so this file may say
//     "Planning for" where the screen shows "PLANNING FOR". Change the words here, not the case.
//
// {@html}
//   - A string that carries markup (a bold lead-in) may be rendered with {@html} only if every value it inserts is a
//     number or another string from this file. Anything that inserts user data (recipe titles, ingredient or tag
//     names) is split into parts (before / after) and the markup stays in the component. {@html} must never be given
//     user data.
//
// Plain module (no runes) so components, .svelte.js stores and plain modules such as dates.js can all import it.

/**
 * The word for a count: plural(1, 'slot') → "slot", plural(2, 'slot') → "slots". Returns the word only, so the
 * caller keeps the number's position: `${n} ${plural(n, 'day')}`. Zero takes the plural form.
 * @param {number} n @param {string} singular @param {string} [pluralForm] for irregular words, e.g. 'recipes' → 'recipes'
 */
export function plural(n, singular, pluralForm = singular + 's') {
  return n === 1 ? singular : pluralForm;
}

export const text = {
  common: {
    undo: 'Undo',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    close: 'Close',
    dismiss: 'Dismiss',
    syncNow: 'Sync Now',
    reconnect: 'Reconnect',
  },

  // Relative-time wording used by dates.js (formatLastMade) and the LastMade component.
  lastMade: {
    never: 'Not made yet',
    today: 'Last made today',
    yesterday: 'Last made yesterday',
    overAYear: 'Last made over a year ago',
    /** @param {number} n @param {'day' | 'week' | 'month'} unit */
    ago: (n, unit) => `Last made ${n} ${plural(n, unit)} ago`,
  },
};
