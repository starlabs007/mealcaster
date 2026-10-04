// Weekly plan state, shaped like the Google Sheets [WeeklyPlan] tab
// (Date_ISO → Recipe_ID_Assigned / Completed_Flag / Custom_Notes). Cached in
// localStorage; sync.svelte.js keeps it in step with the connected sheet.

import './settings.svelte.js'; // sets the week start day before the first week is computed
import { recipes, recipeById } from './recipes.svelte.js';
import { addDays, daysBetween, formatLong, fromISO, weekStartOf, toISO, weekDates } from './dates.js';
import { showToast } from './toast.svelte.js';
import { sampleData, storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';

const STORAGE_KEY = storageKey('weeklyPlan.v1');

/**
 * `notes` holds the sheet's Custom_Notes for that evening.
 * @typedef {{ recipeId?: string, diningOut?: boolean, completed?: boolean, notes?: string }} PlanEntry
 * @typedef {'completed' | 'missed' | 'planned' | 'diningOut' | 'open'} DayStatus
 */

const today = toISO(new Date());
const thisWeek = weekStartOf(new Date());

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
  // The sample plan points at sample recipes, which only exist in the sample dev build.
  return sampleData ? seedEntries() : {};
}

export const planner = $state({
  today,
  weekStart: thisWeek,
  /** @type {Record<string, PlanEntry>} */
  entries: load(),
});

$effect.root(() => {
  $effect(() => {
    // Quota / private-mode errors leave the plan working in memory (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(planner.entries));
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

/** Meals made within this many days count as recent (the catalog can hide them). */
export const RECENT_DAYS = 7;

// recipe id → how often and when it was last made: past days on the plan, plus today once marked done.
const madeIndex = $derived.by(() => {
  /** @type {Map<string, { last: string, count: number }>} */
  const index = new Map();
  for (const [iso, entry] of Object.entries(planner.entries)) {
    if (!entry?.recipeId || iso > planner.today || (iso === planner.today && !entry.completed)) continue;
    const made = index.get(entry.recipeId);
    if (made) {
      made.count += 1;
      if (iso > made.last) made.last = iso;
    } else index.set(entry.recipeId, { last: iso, count: 1 });
  }
  return index;
});

/** ISO date a recipe was last made, if ever. @param {string} recipeId */
export const lastMadeOn = (recipeId) => madeIndex.get(recipeId)?.last;

/** How many dinners on the plan were this recipe. @param {string} recipeId */
export const timesMade = (recipeId) => madeIndex.get(recipeId)?.count ?? 0;

/** Made within the last RECENT_DAYS days. @param {string} recipeId */
export function madeRecently(recipeId) {
  const iso = lastMadeOn(recipeId);
  return !!iso && daysBetween(iso, planner.today) <= RECENT_DAYS;
}

/** The day the planner should scroll to and briefly highlight (after a meal is picked in the catalog). */
export const spotlight = $state({ iso: '' });
const SPOTLIGHT_MS = 3000;
let spotlightTimer;

/** @param {string} iso */
export function spotlightDay(iso) {
  spotlight.iso = iso;
  clearTimeout(spotlightTimer);
  spotlightTimer = setTimeout(() => (spotlight.iso = ''), SPOTLIGHT_MS);
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
  return weekDates(weekStartOf(fromISO(iso)))
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

/**
 * Pick a random recipe from `pool`, preferring ones neither on the viewed week's menu nor
 * made in the last RECENT_DAYS days, then ones just not on the menu, then any.
 * @param {import('./data/recipes.js').Recipe[]} pool
 */
function pickRecipe(pool = recipes) {
  const used = new Set(weekDates(planner.weekStart).map((iso) => planner.entries[iso]?.recipeId));
  const tiers = [
    pool.filter((r) => !used.has(r.id) && !madeRecently(r.id)),
    pool.filter((r) => !used.has(r.id)),
    pool,
  ];
  const best = tiers.find((tier) => tier.length) ?? [];
  return best[Math.floor(Math.random() * best.length)];
}

/** Weeks from this week to the viewed one: 0 this week, 1 next week, -1 last week. */
export const weekOffset = () => Math.round(daysBetween(weekStartOf(new Date()), planner.weekStart) / 7);

/** Jump to this week (0), next week (1) and so on. @param {number} offset */
export function goToWeek(offset) {
  planner.weekStart = addDays(weekStartOf(new Date()), offset * 7);
}

export function shiftWeek(delta) {
  planner.weekStart = addDays(planner.weekStart, delta * 7);
}

export function goToThisWeek() {
  planner.weekStart = weekStartOf(new Date());
}

/** @param {string} iso @param {string} recipeId */
export function assignRecipe(iso, recipeId) {
  planner.entries[iso] = { recipeId };
}

const NO_RECIPES = 'Add a recipe to the catalog first.';

/**
 * @param {string} iso @param {import('./data/recipes.js').Recipe[]} [pool] e.g. the catalog's filtered results
 * @returns {import('./data/recipes.js').Recipe | undefined} undefined when there are no recipes yet
 */
export function surpriseMe(iso, pool) {
  const previous = planner.entries[iso] && { ...planner.entries[iso] };
  // Replacing a meal never "surprises" with the same one, unless it's the only choice.
  const candidates = (pool?.length ? pool : recipes).filter((r) => r.id !== previous?.recipeId);
  const recipe = pickRecipe(candidates.length ? candidates : pool?.length ? pool : recipes);
  if (!recipe) {
    showToast(NO_RECIPES);
    return undefined;
  }
  planner.entries[iso] = { recipeId: recipe.id };
  showToast(`Surprise! ${recipe.title}`, previous?.recipeId ? undoDay(iso, previous) : undefined);
  return recipe;
}

/** Toast action that puts a day back as it was. @param {string} iso @param {object | undefined} previous */
function undoDay(iso, previous) {
  return {
    label: 'Undo',
    run: () => {
      if (previous) planner.entries[iso] = previous;
      else delete planner.entries[iso];
    },
  };
}

/** @param {string} iso */
export function markDiningOut(iso) {
  const previous = planner.entries[iso]?.recipeId ? { ...planner.entries[iso] } : undefined;
  planner.entries[iso] = { diningOut: true };
  if (previous) showToast(`${formatLong(iso)} is now a night off.`, undoDay(iso, previous));
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
