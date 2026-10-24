// Weekly plan state, shaped like the Google Sheets [WeeklyPlan] tab
// (Date_ISO → Recipe_ID_Assigned / Completed_Flag / Custom_Notes). Cached in
// localStorage; sync.svelte.js keeps it in step with the connected sheet.

import './settings.svelte.js'; // sets the week start day before the first week is computed
import { recipes, recipeById } from './recipes.svelte.js';
import { addDays, daysBetween, formatLong, formatWeekday, formatWeekdayShort, fromISO, weekStartOf, toISO, weekDates } from './dates.js';
import { switchedEntries } from './switchDays.js';
import { remindersOn } from './headsUps.js';
import { copiedEntries, dayStatus, dinnerPool, pickTier, resetDays, restoreDays, snapshotDays } from './planDays.js';
import { createUndoSlot, firstTooSoon, madeIndex as buildMadeIndex, nextPlannedAfter as nextWithRecipe, rollToday, summarize, switchTargets as targetsFor, weekOffset as offsetBetween } from './plannerState.js';
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
  const rolled = rollToday(planner, toISO(new Date()));
  planner.today = rolled.today;
  planner.weekStart = rolled.weekStart;
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
const madeIndex = $derived(buildMadeIndex(planner.entries, planner.today));

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
export const spotlight = $state({ days: /** @type {string[]} */ ([]) });
const SPOTLIGHT_MS = 3000;
let spotlightTimer;

/** @param {string | string[]} days */
export function spotlightDay(days) {
  spotlight.days = [days].flat();
  clearTimeout(spotlightTimer);
  spotlightTimer = setTimeout(() => (spotlight.days = []), SPOTLIGHT_MS);
}

/** The recipe planned for an evening, if any (a night off has none). @param {string} iso */
const dinnerOn = (iso) => recipeById.get(planner.entries[iso]?.recipeId ?? '');

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
      reminders: remindersOn(iso, planner.today, dinnerOn),
    };
  });
}

/** Summary for the header pill: dinners covered and open slots still plannable. */
export function weekSummary() {
  return summarize(weekDates(planner.weekStart).map(statusOf));
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
  const next = nextWithRecipe(iso, weekDates(weekStartOf(fromISO(iso))), (d) => recipeById.has(planner.entries[d]?.recipeId ?? ''));
  return next && { iso: next, recipe: recipeById.get(planner.entries[next].recipeId) };
}

// ── Actions ────────────────────────────────────────────────────────────────

const editableDays = () => weekDates(planner.weekStart).filter((iso) => iso >= planner.today);

/** Snapshot the viewed week so a bulk action can be undone from its toast. */
function snapshotWeek() {
  const saved = snapshotDays(planner.entries, weekDates(planner.weekStart));
  return () => restoreDays(planner.entries, saved);
}

/**
 * Pick a random recipe from `pool` for `iso`, from the best tier pickTier finds (planDays.js: not on the menu, not
 * made recently, heads-up still in time).
 * @param {string} iso @param {import('./data/recipes.js').Recipe[]} pool
 */
function pickRecipe(iso, pool = dinnerPool(recipes)) {
  const used = new Set(weekDates(planner.weekStart).map((d) => planner.entries[d]?.recipeId));
  const best = pickTier(pool, iso, planner.today, { used, madeRecently });
  return best[Math.floor(Math.random() * best.length)];
}

/** Weeks from this week to the viewed one: 0 this week, 1 next week, -1 last week. */
export const weekOffset = () => offsetBetween(weekStartOf(new Date()), planner.weekStart);

// The planner's toasts (and their Undo) are about the viewed week, so they close when another week is shown.
let weekToastId = 0;
// Undo stays up longer after a change to several evenings.
const BULK_UNDO_MS = 10_000;

// The last change that can still be taken back: by its toast's Undo, or by Cmd/Ctrl+Z after the toast has gone.
const lastChange = createUndoSlot();

/** @param {string} message @param {import('./toast.svelte.js').ToastAction} [action] @param {number} [duration] ms */
function showWeekToast(message, action, duration) {
  if (action) {
    const run = action.run;
    lastChange.remember(message, run);
    action = { ...action, shortcut: true, run: () => (lastChange.forget(), run()) };
  }
  weekToastId = showToast(message, action, duration);
}

/** Takes back the last planner change and says so (Cmd/Ctrl+Z); with none, says that. */
export function undoLastChange() {
  const change = lastChange.take();
  if (!change) {
    showWeekToast(text.planner.toasts.nothingToUndo);
    return true;
  }
  const { message, run } = change;
  run();
  showWeekToast(text.planner.toasts.undone(message));
  return true;
}

/**
 * Makes a change that shows no Undo toast the one Cmd/Ctrl+Z takes back.
 * @param {string} message @param {string} iso day it touched
 * @param {object} [before] the day as it was, when the change has already been made
 */
function rememberDay(message, iso, before = planner.entries[iso]) {
  const saved = { [iso]: before };
  lastChange.remember(message, () => restoreDays(planner.entries, saved));
}

/** A change without Undo, another week or leaving the planner ends what Cmd/Ctrl+Z can take back. */
export function forgetLastChange() {
  lastChange.forget();
}

