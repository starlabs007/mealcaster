<script>
  import Icon from './Icon.svelte';
  import { printOptions, IMAGE_SCALE, clampScale } from '../printOptions.svelte.js';

  /** @type {{ hasImage: boolean, onprint: (options: import('../printOptions.svelte.js').PrintOptions) => void, onclose: () => void }} */
  let { hasImage, onprint, onclose } = $props();

  // Edited as a draft: Cancel leaves the saved options alone.
  let draft = $state({ ...printOptions });

  /** @type {HTMLElement | undefined} */
  let dialog = $state();
  $effect(() => dialog?.focus());

  /** @param {number} by */
  const stepScale = (by) => (draft.imageScale = clampScale(draft.imageScale + by));

  const sizes = [
    { value: 'small', label: 'Small', hint: '1 size smaller' },
    { value: 'regular', label: 'Regular', hint: 'As on screen' },
    { value: 'large', label: 'Large', hint: '3 sizes bigger' },
  ];
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

{#snippet toggle(/** @type {'image' | 'simple'} */ key, title, description, disabled = false)}
  <label class="flex items-start justify-between gap-4 py-3 {disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
    <span class="flex flex-col">
      <span class="text-label-md text-on-surface">{title}</span>
      <span class="text-body-sm text-on-surface-variant">{description}</span>
    </span>
    <span class="relative mt-0.5 inline-flex shrink-0">
      <input type="checkbox" role="switch" bind:checked={draft[key]} {disabled} class="peer sr-only" />
      <span class="h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2"></span>
      <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform peer-checked:translate-x-5"></span>
    </span>
  </label>
{/snippet}

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

    <div class="mt-3 divide-y divide-surface-container-high">
      <div>
        {@render toggle('image', 'Print recipe image', hasImage ? 'Include the photo on the page.' : 'This recipe has no photo.', !hasImage)}
        {#if hasImage}
          <div class="flex items-center justify-between gap-4 pb-3 pl-4 {draft.image ? '' : 'opacity-50'}">
            <label for="print-scale" class="text-body-sm text-on-surface-variant">Image scaling</label>
            <div class="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest">
              <button
                type="button"
                aria-label="Smaller image"
                class="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                disabled={!draft.image || draft.imageScale <= IMAGE_SCALE.min}
                onclick={() => stepScale(-IMAGE_SCALE.step)}
              >
                <Icon name="remove" class="text-[16px]" />
              </button>
              <input
                id="print-scale"
                type="number"
                inputmode="numeric"
                min={IMAGE_SCALE.min}
                max={IMAGE_SCALE.max}
                step={IMAGE_SCALE.step}
                disabled={!draft.image}
                bind:value={draft.imageScale}
                onchange={() => (draft.imageScale = clampScale(draft.imageScale))}
                class="w-12 border-0 bg-transparent p-0 text-center text-label-md text-on-surface [appearance:textfield] focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span class="pr-1 text-label-md text-on-surface-variant">%</span>
              <button
                type="button"
                aria-label="Larger image"
                class="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                disabled={!draft.image || draft.imageScale >= IMAGE_SCALE.max}
                onclick={() => stepScale(IMAGE_SCALE.step)}
              >
                <Icon name="add" class="text-[16px]" />
              </button>
            </div>
          </div>
        {/if}
      </div>

      {@render toggle('simple', 'Simple layout', 'One column, no tinted backgrounds or shadows, sections headed by large bold titles.')}

      <div class="py-3">
        <fieldset>
          <legend class="text-label-md text-on-surface">Text size</legend>
          <div class="mt-2 grid grid-cols-3 gap-2">
            {#each sizes as size (size.value)}
              <label
                class="flex cursor-pointer flex-col gap-0.5 rounded-lg p-2.5 transition-colors {draft.textSize === size.value
                  ? 'bg-surface-container-low ring-1 ring-primary-container/40'
                  : 'hover:bg-surface-container-low'}"
              >
                <span class="flex items-center gap-2">
                  <input type="radio" name="printTextSize" value={size.value} bind:group={draft.textSize} class="h-4 w-4 accent-primary" />
                  <span class="text-label-md text-on-surface">{size.label}</span>
                </span>
                <span class="pl-6 text-label-sm font-normal text-on-surface-variant">{size.hint}</span>
              </label>
            {/each}
          </div>
        </fieldset>
      </div>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button type="button" class="btn-outline" onclick={onclose}>Cancel</button>
      <button type="button" class="btn-primary" onclick={() => onprint({ ...draft, imageScale: clampScale(draft.imageScale) })}>
        <Icon name="print" class="text-[16px]" /> Print
      </button>
    </div>
  </div>
</div>
