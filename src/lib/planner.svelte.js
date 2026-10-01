// Weekly plan state, shaped like the Google Sheets [WeeklyPlan] tab
// (Date_ISO → Recipe_ID_Assigned / Completed_Flag / Custom_Notes). Cached in
// localStorage; sync.svelte.js keeps it in step with the connected sheet.

import { recipes, recipeById } from './recipes.svelte.js';
import { addDays, fromISO, mondayOf, toISO, weekDates } from './dates.js';
import { showToast } from './toast.svelte.js';

const STORAGE_KEY = 'mealcaster.weeklyPlan.v1';

/**
 * `notes` holds the sheet's Custom_Notes for that evening.
 * @typedef {{ recipeId?: string, diningOut?: boolean, completed?: boolean, notes?: string }} PlanEntry
 * @typedef {'completed' | 'missed' | 'planned' | 'diningOut' | 'open'} DayStatus
 */

const today = toISO(new Date());
const thisWeek = mondayOf(new Date());

/** @returns {Record<string, PlanEntry>} */
function seedEntries() {
  /** @type {Record<string, PlanEntry>} */
  const entries = {};
  const assign = (weekStart, ids) =>
    ids.forEach((id, i) => {
      if (id === 'out') entries[addDays(weekStart, i)] = { diningOut: true };
      else if (id) entries[addDays(weekStart, i)] = { recipeId: id };
    });

  assign(addDays(thisWeek, -7), [
    'sheet-pan-chicken', 'lentil-dal', 'miso-eggplant', 'tuscan-ragu', 'sourdough-pizza', 'out', 'short-ribs',
  ]);
  assign(thisWeek, ['salmon-risotto', 'poblano-enchiladas', null, 'tuscan-ragu', 'sourdough-pizza', null, null]);
  return entries;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage unavailable or corrupt — fall back to the sample plan.
  }
  // The sample plan points at sample recipes, which only exist in development.
  return import.meta.env.DEV ? seedEntries() : {};
}

export const planner = $state({
  today,
  weekStart: thisWeek,
  /** @type {Record<string, PlanEntry>} */
  entries: load(),
});

$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(planner.entries);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {
      // Ignore quota / private-mode errors; the plan still works in memory.
    }
  });
});

// ── Derived views ──────────────────────────────────────────────────────────

/** @param {string} iso @returns {DayStatus} */
export function statusOf(iso) {
  const entry = planner.entries[iso];
  const past = iso < planner.today;
  // Ignore assignments whose recipe no longer exists in the pool.
  if (entry?.recipeId && recipeById.has(entry.recipeId)) return past || entry.completed ? 'completed' : 'planned';
  if (entry?.diningOut) return 'diningOut';
  return past ? 'missed' : 'open';
}

/** Days of the viewed week (or of `weekStart`). */
export function currentWeek(weekStart = planner.weekStart) {
  return weekDates(weekStart).map((iso, weekday) => {
    const recipeId = planner.entries[iso]?.recipeId;
    return {
      iso,
      weekday,
      isToday: iso === planner.today,
      isPast: iso < planner.today,
      status: statusOf(iso),
      recipe: recipeId ? recipeById.get(recipeId) : undefined,
    };
  });
}

/** Summary for the header pill: dinners covered and open slots still plannable. */
export function weekSummary() {
  const days = weekDates(planner.weekStart).map(statusOf);
  return {
    planned: days.filter((s) => s === 'completed' || s === 'planned' || s === 'diningOut').length,
    open: days.filter((s) => s === 'open').length,
  };
}

/** First plannable open slot in the viewed week (today onward), if any. */
export function firstOpenDay() {
  return weekDates(planner.weekStart).find((iso) => statusOf(iso) === 'open');
}

/** The viewed-week day a recipe is assigned to, if any. */
export function dayOfRecipe(recipeId) {
  return weekDates(planner.weekStart).find((iso) => planner.entries[iso]?.recipeId === recipeId);
}

