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

/**
 * Serves `virtual:sample-data`: `{ samples, sampleKey }`. In dev, recipes, ingredients, a plan, favorites and grocery
 * extras from the seeded generator in dev/samples/ (SAMPLE_COUNT, default 60, and SAMPLE_SEED, default 1; count 0 with
 * `--mode empty`). Builds get empty data without loading the generator, so production never contains samples.
 * `sampleKey` names the data (`sample:<seed>:<count>:<generator version>`, '' when empty); env.js clears the device's
 * saved data when it changes. Photos don't count: refreshing the image cache keeps the key.
 * @param {{ command: string, mode: string }} options
 */
function sampleData({ command, mode }) {
  const id = 'virtual:sample-data';
  const resolved = `\0${id}`;
  const empty = { recipes: [], ingredients: [], plan: [], favorites: [], grocery: { every: [], weeks: [] } };
  /** @type {Promise<string> | undefined} */
  let code;

  /** @param {string} name @param {number} fallback @param {number} min */
  const envNumber = (name, fallback, min) => {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= min) return n;
    console.warn(`Sample data: ignoring ${name}="${raw}" (expected a whole number from ${min}); using ${fallback}.`);
    return fallback;
  };

  async function generate() {
    const count = mode === 'empty' ? 0 : envNumber('SAMPLE_COUNT', 60, 0);
    const seed = envNumber('SAMPLE_SEED', 1, 0);
    if (!count) return { samples: empty, sampleKey: '' };
    const { loadImages } = await import('./dev/samples/images.js');
    const { generateSamples, GENERATOR_VERSION } = await import('./dev/samples/generate.js');
    const samples = generateSamples({ seed, count, images: await loadImages() });
    return { samples, sampleKey: `sample:${seed}:${count}:${GENERATOR_VERSION}` };
  }

  return {
    name: 'mealcaster-sample-data',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loaded) {
      if (loaded !== resolved) return;
      code ??= (command === 'serve' ? generate() : Promise.resolve({ samples: empty, sampleKey: '' })).then(
        ({ samples, sampleKey }) =>
          `export const samples = ${JSON.stringify(samples)};\nexport const sampleKey = ${JSON.stringify(sampleKey)};\n`,
      );
      return code;
    },
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
    plugins: [svelte(), contentSecurityPolicy(command === 'serve'), sampleData({ command, mode })],
    define: {
      __GOOGLE_CONFIG__: JSON.stringify(google),
    },
    css: {
      postcss: {
        plugins: [tailwindcss({ config: `${root}tailwind.config.js` }), autoprefixer()],
      },
    },
  };
});
