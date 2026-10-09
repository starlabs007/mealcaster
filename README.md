# MealCaster

Weekly dinner menu planner — plan, prep and shop for the week's dinners.
Built with **Svelte 5 + Vite + Tailwind CSS**, deployed as a static site to GitHub Pages.

> Status: all screens are implemented, including two-way **Google Sheets sync**. Sample recipes and
> a sample plan exist only in `npm run dev`; `npm run dev:empty` and production builds start empty.

## Run it locally

Requires Node 18.18+ (`.nvmrc` pins 18).

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in the Google values (see below)
npm run dev        # http://localhost:5173 — with sample recipes, plan and favorites
npm run dev:empty  # same, but starts empty like production
```

Without `.env.local` the app still runs; Google sync is just unavailable.

Both dev modes run on `localhost:5173` (run one at a time) and use the same localStorage keys.
Switching mode clears this browser's saved recipes, plan, favorites, grocery list and sync history
(Sheets settings are kept) — the sample mode re-seeds, the empty mode starts blank. Within a mode, data
survives reloads. Production runs on its own origin, so its saved data is never touched.

Tests (Node's built-in runner, no extra dependencies):

```bash
npm test           # sync logic against an in-memory spreadsheet — see tests/
```

Production build + local preview of the built site:

```bash
npm run build
npm run preview    # http://localhost:4173
```

## What works on the home screen

- Seven day cards (Saturday → Friday unless you change the start day in Profile & Settings) with **completed** (past), **today**, **planned** and **open** states,
  computed from the real current date.
- Week stepper in the header (click the date range to jump back to this week).
- **Auto-fill Remaining**, **Copy Last Week**, **Reset Week** — each with an Undo toast.
  Past days are kept as history and never overwritten. Auto-fill also prefers meals not already on the week's
  plan and not made in the last 7 days.
- Each day card offers actions for its state:
  - **Open day:** **Choose a Meal** (opens the catalog for that day), **Surprise Me** and **Dining Out**.
  - **Planned meal** (including today): **View Recipe**, **Swap Meal** (opens the catalog), **Surprise Me**,
    **Dining Out** and **Switch Days…**.
    - **Surprise Me** replaces the meal with a random one, preferring meals not already on the week's plan or
      made recently. It skips the meal being replaced unless that is the only recipe available.
    - **Dining Out** turns the evening into a night off.
    - Replacing a planned meal with either shows an **Undo** toast.
    - **Switch Days…** trades the meal with another evening of the same week (today onward, not yet completed);
      that evening's meal or night off moves the other way, and an open evening just receives the meal. Notes go
      with the meal, the completed flag stays with the date. Shows an **Undo** toast.
  - **Night off** (today or later): **Plan a Meal Instead** clears the night so it's open again.
  - **Completed** and **not logged** past days only offer **View Recipe** where there is a meal.
- Grocery badge counts the items still to buy for the viewed week (every dinner of the week, past days included).

## Recipe Catalog (`#/catalog?day=YYYY-MM-DD`)

- Keyword search across titles, descriptions, categories, tags and ingredients (the header search lands here too).
- Filters (combined with AND): Favorites, **Unplanned this week** (on by default, remembered on the device; hides meals the
  viewed week already has planned or completed, except the day being swapped), **Not made recently** (nothing made in the last 7 days; remembered on the device) and one per
  recipe tag in use, plus one category at a time (Filter by Category). Sorts: Most Cooked in Household (from the plan history), Quickest Prep Time,
  Name (A–Z or Z–A), Recently Added to Box. Paging, 9 per page.
- Each card says when the meal was **last made** (from the plan): terracotta within 7 days, green otherwise.
- **Select for {Day}** assigns the recipe to the chosen day and returns to the weekly plan, scrolled to that day and briefly
  highlighting it (or, with that
  switched off in Profile, stays and confirms with a toast); "Planning for" switches the target day.
- **Surprise Me & Assign** picks at random from the current results, preferring meals not made recently.

## Recipe Detail (`#/recipe/:id?day=YYYY-MM-DD`)

- Breadcrumb back to the plan, favorite toggle, Swap Meal, serving scaler (quantities rescale).
- Tags (each links to the catalog filtered by it) and when the meal was last made.
- Mise-en-place checklist grouped by component. Checking an ingredient means you always have it: it goes on your
  **Ingredients I Have** list (see Profile & Settings) and stays off the grocery list, in every week, until you
  uncheck it. **Checkmark all** / **Clear all** act on the whole recipe. **Push Unchecked to Grocery** and
  **Add to List** skip checked ingredients.
- Numbered method steps with durations; "Next: {Day} {Recipe}" walks through the week's dinners.

## Recipe tags

