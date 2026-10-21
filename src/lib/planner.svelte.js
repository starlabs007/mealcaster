// Weekly plan state, shaped like the Google Sheets [WeeklyPlan] tab
// (Date_ISO → Recipe_ID_Assigned / Completed_Flag / Custom_Notes). Cached in
// localStorage; sync.svelte.js keeps it in step with the connected sheet.

import './settings.svelte.js'; // sets the week start day before the first week is computed
import { recipes, recipeById } from './recipes.svelte.js';
import { addDays, daysBetween, formatLong, formatWeekday, fromISO, weekStartOf, toISO, weekDates } from './dates.js';
import { switchedEntries } from './switchDays.js';
import { copiedEntries, dayStatus, dinnerPool, resetDays, restoreDays, snapshotDays } from './planDays.js';
import { dismissToast, showToast, toast } from './toast.svelte.js';
import { text } from './text.js';
import { samples } from 'virtual:sample-data';
import { storageKey } from './env.js';
import { saveItem } from './storage.svelte.js';

const STORAGE_KEY = storageKey('weeklyPlan.v2');

/**
 * `notes` holds the sheet's Custom_Notes for that evening.
 * @typedef {{ recipeId?: string, diningOut?: boolean, completed?: boolean, notes?: string }} PlanEntry
 * @typedef {'completed' | 'missed' | 'planned' | 'diningOut' | 'open'} DayStatus
 */

const today = toISO(new Date());
const thisWeek = weekStartOf(new Date());

/** The sample plan (dev only), placed around this week. @returns {Record<string, PlanEntry>} */
function seedEntries() {
  /** @type {Record<string, PlanEntry>} */
  const entries = {};
  for (const { weekOffset, day, recipeId, diningOut } of samples.plan) {
    entries[addDays(thisWeek, weekOffset * 7 + day)] = diningOut ? { diningOut: true } : { recipeId };
  }
  return entries;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage unavailable or corrupt — fall back to the sample plan.
  }
  // Empty outside dev: the sample plan points at sample recipes.
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
    // Quota / private-mode errors leave the plan working in memory (storage.svelte.js notes it).
    saveItem(STORAGE_KEY, JSON.stringify(planner.entries));
  });
});

/**
 * Roll `planner.today` forward when the date changed while the page sat open. A viewer on the week
 * that was "this week" follows it into the new one.
 */
export function refreshToday() {
  const now = toISO(new Date());
  if (now === planner.today) return;
  const followed = planner.weekStart === weekStartOf(fromISO(planner.today));
  planner.today = now;
  if (followed) planner.weekStart = weekStartOf(new Date());
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refreshToday());
  window.addEventListener('focus', refreshToday);
  // A page left in view across midnight gets neither event; timers are throttled in the background, so also check on return.
  setInterval(refreshToday, 60_000);
}

// ── Derived views ──────────────────────────────────────────────────────────

/** @param {string} iso @returns {DayStatus} */
export function statusOf(iso) {
  return dayStatus(planner.entries[iso], iso, planner.today, (id) => recipeById.has(id));
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
    planned: days.filter((s) => s === 'completed' || s === 'planned').length,
    off: days.filter((s) => s === 'diningOut').length,
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
  const saved = snapshotDays(planner.entries, weekDates(planner.weekStart));
  return () => restoreDays(planner.entries, saved);
}

/**
 * Pick a random recipe from `pool`, preferring ones neither on the viewed week's menu nor
 * made in the last RECENT_DAYS days, then ones just not on the menu, then any.
 * @param {import('./data/recipes.js').Recipe[]} pool
 */
