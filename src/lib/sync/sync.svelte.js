// Google Sheets sync: connecting, choosing the spreadsheet, and running sync
// passes (on connect, when the app regains focus, after edits when Instant
// Push is on, and from the Sync Now button). A newly linked spreadsheet's first
// sync is started from the connection screen; the automatic ones wait for it. The sheet is the source of truth;
// this device's data is a cache plus edits waiting to be pushed.

import { flushSync } from 'svelte';
import { googleConfigured } from '../google/config.js';
import { auth, checkToken, currentToken, prepareAuth, signIn, signOut } from '../google/auth.svelte.js';
import { createSpreadsheet, ensurePhotoFolder, getAccount, isPhotoDataUrl, sheetsApi, uploadPhoto } from '../google/api.js';
import { pickSpreadsheet, preparePicker } from '../google/picker.js';
import { sheets, updateSheetsSettings } from '../sheets.svelte.js';
import { recipes, replaceRecipes, saveRecipe } from '../recipes.svelte.js';
import { addIngredient, findIngredient, ingredientOf, ingredients, replaceIngredients } from '../ingredients.svelte.js';
import { favorites, setFavorites } from '../favorites.svelte.js';
import { planner, replacePlan } from '../planner.svelte.js';
import { grocery, groceryLines, replaceGrocery, stockHiddenLines, thisWeekStart } from '../grocery.svelte.js';
import { AISLE_OF_DEPT } from '../groceryList.js';
import { settings, replaceSettings } from '../settings.svelte.js';
import { realignWeeks } from '../weekStart.svelte.js';
import { weekStartOf } from '../dates.js';
import { showToast } from '../toast.svelte.js';
import { text } from '../text.js';
import { storageKey } from '../env.js';
import { allSaved } from '../storage.svelte.js';
import { settingsFromRows, settingsToRows } from './codec.js';
import { applyGrocery, applyIngredients, applyPlan, applyRecipes, ingredientRows, planRows, provisionRows, recipeRows } from './deviceMerge.js';
import { errorMessage, versionMessage } from './errors.js';
import {
  canStoreBase,
  groceryWeeks,
  mergeQueued,
  provisionsSince,
  PUSH_DELAY_MS,
  shouldRunPush,
  shouldSchedulePush,
  shouldSyncOnFocus,
} from './schedule.js';
import { emptyBase, runSync } from './run.js';
import { SCHEMA_VERSION } from '../schema.js';
import { PHASE_LOOK, phaseOf } from './phase.js';

/** @typedef {import('../schema.js').TabKey} TabKey */
/** @typedef {import('./run.js').SyncBase} SyncBase */
/** @typedef {import('./run.js').Counts} Counts */

// v2 with schema version 2: a base from the old layout must never be compared with new rows.
const BASE_KEY = storageKey('syncBase.v2');

/** @typedef {import('./phase.js').SyncPhase} SyncPhase */
export const syncState = $state({
  busy: false,
  /** Last pass finished: when, and what it did. */
  lastSyncedAt: /** @type {string | null} */ (null),
  /** Problem to show, if the last pass failed. */
  error: '',
  /** Columns that stop sync until resolved on the Column Conflicts screen. */
  conflict: /** @type {{ tab: TabKey, columns: string[] } | null} */ (null),
  /** First sync with data on both sides: what each side holds. */
  choice: /** @type {{ sheet: Counts, device: Counts, backup: boolean } | null} */ (null),
  account: /** @type {{ name: string, email: string, photo: string } | null} */ (null),
});

/** @returns {SyncPhase} */
export function syncPhase() {
  return phaseOf({
    configured: googleConfigured,
    busy: syncState.busy,
    spreadsheet: sheets.spreadsheet,
    token: auth.token,
    choice: syncState.choice,
    conflict: syncState.conflict,
    error: syncState.error,
    initialized: initialized(),
  });
}

export { PHASE_LOOK };

// ---- Base (fingerprints as of the last sync) --------------------------------

/** @returns {SyncBase & { lastSyncedAt?: string }} */
function loadBase() {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Start over: the next pass merges.
  }
  return emptyBase(sheets.spreadsheet);
}

// Raw state so pages that ask what's on the sheet update after each pass.
const initialBase = loadBase();
let base = $state.raw(initialBase);
syncState.lastSyncedAt = initialBase.lastSyncedAt ?? null;

