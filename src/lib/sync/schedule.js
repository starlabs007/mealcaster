// When sync passes run and what they cover, as plain functions (sync.svelte.js holds the timers and the stores).

import { addDays, weekStartOf } from '../dates.js';

/** How many weeks of grocery lists sync, counting this one; future weeks always do. */
export const PROVISION_WEEKS = 8;

/** Edits push this long after they happen (ms). */
export const PUSH_DELAY_MS = 1500;

/** Coming back to the app syncs only if the last pass is older than this (ms). */
export const FOCUS_SYNC_MS = 20_000;

/** Start of the oldest week whose grocery list syncs. Older lists stay as they are, here and in the sheet. @param {Date} [now] */
export const provisionsSince = (now = new Date()) => addDays(weekStartOf(now), -7 * (PROVISION_WEEKS - 1));

/** Weeks whose grocery list is synced: recent or future ones with saved changes, plus this week. @param {string[]} savedWeeks @param {Date} [now] */
export function groceryWeeks(savedWeeks, now = new Date()) {
  const since = provisionsSince(now);
  return [...new Set([...savedWeeks, weekStartOf(now)])].filter((w) => w >= since).sort();
}

/**
 * A pass asked for while another runs: what to run after it. Options add up (a person's `choice` is not lost), and the
 * follow-up is quiet only if every request was.
 * @template {{ quiet?: boolean }} T
 * @param {T | null} waiting @param {T} requested
 */
export const mergeQueued = (waiting, requested) => ({
  ...waiting,
  ...requested,
  quiet: Boolean(waiting?.quiet ?? true) && Boolean(requested.quiet),
});

/**
 * The stored sync base must never be newer than the stored data: if a store didn't fit, a reload brings back older
 * data, and a newer base would read the difference as edits made here and push it over the sheet. An empty
 * (uninitialized) base is always safe.
 * @param {{ initialized: boolean, allSaved: boolean }} state
 */
export const canStoreBase = ({ initialized, allSaved }) => !initialized || allSaved;

/**
 * Whether an edit should start the push timer: Instant Push is on, signed in, the first sync done, nobody is being
 * asked a question (first-sync choice, column conflicts), and the device differs from the last pass.
 * @param {{ instantPush: boolean, signedIn: boolean, initialized: boolean, waitingOnPerson: boolean, changed: boolean }} state
 */
export const shouldSchedulePush = ({ instantPush, signedIn, initialized, waitingOnPerson, changed }) =>
  instantPush && signedIn && initialized && !waitingOnPerson && changed;

/** When the timer fires: a pass may have caught up with the edits meanwhile, or a question may have come up. @param {{ initialized: boolean, waitingOnPerson: boolean, changed: boolean }} state */
export const shouldRunPush = ({ initialized, waitingOnPerson, changed }) => changed && initialized && !waitingOnPerson;

/**
 * Coming back to the app (after the token check): sync if idle, set up, and the last pass is older than FOCUS_SYNC_MS.
 * @param {{ busy: boolean, initialized: boolean, lastSyncedAt: string | null, now: number }} state
 */
export function shouldSyncOnFocus({ busy, initialized, lastSyncedAt, now }) {
  if (busy || !initialized) return false;
  const last = lastSyncedAt ? Date.parse(lastSyncedAt) : 0;
  return now - last > FOCUS_SYNC_MS;
}