function pickRecipe(pool = dinnerPool(recipes)) {
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

// The planner's toasts (and their Undo) are about the viewed week, so they close when another week is shown.
let weekToastId = 0;

/** @param {string} message @param {import('./toast.svelte.js').ToastAction} [action] */
function showWeekToast(message, action) {
  weekToastId = showToast(message, action);
}

/** @param {string} weekStart */
function viewWeek(weekStart) {
  if (weekStart !== planner.weekStart && toast.id === weekToastId) dismissToast();
  planner.weekStart = weekStart;
}

/** Jump to this week (0), next week (1) and so on. @param {number} offset */
export function goToWeek(offset) {
  viewWeek(addDays(weekStartOf(new Date()), offset * 7));
}

export function shiftWeek(delta) {
  viewWeek(addDays(planner.weekStart, delta * 7));
}

export function goToThisWeek() {
  viewWeek(weekStartOf(new Date()));
}

/** @param {string} iso @param {string} recipeId */
export function assignRecipe(iso, recipeId) {
  planner.entries[iso] = { recipeId };
}

const NO_RECIPES = text.planner.toasts.noRecipes;

/**
 * @param {string} iso @param {import('./data/recipes.js').Recipe[]} [pool] e.g. the catalog's filtered results
 * @returns {import('./data/recipes.js').Recipe | undefined} undefined when there are no recipes yet
 */
export function surpriseMe(iso, pool) {
  const previous = planner.entries[iso] && { ...planner.entries[iso] };
  // Replacing a meal never "surprises" with the same one, unless it's the only choice.
  const candidates = (pool?.length ? pool : dinnerPool(recipes)).filter((r) => r.id !== previous?.recipeId);
  const recipe = pickRecipe(candidates.length ? candidates : pool?.length ? pool : dinnerPool(recipes));
  if (!recipe) {
    showWeekToast(NO_RECIPES);
    return undefined;
  }
  planner.entries[iso] = { recipeId: recipe.id };
  showWeekToast(text.planner.toasts.surprise(recipe.title), previous?.recipeId ? undoDay(iso, previous) : undefined);
  return recipe;
}

/** Toast action that puts a day back as it was. @param {string} iso @param {object | undefined} previous */
function undoDay(iso, previous) {
  return {
    label: text.common.undo,
    run: () => {
      if (previous) planner.entries[iso] = previous;
      else delete planner.entries[iso];
    },
  };
}

/** Mark today's meal done (or not done again); past days count as done on their own. @param {string} iso @param {boolean} done */
export function setDone(iso, done) {
  const entry = planner.entries[iso];
  if (!entry?.recipeId || iso !== planner.today) return;
  planner.entries[iso] = done ? { ...entry, completed: true } : (({ completed, ...rest }) => rest)(entry);
}

/** @param {string} iso */
export function markDiningOut(iso) {
  const previous = planner.entries[iso]?.recipeId ? { ...planner.entries[iso] } : undefined;
  planner.entries[iso] = { diningOut: true };
  if (previous) showWeekToast(text.planner.toasts.nightOff(formatLong(iso)), undoDay(iso, previous));
}

/** Days of `iso`'s week its meal can switch with: today onward, not finished, not `iso` itself. @param {string} iso */
export function switchTargets(iso) {
  return weekDates(weekStartOf(fromISO(iso))).filter(
    // statusOf keeps a past night off as 'diningOut', so the date check is needed too.
    (d) => d !== iso && d >= planner.today && ['planned', 'open', 'diningOut'].includes(statusOf(d)),
  );
}

/** Two evenings trade places, with an Undo toast. @param {string} a @param {string} b */
export function switchDays(a, b) {
  const before = { [a]: planner.entries[a], [b]: planner.entries[b] };
  const intoEmptyDay = !planner.entries[b];
  const put = (/** @type {Record<string, PlanEntry | undefined>} */ values) => {
    for (const [iso, entry] of Object.entries(values)) {
      if (entry) planner.entries[iso] = entry;
      else delete planner.entries[iso];
    }
  };
  put(switchedEntries(planner.entries, a, b));
  spotlightDay(b);
  const message = intoEmptyDay ? text.planner.toasts.moved(formatWeekday(b)) : text.planner.toasts.switched(formatWeekday(a), formatWeekday(b));
  showWeekToast(message, { label: text.common.undo, run: () => put(before) });
}

/** @param {string} iso */
export function clearDay(iso) {
  delete planner.entries[iso];
}

export function autoFillRemaining() {
  const open = editableDays().filter((iso) => statusOf(iso) === 'open');
  if (!open.length) return showWeekToast(text.planner.toasts.allPlanned);
  if (!recipes.length) return showWeekToast(NO_RECIPES);
  const undo = snapshotWeek();
  for (const iso of open) planner.entries[iso] = { recipeId: pickRecipe().id };
  showWeekToast(text.planner.toasts.filled(open.length), { label: text.common.undo, run: undo });
}

/** Fills open upcoming evenings from last week; planned and finished ones stay as they are. */
export function copyLastWeek() {
  if (!editableDays().some((iso) => statusOf(iso) === 'open')) return showWeekToast(text.planner.toasts.allPlanned);
  const changes = copiedEntries(planner.entries, weekDates(planner.weekStart), planner.today, statusOf);
  const count = Object.keys(changes).length;
  if (!count) return showWeekToast(text.planner.toasts.noLastWeek);
  const undo = snapshotWeek();
  Object.assign(planner.entries, changes);
  showWeekToast(text.planner.toasts.copied(count), { label: text.common.undo, run: undo });
}

/** Wipes upcoming assignments; finished dinners, today's included, stay as history. */
export function resetWeek() {
  const targets = resetDays(planner.entries, weekDates(planner.weekStart), planner.today, statusOf);
  if (!targets.length) return showWeekToast(text.planner.toasts.nothingToReset);
  const undo = snapshotWeek();
  for (const iso of targets) delete planner.entries[iso];
  showWeekToast(text.planner.toasts.reset(targets.length), { label: text.common.undo, run: undo });
}

/** Replaces the whole plan (used by Google Sheets sync). @param {Record<string, PlanEntry>} entries */
export function replacePlan(entries) {
  planner.entries = entries;
}