Tags are free text: the editor offers Quick (<30m), Vegetarian, Poultry & Meat, Gluten-Free and every tag
already in use, and takes new ones (each word capitalized, at most 100 characters, commas separate tags).
Each tag gets the least-used of five colours the first time it appears and keeps it; colours sync as
`Tag Colour` rows in `[Settings]` and are dropped once no recipe uses the tag. Your own tags (not the four
built-ins) can be recoloured, renamed or deleted under Profile & Settings → Recipe Tags.
The `Tags` column holds them as comma-separated text.

A recipe has at most one **category** (optional; shown on the cards, the detail hero and the planner day card).
The editor offers Dinner, Lunch, Dessert and every category in use, and takes a custom one (tidied like a tag).
The `Category` column holds it; blank means none.

## Quick Grocery List (`#/grocery`)

- Auto-compiled from all of the viewed week's dinners (past days and ones marked done included, so their items and
  their `[Provisions]` rows stay), grouped into Produce, Meat & Seafood, Dairy and Pantry aisles (with aisle tabs).
  Each line shows which dinner needs it.
- Ingredients on your **Ingredients I Have** list are left off; an expandable note (closed by default) says how many
  and lists them with the dinner they belong to.
- Tap the circle when bought and the box icon if you already have it; either way the item moves to the
  **Already On Hand / Acquired** ledger and the aisle counters update.
