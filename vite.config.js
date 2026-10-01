import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Content Security Policy as a <meta> tag (GitHub Pages can't send headers).
 * Allows this site, Google Fonts, Google sign-in (accounts.google.com), the
 * Picker (apis.google.com scripts, docs.google.com frame) and the Sheets/Drive
 * REST APIs. Images may come from any https host (recipe photo links), plus
 * data:/blob: for photos not yet uploaded — which uploadPhoto also fetch()es.
 * @param {boolean} dev also allow Vite's HMR websocket
 */
function contentSecurityPolicy(dev) {
  const policy = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
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
  const content = Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  return {
    name: 'mealcaster-csp',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content }, injectTo: 'head-prepend' },
    ],
  };
}

// Relative base so the build works from any GitHub Pages sub-path (e.g. /mealcaster/).
export default defineConfig(({ command, mode }) => {
  // Google credentials come from .env.local in dev and the `production` environment in CI.
  // Only these three names are exposed to the browser bundle.
  const env = loadEnv(mode, root, 'GOOGLE_');
  const google = {
    clientId: env.GOOGLE_CLIENT_ID ?? '',
    apiKey: env.GOOGLE_API_KEY ?? '',
    appId: env.GOOGLE_APP_ID ?? '',
  };

  return {
    root,
    base: './',
    plugins: [svelte(), contentSecurityPolicy(command === 'serve')],
    define: {
      __GOOGLE_CONFIG__: JSON.stringify(google),
      // Sample recipes/plan: `npm run dev` only. `npm run dev:empty` (mode "empty") and builds start empty.
      __SAMPLE_DATA__: JSON.stringify(command === 'serve' && mode !== 'empty'),
    },
    css: {
      postcss: {
        plugins: [tailwindcss({ config: `${root}tailwind.config.js` }), autoprefixer()],
      },
    },
  };
});
