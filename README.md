# MealCaster

Weekly dinner menu planner — plan, prep and shop for the week's dinners.
Built with **Svelte 5 + Vite + Tailwind CSS**, deployed as a static site to GitHub Pages.

> Status: **Weekly Dinner Menu Planner**, **Recipe Catalog** and **Recipe Detail** are implemented.
> Quick Grocery List and Google Sheets Sync are still placeholders ("coming soon" toasts).

## Run it locally

Requires Node 18.18+ (`.nvmrc` pins 18).

```bash
nvm use
npm install
npm run dev        # http://localhost:5173
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

## Local data

Until the Google Sheets sync exists, state lives in `localStorage`; clear these keys to reset:

| Key | Mirrors |
| --- | --- |
| `mealcaster.weeklyPlan.v1` | `[WeeklyPlan]` tab |
| `mealcaster.favorites.v1` | `Favorite_Flag` column of `[Recipes]` |
| `mealcaster.groceryExtras.v1` | ingredients pushed manually to the grocery list |

The grocery badge counts non-staple ingredients of this week's upcoming dinners plus anything pushed
from a Recipe Detail page.

## Project layout

```
src/
  App.svelte                 app shell + hash routes
  routes/
    WeeklyPlanner.svelte     #/
    Catalog.svelte           #/catalog
    RecipeDetail.svelte      #/recipe/:id
  lib/
    router.svelte.js         hash router (works on GitHub Pages)
    planner.svelte.js        weekly plan state + actions (Svelte runes)
    grocery.svelte.js        grocery list model
    favorites.svelte.js
    toast.svelte.js
    dates.js
    data/recipes.js          [Recipes] data, filters, tag metadata
    data/slotPrompts.js      copy for open dinner slots
    components/              AppHeader, DayCard, RecipeCard, ...
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
Enable it once in the repo under **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is relative (`./`), so the site works from the `/<repo>/` sub-path.
