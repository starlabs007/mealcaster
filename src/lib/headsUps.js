// Heads-ups: a short sentence about something a recipe needs done ahead ("Soak the chickpeas overnight."), with how
// many days before the dinner it's due (0 = on the day). Stored on the recipe as `headsUps` (a list; the editor offers
// one for now) and in the sheet's Heads_Up_JSON column. The planner shows each one on the card of the day it's due.
//
// Plain module (no runes) so the codec, the planner and the tests can import it.

import { addDays } from './dates.js';
import { headsUpKeys as K } from './sheetText.js';

/**
 * @typedef {{ text: string, daysBefore: number, [key: string]: unknown }} HeadsUp keys the app doesn't know (written by
 *   a later build or by hand) are kept, so they survive a round trip through an older device
 * @typedef {import('./data/recipes.js').Recipe} Recipe
 */

/** Longest lead time the editor offers (a sheet may hold more). */
export const MAX_EDITOR_LEAD = 2;
/** How far ahead the planner looks for dinners whose heads-up is due on a day. */
const LOOKAHEAD_DAYS = 7;
/** Editor limit: a heads-up is one short sentence. */
export const HEADS_UP_MAX_LENGTH = 140;

/** One heads-up from stored or sheet data (a plain string = on the day), or null without text. */
function toHeadsUp(item) {
  if (typeof item === 'string') item = { [K.text]: item };
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const text = typeof item[K.text] === 'string' ? item[K.text].trim() : '';
  if (!text) return null;
  const days = Math.floor(Number(item[K.daysBefore]));
  return { ...item, text, daysBefore: days > 0 ? days : 0 };
}

/** @param {unknown} list @returns {HeadsUp[]} */
export const normalizeHeadsUps = (list) => (Array.isArray(list) ? list.map(toHeadsUp).filter((h) => h !== null) : []);

/**
 * Heads_Up_JSON cell → heads-ups. A JSON list (or a single object) reads as such; plain text is one heads-up on the
 * day, so the cell can be typed by hand.
 * @returns {{ headsUps: HeadsUp[], raw?: string }} `raw`: a cell that looks like JSON but doesn't parse. It shows as
 *   nothing and is written back as it was, so a typo in the sheet never loses the text.
 */
export function parseHeadsUps(value) {
  const text = String(value ?? '').trim();
  if (!text) return { headsUps: [] };
  if (!/^[[{]/.test(text)) return { headsUps: normalizeHeadsUps([text]) };
  try {
    const data = JSON.parse(text);
    return { headsUps: normalizeHeadsUps(Array.isArray(data) ? data : [data]) };
  } catch {
    return { headsUps: [], raw: text };
  }
}

/** Heads-ups → Heads_Up_JSON cell ('' when there are none). @param {HeadsUp[] | undefined} headsUps */
export function formatHeadsUps(headsUps) {
  const list = normalizeHeadsUps(headsUps);
  if (!list.length) return '';
  return JSON.stringify(list.map(({ text, daysBefore, ...rest }) => ({ [K.text]: text, [K.daysBefore]: daysBefore, ...rest })));
}

/** Longest lead time of a recipe's heads-ups in days (0 = nothing needs notice). @param {Recipe | undefined} recipe */
export const leadDays = (recipe) => Math.max(0, ...(recipe?.headsUps ?? []).map((h) => h.daysBefore));

/** Heads-ups longest lead first (the order to do them in). @param {HeadsUp[] | undefined} headsUps */
export const byLead = (headsUps) => [...(headsUps ?? [])].sort((a, b) => b.daysBefore - a.daysBefore);

/**
 * Heads-ups of `recipe` planned on `iso` whose day has already gone (before `today`). Doing the prep this evening for
 * tomorrow still counts as in time.
 * @param {Recipe | undefined} recipe @param {string} iso @param {string} today
 */
export const missedHeadsUps = (recipe, iso, today) =>
  (recipe?.headsUps ?? []).filter((h) => h.daysBefore > 0 && addDays(iso, -h.daysBefore) < today);

/**
 * Heads-ups due on `iso` for the dinners after it (a dinner's heads-up with `daysBefore` n is due n days earlier),
 * nearest dinner first. Nothing for days before `today`: history isn't a to-do list.
 * @param {string} iso @param {string} today
 * @param {(iso: string) => Recipe | undefined} dinnerOn the recipe planned that evening, if any
 * @returns {{ dinner: string, days: number, recipe: Recipe, headsUp: HeadsUp }[]}
 */
export function remindersOn(iso, today, dinnerOn) {
  if (iso < today) return [];
  const out = [];
  for (let days = 1; days <= LOOKAHEAD_DAYS; days++) {
    const dinner = addDays(iso, days);
    const recipe = dinnerOn(dinner);
    for (const headsUp of recipe?.headsUps ?? []) {
      if (headsUp.daysBefore === days) out.push({ dinner, days, recipe, headsUp });
    }
  }
  return out;
}