- **Add Item** for anything extra, for just the viewed week or as a **Standing item** shown in every week until it is
  bought or marked on hand (then it stays only in that week's Acquired list), **Share** (native share sheet or clipboard), **Print Kitchen
  Checklist** (print-friendly layout). Synced to the optional `[Provisions]` tab: this week, the 7 before it and any
  future weeks. Older weeks are no longer synced; their rows stay in the sheet and their lists stay on the device.
- Sidebar: items to buy, completion, department spread and the dinners feeding the list.

## Profile & Settings (`#/profile`)

The `[Settings]` tab is required (it can be renamed, not switched off). Besides the preferences below it holds a
`Schema | Version` row — the schema version the sheet was written with (currently 1, `SCHEMA_VERSION` in
`src/lib/schema.js`). Bump it when a change needs existing sheets migrated; a sheet's older number is kept so a
migration can see it.

Reached from the avatar in the header (and the footer, on phones).

- **Planning** — "Return to the planner after choosing a meal" (on by default; applies to Select and Surprise Me
  in the catalog). Synced as a `Preference` row in the `[Settings]` tab.
- **Week starts on** — the first day of the weekly plan and the grocery week (Saturday by default). Synced as a
  `Preference` row in `[Settings]`. Plan dates don't move; grocery lists are re-keyed onto the new weeks.
- **Aisle Mappings** — your own ingredient → aisle pairs (e.g. "Oat milk" → Pantry). They're checked before the
  built-in word lists whenever an aisle is guessed: typing or pasting ingredients in the recipe editor, and the
  aisle pre-selected in the grocery **Add Item** form. A name matches as whole words anywhere in the ingredient
  ("oat milk" also matches "2 cups oat milk"), and the longest match wins. Explicit aisles already saved on a
  recipe are never changed. Synced to the `[Settings]` tab.
- **Ingredients I Have** — names that never reach the grocery list, in any week. Checking an ingredient on a recipe
  adds it here; you can also add or remove names by hand. A name matches an ingredient's full text, ignoring case
  and plurals ("noodles" won't hide "egg noodles"). Synced as `Have` rows in the `[Settings]` tab.
- **Recipe Tags** — every tag in use with its recipe count. Your own tags get a colour picker (five tones), Rename
  and Delete; both change every recipe with the tag (samples become edited), renaming onto a tag in use merges
  them, and an Undo toast follows. The four built-ins can't be changed. Reset Colours hands colours out again.
  Colours sync as `Tag Colour` rows (`Section | Name | Value` = `Tag Colour | Date Night | Plum`) in `[Settings]`.
- **This Device** — never synced; one card per group:
  - **Recipe Printing**: defaults for the Print Options dialog (image and its scaling, simple layout, text size).
  - **Storage**: how much of the roughly 5 MB a browser allows the site is used (shared with other apps on the same
    domain), uploaded photos still waiting for Google Drive, a warning when the device is nearly full or a save didn't
    fit, and **Ask to Keep It** while the browser may clear the data to free space.
  - **Catalog**: start the catalog with "Unplanned this week" (on by default) and/or "Not made recently"
    switched on.
  - **Export**: downloads everything on this device as `MealCaster_Export_<date>.xlsx` with the sheet's tabs (and
    tab names) — recipes, planned dinners, the viewed week's grocery list and settings; photos not yet on Drive are
    left out. Works connected or not.
- **Danger Zone** — *Disconnect & Erase*: after a confirmation dialog, signs out of Google, removes every
  `mealcaster.*` key from this browser and reloads fresh. The Google Sheet is never changed. Handy for testing.

## Google Sheets sync (`#/sheets-sync`)

Browser-only: Google Identity Services for sign-in, the Sheets and Drive REST APIs, and the Google
Picker. The OAuth scope is `drive.file`, so MealCaster only sees spreadsheets the person picks in the
Picker or that it creates ("Create New Sheet").

**Credentials** — three build-time values, all public by design in a browser app:

| Variable | What |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID. Authorized JavaScript origins: `http://localhost:5173`, `https://starlabs007.github.io` |
| `GOOGLE_API_KEY` | Browser API key — restrict it to those origins and to the Sheets, Drive and Picker APIs |
| `GOOGLE_APP_ID` | Google Cloud project number (the Picker needs it) |

In dev they come from `.env.local` (git-ignored); in CI from the repo's `production` environment
(variables or secrets). `vite.config.js` exposes exactly these three to the bundle.

**The connection screen** — a modal over the page it was opened from, in three steps. `#/sheets-sync` opens step 1
when no spreadsheet is linked, otherwise step 3. Steps replace each other in history, so Back / Done / Escape return
to that page.

1. **Google account** (`#/sheets-sync/account`) — Sign in with Google (or Reconnect), or **Use a different account**
   (Google's account chooser). Switching to another account unlinks the spreadsheet, as it may not have access.
2. **Spreadsheet** (`#/sheets-sync/sheet`) — **Create a new spreadsheet** (name it; "MealCaster" by default) *or*
   **Choose from Drive**. **Empty Template (.xlsx)** downloads the tabs with only their header rows, to upload to Drive
   and choose. **Tab names (advanced)**, collapsed: the three required tabs, then the optional grocery list tab; saved
   when leaving the step by Continue / Create / Choose. **Clear Saved Settings** (with Undo) shows there while nothing
   is linked.
3. **Sync** (`#/sheets-sync/sync`) — the account and spreadsheet with Change links, **How to sync** (direction and
   Instant Push, saved as they change), the sync status with **Start Syncing** / **Sync Now** / **Reconnect** /
   **Resolve Columns**, **Check Column Headers**, and **Disconnect…** (asks first).

The header's Google Sheets button follows the sync state: a plain **Connect Google Sheets** link while nothing is
linked; otherwise a split button whose main action is Reconnect, Sync Now, Resolve Columns or Finish Connecting
(first sync not done or waiting on a choice), with a menu of Connection Settings, Open in Google Sheets and
Disconnect…. Below `sm` it's icon-only and opens the menu. The states and actions are plain functions in
`src/lib/sync/phase.js` (tested in `tests/phase.test.js`).

**How sync behaves**

- The Google Sheet is the source of truth; `localStorage` is a cache plus edits waiting to be pushed.
- Row-level three-way sync keyed by `Recipe_ID`, `Date_ISO`, `Week_Of` + `Line_Key`, and `Section` + `Name`: if a row
  changed in the sheet since the last sync the sheet wins; otherwise this device's edit is pushed.
  Rows are updated in place and only MealCaster's columns are written, so extra columns stay put.
- Choosing or creating a spreadsheet doesn't sync: its first sync starts from step 3 (**Start Syncing**). Until
  then the header shows **Finish Connecting** and automatic syncs (Instant Push, regaining focus) wait.
- First sync with data on both sides asks, on step 3: **Merge** (device-only rows are added, the sheet wins on
  overlaps) or **Use the spreadsheet only**; **Don't Connect** unlinks the spreadsheet but stays signed in. If the
  question comes up elsewhere (e.g. after reconnecting), the app opens step 3.
- **Sheets as Backup** (backup sync, step 3 → How to sync) makes the sheet a backup of this device: the
  device wins every row, nothing is pulled, and rows only in the sheet (including unknown `[Settings]` rows) are deleted;
  the sheet's schema version is overwritten with the app's. If the spreadsheet already has recipes, plan or grocery
  data, the first sync asks first: **Empty / Overwrite Spreadsheet** or **Don't Connect**, plus **Restore From
  Spreadsheet** (switches to Bidirectional and takes the sheet's data) when this device has none. Switching to
  backup after the first sync asks to confirm, since the next sync overwrites the sheet.
- After the first sync it runs on connect, when the app regains focus, ~1.5 s after edits (Instant Push), and on
  Sync Now.
- Renamed/missing columns pause sync until resolved on `#/sheets-sync/columns`.
- Uploaded recipe photos go to a "MealCaster Photos" Drive folder, shared as anyone-with-the-link.
- Sign-in lasts about an hour and isn't stored; after a reload, click **Reconnect** (the header button's main action).

Sync logic is plain JS in `src/lib/sync/` (`codec.js` rows ⇄ data, `engine.js` reconcile,
`run.js` one pass with the API injected); `sync.svelte.js` wires it to the stores and UI.
`tests/` exercises those modules with a fake Sheets API (`tests/fakes.js`); CI runs `npm test` before
every deploy build.

## Local data

State is cached in `localStorage`; clear these keys to reset:

| Key | Mirrors |
| --- | --- |
| `mealcaster.recipeBox.v1` | `[Recipes]` tab (custom/edited recipes, deleted samples) |
| `mealcaster.weeklyPlan.v1` | `[WeeklyPlan]` tab |
| `mealcaster.favorites.v1` | `Favorite_Flag` column of `[Recipes]` |
| `mealcaster.grocery.v2` | per-week `[Provisions]` list: bought/on-hand status, pushed and custom items |
| `mealcaster.groceryGlobal.v1` | Standing items: `global:` rows in `[Provisions]`, one per week they show in |
| `mealcaster.settings.v1` | `[Settings]` tab: Profile preferences, aisle mappings, ingredients I have, tag colours |
| `mealcaster.sheetsSettings.v1` | linked spreadsheet, tab names, sync options, column mapping |
| `mealcaster.syncBase.v1` | row fingerprints from the last sync |

Device-only preferences (not synced): `mealcaster.printOptions.v1`, `mealcaster.catalogHideRecent.v1`, `mealcaster.catalogHidePlanned.v1`
(`mealcaster.tagColors.v1`, the old per-device tag colours, is moved into settings once and removed); an unsaved new recipe is kept in `mealcaster.recipeDraft.v1`.

The grocery badge counts items still to buy for the viewed week.

Saves go through `saveItem` (`storage.svelte.js`), which notes saves that didn't fit and shows a toast. Until every
store is saved again, sync keeps the new `syncBase.v1` in memory only, so a reload can't push older data over the
sheet. At startup the app asks the browser to keep its data (`navigator.storage.persist()`; Firefox only from the
Profile button, as it asks the person) and warns at 80% of 5 MB.

## Project layout

```
src/
  App.svelte                 app shell + hash routes
  routes/
    WeeklyPlanner.svelte     #/
    Catalog.svelte           #/catalog
    RecipeDetail.svelte      #/recipe/:id
    Grocery.svelte           #/grocery
    Profile.svelte           #/profile
    RecipeEditor.svelte      #/recipe/new, #/recipe/:id/edit
    SheetsConnection.svelte  #/sheets-sync/account|sheet|sync (AccountStep, SheetStep, SyncStep components)
    ColumnConflicts.svelte   #/sheets-sync/columns
  lib/
    google/                  config, sign-in, Sheets/Drive REST client, Picker
    sync/                    codec, engine, one sync pass, sync orchestration, phase.js (sync states + header actions)
    schema.js                expected column headers per tab
    schemaCheck.js           header matching for the Column Conflicts screen
    sheetsTemplate.js        .xlsx workbooks: the Profile data export and the empty template
    router.svelte.js         hash router (works on GitHub Pages)
    planner.svelte.js        weekly plan state + actions, last made / times made (Svelte runes)
    switchDays.js            entries after two evenings switch (pure, tested)
    recipes.svelte.js        live recipe list (samples + saved), save/delete/revert
    tags.js                  tag & category normalizing, suggestions, colour rotation
    tagColors.svelte.js      tag colours (synced) and renaming / deleting tags
    grocery.svelte.js        grocery list model
    settings.svelte.js       Profile settings (aisle mappings, ingredients I have) + aisleMap.js / haveList.js matching
    devicePrefs.svelte.js    small per-device display preferences
    favorites.svelte.js
    toast.svelte.js
    storage.svelte.js        localStorage saves that note failures, storage use, persist() request
    dates.js
    format.js                quantity formatting (1/3, 3 1/2)
    data/recipes.js          sample recipes (dev only)
    components/              AppHeader, DayCard, RecipeCard, LastMade, ...
```

**Runes only in `.svelte` / `.svelte.js`.** Svelte compiles `$state`, `$derived`, `$effect` and the other runes
only in those files. In a plain `.js` module they're left as-is: the build passes and the code throws when it runs.
A module that holds or snapshots app state is a `.svelte.js` file; a plain `.js` module takes plain data as
arguments (which also keeps it testable — the Node tests can't load `.svelte.js` modules).
`tests/runes.test.js` fails on any rune in a plain `.js` file under `src/`.

## Deploying

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
Enable it once in the repo under **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is relative (`./`), so the site works from the `/<repo>/` sub-path.
The build job runs in the `production` environment to read the three `GOOGLE_*` values.

## To do

- **Dinner picks ignore the category.** Auto-fill and Surprise Me choose from every recipe, so a Lunch or
  Dessert recipe (e.g. the New York Cheesecake sample) can land on a dinner day. Limit both to recipes in the
  Dinner category or with no category.
