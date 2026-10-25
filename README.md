# MealCaster

Weekly dinner menu planner — plan, prep and shop for the week's dinners.
Built with **Svelte 5 + Vite + Tailwind CSS**, deployed as a static site to GitHub Pages.

> Status: all screens are implemented, including two-way **Google Sheets sync**. Generated sample data
> exists only in `npm run dev`; `npm run dev:empty` and production builds start empty.

## Run it locally

Requires Node 20+ (`.nvmrc` pins 20).

```bash
nvm use
npm install
cp .env.example .env.local   # then fill in the Google values (see below)
npm run dev        # http://localhost:5173 — with generated sample data
npm run dev:empty  # same, but starts empty like production
npm run dev:lan    # same as dev, also on your network (the printed Network address, for a phone; no Google sign-in there)
```

Without `.env.local` the app still runs; Google sync is just unavailable.

### Sample data

`npm run dev` generates sample data when the dev server starts: varied recipes from about 50 dish templates and ten
cuisines (Chinese and Vietnamese included), the ingredients they use, four past weeks and part of this week planned,
some favorites, and grocery extras (two every-week items, one addition this week). It comes from the seeded generator
in `dev/samples/` (served to the app as `virtual:sample-data` by a plugin in `vite.config.js`); production builds get
empty data from the plugin and never load the generator.

```bash
SAMPLE_COUNT=500 npm run dev   # how many recipes (default 60; 0 = empty, same as npm run dev:empty)
SAMPLE_SEED=2 npm run dev      # another set of recipes (default 1)
SAMPLE_DATE=2026-01-15 npm run dev  # "added" dates count back from this day instead of today
npm run samples:images         # refresh the photo cache (see below)
```

The same seed and count always give the same recipes and ids. Recipe photos come from
[TheMealDB](https://www.themealdb.com/) through its official API (free development key; the website itself may not be
scraped). The photo list is fetched once into `.cache/sample-images.json`, which is gitignored: no TheMealDB data is
committed. Without the cache and a network connection, recipes are generated without photos and dev still starts.

Both dev modes run on `localhost:5173` (run one at a time) and use the same localStorage keys. When the sample data
changes (dev ↔ dev:empty, another `SAMPLE_COUNT` or `SAMPLE_SEED`, or a new generator version), the next load clears
this browser's saved recipes, plan, favorites, grocery list and sync history (Sheets settings are kept) and says so in
the console; the device then starts from the new samples. Refreshing the photo cache doesn't. Otherwise data survives
reloads. Production runs on its own origin, so its saved data is never touched.

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
- **Auto-fill Remaining**, **Copy Previous Week** (**Copy This Week** on next week), **Clear n Upcoming Evenings** — each with an Undo toast.
  Past days are kept as history and never overwritten. Auto-fill also prefers meals not already on the week's
  plan and not made in the last 7 days, and meals whose heads-up is still in time (see Heads-ups).
- Each day card offers actions for its state:
  - **Open day:** **Choose a Meal** (opens the catalog for that day), **Surprise Me** and **Night Off**.
  - **Planned meal** (including today): **View Recipe**, **Choose a Different Meal** (opens the catalog), **Surprise Me**,
    **Night Off** and **Move to Another Day…**.
    - **Drag to another day**: a planned meal that can move has a drag handle (⠿, top right on phones, right
      edge on wider screens), in the normal and the minimal view. Drag it onto another evening of the week (today
      onward, not yet completed): the evenings it can go to are outlined, the rest dimmed, and the floating card
      says what letting go does (**Move to …** for an open evening, **Switch with …** otherwise). It's the same
      move as Move to Another Day…, with an Undo toast. The page scrolls near the top or bottom of the screen; Escape or
      letting go anywhere else cancels. Pressing the handle without dragging opens the Move to Another Day… picker — the
      keyboard and screen-reader way, and the only one in the minimal view.
    - **Surprise Me** replaces the meal with a random one, preferring meals not already on the week's plan or
      made recently. It skips the meal being replaced unless that is the only recipe available.
    - **Night Off** turns the evening into a night off.
    - **Clear evening** puts the evening back to open.
    - Each of these shows an **Undo** toast, on an open evening too.
    - **Move to Another Day…** trades the meal with another evening of the same week (today onward, not yet completed);
      that evening's meal or night off moves the other way, and an open evening just receives the meal. Notes go
      with the meal, the completed flag stays with the date. Shows an **Undo** toast.
  - **Night off** (today or later): **Plan This Evening** clears the night so it's open again.
  - **Mark Done** (today only) flags the meal as made without waiting for the day to pass; it turns into a **Done** toggle that undoes it. A done meal counts as made for the catalog and syncs as `Completed_Flag`.
  - **Completed** and **no plan** past days only offer **View Recipe** where there is a meal.