/** Next day after `iso` in its week that has a recipe assigned. */
export function nextPlannedAfter(iso) {
  return weekDates(mondayOf(fromISO(iso)))
    .filter((d) => d > iso && recipeById.has(planner.entries[d]?.recipeId ?? ''))
    .map((d) => ({ iso: d, recipe: recipeById.get(planner.entries[d].recipeId) }))[0];
}

// ── Actions ────────────────────────────────────────────────────────────────

const editableDays = () => weekDates(planner.weekStart).filter((iso) => iso >= planner.today);

/** Snapshot the viewed week so a bulk action can be undone from its toast. */
function snapshotWeek() {
  const dates = weekDates(planner.weekStart);
  const saved = Object.fromEntries(dates.map((iso) => [iso, planner.entries[iso]]));
  return () => {
    for (const iso of dates) {
      if (saved[iso]) planner.entries[iso] = saved[iso];
      else delete planner.entries[iso];
    }
  };
}

/** Pick a recipe, preferring ones not already on the viewed week's menu. */
function pickRecipe(exclude = new Set()) {
  const used = new Set(weekDates(planner.weekStart).map((iso) => planner.entries[iso]?.recipeId));
  const fresh = recipes.filter((r) => !used.has(r.id) && !exclude.has(r.id));
  const pool = fresh.length ? fresh : recipes.filter((r) => !exclude.has(r.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shiftWeek(delta) {
  planner.weekStart = addDays(planner.weekStart, delta * 7);
}

export function goToThisWeek() {
  planner.weekStart = mondayOf(new Date());
}

/** @param {string} iso @param {string} recipeId */
export function assignRecipe(iso, recipeId) {
  planner.entries[iso] = { recipeId };
}

const NO_RECIPES = 'Add a recipe to the catalog first.';

/**
 * @param {string} iso @param {import('./data/recipes.js').Recipe[]} [pool]
 * @returns {import('./data/recipes.js').Recipe | undefined} undefined when there are no recipes yet
 */
export function surpriseMe(iso, pool) {
  const recipe = pool?.length ? pool[Math.floor(Math.random() * pool.length)] : pickRecipe();
  if (!recipe) {
    showToast(NO_RECIPES);
    return undefined;
  }
  planner.entries[iso] = { recipeId: recipe.id };
  showToast(`Surprise! ${recipe.title}`);
  return recipe;
}

/** @param {string} iso */
export function markDiningOut(iso) {
  planner.entries[iso] = { diningOut: true };
}

/** @param {string} iso */
export function clearDay(iso) {
  delete planner.entries[iso];
}

export function autoFillRemaining() {
  const open = editableDays().filter((iso) => statusOf(iso) === 'open');
  if (!open.length) return showToast('Every dinner this week is already planned.');
  if (!recipes.length) return showToast(NO_RECIPES);
  const undo = snapshotWeek();
  for (const iso of open) planner.entries[iso] = { recipeId: pickRecipe().id };
  showToast(`Filled ${open.length} open ${open.length === 1 ? 'slot' : 'slots'}.`, { label: 'Undo', run: undo });
}

export function copyLastWeek() {
  const targets = editableDays();
  const sources = targets.map((iso) => planner.entries[addDays(iso, -7)]);
  if (!sources.some(Boolean)) return showToast('No dinners were planned last week.');
  const undo = snapshotWeek();
  targets.forEach((iso, i) => {
    const src = sources[i];
    if (src) planner.entries[iso] = { recipeId: src.recipeId, diningOut: src.diningOut };
    else delete planner.entries[iso];
  });
  showToast('Copied last week’s dinners.', { label: 'Undo', run: undo });
}

/** Wipes upcoming assignments; finished dinners stay as history. */
export function resetWeek() {
  const targets = editableDays().filter((iso) => planner.entries[iso]);
  if (!targets.length) return showToast('Nothing to reset — this week is already clear.');
  const undo = snapshotWeek();
  for (const iso of targets) delete planner.entries[iso];
  showToast('Weekly plan reset.', { label: 'Undo', run: undo });
}

/** Replaces the whole plan (used by Google Sheets sync). @param {Record<string, PlanEntry>} entries */
export function replacePlan(entries) {
  planner.entries = entries;
}
