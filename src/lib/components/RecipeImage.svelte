<script>
  import Icon from './Icon.svelte';

  /** @type {{ src?: string, alt: string, class?: string }} */
  let { src, alt, class: className = '' } = $props();
  let failed = $state(false);
</script>

{#if src && !failed}
  <img {src} {alt} loading="lazy" class="object-cover {className}" onerror={() => (failed = true)} />
{:else}
  <div
    role="img"
    aria-label={alt}
    class="flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container-highest text-outline {className}"
  >
    <Icon name="restaurant" class="text-[32px]" />
  </div>
{/if}
