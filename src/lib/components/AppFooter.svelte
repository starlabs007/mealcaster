<script>
  import { href } from '../router.svelte.js';
</script>

<footer class="mt-10 w-full bg-surface-container-low print:hidden">
  <div
    class="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-10 text-center md:flex-row md:px-gutter-desktop md:text-left"
  >
    <div class="flex flex-wrap items-center justify-center gap-2 md:justify-start">
      <span class="font-display text-headline-sm text-primary">MealCaster</span>
      <span class="text-body-sm text-outline">— Mindful kitchen choreography &amp; nourishment</span>
    </div>
    <a href={href('/profile')} class="text-body-sm text-primary hover:underline">Profile &amp; Settings</a>
    <div class="text-body-sm text-outline">© {new Date().getFullYear()} MealCaster. Culinary Mise en Place.</div>
  </div>
</footer>
