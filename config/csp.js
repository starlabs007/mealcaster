// Content Security Policy as a <meta> tag (GitHub Pages can't send headers), injected by the Vite plugin below.
// Inline scripts in index.html (the theme script that runs before the first paint) are allowed by their sha256 hash,
// computed from the page Vite serves or builds, so editing a script can't leave a stale hash behind. Never
// 'unsafe-inline' for scripts.
import { createHash } from 'node:crypto';

/**
 * The text of every inline <script> (no `src`) in an HTML page, exactly as written: whitespace counts in a hash.
 * Empty scripts are skipped (nothing to run).
 * @param {string} html
 * @returns {string[]}
 */
export function inlineScripts(html) {
  const scripts = [];
  for (const [, attrs, text] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/(^|\s)src\s*=/i.test(attrs) || text === '') continue;
    scripts.push(text);
  }
  return scripts;
}

/**
 * The CSP source that allows one inline script: `'sha256-<base64>'` of its UTF-8 text.
 * @param {string} text
 */
export function scriptHash(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

/**
 * The policy string. Allows this site, Google Fonts, Google sign-in (accounts.google.com), the Picker
 * (apis.google.com scripts, docs.google.com frame) and the Sheets/Drive REST APIs. Images may come from any https
 * host (recipe photo links), plus data:/blob: for photos not yet uploaded — which uploadPhoto also fetch()es.
 * @param {{ dev: boolean, scriptHashes?: string[] }} options dev also allows Vite's HMR websocket
 */
export function cspContent({ dev, scriptHashes = [] }) {
  const policy = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...new Set(scriptHashes), 'https://accounts.google.com', 'https://apis.google.com'],
    // 'unsafe-inline': Svelte style="" attributes and transitions.
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
    'font-src': ['https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      'data:',
      'https://sheets.googleapis.com',
      'https://www.googleapis.com',
      'https://accounts.google.com',
      'https://oauth2.googleapis.com',
      ...(dev ? ['ws:'] : []),
    ],
    'frame-src': ['https://accounts.google.com', 'https://docs.google.com', 'https://drive.google.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Vite plugin: prepends the CSP <meta> to index.html. Runs last (`order: 'post'`) so it hashes the inline scripts
 * of the final page.
 * @param {boolean} dev
 */
export function contentSecurityPolicy(dev) {
  return {
    name: 'mealcaster-csp',
    transformIndexHtml: {
      order: /** @type {const} */ ('post'),
      /** @param {string} html */
      handler: (html) => [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: cspContent({ dev, scriptHashes: inlineScripts(html).map(scriptHash) }),
          },
          injectTo: /** @type {const} */ ('head-prepend'),
        },
      ],
    },
  };
}