/** @param {string} weekStart */
function viewWeek(weekStart) {
  if (weekStart !== planner.weekStart) {
    if (toast.id === weekToastId) dismissToast();
    forgetLastChange();
  }
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

/**
 * " Hummus needs a day’s notice: Soak the chickpeas overnight." when the meal now planned on one of `days` leaves no
 * time for one of its heads-ups (the day to do it has gone), else ''. Goes on the toast of whatever planned it.
 * @param {...string} days
 */
export function tooSoonNote(...days) {
  const late = firstTooSoon(days, (iso) => recipeById.get(planner.entries[iso]?.recipeId ?? ''), planner.today);
  return late ? text.common.headsUps.tooSoon(late.recipe.shortTitle || late.recipe.title, late.missed.daysBefore, late.missed.text) : '';
}

/** @param {string} message @param {string} note from tooSoonNote */
const withNote = (message, note) => (note ? `${message} ${note}` : message);

/** @param {string} iso @param {string} recipeId */
export function assignRecipe(iso, recipeId) {
  rememberDay(text.planner.toasts.assigned(formatWeekday(iso), recipeById.get(recipeId)?.title ?? ''), iso);
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
  const recipe = pickRecipe(iso, candidates.length ? candidates : pool?.length ? pool : dinnerPool(recipes));
  if (!recipe) {
    showWeekToast(NO_RECIPES);
    return undefined;
  }
  planner.entries[iso] = { recipeId: recipe.id };
  spotlightDay(iso);
  showWeekToast(withNote(text.planner.toasts.surpriseOn(formatWeekday(iso), recipe.title), tooSoonNote(iso)), undoDay(iso, previous));
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
  const previous = { ...entry };
  planner.entries[iso] = done ? { ...entry, completed: true } : (({ completed, ...rest }) => rest)(entry);
  // Done says so, with an Undo; taking it back (the button, or Cmd/Ctrl+Z) is the undo itself, so it stays quiet.
  if (done) showWeekToast(text.planner.toasts.markedDone(formatWeekday(iso), titleOn(iso)), undoDay(iso, previous));
  else rememberDay(text.planner.toasts.markedNotDone(formatWeekday(iso), titleOn(iso)), iso, previous);
}

/** @param {string} iso */
export function markDiningOut(iso) {
  const previous = planner.entries[iso] && { ...planner.entries[iso] };
  planner.entries[iso] = { diningOut: true };
  showWeekToast(text.planner.toasts.nightOff(formatLong(iso)), undoDay(iso, previous));
}

/** Days of `iso`'s week its meal can switch with: today onward, not finished, not `iso` itself. @param {string} iso */
export function switchTargets(iso) {
  return targetsFor(iso, weekDates(weekStartOf(fromISO(iso))), planner.today, statusOf);
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
  showWeekToast(withNote(message, tooSoonNote(b, a)), { label: text.common.undo, run: () => put(before) });
}

/** @param {string} iso */
export function clearDay(iso) {
  rememberDay(text.planner.toasts.nightOffEnded(formatWeekday(iso)), iso);
  delete planner.entries[iso];
}

/** Puts a planned evening back to open, with an Undo toast. @param {string} iso */
export function clearEvening(iso) {
  const previous = planner.entries[iso] && { ...planner.entries[iso] };
  clearDay(iso);
  showWeekToast(text.planner.toasts.cleared(formatWeekday(iso)), undoDay(iso, previous));
}

/** Title of the meal planned on a day. @param {string} iso */
const titleOn = (iso) => recipeById.get(planner.entries[iso]?.recipeId ?? '')?.title ?? '';

export function autoFillRemaining() {
  const open = editableDays().filter((iso) => statusOf(iso) === 'open');
  if (!open.length) return showWeekToast(text.planner.toasts.allPlanned);
  if (!recipes.length) return showWeekToast(NO_RECIPES);
  const undo = snapshotWeek();
  for (const iso of open) planner.entries[iso] = { recipeId: pickRecipe(iso).id };
  spotlightDay(open);
  const message =
    open.length === 1 ? text.planner.toasts.filledOne(formatWeekday(open[0]), titleOn(open[0])) : text.planner.toasts.filled(open.map(formatWeekdayShort));
  showWeekToast(withNote(message, tooSoonNote(...open)), { label: text.common.undo, run: undo }, BULK_UNDO_MS);
}

/** Fills open upcoming evenings from last week; planned and finished ones stay as they are. */
export function copyLastWeek() {
  if (!editableDays().some((iso) => statusOf(iso) === 'open')) return showWeekToast(text.planner.toasts.allPlanned);
  const changes = copiedEntries(planner.entries, weekDates(planner.weekStart), planner.today, statusOf);
  const copied = Object.keys(changes).sort();
  if (!copied.length) return showWeekToast(text.planner.toasts.noLastWeek);
  const undo = snapshotWeek();
  Object.assign(planner.entries, changes);
  spotlightDay(copied);
  const message =
    copied.length === 1 ? text.planner.toasts.copiedOne(formatWeekday(copied[0]), titleOn(copied[0])) : text.planner.toasts.copied(copied.map(formatWeekdayShort));
  showWeekToast(withNote(message, tooSoonNote(...copied)), { label: text.common.undo, run: undo }, BULK_UNDO_MS);
}

const resetTargets = () => resetDays(planner.entries, weekDates(planner.weekStart), planner.today, statusOf);

/** How many evenings Reset Week would clear (its menu item says so, and hides at 0). */
export const resetCount = () => resetTargets().length;

/** Wipes upcoming assignments; finished dinners, today's included, stay as history. */
export function resetWeek() {
  const targets = resetTargets();
  if (!targets.length) return;
  const undo = snapshotWeek();
  for (const iso of targets) delete planner.entries[iso];
  showWeekToast(text.planner.toasts.reset(targets.length), { label: text.common.undo, run: undo }, BULK_UNDO_MS);
}

/** Replaces the whole plan (used by Google Sheets sync). @param {Record<string, PlanEntry>} entries */
export function replacePlan(entries) {
  forgetLastChange();
  planner.entries = entries;
}
