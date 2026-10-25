# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Responsive static site on GitHub Pages, also installed as a Home Screen app on iPhone (manifest + icons in
`repo/public/`). Mobile web, not native.

## Users

- **Primary: one household planner** (the owner). They plan the week's dinners, keep the recipe box and do the
  shopping. Other household members at most glance at the plan or the list; they don't edit.
- **Later: other home cooks.** Built for the household first, but it should stay ready to open up to others
  (today the Google OAuth consent screen is in Testing mode, listed users only). Don't design as if there were a
  single hard-coded user, and don't assume a public audience exists yet.
- The PRD personas ("The Intentional Home Cook", "The Busy Household Choreographer",
  `stitch_mealcaster/mealcaster_product_requirements_document_prd.md`) describe that wider audience; they are a
  hypothesis, not observed users.

## Product Purpose

MealCaster takes the decision out of weeknight dinners: plan the week's dinners, cook from a clear recipe page, and
shop from a grocery list built from that plan. Success is a week where dinner is already decided, the shopping is one
trip with one list, and the recipe box keeps growing without being retyped anywhere else.

## Positioning

The household's data lives in **their own Google Sheet**, not in MealCaster: recipes, ingredients, the plan, the
grocery list and settings are readable, editable tabs the user owns (`drive.file` scope; no backend). The app is a
planning and cooking layer over that sheet, with two-way sync. A meal-kit or recipe-site planner can't truthfully
claim that ownership and transparency.

## Operating Context

The work splits by device:

- **Computer:** planning the week, browsing and editing recipes, managing ingredients, tags and the Sheets
  connection.
- **Phone (Home Screen app):** in the kitchen following a recipe (mise-en-place checklist, method steps, serving
  scaler) and at the store ticking off the grocery list. Print Checklist covers paper shopping.

Rituals and facts of use:

- A weekly cycle with a configurable first day (Saturday by default): fill the week (pick, Surprise Me, Auto-fill,
  Copy Previous Week), move meals between evenings, mark today done, shop from the week's list.
- Past days are history and never get overwritten.
- Google sign-in lasts about an hour and isn't stored; reconnecting happens quietly on the next click.
- Safari and Firefox tracking protection can block the Google Picker; Create New Sheet is the workaround.

## Capabilities and Constraints

- Screens: Weekly Planner (home), Recipe Catalog, Recipe Detail, Recipe Editor, Grocery List, Profile &
  Settings, Google Sheets connection (three steps) and Column Conflicts. Full behaviour in `repo/README.md`;
  decisions not to re-litigate in `HANDOFF.md`.
- Stack is fixed by the codebase: Svelte 5, Vite, Tailwind CSS 3, hash routing, static build on GitHub Pages, no
  server. Data cached in `localStorage` (~5 MB budget shared with other Pages sites).
- Sheet schema is versioned (`SCHEMA_VERSION` 2). Wording written to or parsed from the sheet lives in
  `sheetText.js` and can't change without an alias or migration; on-screen wording lives in `text.js`.
- Terminology: **At home** = you have it, so it stays off the grocery list (`On_Hand`); not "in stock", which could mean the store; **Pantry** is only an aisle. **Night off** = the evening is eaten out or from leftovers (menu item "Night Off").
  **Sheets as Backup** = device wins (push only); **Bidirectional** = sheet wins when both changed.
- Deliberately out of scope: Instacart export, calories, ratings, nutrition, inventory tracking beyond "at home".
- Recipe photos hotlink; missing or broken ones show a placeholder tile. Uploaded photos go to a Drive folder.
- Undecided: whether and how MealCaster opens to other users (OAuth verification, multi-user sharing). The PRD's
  post-MVP ideas (cooking mode, multi-store grocery routing, family sharing) are not committed.

## Brand Commitments

- **Name:** MealCaster.
- **Logo:** the culinary magician mark (`repo/public/logo-mark.png`, app icons in `repo/public/`; original in
  `stitch_mealcaster/mealcaster_logo/`).
- The current look (Warm Culinary Editorial, `stitch_mealcaster/warm_culinary_editorial/DESIGN.md`) is **evidence,
  not a commitment**: it may be refined or replaced.

## Evidence on Hand

- The live app and the owner's real recipe data in their Google Sheet (schema 2).
- Original mock screens (`stitch_mealcaster/*/screen.png` + `code.html`) and the PRD.
- Dev-only generated sample data (`repo/dev/samples/`), with TheMealDB photos in a gitignored cache. Those photos may
  not ship or appear in public material.
- **Absent:** outside users, testimonials, usage metrics, press, pricing. Don't invent any.

## Product Principles

1. **The sheet is theirs.** Every feature keeps the Google Sheet readable and owned by the user; never hide data in
   a format only MealCaster understands, and never break existing rows.
2. **Decide once, then just cook.** Reduce weeknight decisions: sensible defaults, one tap to fill or move a meal,
   Undo instead of confirmation where it's safe.
3. **Right device, right moment.** Planning depth on the computer; glanceable, one-handed use in the kitchen and the
   store on the phone.
4. **History stays true.** Past days and past grocery weeks are a record and never get rewritten by later changes.
5. **Small on purpose.** No calorie counts, ratings or inventory bloat; a feature earns its place by making the week
   easier.

## Accessibility & Inclusion

- Every pointer gesture needs a keyboard and screen-reader path (e.g. drag-to-move has Move to Another Day… as fallback).
- Recipe and ingredient text is multilingual (Vietnamese, Chinese dishes): accents are kept as typed and ignored when
  comparing or searching.
- No formal standard was set; treat WCAG 2.2 AA as the working floor.
