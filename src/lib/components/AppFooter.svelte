<script>
  import { href } from '../router.svelte.js';
  import { text } from '../text.js';
</script>

<footer class="mt-10 w-full bg-surface-container-low print:hidden">
  <div
    class="mx-auto flex w-full max-w-page flex-col items-center justify-between gap-4 px-gutter py-10 text-center md:flex-row md:px-gutter-desktop md:text-left"
  >
    <div class="flex flex-wrap items-center justify-center gap-2 md:justify-start">
      <span class="font-display text-headline-sm text-primary">{text.header.appName}</span>
      <span class="text-body-sm text-outline">{text.header.footer.tagline}</span>
    </div>
    <a href={href('/profile')} class="text-body-sm text-primary hover:underline">{text.header.profile}</a>
    <div class="text-body-sm text-outline">{text.header.footer.copyright(new Date().getFullYear())}</div>
  </div>
</footer>
