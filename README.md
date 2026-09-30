# MealCaster

Weekly dinner menu planner — plan, prep and shop for the week's dinners.
Built with **Svelte 5 + Vite + Tailwind CSS**, deployed as a static site to GitHub Pages.

> Status: the **Weekly Dinner Menu Planner** (home screen) is implemented. Recipe Catalog,
> Recipe Detail, Grocery List and Google Sheets Sync are placeholders ("coming soon" toasts).

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

The plan is saved in `localStorage` (key `mealcaster.weeklyPlan.v1`) in the same shape as the
Google Sheets `[WeeklyPlan]` tab; clear that key to restore the sample week.

## Project layout

```
src/
  App.svelte                 app shell (header, main, footer, toast)
  routes/WeeklyPlanner.svelte
  lib/
    planner.svelte.js        weekly plan state + actions (Svelte runes)
    toast.svelte.js
    dates.js
    data/recipes.js          sample [Recipes] data
    data/slotPrompts.js      copy for open dinner slots
    components/              AppHeader, AppFooter, PlannerHeader, DayCard, ...
```

## Deploying

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
Enable it once in the repo under **Settings → Pages → Source: GitHub Actions**.
The Vite `base` is relative (`./`), so the site works from the `/<repo>/` sub-path.
