<script>
  import Icon from './Icon.svelte';

  // `failed` is bindable so a card can swap in its own fallback when the photo doesn't load.
  /** @type {{ src?: string, alt: string, class?: string, failed?: boolean }} */
  let { src, alt, class: className = '', failed = $bindable(false) } = $props();
</script>

{#if src && !failed}
  <img {src} {alt} loading="lazy" class="object-cover {className}" onerror={() => (failed = true)} />
{:else}
  <!-- Decorative (alt="") is hidden from assistive tech: an image with an empty name is a bug. -->
  <div
    role={alt ? 'img' : undefined}
    aria-label={alt || undefined}
    aria-hidden={alt ? undefined : 'true'}
    class="flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container-highest text-outline {className}"
  >
    <Icon name="restaurant" class="text-[32px]" />
  </div>
{/if}
