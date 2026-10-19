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

  // Weekly planner: page, toolbar, day cards, Switch Days dialog and the toasts planner.svelte.js raises.
  // Dates and weekday names arrive already formatted (dates.js); only the words around them live here.
  planner: {
    daysAria: 'Dinners this week',
    minimalView: 'Minimal view',

    header: {
      eyebrow: 'Weekly Schedule',
      thisWeek: 'This Week’s Dinner Plan',
      lastWeek: 'Last Week’s Dinner Plan',
      nextWeek: 'Next Week’s Dinner Plan',
      weekOf: (/** @type {string} */ date) => `Week of ${date}`,
      dinners: (/** @type {number} */ planned) => `${planned} of 7 Dinners`,
      openLeft: (/** @type {number} */ n) => `${n} Open ${plural(n, 'slot')} left`,
      allSet: 'All set',
      autoFill: 'Auto-fill Remaining',
      copyLastWeek: 'Copy Last Week',
      resetWeek: 'Reset Week',
    },

    card: {
      aria: (/** @type {string} */ weekday, /** @type {string} */ date, /** @type {boolean} */ isToday) => `${weekday} ${date}${isToday ? ' (today)' : ''}`,
      completed: 'Completed',
      today: '• TODAY',
      planned: 'Planned',
      nightOff: 'Night off',
      notLogged: 'Not logged',
      open: 'Open',
      meta: (/** @type {string} */ badge, /** @type {number} */ minutes, /** @type {number} */ serves) =>
        [badge, `${minutes} min`, `Serves ${serves}`].filter(Boolean).join(' · '),
      viewRecipe: 'View Recipe',
      viewRecipeAria: (/** @type {string} */ title) => `View recipe: ${title}`,
      done: 'Done',
      markDone: 'Mark Done',
      swapMeal: 'Swap Meal',
      surpriseMe: 'Surprise Me',
      diningOut: 'Dining Out',
      switchDays: 'Switch Days…',
      diningOutTitle: 'Dining out or leftovers',
      diningOutNote: 'A night off from the stove — nothing to prep or shop for.',
      missedTitle: 'No dinner was logged',
      missedNote: 'This evening has passed without a planned meal.',
      openTitle: (/** @type {string} */ weekday) => `No dinner planned yet for ${weekday}`,
      openNote: 'Choose a meal, let the app pick one, or take the night off.',
      chooseMeal: 'Choose a Meal',
      planInstead: 'Plan a Meal Instead',
    },

    switchDialog: {
      title: 'Switch Days',
      thisMeal: 'this meal',
      moveBefore: 'Move',
      moveAfter: (/** @type {string} */ weekday) => `from ${weekday} to:`,
      nightOff: 'Night off',
      open: 'Open',
      note: (/** @type {string} */ weekday) => `If that evening has a meal or a night off, it moves to ${weekday}.`,
    },

    toasts: {
      noRecipes: 'Add a recipe to the catalog first.',
      surprise: (/** @type {string} */ title) => `Surprise! ${title}`,
      nightOff: (/** @type {string} */ date) => `${date} is now a night off.`,
      switched: (/** @type {string} */ a, /** @type {string} */ b) => `Switched ${a} and ${b}.`,
      allPlanned: 'Every dinner this week is already planned.',
      filled: (/** @type {number} */ n) => `Filled ${n} open ${plural(n, 'slot')}.`,
      noLastWeek: 'No dinners were planned last week.',
      copied: 'Copied last week’s dinners.',
      nothingToReset: 'Nothing to reset — this week is already clear.',
      reset: 'Weekly plan reset.',
    },
  },

  // Recipe catalog: page, filters, empty states, recipe cards, and the toast after picking a meal.
  // LastMade (shared with the recipe page) uses `lastMade` below.
  catalog: {
    backToPlanner: 'Weekly Dinner Plan',
    titles: {
      catalog: 'Recipe Catalog',
      swap: (/** @type {string} */ weekday) => `Swap ${weekday}’s Dinner`,
      choose: 'Choose a Dinner Meal',
    },
    planningFor: 'Planning for',
    pickDay: 'Pick a day…',
    dayOpen: 'open',
    dayDiningOut: 'dining out',
    addCustom: 'Add Custom Recipe',
    searchAria: 'Search recipes and ingredients',
    searchPlaceholder: 'Search recipes, ingredients (e.g. salmon, pasta, lemon, tofu)...',
    sortBy: 'Sort by:',
    sorts: {
      mostCooked: 'Most Cooked in Household',
      quickest: 'Quickest Prep Time',
      nameAsc: 'Name (A–Z)',
      nameDesc: 'Name (Z–A)',
      recent: 'Recently Added to Box',
    },
    /** Rendered with {@html}: only numbers are inserted. */
    displaying: (/** @type {number} */ shown, /** @type {number} */ total) =>
      `Displaying <strong class="text-on-surface">${shown}</strong> of ${total} meals`,
    filters: {
      heading: 'Filter by Culinary Attributes',
      clearAll: (/** @type {number} */ n) => `Clear all filters (${n} active)`,
      favorites: 'Favorites',
      unplanned: 'Unplanned this week',
      notMadeRecently: 'Not made recently',
      categoryHeading: 'Filter by Category',
      anyCategory: 'Any category',
    },
    empty: {
      title: 'Your recipe catalog is empty',
      body: 'Add your first family recipe, or connect a Google Sheet that already has your recipes.',
      addRecipe: 'Add a Recipe',
      connectSheets: 'Connect Google Sheets',
    },
    noMatch: {
      title: 'No recipes match those filters',
      body: 'Try a different ingredient or loosen a filter or two.',
      clear: 'Clear search & filters',
    },
    surprise: {
      title: (/** @type {string} */ weekday) => `Can’t decide on ${weekday}’s Dinner?`,
      body: 'Roll for a random pick from the meals matching your current search and filters.',
      button: 'Surprise Me & Assign',
    },
    toasts: {
      added: (/** @type {string} */ title, /** @type {string} */ date) => `${title} added to ${date} dinner and your grocery basket was updated.`,
      goToWeekly: 'Go to Weekly View',
    },
    errors: {
      outOfSpace: 'This device ran out of space for saved recipes. Try a smaller photo or an image link.',
    },
    card: {
      removeFavoriteAria: (/** @type {string} */ title) => `Remove ${title} from favorites`,
      addFavoriteAria: (/** @type {string} */ title) => `Add ${title} to favorites`,
      serves: (/** @type {number} */ n) => `Serves ${n}`,
      yourRecipe: 'Your recipe',
      plannedFor: (/** @type {string} */ weekday) => `Planned for ${weekday}`,
      selectFor: (/** @type {string} */ weekday) => `+ Select for ${weekday}`,
      noOpenDay: 'No open day to assign',
      previewTitle: 'Preview recipe details and ingredients',
      openAria: (/** @type {string} */ title) => `Open ${title} recipe`,
    },
  },

  // Recipe page, its delete confirm, and the print options (Print Options dialog, Profile, Simple layout).
  recipe: {
    notFound: {
      title: 'Recipe not found',
      body: 'It may have been removed from the household recipe box.',
      browse: 'Browse the Recipe Catalog',
    },
    breadcrumbAria: 'Breadcrumb',
    weeklyPlan: 'Weekly Dinner Plan',
    dayDinner: (/** @type {string} */ weekday) => `${weekday} Dinner`,
    catalog: 'Recipe Catalog',
    buttons: {
      edit: 'Edit',
      delete: 'Delete',
      favorited: 'Favorited',
      favorite: 'Favorite',
      swapMeal: 'Swap Meal',
      planFor: (/** @type {string} */ weekday) => `Plan for ${weekday}`,
      print: 'Print',
      addToList: 'Add to List',
      allOnList: 'All on List',
      swapFromCatalog: 'Swap Recipe from Catalog',
      next: (/** @type {string} */ weekday, /** @type {string} */ title) => `Next: ${weekday} ${title}`,
      backToWeekly: 'Back to Weekly Menu',
    },
    badges: {
      scheduled: (/** @type {string} */ date) => `Scheduled: ${date}`,
      customInSheet: (/** @type {string} */ tab) => `Custom recipe · in [${tab}] sheet`,
      customOnDevice: 'Custom recipe · saved on this device',
      edited: 'Edited on this device',
    },
    tagsAria: 'Tags',
    tagTitle: (/** @type {string} */ tag) => `Browse recipes tagged ${tag}`,
    stats: {
      prep: 'Prep Time',
      cook: 'Cook Time',
      total: 'Total Time',
      servings: 'Servings',
      servingsValue: (/** @type {number} */ n) => `${n} Servings`,
      fewer: 'Fewer servings',
      more: 'More servings',
    },
    /** "15 mins", "1 min" (60 minutes and over use formatMinutes). */
    minutes: (/** @type {number} */ m) => `${m} ${plural(m, 'min', 'mins')}`,
    photoMeta: (/** @type {string} */ time, /** @type {number} */ serves) => `${time} · Serves ${serves}`,
    notes: { title: 'Cook’s Secrets', label: 'Notes' },
    ingredients: {
      title: 'Mise en Place Ingredients',
      hint: 'Check what you have in stock to keep it off your grocery list',
      clearAll: 'Clear all',
      checkAll: 'Checkmark all',
      optional: 'optional',
      pushHint: 'Missing something? Push every unchecked ingredient to your grocery list.',
      push: (/** @type {number} */ n) => `Push Unchecked to Grocery (${n} ${plural(n, 'item')})`,
      pushed: 'Unchecked items are on your list',
    },
    method: {
      title: 'Step-by-Step Method',
      count: (/** @type {number} */ n) => `${n} Essential Movements`,
    },
    sync: 'Google Sheets sync',
    deleteDialog: {
      title: 'Delete this recipe?',
      afterTitle: ' will be removed from your recipes. You can undo this right after.',
    },
    toasts: {
      addedFromRecipe: (/** @type {number} */ n, /** @type {string} */ title) => `Added ${n} ${plural(n, 'ingredient')} from ${title} to your grocery list.`,
      addedUnchecked: (/** @type {number} */ n) => `Added ${n} ${plural(n, 'ingredient')} you haven’t checked off to your grocery list.`,
      planned: (/** @type {string} */ title, /** @type {string} */ date) => `${title} planned for ${date}.`,
      deleted: (/** @type {string} */ title) => `${title} deleted.`,
    },

    // Print options: the Print Options dialog, the Profile page and the Simple layout printout.
    print: {
      title: 'Print Options',
      print: 'Print',
      image: 'Print recipe image',
      imageIncluded: 'Include the photo on the page.',
      imageNone: 'This recipe has no photo.',
      imageScaling: 'Image scaling',
      smallerImage: 'Smaller image',
      largerImage: 'Larger image',
      simple: 'Simple layout',
      simpleHint: 'One column, no tinted backgrounds or shadows, sections headed by large bold titles.',
      textSize: 'Text size',
      sizes: {
        small: { label: 'Small', hint: '1 size smaller' },
        regular: { label: 'Regular', hint: 'As on screen' },
        large: { label: 'Large', hint: '3 sizes bigger' },
      },
      simplePage: {
        prep: (/** @type {string} */ time) => `Prep ${time}`,
        cook: (/** @type {string} */ time) => `Cook ${time}`,
        total: (/** @type {string} */ time) => `Total ${time}`,
        servings: (/** @type {number} */ n) => `${n} ${plural(n, 'serving')}`,
        ingredients: 'Ingredients',
        optional: 'optional',
        method: 'Method',
      },
    },
  },

  // Recipe editor (new recipe, edit, revert) and the Combobox it shares with Grocery and the Ingredients dialog.
  editor: {
    notFound: {
      title: 'Recipe not found',
      body: 'It may have been removed from the household recipe box.',
      addCustom: 'Add a Custom Recipe',
      browse: 'Browse the Recipe Catalog',
    },
    optional: '(optional)',
    required: 'Required',
    column: (/** @type {string} */ name) => `Column: ${name}`,
    comboboxSuggestionsAria: (/** @type {string} */ label) => `${label}: suggestions`,

    banner: {
      tab: (/** @type {string} */ tab) => `[${tab}] tab`,
      savingWrites: 'Saving writes this recipe’s row in your sheet',
      sheetsSettings: 'Sheets Settings',
      viewSheet: 'View Google Sheet',
    },
    header: {
      breadcrumbAria: 'Breadcrumb',
      catalog: 'Recipe Catalog',
      edit: 'Edit',
      createNew: 'Create New Recipe',
      titleEdit: 'Edit Recipe',
      titleNew: 'Add a Custom Family Recipe',
      introBefore: 'Document signature dinners, treasured family heirlooms, or handpicked online finds — laid out to match the columns of your',
      introAfter: ' sheet.',
      restoredDraft: 'Restored your saved draft',
    },

    essentials: {
      title: 'Recipe Essentials',
      recipeTitle: 'Recipe Title',
      titlePlaceholder: 'e.g., Mom’s Lemon Basil Ricotta Rigatoni',
      description: 'Description',
      descriptionPlaceholder: 'One or two lines that make you want to cook it tonight.',
      servings: 'Yield / Servings',
      servingsUnit: 'servings',
      prep: 'Prep Time',
      cook: 'Cook Time',
      minutesUnit: 'min',
    },
    photo: {
      label: 'Culinary Photo',
      previewAlt: 'Recipe photo preview',
      replace: 'Replace',
      remove: 'Remove',
      drop: 'Drop a kitchen snapshot or click to upload',
      limits: 'JPG, WebP or PNG up to 10 MB',
      linkAria: 'Image link',
      usingUploaded: 'Using the uploaded photo',
      linkPlaceholder: 'Or paste a public image link (Drive, Unsplash…)',
      uploadedConnected: 'Uploaded photos go to a “MealCaster Photos” folder in your Google Drive, viewable by anyone with the link.',
      uploadedLocal: 'Uploaded photos stay on this device until you connect a Google Sheet.',
      wrongType: 'Choose a JPG, PNG or WebP image.',
      tooBig: 'That photo is over 10 MB.',
      unreadable: 'Couldn’t read that image.',
    },
    category: {
      label: 'Category',
      newAria: 'New category',
      placeholder: 'Add your own category, e.g. Breakfast',
      add: 'Add',
      hint: 'One per recipe; tap the selected one again to clear it.',
    },
    tags: {
      label: 'Tags',
      newAria: 'New tag',
      placeholder: 'Add your own tag, e.g. Date Night',
      add: 'Add',
      hint: (/** @type {number} */ max) => `Press Enter to add. Words are capitalized for you; up to ${max} characters per tag, commas separate tags.`,
    },
    mapping: {
      title: 'Sheet Column Mapping',
      hide: 'Hide',
      show: 'Show',
      intro: 'Each field fills one column of your recipes tab:',
      /** What fills each [Recipes] column. */
      source: {
        Recipe_ID: 'Generated',
        Title: 'Recipe Title',
        Description: 'Description',
        Ingredients_JSON: 'Ingredients',
        Method_Steps: 'Method',
        Image_URL: 'Photo link',
        Tags: 'Tags',
        Favorite_Flag: '♥ on card',
        Category: 'Category',
        Servings: 'Servings',
        Prep_Minutes: 'Prep Time',
        Cook_Minutes: 'Cook Time',
        Notes: 'Cook’s Secrets',
      },
    },

    ingredients: {
      title: 'Ingredients & Mise en Place',
      columns: 'Qty · Unit · Ingredient · Note (for the store) · Prep (for the kitchen) · Component group · Store aisle',
      closePaste: 'Close',
      paste: 'Paste bulk text',
      addRow: 'Add Ingredient Row',
      groupsHint: 'Component groups become the numbered Mise en Place sections in the recipe view.',
      qtyAria: (/** @type {number} */ n) => `Quantity, row ${n}`,
      qtyPlaceholder: 'Qty',
      unitAria: (/** @type {number} */ n) => `Unit, row ${n}`,
      unitPlaceholder: 'Unit',
      nameAria: (/** @type {number} */ n) => `Ingredient, row ${n}`,
      namePlaceholder: 'Ingredient (e.g. green onion)',
      newIngredientDidYouMean: 'New ingredient. Did you mean',
      plusNote: (/** @type {string} */ note) => `+ note “${note}”`,
      noteAria: (/** @type {number} */ n) => `Note for the store, row ${n}`,
      notePlaceholder: 'Note (e.g. flank or ribeye)',
      prepAria: (/** @type {number} */ n) => `Prep, row ${n}`,
      prepPlaceholder: 'Prep (e.g. sliced)',
      optionalCheckbox: 'Optional',
      optionalWord: 'optional',
      groupAria: (/** @type {number} */ n) => `Component group, row ${n}`,
      groupPlaceholder: 'Group (e.g. Sauce)',
      newBadge: 'New',
      newBadgeTitle: (/** @type {string} */ name) => `Saving adds “${name}” to your ingredients, in this aisle`,
      aisleAria: (/** @type {number} */ n) => `Store aisle, row ${n}`,
      aisleKnownTitle: (/** @type {string} */ name) => `The aisle of “${name}”, shared by every recipe that uses it`,
      aisleNewTitle: 'Store aisle for this new ingredient',
      detailsAria: (/** @type {number} */ n) => `Note, prep and optional, row ${n}`,
      detailsTitle: 'Note, prep, optional',
      details: 'Details',
      removeAria: (/** @type {number} */ n) => `Remove ingredient row ${n}`,
      removeTitle: 'Remove ingredient',
    },
    paste: {
      label: 'Paste an ingredient list — one per line',
      placeholder: 'Pasta:\n1 lb rigatoni\n\nLemon ricotta cream:\n1 1/2 cups whole-milk ricotta\n2 lemons, zested and juiced\nSalt and black pepper',
      helpAria: 'How pasted lines are read',
      add: 'Add Ingredients',
      /** Each rendered with {@html}: static markup only, no user data. */
      help: [
        'One ingredient per line. Bullets and numbering are ignored.',
        'A line ending in “:” starts a component group, e.g. <em>Sauce:</em>',
        'Amount and unit come first: <em>1 1/2 cups rice</em>, <em>½ tsp salt</em>.',
        'Brackets become the note: <em>beef (flank or ribeye)</em>. Kitchen words in them go to prep: <em>(…, sliced)</em>.',
        'After a comma is prep: <em>shallot, finely minced</em>. So is a prep word before the name: <em>shredded chicken</em>.',
        '<em>(optional)</em> marks the line optional.',
        'A container becomes the unit: <em>6 oz can of tomato paste</em> → 1 can, note “6 oz”.',
        'Check the rows after adding: new ingredients are marked <strong class="text-tertiary">New</strong>, and look-alikes offer “Did you mean…”.',
      ],
    },

    method: {
      title: 'Preparation & Method',
      column: 'Method_Steps',
      ordered: 'Ordered steps',
      markdown: 'Supports Markdown:',
      write: 'Write',
      preview: 'Preview',
      count: (/** @type {number} */ n) => `${n} ${plural(n, 'step')}`,
      titleAria: (/** @type {number} */ n) => `Step ${n} title`,
      titlePlaceholder: 'Step title (e.g. Boil pasta & reserve liquid)',
      moveUp: (/** @type {number} */ n) => `Move step ${n} up`,
      moveDown: (/** @type {number} */ n) => `Move step ${n} down`,
      remove: (/** @type {number} */ n) => `Remove step ${n}`,
      nothingToPreview: 'Nothing to preview yet.',
      directionsAria: (/** @type {number} */ n) => `Step ${n} directions`,
      directionsPlaceholder: 'Describe the technique, temperatures and timing… (Markdown supported)',
      minutesPlaceholder: '—',
      minutes: 'min',
      add: (/** @type {string} */ nn) => `Add Step ${nn}`,
    },
    notes: {
      title: 'Cook’s Secrets',
      column: 'Notes',
      hint: 'Family adjustments, the best brand of ricotta, or a side dish that always works.',
      placeholder: 'e.g., Serve with a crisp chilled **Vermentino**. Don’t boil the ricotta directly or it may curdle.',
    },

    actions: {
      discardChanges: 'Discard Changes',
      discardDraft: 'Discard Draft',
      revert: 'Revert to Original',
      savedOnDevice: 'Changes are saved on this device',
      customSaved: (/** @type {number} */ n) => `${n} custom ${plural(n, 'recipe')} saved on this device`,
      saveDraft: 'Save Draft',
      saveChanges: 'Save Changes',
      saveRecipe: 'Save Recipe',
    },

    errors: {
      title: 'Give the recipe a title.',
      serves: 'Servings must be 1–50.',
      minutes: 'Enter whole minutes.',
      ingredients: 'Add at least one ingredient.',
      qty: 'Use amounts like 2, 1.5, 1/2 or 1 1/2 — or leave blank for “to taste”.',
    },
    toasts: {
      noIngredientsFound: 'No ingredients found — put one per line, e.g. “1 lb rigatoni”.',
      addedIngredients: (/** @type {number} */ n) => `Added ${n} ${plural(n, 'ingredient')} — check the amounts and aisles.`,
      updated: 'Recipe updated.',
      added: (/** @type {string} */ title) => `${title} added to your recipe box.`,
      reverted: 'Recipe reverted to the original.',
      draftSaved: 'Draft saved on this device.',
      draftNoSpace: 'This device ran out of space for the draft. Try a smaller photo or an image link.',
      draftDiscarded: 'Draft discarded.',
    },
  },

  // Grocery list: page, week picker, Add Item form, department sections, side panels, print checklist, toasts.
  // Meal-pill labels ("Mon: Pasta", "Added by you", "Every week") come from sheetText.js: they are also written to the sheet.
  grocery: {
    breadcrumbAria: 'Breadcrumb',
    weeklyPlan: 'Weekly Dinner Plan',
    crumb: 'Grocery & Provisions List',
    title: 'Weekly Provisions & Grocery List',
    weekName: {
      thisWeek: 'this week',
      nextWeek: 'next week',
      lastWeek: 'last week',
      weekOf: (/** @type {string} */ date) => `the week of ${date}`,
    },
    introBefore: (/** @type {string} */ week) => `Auto-compiled from the planned dinners of ${week}`,
    syncedBefore: 'Synced with the',
    syncedAfter: 'tab of your Google Sheet.',
    savedOnDevice: (/** @type {boolean} */ connected) =>
      `Saved on this device${connected ? '' : ' — connect a Google Sheet to keep it in a [Provisions] tab'}.`,
    weekPicker: {
      aria: 'Grocery week',
      thisWeek: 'This Week',
      nextWeek: 'Next Week',
      earlier: 'Earlier week',
      later: 'Later week',
      minimalView: 'Minimal view',
    },
    share: 'Share',
    addItem: 'Add Item',
    closeForm: 'Close',
    form: {
      ingredient: 'Ingredient',
      newBadge: 'New',
      newBadgeTitle: (/** @type {string} */ name) => `Adding it also adds “${name}” to your ingredients, in this aisle`,
      placeholder: 'e.g. bananas',
      noteLabel: 'Quantity or note',
      notePlaceholder: 'e.g. 2 bottles',
      aisle: 'Aisle',
      aisleKnownTitle: 'The ingredient’s aisle (change it in Profile → Ingredients)',
      submit: 'Add to List',
      weeksLegend: 'Which weeks',
      everyWeek: 'Every week',
      everyWeekHint: '— from this week on, until you buy it',
      justWeek: (/** @type {string} */ week) => `Just ${week}`,
    },
    filterAria: 'Filter by aisle',
    allAisles: 'All Aisles',
    tabLabel: (/** @type {string} */ name, /** @type {number} */ count) => `${name} (${count})`,
    tapHint: 'Tap the circle when bought, or the box if it’s at home (keeps it off every week’s list)',
    empty: {
      title: (/** @type {string} */ week) => `Nothing to buy for ${week}`,
      body: 'Plan a few dinners and their ingredients will be compiled here automatically.',
      openPlan: 'Open the weekly plan',
    },
    /** Where in the store a department is, shown beside its heading and on the printout. */
    where: {
      produce: 'Aisle 1 & Wet Rack',
      meat: 'Butcher & Fishmonger',
      dairy: 'Cheese Counter & Dairy Wall',
      pantry: 'Center Aisles',
      other: 'Anywhere Else',
    },
    itemCount: (/** @type {number} */ n) => `${n} ${plural(n, 'item')}`,
    line: {
      sourcesAria: 'For',
      showAllAria: (/** @type {number} */ n, /** @type {string} */ name) => `Show all ${n} sources of ${name}`,
      more: (/** @type {number} */ n) => `+${n} more`,
      markBoughtAria: (/** @type {boolean} */ bought, /** @type {string} */ name) => `${bought ? 'Unmark' : 'Mark'} ${name} as bought`,
      optional: 'Optional',
      needAfterAllTitle: 'Need to buy after all',
      moveBackAria: (/** @type {string} */ name) => `Move ${name} back to the shopping list`,
      onHandTitle: 'Have it at home — mark as on hand',
      onHandAria: (/** @type {string} */ name) => `Mark ${name} as on hand`,
      removeEveryTitle: 'Remove what you added (from every week)',
      removeTitle: 'Remove what you added',
      removeAria: (/** @type {string} */ name) => `Remove ${name}, added by you`,
    },
    leftOff: {
      past: (/** @type {number} */ n) => `${n} ${n === 1 ? 'ingredient was' : 'ingredients were'} left off because ${n === 1 ? 'it was' : 'they were'} in stock.`,
      current: (/** @type {number} */ n) => `${n} ${n === 1 ? 'ingredient is' : 'ingredients are'} left off because ${n === 1 ? 'it’s' : 'they’re'} in stock.`,
      needAria: (/** @type {string} */ name) => `Need ${name}: put it back on the list`,
      needIt: 'Need it',
      pastNote: 'This week is over, so its list stays as it was.',
      currentNote: 'Out of one? Tap Need it (or untick it on a recipe page) and it’s back on every week’s list.',
    },
    bought: { title: 'Bought', hide: 'Hide', show: 'Show' },
    overview: {
      title: 'Shopping Overview',
      week: (/** @type {number} */ n) => `Week ${n}`,
      toBuy: 'items to buy',
      onHand: 'on hand',
      completion: 'Shopping completion',
      spread: 'Department Spread',
      spreadTitle: (/** @type {string} */ name, /** @type {number} */ pct) => `${name} ${pct}%`,
      spreadItem: (/** @type {string} */ name, /** @type {number} */ pct) => `${name} (${pct}%)`,
      print: 'Print Kitchen Checklist',
    },
    sources: {
      title: 'Meal Sources',
      dinners: (/** @type {number} */ n) => `${n} ${plural(n, 'dinner')}`,
      today: 'Today',
      none: (/** @type {string} */ week) => `No dinners planned for ${week}.`,
      openSchedule: 'Open weekly dinner schedule',
    },
    toasts: {
      added: (/** @type {string} */ name, /** @type {boolean} */ everyWeek, /** @type {string} */ week, /** @type {boolean} */ wasOnHand) =>
        `Added ${name} to ${everyWeek ? 'your list until you buy it' : `the list for ${week}`}.` + (wasOnHand ? ' It’s no longer marked on hand.' : ''),
      onHand: (/** @type {string} */ name) => `${name} is on hand: it stays off every week’s list until you say you need it.`,
      needIt: (/** @type {string} */ name) => `${name} is back on the list.`,
      copied: 'Grocery list copied to your clipboard.',
      shareFailed: 'Couldn’t share the list from this browser.',
    },
    shareText: {
      title: 'MealCaster grocery list',
      heading: (/** @type {string} */ range) => `MealCaster grocery list · ${range}`,
    },
    print: {
      title: 'Kitchen Checklist',
      summary: (/** @type {string} */ week, /** @type {number} */ count, /** @type {string[]} */ sources) =>
        `${week} · ${count} ${plural(count, 'item')} to buy${sources.length ? `\u00a0· for ${sources.join(', ')}` : ''}`,
      optional: 'optional',
      nothingLeft: 'Nothing left to buy.',
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
