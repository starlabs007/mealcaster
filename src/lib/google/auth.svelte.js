// Google sign-in with Google Identity Services (token model). Access tokens last
// about an hour and are kept in memory only — after a reload, or once the
// token expires, the person clicks Reconnect (usually no password needed).

import { googleConfig, googleConfigured, SCOPE } from './config.js';

export const auth = $state({
  /** GIS script loaded and ready for a sign-in click. */
  ready: false,
  token: '',
  expiresAt: 0,
});

/** @type {Map<string, Promise<void>>} */
const scripts = new Map();

/** Loads a Google script once. @param {string} src */
export function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = () => {
          scripts.delete(src);
          reject(new Error('Couldn’t reach Google — check your connection.'));
        };
        document.head.append(el);
      }),
    );
  }
  return scripts.get(src);
}

let client;
/** @type {{ resolve: (token: string) => void, reject: (error: Error) => void } | null} */
let pending = null;
let expiryTimer;

/** Loads Google Identity Services ahead of time, so a click can open the sign-in popup straight away. */
export async function prepareAuth() {
  if (!googleConfigured || client) return;
  await loadScript('https://accounts.google.com/gsi/client');
  const { oauth2 } = /** @type {any} */ (window).google.accounts;
  client = oauth2.initTokenClient({
    client_id: googleConfig.clientId,
    scope: SCOPE,
    callback: (response) => {
      const done = pending;
      pending = null;
      if (response.error || !oauth2.hasGrantedAllScopes(response, SCOPE)) {
        done?.reject(new Error('Google access wasn’t granted, so MealCaster can’t sync.'));
        return;
      }
      auth.token = response.access_token;
      // Treat it as expired a minute early so no request races the expiry.
      auth.expiresAt = Date.now() + (Number(response.expires_in) - 60) * 1000;
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(expire, auth.expiresAt - Date.now());
      done?.resolve(auth.token);
    },
    error_callback: (error) => {
      const done = pending;
      pending = null;
      done?.reject(
        new Error(
          error?.type === 'popup_failed_to_open'
            ? 'The Google sign-in window was blocked — allow pop-ups for this site and try again.'
            : 'Google sign-in was closed before it finished.',
        ),
      );
    },
  });
  auth.ready = true;
}

/**
 * Opens Google sign-in. Call it straight from a click handler so the popup
 * isn't blocked.
 * @param {string} [hint] email of the account used last time
 * @param {{ chooseAccount?: boolean }} [options] show Google's account chooser (no hint)
 * @returns {Promise<string>} access token
 */
export function signIn(hint, { chooseAccount = false } = {}) {
  if (!client) return Promise.reject(new Error('Google sign-in is still loading — try again in a moment.'));
  pending?.reject(new Error('Sign-in restarted.'));
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    client.requestAccessToken(chooseAccount ? { prompt: 'select_account' } : { prompt: '', ...(hint && { login_hint: hint }) });
  });
}

/** A usable token, or '' when the person needs to reconnect. */
export const currentToken = () => (auth.token && Date.now() < auth.expiresAt ? auth.token : '');

/** Forgets the token (it expired, or Google rejected it). */
export function expire() {
  clearTimeout(expiryTimer);
  auth.token = '';
  auth.expiresAt = 0;
}

/** Signs out and revokes MealCaster's access token. */
export function signOut() {
  const token = auth.token;
  expire();
  if (token) /** @type {any} */ (window).google?.accounts.oauth2.revoke(token, () => {});
}
