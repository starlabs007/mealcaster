// Weekly plan state, shaped like the Google Sheets [WeeklyPlan] tab
// (Date_ISO → Recipe_ID_Assigned / Completed_Flag). Persisted to localStorage
// until the two-way Sheets sync is built.

import { recipes, recipeById } from './data/recipes.js';
import { addDays, mondayOf, toISO, weekDates } from './dates.js';
import { showToast } from './toast.svelte.js';

const STORAGE_KEY = 'mealcaster.weeklyPlan.v1';

/**
 * @typedef {{ recipeId?: string, diningOut?: boolean, completed?: boolean }} PlanEntry
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
    'roast-chicken', 'lentil-dal', 'miso-eggplant', 'tuscan-ragu', 'sourdough-pizza', 'out', 'short-ribs',
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
  return seedEntries();
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
  if (entry?.recipeId) return past || entry.completed ? 'completed' : 'planned';
  if (entry?.diningOut) return 'diningOut';
  return past ? 'missed' : 'open';
}

export function currentWeek() {
  return weekDates(planner.weekStart).map((iso, weekday) => {
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

/** Unbought grocery items: ingredients of every upcoming dinner in the viewed week. */
export function groceryCount() {
  return currentWeek()
    .filter((d) => d.status === 'planned')
    .reduce((n, d) => n + (d.recipe?.ingredients.length ?? 0), 0);
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

/** @param {string} iso */
export function surpriseMe(iso) {
  const recipe = pickRecipe();
  planner.entries[iso] = { recipeId: recipe.id };
  showToast(`Surprise! ${recipe.title}`);
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
