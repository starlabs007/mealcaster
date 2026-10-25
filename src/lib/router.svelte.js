// Minimal hash router — hash URLs work on GitHub Pages without server rewrites.
// Routes: #/ (weekly menu), #/catalog?day=&q=&filter=&meals=, #/recipe/:id?day=, #/recipe/new, #/recipe/:id/edit, #/grocery, #/profile,
// #/sheets-sync → #/sheets-sync/account | /sheet | /sync (connection steps, a modal over the previous page),
// #/sheets-sync/columns (column conflicts modal)

import { hrefFor, parseHash } from './routes.js';

const parse = () => parseHash(location.hash);

export const route = $state(parse());

// Whether there's an earlier in-app page to go back to.
let inAppHistory = false;

/** The page the latest navigation left, and how far it was scrolled (pages that restore their place read it). */
export const left = { path: '', scrollY: 0 };

/** goBack's check that Back reached an app page (see there). */
let backCheck;

window.addEventListener('hashchange', () => {
  clearTimeout(backCheck);
  inAppHistory = true;
  left.path = route.path;
  left.scrollY = window.scrollY;
  Object.assign(route, parse());
  window.scrollTo({ top: 0 });
});

/** Back to the previous in-app page, or `fallback` when the app was opened here. */
export function goBack(fallback = '/') {
  if (!inAppHistory) return navigate(fallback);
  // Back can step through an embedded frame's own history instead (the Google Picker's, on
  // iOS Safari), which changes nothing on screen: go to `fallback` when the page stays put.
  const from = location.hash;
  history.back();
  clearTimeout(backCheck);
  backCheck = setTimeout(() => {
    if (location.hash === from) navigate(fallback);
  }, 400);
}

export const href = hrefFor;

/** @param {string} path @param {Record<string, string | undefined | null>} [query] */
export function navigate(path, query) {
  location.hash = href(path, query);
}

/** Like navigate, but replaces the current history entry (steps within one screen). @param {string} path */
export function replace(path) {
  history.replaceState(history.state, '', href(path));
  Object.assign(route, parse());
}
