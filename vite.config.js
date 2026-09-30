import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const root = fileURLToPath(new URL('.', import.meta.url));

// Relative base so the build works from any GitHub Pages sub-path (e.g. /mealcaster/).
export default defineConfig({
  root,
  base: './',
  plugins: [svelte()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: `${root}tailwind.config.js` }), autoprefixer()],
    },
  },
});