- Grocery badge counts the items still to buy for the viewed week (every dinner of the week, past days included).
- **Heads-ups** on today's and upcoming cards: a dinner's own heads-up due on the day, an **N days ahead** pill when it
  needed doing earlier, and reminders for the next dinners ("For tomorrow · Hummus: Soak the chickpeas overnight.").
  A reminder opens that dinner's recipe. Nothing to tick off; past days show none.

## Recipe Catalog (`#/catalog?day=YYYY-MM-DD`)

- Keyword search across titles, descriptions, categories, tags and ingredient names, ignoring accents ("bun cha"
  finds Bún chả; the header search lands here too).
- Filters (combined with AND): Favorites, **Unplanned this week** (on by default, remembered on the device; hides meals the
  viewed week already has planned or completed, except the day being swapped), **Not made recently** (nothing made in the last 7 days; remembered on the device) and one per
  recipe tag in use, plus any of the meals (Filter by Category: a recipe shows if it has **any** chosen meal; tags still need every one; `?meals=Lunch,Dinner`, an older `?category=` link still works). Sorts: Most Cooked in Household (from the plan history), Quickest Prep Time,
  Name (A–Z or Z–A), Recently Added to Box.
- Infinite scroll: 9 recipes at first, 9 more as you near the bottom; a new search, filter or sort starts over at 9.
- Going back to the catalog from a recipe (back button, breadcrumb or header tab) with the same search returns to where
  you were: same recipes loaded, same sort and Favorites, same scroll position.
- Each card says when the meal was **last made** (from the plan): terracotta within 7 days, green otherwise.
- **Select for {Day}** assigns the recipe to the chosen day and returns to the weekly plan, scrolled to that day and briefly
  highlighting it (or, with that
  switched off in Profile, stays and confirms with a toast); "Planning for" switches the target day.
- **Surprise Me & Assign** picks at random from the current results, preferring meals not made recently.
- A recipe whose heads-up needs notice shows **N days ahead** on its photo.

## Recipe Detail (`#/recipe/:id?day=YYYY-MM-DD`)

- Breadcrumb back to the plan, favorite toggle, Choose a Different Meal, serving scaler (quantities rescale).
- Tags (each links to the catalog filtered by it) and when the meal was last made.
- On phones (below `md`) the page gets to the ingredients sooner: Print and Delete move into a ⋯ menu, the times
  read as one line (Prep · Cook · Total), the servings stepper sits at the top of the ingredients, the photo is a
  slimmer strip without its time / servings chip, and the Scheduled badge is left to the breadcrumb.
- Mise-en-place checklist grouped by component. Ticking a line marks it **prepped** while you cook: kept on this
  device for today only (never synced; the next day the recipe starts clean). **Tick all** / **Clear ticks** act on the
  whole recipe. The house button at the end of each line marks the ingredient **at home** (the same flag as everywhere
  else, see Ingredients; a solid house when at home, an outline when not, never a filled disc like the prep tick), with a toast and **Undo**: it stays off every week's grocery list until unmarked. **Add
  Missing to Grocery List** (under the checklist, the only grocery button on the page and its one sage primary button; a quiet outline once nothing is missing) skips ingredients at home and
  ones already on the list; prepped ticks don't change it. Lines read like "1 lb beef (flank or ribeye), sliced"; amounts and plurals follow the serving scaler.
- Numbered method steps with durations; tap a step's number to mark it done (the card sinks into the page; kept
  with the prepped ticks, today on this device). The screen stays awake while the method is on screen (Screen Wake
  Lock, where supported); on phones a **Method ↓** link in the ingredients header jumps there; "Next: {Day} {Recipe}" (or Back to Weekly Menu, outline buttons) walks through the week's dinners.
