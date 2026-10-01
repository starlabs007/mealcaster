import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const root = fileURLToPath(new URL('.', import.meta.url));

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
    plugins: [svelte()],
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
