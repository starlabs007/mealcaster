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

- Monday → Sunday day cards with **completed** (past), **today**, **planned** and **open** states,
  computed from the real current date.
- Week stepper in the header (click the date range to jump back to this week).
- **Auto-fill Remaining**, **Copy Last Week**, **Reset Week** — each with an Undo toast.
  Past days are kept as history and never overwritten.
- **Surprise Me** and **Dining Out / Leftovers** on open slots.
- Grocery badge counts the ingredients of this week's upcoming dinners.

## Recipe Catalog (`#/catalog?day=YYYY-MM-DD`)

- Keyword search across titles, descriptions, tags and ingredients (the header search lands here too).
- Favorites + culinary attribute filters (combined with AND), four sort orders, paging (9 per page).
- **Select for {Day}** assigns the recipe to the chosen day; "Planning for" switches the target day.
- **Surprise Me & Assign** picks at random from the current results.

## Recipe Detail (`#/recipe/:id?day=YYYY-MM-DD`)

- Breadcrumb back to the plan, favorite toggle, Swap Meal, serving scaler (quantities rescale).
- Mise-en-place checklist grouped by component; **Push Unchecked to Grocery** and **Add to List**.
- Numbered method steps with durations; "Next: {Day} {Recipe}" walks through the week's dinners.

## Quick Grocery List (`#/grocery`)

- Auto-compiled from the viewed week's upcoming dinners, grouped into Produce, Meat & Seafood,
  Dairy and Pantry aisles (with aisle tabs). Each line shows which dinner needs it.
- Tap the circle when bought; the box icon moves an item to the **Already In Pantry / Acquired**
  ledger (pantry staples like oil and salt start there). **Clear Done** moves bought items to the ledger.
- **Add Item** for anything extra, **Share** (native share sheet or clipboard), **Print Kitchen
  Checklist** (print-friendly layout). Synced to the optional `[Provisions]` tab.
- Sidebar: items to buy, completion, department spread and the dinners feeding the list.

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
- Row-level three-way sync keyed by `Recipe_ID`, `Date_ISO`, and `Week_Of` + `Line_Key`: if a row
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
| `mealcaster.grocery.v2` | per-week `[Provisions]` list: bought/pantry status, pushed and custom items |
| `mealcaster.sheetsSettings.v1` | linked spreadsheet, tab names, sync options, column mapping |
| `mealcaster.syncBase.v1` | row fingerprints from the last sync |

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
    RecipeEditor.svelte      #/recipe/new, #/recipe/:id/edit
    SheetsSettings.svelte    #/sheets-sync
    ColumnConflicts.svelte   #/sheets-sync/columns
  lib/
    google/                  config, sign-in, Sheets/Drive REST client, Picker
    sync/                    codec, engine, one sync pass, sync orchestration
    schema.js                expected column headers per tab
    schemaCheck.js           header matching for the Column Conflicts screen
    router.svelte.js         hash router (works on GitHub Pages)
    planner.svelte.js        weekly plan state + actions (Svelte runes)
    grocery.svelte.js        grocery list model
    favorites.svelte.js
    toast.svelte.js
    dates.js
    format.js                quantity formatting (1/3, 3 1/2)
    data/recipes.js          [Recipes] data, filters, tag metadata
    data/slotPrompts.js      copy for open dinner slots
    components/              AppHeader, DayCard, RecipeCard, ...
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
Enable it once in the repo under **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is relative (`./`), so the site works from the `/<repo>/` sub-path.
The build job runs in the `production` environment to read the three `GOOGLE_*` values.
