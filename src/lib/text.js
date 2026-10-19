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

  // App shell: header, footer, Sheets button and menu, sync status, disconnect dialog, sync-phase labels (phase.js).
  header: {
    appName: 'MealCaster',
    homeAria: 'MealCaster home',
    primaryNavAria: 'Primary',
    tabs: { weeklyMenu: 'Weekly Menu', recipeCatalog: 'Recipe Catalog' },
    search: { aria: 'Search recipes', placeholder: 'Search culinary recipes, ingredients...' },
    week: {
      previous: 'Previous week',
      next: 'Next week',
      thisWeek: 'This week',
      backToThisWeek: 'Back to this week',
    },
    grocery: {
      label: 'Quick Grocery List',
      aria: (/** @type {number} */ n) => `Quick Grocery List, ${n} items`,
    },
    profile: 'Profile & Settings',

    footer: {
      tagline: '— Mindful kitchen choreography & nourishment',
      copyright: (/** @type {number} */ year) => `© ${year} MealCaster. Culinary Mise en Place.`,
    },

    // The Google Sheets button. Its aria-label / title are the only text it has on mobile (icon-only).
    sheets: {
      label: (/** @type {string} */ phase) => `Google Sheets: ${phase}`,
      moreOptionsAria: (/** @type {string} */ label) => `${label} — more options`,
      moreOptionsTitle: 'More options',
      menuAria: 'Google Sheets',
      syncing: 'Syncing…',
    },

    // Short name of each sync phase (badge, header button, menu heading).
    phase: {
      synced: 'Synced',
      syncing: 'Syncing',
      pending: 'Not synced yet',
      signedOut: 'Reconnect',
      choose: 'Needs you',
      conflict: 'Paused',
      error: 'Sync problem',
      notConnected: 'Not connected',
    },

    // Header button and menu actions.
    actions: {
      setup: 'Connect Google Sheets',
      reconnect: 'Reconnect',
      syncNow: 'Sync Now',
      resolveColumns: 'Resolve Columns',
      review: 'Finish Connecting',
      settings: 'Connection Settings',
      openSheet: 'Open in Google Sheets',
      disconnect: 'Disconnect…',
    },

    // One-line sync summary (SyncStatus, shared by Profile, Recipe, Editor, Grocery and Sheets screens).
    syncStatus: {
      justNow: 'just now',
      minutesAgo: (/** @type {number} */ n) => `${n} min ago`,
      hoursAgo: (/** @type {number} */ n) => `${n} h ago`,
      syncedAt: (/** @type {string} */ ago) => `Synced with Google Sheets · ${ago}`,
      connected: 'Connected to Google Sheets',
      syncing: 'Syncing with Google Sheets…',
      pending: 'Spreadsheet linked, not synced yet. Changes stay on this device until you start syncing.',
      signedOut: 'Reconnect to sync — changes are kept on this device until then.',
      chooseBackup: 'Confirm before the spreadsheet is overwritten to match this device.',
      choose: 'Choose how to combine this device with the spreadsheet.',
      conflict: (/** @type {string} */ tab, /** @type {string} */ columns) => `Sync paused: column conflicts in “${tab}” (${columns}).`,
      notConnected: 'Not connected · saved on this device',
    },

    disconnect: {
      title: 'Disconnect from Google Sheets?',
      beforeName: 'This signs you out of Google and stops syncing with',
      quoted: (/** @type {string} */ name) => `“${name}”`,
      yourSpreadsheet: 'your spreadsheet',
      stays: 'Your recipes, plans and grocery lists stay on this device, and the spreadsheet isn’t changed. You can connect to it again later.',
      confirm: 'Disconnect',
    },
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