function saveBase(next) {
  base = { ...next, lastSyncedAt: syncState.lastSyncedAt };
  // The stored base must never get ahead of the stored data. If a store didn't fit, a reload
  // brings back older data, and a newer base would read the difference as edits made here and
  // push it over the sheet. Kept in memory only, the stored base stays older than the data, and
  // the next pass after a reload lets the sheet win those rows. (An empty base is always safe.)
  if (!canStoreBase({ initialized: next.initialized, allSaved: allSaved() })) return;
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
  } catch {
    // Without a saved base the next pass is a merge, which is still safe.
  }
}

/** Whether the linked spreadsheet has had its first sync. */
export const initialized = () => base.initialized && base.spreadsheetId === sheets.spreadsheet;

/**
 * Name of the tab that held this row at the last sync, or '' if it wasn't on
 * the connected sheet. @param {TabKey} tab @param {string} key
 */
export function sheetTabOf(tab, key) {
  if (!base.initialized || base.spreadsheetId !== sheets.spreadsheet) return '';
  const synced = base.tabs[tab];
  return synced && key in synced.rows ? synced.name : '';
}

// ---- The device side ----------------------------------------------------------

// Order matters: each tab is applied before the next reads the device, and recipe lines and grocery
// rows need the ingredients.
const syncedTabs = () =>
  /** @type {{ key: TabKey, name: string }[]} */ (
    [
      { key: 'ingredients', name: sheets.tabs.ingredients.trim() },
      { key: 'recipes', name: sheets.tabs.recipes.trim() },
      { key: 'weeklyPlan', name: sheets.tabs.weeklyPlan.trim() },
      sheets.syncProvisions && { key: 'provisions', name: sheets.tabs.provisions.trim() },
      { key: 'settings', name: sheets.tabs.settings.trim() },
    ].filter(Boolean)
  );

const today = () => planner.today;

/** @type {import('./run.js').LocalAdapter} */
const device = {
  localRows(tab) {
    if (tab === 'ingredients') return ingredientRows($state.snapshot(ingredients));
    if (tab === 'recipes') return recipeRows($state.snapshot(recipes), favorites.ids);
    if (tab === 'weeklyPlan') return planRows($state.snapshot(planner.entries));
    if (tab === 'settings') return settingsToRows($state.snapshot(settings));
    return provisionRows(groceryWeeks(Object.keys(grocery.weeks)).map((week) => ({ week, lines: groceryLines(week), hidden: stockHiddenLines(week) })));
  },

  apply(tab, final, fromSheet, columns) {
    // Nothing came from the sheet: the device already holds the result.
    if (!fromSheet.size) return;
    if (tab === 'ingredients') {
      replaceIngredients(applyIngredients({ final, fromSheet, existing: $state.snapshot(ingredients), columns }));
    } else if (tab === 'recipes') {
      const next = applyRecipes({ final, fromSheet, existing: $state.snapshot(recipes), favorites: $state.snapshot(favorites.ids), columns, today: today() });
      replaceRecipes(next.recipes);
      setFavorites(next.favorites);
    } else if (tab === 'weeklyPlan') {
      replacePlan(applyPlan({ final, fromSheet, entries: $state.snapshot(planner.entries), columns }));
    } else if (tab === 'settings') {
      const wasThisWeek = planner.weekStart === weekStartOf(new Date());
      replaceSettings(settingsFromRows([...final.values()]));
      realignWeeks(wasThisWeek);
    } else {
      // A row typed into the sheet names its item: that ingredient, or a new one in the row's department.
      const idForName = (name, dept) => findIngredient(name)?.id ?? addIngredient({ name, aisle: AISLE_OF_DEPT[dept] }).id;
      const { weeks, every } = applyGrocery({
        final,
        since: provisionsSince(),
        thisWeek: thisWeekStart(),
        idForName,
        weeks: $state.snapshot(grocery.weeks),
        every: $state.snapshot(grocery.every),
      });
      replaceGrocery(weeks, every);
    }
  },
};

/** Everything a sync pass looks at, as one string — to notice edits. */
const deviceFingerprint = () =>
  JSON.stringify([ingredients, recipes, favorites.ids, planner.entries, grocery.weeks, grocery.every, settings, syncedTabs(), sheets.direction]);

// ---- Sync passes ----------------------------------------------------------------

let running = null;
/** Options for a pass requested while another was running (a person's choice must not be lost). */
let again = null;
let lastFingerprint = '';

