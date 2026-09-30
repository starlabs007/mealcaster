// Minimal hash router — hash URLs work on GitHub Pages without server rewrites.
// Routes: #/ (weekly menu), #/catalog?day=&q=&filter=, #/recipe/:id?day=

/** @returns {{ path: string, query: Record<string, string> }} */
function parse() {
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export const route = $state(parse());

window.addEventListener('hashchange', () => {
  Object.assign(route, parse());
  window.scrollTo({ top: 0 });
});

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
