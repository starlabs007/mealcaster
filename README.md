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

- Saturday → Friday day cards with **completed** (past), **today**, **planned** and **open** states,
  computed from the real current date.
- Week stepper in the header (click the date range to jump back to this week).
- **Auto-fill Remaining**, **Copy Last Week**, **Reset Week** — each with an Undo toast.
  Past days are kept as history and never overwritten.
- **Choose a Meal**, **Surprise Me** and **Dining Out** on open slots. Surprise Me and Auto-fill prefer meals
  not already on the week's plan and not made in the last 7 days.
- Grocery badge counts the ingredients of this week's upcoming dinners.

## Recipe Catalog (`#/catalog?day=YYYY-MM-DD`)

- Keyword search across titles, descriptions, categories, tags and ingredients (the header search lands here too).
- Filters (combined with AND): Favorites, **Not made in 7 days** (remembered on the device) and one per
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
- Mise-en-place checklist grouped by component; **Push Unchecked to Grocery** and **Add to List**.
- Numbered method steps with durations; "Next: {Day} {Recipe}" walks through the week's dinners.

## Recipe tags

Tags are free text: the editor offers Quick (<30m), Vegetarian, Poultry & Meat, Gluten-Free and every tag
already in use, and takes new ones (each word capitalized, at most 100 characters, commas separate tags).
Each tag gets the next colour in a fixed rotation the first time it appears and keeps it (per device).
The `Tags` column holds them as comma-separated text.

A recipe has at most one **category** (optional; shown on the cards, the detail hero and the planner day card).
The editor offers Dinner, Lunch, Dessert and every category in use, and takes a custom one (tidied like a tag).
The `Category` column holds it; blank means none.

## Quick Grocery List (`#/grocery`)

- Auto-compiled from the viewed week's upcoming dinners, grouped into Produce, Meat & Seafood,
  Dairy and Pantry aisles (with aisle tabs). Each line shows which dinner needs it.
- Tap the circle when bought and the box icon if you already have it; either way the item moves to the
  **Already On Hand / Acquired** ledger and the aisle counters update (staples like oil and salt start there).
- **Add Item** for anything extra, **Share** (native share sheet or clipboard), **Print Kitchen
  Checklist** (print-friendly layout). Synced to the optional `[Provisions]` tab.
- Sidebar: items to buy, completion, department spread and the dinners feeding the list.

## Profile & Settings (`#/profile`)

Reached from the avatar in the header (and the footer, on phones).

- **Planning** — "Return to the planner after choosing a meal" (on by default; applies to Select and Surprise Me
  in the catalog). Synced as a `Preference` row in the `[Settings]` tab.
- **Aisle Mappings** — your own ingredient → aisle pairs (e.g. "Oat milk" → Pantry). They're checked before the
  built-in word lists whenever an aisle is guessed: typing or pasting ingredients in the recipe editor, and the
  aisle pre-selected in the grocery **Add Item** form. A name matches as whole words anywhere in the ingredient
  ("oat milk" also matches "2 cups oat milk"), and the longest match wins. Explicit aisles already saved on a
  recipe are never changed. Synced to the optional `[Settings]` tab.
- **This Device** — print defaults for the Print Options dialog, the catalog's "Not made in 7 days" default and
  a Reset Colours button for tag colours. Never synced.

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

**How sync behaves**

- The Google Sheet is the source of truth; `localStorage` is a cache plus edits waiting to be pushed.
- Row-level three-way sync keyed by `Recipe_ID`, `Date_ISO`, `Week_Of` + `Line_Key`, and `Section` + `Name`: if a row
  changed in the sheet since the last sync the sheet wins; otherwise this device's edit is pushed.
  Rows are updated in place and only MealCaster's columns are written, so extra columns stay put.
- First sync with data on both sides asks: **Merge** (device-only rows are added, the sheet wins on
  overlaps) or **Use the spreadsheet only**.
- Runs on connect, when the app regains focus, ~1.5 s after edits (Instant Push), and on Sync Now.
- Renamed/missing columns pause sync until resolved on `#/sheets-sync/columns`.
- Uploaded recipe photos go to a "MealCaster Photos" Drive folder, shared as anyone-with-the-link.
- Sign-in lasts about an hour and isn't stored; after a reload, click **Reconnect**.

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
| `mealcaster.settings.v1` | `[Settings]` tab: Profile aisle mappings |
| `mealcaster.sheetsSettings.v1` | linked spreadsheet, tab names, sync options, column mapping |
| `mealcaster.syncBase.v1` | row fingerprints from the last sync |

Device-only preferences (not synced): `mealcaster.printOptions.v1`, `mealcaster.tagColors.v1`,
`mealcaster.catalogHideRecent.v1`; an unsaved new recipe is kept in `mealcaster.recipeDraft.v1`.

The grocery badge counts items still to buy for the viewed week.

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
    SheetsSettings.svelte    #/sheets-sync
    ColumnConflicts.svelte   #/sheets-sync/columns
  lib/
    google/                  config, sign-in, Sheets/Drive REST client, Picker
    sync/                    codec, engine, one sync pass, sync orchestration
    schema.js                expected column headers per tab
    schemaCheck.js           header matching for the Column Conflicts screen
    router.svelte.js         hash router (works on GitHub Pages)
    planner.svelte.js        weekly plan state + actions, last made / times made (Svelte runes)
    recipes.svelte.js        live recipe list (samples + saved), save/delete/revert
    tags.js                  tag & category normalizing, suggestions, colour rotation
    tagColors.svelte.js      per-device tag colours
    grocery.svelte.js        grocery list model
    settings.svelte.js       Profile settings (aisle mappings) + aisleMap.js matching
    devicePrefs.svelte.js    small per-device display preferences
    favorites.svelte.js
    toast.svelte.js
    dates.js
    format.js                quantity formatting (1/3, 3 1/2)
    data/recipes.js          sample recipes (dev only)
    components/              AppHeader, DayCard, RecipeCard, LastMade, ...
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
Enable it once in the repo under **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is relative (`./`), so the site works from the `/<repo>/` sub-path.
The build job runs in the `production` environment to read the three `GOOGLE_*` values.

## To do

- **Dinner picks ignore the category.** Auto-fill and Surprise Me choose from every recipe, so a Lunch or
  Dessert recipe (e.g. the New York Cheesecake sample) can land on a dinner day. Limit both to recipes in the
  Dinner category or with no category.
- **Customized aisle mapping.** Allow for additional ingredients to automatically map to aisle. These would be merged into the existing mappings. These can exist as profile settings (settings not implemented yet either)