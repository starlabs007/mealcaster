// Connection state (src/lib/sync/phase.js): the sync phase, the header button's
// actions in each phase, and the step the connection screen opens on.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_LOOK, headerActions, phaseOf, startStep } from '../src/lib/sync/phase.js';

/** Connected, signed in and in sync; each test changes what it needs. */
const state = (changes = {}) => ({
  configured: true,
  busy: false,
  spreadsheet: 'S1',
  token: 'tok',
  choice: null,
  conflict: null,
  error: '',
  ...changes,
});

const PHASES = /** @type {const} */ (['unavailable', 'unlinked', 'signedOut', 'syncing', 'synced', 'error', 'conflict', 'choose']);

describe('phaseOf', () => {
  it('reads each state', () => {
    assert.equal(phaseOf(state()), 'synced');
    assert.equal(phaseOf(state({ configured: false })), 'unavailable');
    assert.equal(phaseOf(state({ busy: true })), 'syncing');
    assert.equal(phaseOf(state({ spreadsheet: '' })), 'unlinked');
    assert.equal(phaseOf(state({ token: '' })), 'signedOut');
    assert.equal(phaseOf(state({ choice: { backup: false } })), 'choose');
    assert.equal(phaseOf(state({ conflict: { tab: 'recipes', columns: ['Title'] } })), 'conflict');
    assert.equal(phaseOf(state({ error: 'Offline' })), 'error');
  });

  it('puts an unconfigured build before everything else', () => {
    assert.equal(phaseOf(state({ configured: false, busy: true, spreadsheet: '', error: 'x' })), 'unavailable');
  });

  it('shows a running pass over a problem from the last one', () => {
    assert.equal(phaseOf(state({ busy: true, error: 'Offline', conflict: { tab: 'recipes', columns: [] } })), 'syncing');
  });

  it('needs a spreadsheet before a sign-in matters', () => {
    assert.equal(phaseOf(state({ spreadsheet: '', token: '' })), 'unlinked');
  });

  it('asks to reconnect before showing an old choice, conflict or error', () => {
    assert.equal(phaseOf(state({ token: '', choice: {}, conflict: {}, error: 'x' })), 'signedOut');
  });

  it('orders a first-sync choice over a conflict over an error', () => {
    assert.equal(phaseOf(state({ choice: {}, conflict: {}, error: 'x' })), 'choose');
    assert.equal(phaseOf(state({ conflict: {}, error: 'x' })), 'conflict');
  });
});

describe('PHASE_LOOK', () => {
  it('has a look for every phase', () => {
    for (const phase of PHASES) assert.ok(PHASE_LOOK[phase]?.short, phase);
  });
});

describe('headerActions', () => {
  const primaryOf = (phase) => headerActions(phase).primary.id;

  it('picks the main action from the phase', () => {
    assert.equal(primaryOf('unavailable'), 'setup');
    assert.equal(primaryOf('unlinked'), 'setup');
    assert.equal(primaryOf('signedOut'), 'reconnect');
    assert.equal(primaryOf('synced'), 'syncNow');
    assert.equal(primaryOf('error'), 'syncNow');
    assert.equal(primaryOf('syncing'), 'syncNow');
    assert.equal(primaryOf('conflict'), 'resolveColumns');
    assert.equal(primaryOf('choose'), 'review');
  });

  it('disables the main action only while syncing', () => {
    for (const phase of PHASES) assert.equal(Boolean(headerActions(phase).primary.disabled), phase === 'syncing', phase);
  });

  it('is a plain button when nothing is connected', () => {
    assert.deepEqual(headerActions('unavailable').menu, []);
    assert.deepEqual(headerActions('unlinked').menu, []);
  });

  it('offers settings, the sheet and disconnect once a spreadsheet is linked', () => {
    for (const phase of ['signedOut', 'syncing', 'synced', 'error', 'conflict', 'choose']) {
      assert.deepEqual(headerActions(phase).menu.map((a) => a.id), ['settings', 'openSheet', 'disconnect'], phase);
    }
  });

  it('labels every action', () => {
    for (const phase of PHASES) {
      const { primary, menu } = headerActions(phase);
      for (const action of [primary, ...menu]) assert.ok(action.label && action.icon, `${phase}: ${action.id}`);
    }
  });

  it('hands out copies, so a caller can’t change the next result', () => {
    headerActions('syncing').primary.label = 'changed';
    headerActions('synced').menu[0].label = 'changed';
    assert.equal(headerActions('syncing').primary.label, 'Sync Now');
    assert.equal(headerActions('synced').menu[0].label, 'Connection Settings');
  });
});

describe('startStep', () => {
  it('starts setup from the account step', () => {
    assert.equal(startStep('unavailable'), 'account');
    assert.equal(startStep('unlinked'), 'account');
  });

  it('opens on the sync step once a spreadsheet is linked', () => {
    for (const phase of ['signedOut', 'syncing', 'synced', 'error', 'conflict', 'choose']) assert.equal(startStep(phase), 'sync', phase);
  });
});
