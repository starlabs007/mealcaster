<script>
  import Icon from './Icon.svelte';
  import PrintOptionsFields from './PrintOptionsFields.svelte';
  import { printOptions, clampScale } from '../printOptions.svelte.js';

  /** @type {{ hasImage: boolean, onprint: (options: import('../printOptions.svelte.js').PrintOptions) => void, onclose: () => void }} */
  let { hasImage, onprint, onclose } = $props();

  // Edited as a draft: Cancel leaves the saved options alone.
  let draft = $state({ ...printOptions });

  /** @type {HTMLElement | undefined} */
  let dialog = $state();
  $effect(() => dialog?.focus());
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md print:hidden"
  onclick={(e) => e.target === e.currentTarget && onclose()}
>
  <div
    bind:this={dialog}
    role="dialog"
    aria-modal="true"
    aria-labelledby="print-title"
    tabindex="-1"
    class="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lift focus:outline-none"
  >
    <div class="flex items-center gap-3">
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
        <Icon name="print" class="text-[18px]" />
      </span>
      <h2 id="print-title" class="font-display text-headline-sm text-on-surface">Print Options</h2>
    </div>

    <div class="mt-3">
      <PrintOptionsFields bind:draft {hasImage} />
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button type="button" class="btn-outline" onclick={onclose}>Cancel</button>
      <button type="button" class="btn-primary" onclick={() => onprint({ ...draft, imageScale: clampScale(draft.imageScale) })}>
        <Icon name="print" class="text-[16px]" /> Print
      </button>
    </div>
  </div>
</div>
