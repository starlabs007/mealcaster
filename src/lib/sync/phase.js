// Where the Google Sheets connection stands, and what the header button and the
// connection steps offer in each state. Plain module (no runes) so it can be tested.

import { text } from '../text.js';

/**
 * @typedef {'unavailable' | 'unlinked' | 'signedOut' | 'syncing' | 'pending' | 'synced' | 'error' | 'conflict' | 'choose'} SyncPhase
 */

/**
 * @param {{
 *   configured: boolean,
 *   busy: boolean,
 *   spreadsheet: string,
 *   token: string,
 *   choice: unknown,
 *   conflict: unknown,
 *   error: string,
 *   initialized: boolean,
 * }} state
 * `initialized`: the linked spreadsheet has been synced at least once (its first sync is
 * explicit, from the connection screen; until then it's `pending`).
 * @returns {SyncPhase}
 */
export function phaseOf({ configured, busy, spreadsheet, token, choice, conflict, error, initialized }) {
  if (!configured) return 'unavailable';
  if (busy) return 'syncing';
  if (!spreadsheet) return 'unlinked';
  if (!token) return 'signedOut';
  if (choice) return 'choose';
  if (conflict) return 'conflict';
  if (error) return 'error';
  if (!initialized) return 'pending';
  return 'synced';
}

/**
 * How each phase looks, shared by the header tab and the status labels.
 * Tones: ok = connected and in sync, busy/warn = working or waiting on you,
 * bad = sync is stopped, off = not connected.
 * @type {Record<SyncPhase, { tone: 'ok' | 'busy' | 'warn' | 'bad' | 'off', icon: string, short: string }>}
 */
export const PHASE_LOOK = {
  synced: { tone: 'ok', icon: 'cloud_done', short: text.header.phase.synced },
  syncing: { tone: 'busy', icon: 'sync', short: text.header.phase.syncing },
  pending: { tone: 'warn', icon: 'pending', short: text.header.phase.pending },
  signedOut: { tone: 'warn', icon: 'login', short: text.header.phase.signedOut },
  choose: { tone: 'warn', icon: 'help', short: text.header.phase.choose },
  conflict: { tone: 'bad', icon: 'sync_problem', short: text.header.phase.conflict },
  error: { tone: 'bad', icon: 'sync_problem', short: text.header.phase.error },
  unlinked: { tone: 'off', icon: 'cloud_off', short: text.header.phase.notConnected },
  unavailable: { tone: 'off', icon: 'cloud_off', short: text.header.phase.notConnected },
};

/**
 * @typedef {'setup' | 'reconnect' | 'syncNow' | 'resolveColumns' | 'review' | 'settings' | 'openSheet' | 'disconnect'} ActionId
 * @typedef {{ id: ActionId, label: string, icon: string, disabled?: boolean }} Action
 */

/** @type {Record<ActionId, Action>} */
const ACTIONS = {
  setup: { id: 'setup', label: text.header.actions.setup, icon: 'add_link' },
  reconnect: { id: 'reconnect', label: text.header.actions.reconnect, icon: 'login' },
  syncNow: { id: 'syncNow', label: text.header.actions.syncNow, icon: 'sync' },
  resolveColumns: { id: 'resolveColumns', label: text.header.actions.resolveColumns, icon: 'difference' },
  review: { id: 'review', label: text.header.actions.review, icon: 'help' },
  settings: { id: 'settings', label: text.header.actions.settings, icon: 'settings' },
  openSheet: { id: 'openSheet', label: text.header.actions.openSheet, icon: 'open_in_new' },
  disconnect: { id: 'disconnect', label: text.header.actions.disconnect, icon: 'link_off' },
};

/** @type {Record<SyncPhase, ActionId>} */
const PRIMARY = {
  unavailable: 'setup',
  unlinked: 'setup',
  signedOut: 'reconnect',
  synced: 'syncNow',
  error: 'syncNow',
  syncing: 'syncNow',
  pending: 'review',
  conflict: 'resolveColumns',
  choose: 'review',
};

/**
 * The header button: its main action, and the menu beside it (empty when
 * nothing is connected, so the button is a plain one).
 * @param {SyncPhase} phase
 * @returns {{ primary: Action, menu: Action[] }}
 */
export function headerActions(phase) {
  const primary = { ...ACTIONS[PRIMARY[phase]], ...(phase === 'syncing' && { disabled: true }) };
  const linked = phase !== 'unavailable' && phase !== 'unlinked';
  const menu = linked ? [ACTIONS.settings, ACTIONS.openSheet, ACTIONS.disconnect].map((a) => ({ ...a })) : [];
  return { primary, menu };
}

/**
 * @typedef {'account' | 'sheet' | 'sync'} ConnectionStep
 */

/**
 * Step the connection screen opens on: setup from the start, or the sync step once a spreadsheet is linked.
 * @param {SyncPhase} phase
 * @returns {ConnectionStep}
 */
export const startStep = (phase) => (phase === 'unavailable' || phase === 'unlinked' ? 'account' : 'sync');