/** Uploads photos added on this device to Drive, so every device can show them. */
async function uploadPendingPhotos() {
  const pending = recipes.filter((r) => isPhotoDataUrl(r.image));
  if (!pending.length) return;
  const folder = await ensurePhotoFolder(sheets.photosFolderId);
  if (folder !== sheets.photosFolderId) updateSheetsSettings({ photosFolderId: folder });
  for (const recipe of pending) {
    const url = await uploadPhoto(recipe.image, `${recipe.title}.jpg`, folder);
    const current = recipes.find((r) => r.id === recipe.id);
    // Skip if it was edited again meanwhile; the next pass picks it up.
    if (current?.image === recipe.image) saveRecipe({ ...$state.snapshot(current), image: url });
  }
}

/**
 * Runs a sync pass now (or right after the current one).
 * @param {{ choice?: 'merge' | 'sheetOnly' | 'confirm', quiet?: boolean }} [options]
 */
export function syncNow(options = {}) {
  // A token that ran out shows as Reconnect rather than leaving Sync Now doing nothing.
  if (!googleConfigured || !sheets.spreadsheet || !checkToken()) return Promise.resolve();
  if (running) {
    again = mergeQueued(again, options);
    return running;
  }
  running = (async () => {
    syncState.busy = true;
    try {
      if (base.spreadsheetId !== sheets.spreadsheet) saveBase(emptyBase(sheets.spreadsheet));
      await uploadPendingPhotos();
      const result = await runSync({
        api: sheetsApi,
        spreadsheetId: sheets.spreadsheet,
        tabs: syncedTabs(),
        schemaCheck: $state.snapshot(sheets.schemaCheck) ?? {},
        autoAppendOptional: sheets.autoAppendOptional,
        direction: sheets.direction,
        base,
        choice: options.choice,
        local: device,
        provisionsSince: provisionsSince(),
      });
      if (result.title !== sheets.spreadsheetName) updateSheetsSettings({ spreadsheetName: result.title });
      syncState.error = '';
      syncState.conflict = result.status === 'conflict' ? { tab: result.tab, columns: result.columns } : null;
      syncState.choice = result.status === 'choose' ? { sheet: result.sheet, device: result.device, backup: result.backup } : null;
      if (result.status === 'version') syncState.error = versionMessage(result.sheetVersion, SCHEMA_VERSION, text.sheets.errors);
      if (result.status === 'done') {
        // Run the stores' save effects now, so saveBase knows whether the pulled data was stored.
        flushSync();
        syncState.lastSyncedAt = new Date().toISOString();
        saveBase(result.base);
        lastFingerprint = deviceFingerprint();
        if (!options.quiet && result.pulled) showToast(text.sheets.toasts.updated(result.pulled));
      }
    } catch (error) {
      syncState.error = errorMessage(error, text.sheets.errors);
    } finally {
      syncState.busy = false;
      running = null;
    }
    if (again) {
      const next = again;
      again = null;
      await syncNow(next);
    }
  })();
  return running;
}

// ---- Connecting ---------------------------------------------------------------

async function afterSignIn() {
  try {
    syncState.account = await getAccount();
    if (syncState.account.email !== sheets.accountEmail) updateSheetsSettings({ accountEmail: syncState.account.email });
  } catch {
    // The account name is nice to show but not needed.
  }
}

/**
 * Sync Now from a click: reconnects first if the Google session ran out while the page sat idle
 * (a click can open the sign-in popup, so one click still syncs).
 */
export function syncFromClick() {
  return checkToken() ? syncNow() : connect();
}

/** Sign in (or reconnect) — call from a click. Syncs if a spreadsheet is linked. */
export async function connect() {
  try {
    await signIn(sheets.accountEmail || undefined);
  } catch (error) {
    showToast(errorMessage(error, text.sheets.errors));
    return;
  }
  await afterSignIn();
  if (sheets.spreadsheet) await syncNow();
}

/**
 * Signs in with a Google account picked in Google's chooser — call from a click. A linked
 * spreadsheet belongs to the old account's access, so it's unlinked if the account changes.
 * @returns {Promise<boolean>} whether a (possibly the same) account is now signed in
 */
export async function switchAccount() {
  const before = sheets.accountEmail;
  try {
    await signIn(undefined, { chooseAccount: true });
  } catch (error) {
    showToast(errorMessage(error, text.sheets.errors));
    return false;
  }
  await afterSignIn();
  if (sheets.spreadsheet && before && sheets.accountEmail !== before) {
    unlink();
    showToast(text.sheets.toasts.signedInAs(sheets.accountEmail));
  }
  return true;
}

