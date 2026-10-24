// The hash router's rules as plain functions: reading a hash, writing a link, and recognising a recipe page.

/**
 * "#/catalog?day=2026-10-24" → { path: '/catalog', query: { day: '2026-10-24' } }; an empty hash is the planner.
 * @param {string} hash
 * @returns {{ path: string, query: Record<string, string> }}
 */
export function parseHash(hash) {
  const [path, qs = ''] = (hash.slice(1) || '/').split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

/** A link to a page; query values that are missing or empty are left out. @param {string} path @param {Record<string, string | undefined | null>} [query] */
export function hrefFor(path, query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

/** The recipe id of "/recipe/:id" (not "new" handled here: callers check that path first), else undefined. @param {string} path */
export const recipeRouteId = (path) => path.match(/^\/recipe\/([\w-]+)$/)?.[1];

/** The recipe id of "/recipe/:id/edit", else undefined. @param {string} path */
export const editRouteId = (path) => path.match(/^\/recipe\/([\w-]+)\/edit$/)?.[1];
