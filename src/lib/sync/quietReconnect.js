// When to renew the Google token quietly from a click (see startSync in sync.svelte.js).
// Plain JS so the decision is testable.

/** A click in the last 10 minutes of the token's life renews it (`expiresAt` is already a minute early). */
export const REFRESH_WINDOW_MS = 10 * 60_000;

/** After a failed quiet reconnect, wait this long before another click may try again. */
export const BACKOFF_MS = 5 * 60_000;

/**
 * Should this click reconnect to Google quietly?
 * @param {{
 *   configured: boolean, ready: boolean, linked: boolean,
 *   token: string, expiresAt: number, now: number,
 *   signingIn: boolean, backoffUntil: number, onSignInControl: boolean,
 * }} s
 */
export function shouldQuietReconnect(s) {
  if (!s.configured || !s.ready || !s.linked) return false;
  if (s.signingIn || s.onSignInControl || s.now < s.backoffUntil) return false;
  // No usable token (expired, or lost on reload), or one inside the refresh window.
  return !s.token || s.now >= s.expiresAt - REFRESH_WINDOW_MS;
}
