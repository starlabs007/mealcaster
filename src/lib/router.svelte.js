// Minimal hash router — hash URLs work on GitHub Pages without server rewrites.
// Routes: #/ (weekly menu), #/catalog?day=&q=&filter=&category=, #/recipe/:id?day=, #/recipe/new, #/recipe/:id/edit, #/grocery, #/profile,
// #/sheets-sync (settings modal over the weekly menu), #/sheets-sync/columns (column conflicts modal)

/** @returns {{ path: string, query: Record<string, string> }} */
function parse() {
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export const route = $state(parse());

// Whether there's an earlier in-app page to go back to.
let inAppHistory = false;

window.addEventListener('hashchange', () => {
  inAppHistory = true;
  Object.assign(route, parse());
  window.scrollTo({ top: 0 });
});

/** Back to the previous in-app page, or `fallback` when the app was opened here. */
export function goBack(fallback = '/') {
  if (inAppHistory) history.back();
  else navigate(fallback);
}

/** @param {string} path @param {Record<string, string | undefined | null>} [query] */
export function href(path, query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null && v !== ''),
  ).toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

/** @param {string} path @param {Record<string, string | undefined | null>} [query] */
export function navigate(path, query) {
  location.hash = href(path, query);
}