- The serving scaler remembers the last count per recipe on this device (never synced; the sheet's `Servings` stays
  the recipe's own).
- **Cook** (`?cook=1`, every width) turns the same page into a view for the counter: the action bar, photo, tags,
  description, stat tiles, aisle chips, At home buttons, Add Missing and the sync card go; ingredient lines and steps
  get bigger (Body XL), and step text runs the card's full width. Only same-day heads-ups stay. The first step not
  done is marked **Next**; done steps fold to their title; once all are done, tonight's dinner offers **Mark Done**.
  Phones get a bottom bar (Exit · Next step ↓ · servings), wider screens a top bar, and from `lg` the ingredients
  stick in a left column beside the method. The app header scrolls away and the screen stays awake the whole time.
  On until you leave the page (toggling doesn't add a history entry); Exit returns to the top with focus on Cook.
  On phones, tonight's planner card links here with **Cook** instead of View Recipe.

## Heads-ups

A recipe can carry a **heads-up**: one short sentence about something to do ahead ("Soak the chickpeas overnight.") and
when it's due: on the day, the day before or 2 days before. The editor sets one (About This Recipe); the sheet can hold
more, and the editor keeps those as they are.

- **Recipe page:** a callout under the description, longest lead first (printed too).
- **Planner:** each heads-up shows on the card of the day it's due (see the home screen), across week boundaries.
- **Catalog:** an **N days ahead** pill on the photo.
- **Planning too late** (picking, Surprise Me, moving, copying or Auto-fill onto a day whose heads-up day has gone, not
  counting this evening): the toast says so ("Hummus needs a day’s notice: …"). Auto-fill and Surprise Me avoid it
  when another meal fits.
- **Sheet:** the `Heads_Up_JSON` column of `[Recipes]`, a list like
  `[{"text":"Soak the chickpeas overnight.","daysBefore":1}]` (empty = none). Plain text reads as a heads-up on the
  day; keys MealCaster doesn't know are kept; a cell that isn't valid JSON shows nothing and is left as it is until
  the recipe gets a heads-up in the app. Optional: added to an existing sheet on the next sync, no schema change
  (older builds leave the column alone).

## Recipe tags

Tags are free text: the editor offers Quick (<30m), Vegetarian, Poultry & Meat, Gluten-Free and every tag
already in use, and takes new ones (each word capitalized, at most 100 characters, commas separate tags).
Each tag gets the least-used of five colours the first time it appears and keeps it; colours sync as
`Tag Colour` rows in `[Settings]` and are dropped once no recipe uses the tag. Your own tags (not the four
built-ins) can be recoloured, renamed or deleted under Profile & Settings → Recipe Tags.
The `Tags` column holds them as comma-separated text.

A recipe has any number of **meals** from a fixed list (Breakfast, Lunch, Dinner, Side, Snack, Dessert; shown on the cards
and the detail hero as "Lunch · Dinner"). The editor's Category field is a row of toggle chips. The `Category` column holds
them comma-separated ("Lunch, Dinner", always in list order); an older single value reads as a one-item list, blank means
none, and a value outside the list ("Brunch") is moved into the recipe's Tags when read. Auto-fill and Surprise Me pick
recipes whose meals include Dinner or are empty (every recipe if none qualify).

## Ingredients

Every ingredient is one entry in the `[Ingredients]` tab (`Ingredient_ID, Name, Plural, Aisle, On_Hand`); recipe
lines point at it by id and add their own amount, unit, **note** (for the store: "flank or ribeye", "6 oz"),
**prep** (for the kitchen: "sliced") and an **optional** flag. So an ingredient's name, aisle and stock are set once
for every recipe and the grocery list.

- **Names** are stored lowercase, singular, with an optional plural ("green onion" / "green onions"; blank for
  "rice", "rau răm"). The plural is used except for a single item (`1 onion`, `½ onion`, `1 large onion`, but
  `2 onions`, `1 lb carrots`). Units have one canonical form (`tsp tbsp cup oz lb g kg ml l clove bunch can …`);
  word units pluralize above 1 (`2 cups`), abbreviations and sizes never do.
- **Accents and case never matter when comparing** — search, suggestions, duplicate checks ("rau ram" finds "rau
  răm", "Đúc" = "duc") — but are kept as typed. Plain helpers in `src/lib/ingredients.js` (`foldKey`, `slugify`,
  plural and unit display).
- **Ids** are readable slugs fixed at creation (`nuoc-mam`, collisions get `-2`); renaming never changes them.
- **At home** (`On_Hand`) means you have it: it stays off every week's grocery list until unticked. Set it
  from a recipe's checklist, a grocery line's box icon, or Profile → Ingredients; untick it there or with **Need it**
  on the grocery list.
- **Recipe editor**: the ingredient field suggests existing ingredients (accent-insensitive, plurals too) and creates
  a new one on save, marked **New** with its aisle (guessed from keywords; a name with no keyword match waits for you to choose, and saving asks for it). Prep and Cook times may stay empty (saved as 0, which no screen shows) and "Did you mean…" buttons for
  look-alikes. An existing ingredient's aisle shows read-only beside the row (change it in Profile). The unit field suggests units
  and other spellings ("tablespoon" → tbsp). **Paste bulk text** splits lines into amount, unit, ingredient, note,
  prep and optional (rules under its help toggle); a "Sauce:" line starts a group.
- Ingredient **groups** are edited as sections (**Add Group**; a heading's ⋯ menu moves or deletes it, its rows joining
  the group above). A row is qty · unit · ingredient · ⋯ (note, prep and optional; move to another group; remove);
  Enter in the ingredient field adds the next row. One group shows no heading; it saves as "Main" when untitled. A
  group keeps its sheet category when renamed.
- A recipe line whose ingredient isn't in the tab shows as "Unknown ingredient" and keeps its id; sync doesn't stop.

## Grocery List (`#/grocery`)

- Auto-compiled from all of the viewed week's dinners (past days and ones marked done included, so their items and
  their `[Provisions]` rows stay), plus recipes pushed from a recipe page and items you added, grouped by the
  ingredient's aisle (with aisle tabs).
- **One line per ingredient**: every dinner using it is merged into it, each shown as a chip (two, then "+N more").
  Amounts in the same unit add up ("2 lb + 2 tbsp" otherwise); each meal's note stays with its meal. A line only
  optional recipes need is labelled **optional**.
- Ingredients **at home** are left off; an expandable note (closed by default) lists them, each with **Need it** to
  untick its stock and put it back on every week's list.
- Tap a line when bought: it shows its tick for a moment, then moves to the **Bought** section (a second quick tap
  is ignored), with a **Got X · Undo** toast; the house icon marks the ingredient at home.
  Bought is per week and leaves stock alone.
- The page keeps only This Week / Next Week as shortcuts (the header's week stepper is the way to any other week). The
  sync note lives in the sync badge's tooltip, and the tap hint has a **Got it** button that hides it on this device for good.
- **Skip This Week** (line menu or icon) is for a sold-out item: the line moves to a folded **Skipped** section, counts
  as handled ("N left", done state, completion), stays off Print and Share, and comes back next week (an every-week
  item too). Tap a skipped line to put it back. Mark At Home is the lasting version.
- **Past weeks are frozen**: changing stock never changes a past week's list (each past week keeps a snapshot of what
  it left off; Need it and the house icon are hidden there). Add Item is hidden on past weeks too. A past week reads
  as a record: a note says its list stays as it was, the overview and store bar show "x of y bought" instead of what's
  left and a completion bar, the tap hint is hidden, and the header's Grocery List button shows no count. Its lines can
  still be ticked, to note what you bought.
- **Add Item** picks an ingredient or creates one (with its aisle), for **just the viewed week** (default) or **every
  week** (from this week on until you buy it, then only in the week you bought it). Adding an in-stock ingredient
  clears its at-home mark. Removing an added item (trash icon) or marking it at home shows a toast with **Undo**. The
  ingredients left off because they're at home are listed alphabetically. **Share** (native share sheet or clipboard),
  **Print Checklist** (a quiet button in the header, in every view; print-friendly layout). **Minimal view** (mouse only) also hides the intro text and Share, and narrows the whole page to one centred, readable column. The list is grouped into five departments with one on-screen name each (Produce & Herbs, Meat & Seafood, Dairy & Frozen, Pantry, Spices & Bakery, Other; the filter uses the first part), shared by the headings, the Add Item aisle groups and the printout (titled Grocery List); the sheet's `Department` column keeps its own short names. The aisle filter resets to All when the week changes.
- **Store mode** (touch screens, phones and tablets): the list opens straight away under one bar with the week,
  "N left" and a ⋯ menu (Add Item, This / Next / Earlier / Later Week, Share, Print Checklist, Full List, and the sync
  line as small print). Lines show name and amount in a larger size; the dinners a line is for sit in its own ⋯. Aisle headings stay
  pinned while you scroll, and the app header scrolls away with the page (back in place when you reach the top) instead of staying fixed. Toasts show over the store bar, so they never cover a line. **Full List** switches
  to the full layout for this visit (not saved); **Store Mode** there switches back.
- Synced to the optional `[Provisions]` tab, one row per ingredient per week (`Line_Key` = `ing:<Ingredient_ID>`,
  `Status` To buy / Bought / Skipped / On hand, `Added` = JSON of what was added by hand): this week, the 7 before it and any
  future weeks. Older weeks are no longer synced; their rows stay in the sheet and their lists stay on the device.
  `On hand` rows of this week and later are read-only — stock lives in `[Ingredients]`.
- Sidebar: items to buy and at home, the week's dates and completion.

## Profile & Settings (`#/profile`)

The `[Settings]` tab is required (it can be renamed, not switched off). Besides the preferences below it holds a
`Schema | Version` row — the schema version the sheet was written with (currently 2, `SCHEMA_VERSION` in
`src/lib/schema.js`). Bump it when a change needs existing sheets migrated. Sync refuses a spreadsheet with another
version (or with no version row and old-style recipe lines) and says so, without reading or writing anything.
Version 1 sheets (ingredient text on each recipe line) are converted once outside the app.

Reached from the avatar in the header (and the footer, on phones).

- **Planning** — "Return to the planner after choosing a meal" (on by default; applies to Select and Surprise Me
  in the catalog). Synced as a `Preference` row in the `[Settings]` tab.
- **Week starts on** — the first day of the weekly plan and the grocery week (Saturday by default). Synced as a
  `Preference` row in `[Settings]`. Plan dates don't move; grocery lists are re-keyed onto the new weeks.
- **Ingredients** — a count with **View / Edit**, opening a dialog (bottom sheet on phones): add an ingredient (name
  + aisle; an existing name jumps to it), search (accent-insensitive), filter All / At home / Not in a recipe, tick
  stock, and edit name, plural and aisle in place. A name that is another ingredient's offers **Merge into it**: every
  recipe line and grocery mark moves to the kept one (samples become edited), it's at home if either was. Delete
  is only offered for ingredients no recipe uses. Merge and Delete show an Undo toast. Synced to `[Ingredients]`.
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
    tab names) — ingredients, recipes, planned dinners, the viewed week's grocery list and settings; photos not yet on Drive are
    left out. Works connected or not.
