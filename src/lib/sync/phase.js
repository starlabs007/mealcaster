// Where the Google Sheets connection stands, and what the header button and the
// connection steps offer in each state. Plain module (no runes) so it can be tested.

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
  synced: { tone: 'ok', icon: 'cloud_done', short: 'Synced' },
  syncing: { tone: 'busy', icon: 'sync', short: 'Syncing' },
  pending: { tone: 'warn', icon: 'pending', short: 'Not synced yet' },
  signedOut: { tone: 'warn', icon: 'login', short: 'Reconnect' },
  choose: { tone: 'warn', icon: 'help', short: 'Needs you' },
  conflict: { tone: 'bad', icon: 'sync_problem', short: 'Paused' },
  error: { tone: 'bad', icon: 'sync_problem', short: 'Sync problem' },
  unlinked: { tone: 'off', icon: 'cloud_off', short: 'Not connected' },
  unavailable: { tone: 'off', icon: 'cloud_off', short: 'Not connected' },
};

/**
 * @typedef {'setup' | 'reconnect' | 'syncNow' | 'resolveColumns' | 'review' | 'settings' | 'openSheet' | 'disconnect'} ActionId
 * @typedef {{ id: ActionId, label: string, icon: string, disabled?: boolean }} Action
 */

/** @type {Record<ActionId, Action>} */
const ACTIONS = {
  setup: { id: 'setup', label: 'Connect Google Sheets', icon: 'add_link' },
  reconnect: { id: 'reconnect', label: 'Reconnect', icon: 'login' },
  syncNow: { id: 'syncNow', label: 'Sync Now', icon: 'sync' },
  resolveColumns: { id: 'resolveColumns', label: 'Resolve Columns', icon: 'difference' },
  review: { id: 'review', label: 'Finish Connecting', icon: 'help' },
  settings: { id: 'settings', label: 'Connection Settings', icon: 'settings' },
  openSheet: { id: 'openSheet', label: 'Open in Google Sheets', icon: 'open_in_new' },
  disconnect: { id: 'disconnect', label: 'Disconnect…', icon: 'link_off' },
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