/** Links a spreadsheet; its first sync runs from the connection screen. @param {{ id: string, name: string }} file */
function link(file) {
  updateSheetsSettings({ spreadsheet: file.id, spreadsheetName: file.name });
  saveBase(emptyBase(file.id));
  Object.assign(syncState, { lastSyncedAt: null, error: '', conflict: null, choice: null });
}

/** Sign in first if needed; resolves false if that didn't work. */
async function ensureSignedIn() {
  if (currentToken()) return true;
  try {
    await signIn(sheets.accountEmail || undefined);
  } catch (error) {
    showToast(errorMessage(error, text.sheets.errors));
    return false;
  }
  await afterSignIn();
  return true;
}

/**
 * Opens the Google Picker to choose the spreadsheet — call from a click.
 * @returns {Promise<boolean>} whether a spreadsheet was linked
 */
export async function chooseSpreadsheet() {
  if (!(await ensureSignedIn())) return false;
  try {
    const file = await pickSpreadsheet(currentToken());
    if (!file) return false;
    link(file);
    return true;
  } catch (error) {
    showToast(errorMessage(error, text.sheets.errors));
    return false;
  }
}

/**
 * Creates a new spreadsheet in the person's Drive — call from a click.
 * @param {string} [name] the file's name ("MealCaster" if blank)
 * @returns {Promise<boolean>} whether it was created and linked
 */
export async function createNewSpreadsheet(name = '') {
  if (!(await ensureSignedIn())) return false;
  try {
    link(await createSpreadsheet(name.trim() || 'MealCaster', syncedTabs().map((t) => t.name)));
    return true;
  } catch (error) {
    showToast(errorMessage(error, text.sheets.errors));
    return false;
  }
}

/** Forgets the linked spreadsheet but stays signed in. Everything stays on this device. */
export function unlink() {
  updateSheetsSettings({ spreadsheet: '', spreadsheetName: '' });
  saveBase(emptyBase(''));
  Object.assign(syncState, { lastSyncedAt: null, error: '', conflict: null, choice: null });
}

/** Signs out and unlinks the spreadsheet. Everything stays on this device. */
export function disconnect() {
  signOut();
  unlink();
  syncState.account = null;
  showToast(text.sheets.toasts.disconnected);
}

/** Backup-sync confirm, "restore" answer: switch to bidirectional and take the spreadsheet's data. */
export function restoreFromSheet() {
  updateSheetsSettings({ direction: 'bidirectional' });
  return syncNow({ choice: 'sheetOnly' });
}

/** Leaves the first-sync choice without syncing: unlinks the spreadsheet, staying signed in to choose another. */
export function cancelFirstSync() {
  unlink();
}

// ---- Triggers -------------------------------------------------------------------

/** Starts loading Google scripts and watching for edits. Call once at startup. */
export function startSync() {
  if (!googleConfigured) return;
  prepareAuth().catch(() => {});
  preparePicker().catch(() => {});

  // Edits push shortly after they happen (Instant Reactive Push).
  let timer;
  $effect.root(() => {
    $effect(() => {
      const print = deviceFingerprint();
      // Waiting on the person (first-sync choice, column conflicts): don't retry on every edit.
      // Before the first sync of a linked spreadsheet: that one is started from the connection screen.
      const waitingOnPerson = Boolean(syncState.choice || syncState.conflict);
      if (!shouldSchedulePush({ instantPush: sheets.instantPush, signedIn: Boolean(auth.token), initialized: initialized(), waitingOnPerson, changed: print !== lastFingerprint })) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        // A pass may have caught up with these edits in the meantime.
        const state = { initialized: initialized(), waitingOnPerson: Boolean(syncState.choice || syncState.conflict), changed: deviceFingerprint() !== lastFingerprint };
        if (shouldRunPush(state)) syncNow({ quiet: true });
      }, PUSH_DELAY_MS);
    });
  });

  // The expiry timer doesn't run while the computer sleeps: notice a token that ran out meanwhile,
  // so the header shows Reconnect.
  setInterval(checkToken, 60_000);

  // Pick up changes made in the sheet when coming back to the app.
  const onFocus = () => {
    if (document.visibilityState !== 'visible' || !checkToken()) return;
    if (shouldSyncOnFocus({ busy: syncState.busy, initialized: initialized(), lastSyncedAt: syncState.lastSyncedAt, now: Date.now() })) syncNow();
  };
  document.addEventListener('visibilitychange', onFocus);
  window.addEventListener('focus', onFocus);
}