- **Danger Zone** — *Disconnect & Erase*: after a confirmation dialog, signs out of Google, removes every
  `mealcaster.*` key from this browser and reloads fresh. The Google Sheet is never changed. Handy for testing.

## Google Sheets sync (`#/sheets-sync`)

Browser-only: Google Identity Services for sign-in, the Sheets and Drive REST APIs, and the Google
Picker. The OAuth scope is `drive.file`, so MealCaster only sees spreadsheets the person picks in the
Picker or that it creates ("Create New Sheet").

**Picker and tracking protection** — the Picker is a `docs.google.com` frame that needs Google's sign-in
cookies, which Safari (worst in the Home Screen app, which has its own cookies) and Firefox's Enhanced
Tracking Protection block. It then never opens, or asks to let docs.google.com use cookies and then says
"API developer key is invalid" (Google's error for the missing cookies, not a bad key). Step 2 shows a
hint on those browsers, and if the Picker hasn't opened after 10 s it is closed and step 2 is enabled
again with a toast. Workarounds: Create New Sheet (no Picker), or turn tracking protection off while
choosing.

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
   and choose. **Tab names (advanced)**, collapsed: the four required tabs, then the optional grocery list tab; saved
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
- Row-level three-way sync keyed by `Ingredient_ID`, `Recipe_ID`, `Date_ISO`, `Week_Of` + `Line_Key`, and
  `Section` + `Name` (`[Ingredients]` first, so recipes and grocery rows read the latest ingredients): if a row
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
- Sign-in lasts about an hour (Google's limit) and isn't stored. While a spreadsheet is linked, your next click
  anywhere in the app renews it quietly — in the last 10 minutes of the hour, or after it ran out or the page
  reloaded — by opening Google's sign-in window, which closes by itself when you've already allowed MealCaster.
  Nothing syncs in the background once the hour is up until you click something. If you close that window or Google
  fails, it isn't tried again for 5 minutes; click **Reconnect** (the header button's main action) or **Sync Now**
  any time.

Sync logic is plain JS in `src/lib/sync/` (`codec.js` rows ⇄ data, `engine.js` reconcile,
`run.js` one pass with the API injected); `sync.svelte.js` wires it to the stores and UI.
`tests/` exercises those modules with a fake Sheets API (`tests/fakes.js`); CI runs `npm test` before
every deploy build.

## Local data

State is cached in `localStorage`; clear these keys to reset:

| Key | Mirrors |
| --- | --- |
| `mealcaster.ingredients.v1` | `[Ingredients]` tab (name, plural, aisle, at home) |
| `mealcaster.recipeBox.v2` | `[Recipes]` tab (custom/edited recipes, deleted samples) |
| `mealcaster.weeklyPlan.v2` | `[WeeklyPlan]` tab |
| `mealcaster.favorites.v2` | `Favorite_Flag` column of `[Recipes]` |
| `mealcaster.grocery.v4` | per-week `[Provisions]` list: bought status, pushed recipes, items added this week, past weeks' stock snapshots |
| `mealcaster.groceryEvery.v1` | items added for every week (merged into that ingredient's `[Provisions]` row) |
| `mealcaster.settings.v2` | `[Settings]` tab: Profile preferences, tag colours |
| `mealcaster.sheetsSettings.v1` | linked spreadsheet, tab names, sync options, column mapping |
| `mealcaster.syncBase.v2` | row fingerprints from the last sync |

Keys from before schema version 2 (`recipeBox.v1`, `grocery.v2`, `settings.v1`, `syncBase.v1`…) are removed at
startup (`env.js`): the new build never reads old-format data, and a stale sync base would delete sheet rows.

Device-only preferences (not synced): `mealcaster.printOptions.v1`, `mealcaster.catalogHideRecent.v1`, `mealcaster.catalogHidePlanned.v1`;
today's prepped ticks and done steps on recipe pages in `mealcaster.recipePrep.v1`; the servings last chosen per recipe in `mealcaster.recipeServings.v1`; the Recipe Editor keeps unsaved work as a draft a moment after each change (a new recipe in `mealcaster.recipeDraft.v2`, edits to an existing one in `mealcaster.recipeEditDrafts.v1`, per recipe id and only for the recipe as it was opened). Saving or discarding clears it; leaving the editor keeps it and the editor restores it on reopening.

The grocery badge counts items still to buy for the viewed week.

Saves go through `saveItem` (`storage.svelte.js`), which notes saves that didn't fit and shows a toast. Until every
store is saved again, sync keeps the new `syncBase.v2` in memory only, so a reload can't push older data over the
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
    pointerDrag.js           drag-and-drop on pointer events (mouse + touch), standalone and reusable (tested)
    recipes.svelte.js        live recipe list (samples + saved), save/delete/revert
    ingredients.js           ingredient helpers: foldKey, slugs, units, plural rule, line display (plain, tested)
    ingredients.svelte.js    ingredient store (synced), stock changes
    ingredientActions.svelte.js  merge / delete an ingredient across recipes and grocery lists, with Undo
    ingredientText.js        paste parser, quantity parsing, aisle guess for new ingredients
    tags.js                  tag normalizing, suggestions, colour rotation
    meals.js                 the fixed meal list: parsing, filtering, dinner check
    tagColors.svelte.js      tag colours (synced) and renaming / deleting tags
    grocery.svelte.js        grocery list state (per week, every-week items, stock snapshots)
    groceryList.js           one line per ingredient: merging, amounts, visibility (plain, tested)
    settings.svelte.js       Profile settings (preferences, tag colours)
    devicePrefs.svelte.js    small per-device display preferences
    favorites.svelte.js
    toast.svelte.js
    storage.svelte.js        localStorage saves that note failures, storage use, persist() request
    dates.js
    text.js                  all on-screen wording (plain module; plural() helper, one group per screen)
    sheetText.js             wording stored in the Google Sheet and parsed back by sync/codec.js (changing it may need a migration)
    format.js                quantity formatting (1/3, 3 1/2)
    data/recipes.js          recipe types, formatMinutes
    components/              AppHeader, DayListCard, RecipeCard, LastMade, ...
dev/samples/                 dev sample data generator (plain Node modules, never bundled): generate.js, dish
                             templates, cuisines, ingredient catalog, phrases, images.js (TheMealDB photo cache)
.cache/                      gitignored: sample-images.json
```

**Which text file?** Words a person only reads on screen go in `text.js`; words written to or read back from the
sheet (statuses, `[Settings]` rows, aisle and department names, weekdays, colour names) go in `sheetText.js`,
whose header explains how to change them safely.

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

Nothing open.
