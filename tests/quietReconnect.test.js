// Quiet reconnect decision (src/lib/sync/quietReconnect.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BACKOFF_MS, REFRESH_WINDOW_MS, shouldQuietReconnect } from '../src/lib/sync/quietReconnect.js';

const NOW = 1_000_000_000;
/** Linked, with a token that has 30 minutes left; each test changes what it needs. */
const state = (changes = {}) => ({
  configured: true,
  ready: true,
  linked: true,
  token: 'tok',
  expiresAt: NOW + 30 * 60_000,
  now: NOW,
  signingIn: false,
  backoffUntil: 0,
  onSignInControl: false,
  ...changes,
});

describe('shouldQuietReconnect', () => {
  it('leaves a healthy token alone', () => {
    assert.equal(shouldQuietReconnect(state()), false);
    assert.equal(shouldQuietReconnect(state({ expiresAt: NOW + REFRESH_WINDOW_MS + 1 })), false);
  });

  it('renews inside the refresh window', () => {
    assert.equal(shouldQuietReconnect(state({ expiresAt: NOW + REFRESH_WINDOW_MS })), true);
    assert.equal(shouldQuietReconnect(state({ expiresAt: NOW + 1000 })), true);
  });

  it('reconnects when there is no token', () => {
    assert.equal(shouldQuietReconnect(state({ token: '', expiresAt: 0 })), true);
  });

  it('does nothing without a linked spreadsheet or Google set up', () => {
    const expired = { token: '', expiresAt: 0 };
    assert.equal(shouldQuietReconnect(state({ ...expired, linked: false })), false);
    assert.equal(shouldQuietReconnect(state({ ...expired, configured: false })), false);
    assert.equal(shouldQuietReconnect(state({ ...expired, ready: false })), false);
  });

  it('stays out of the way of other sign-ins', () => {
    const expired = { token: '', expiresAt: 0 };
    assert.equal(shouldQuietReconnect(state({ ...expired, signingIn: true })), false);
    assert.equal(shouldQuietReconnect(state({ ...expired, onSignInControl: true })), false);
  });

  it('backs off after a failure, then tries again', () => {
    const expired = { token: '', expiresAt: 0, backoffUntil: NOW + BACKOFF_MS };
    assert.equal(shouldQuietReconnect(state(expired)), false);
    assert.equal(shouldQuietReconnect(state({ ...expired, now: NOW + BACKOFF_MS })), true);
  });
});
