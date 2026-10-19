<script>
  // The print-option controls, shared by the Print Options dialog and the Profile page.
  import Icon from './Icon.svelte';
  import { text } from '../text.js';
  import { IMAGE_SCALE, clampScale } from '../printOptions.svelte.js';

  /**
   * `rowClass` limits each row's content (e.g. `max-w-md`) while the dividers between rows stay full width.
   * @type {{ draft: import('../printOptions.svelte.js').PrintOptions, hasImage?: boolean, rowClass?: string }}
   */
  let { draft = $bindable(), hasImage = true, rowClass = '' } = $props();

  /** @param {number} by */
  const stepScale = (by) => (draft.imageScale = clampScale(draft.imageScale + by));

  const sizes = [
    { value: 'small', ...text.recipe.print.sizes.small },
    { value: 'regular', ...text.recipe.print.sizes.regular },
    { value: 'large', ...text.recipe.print.sizes.large },
  ];
</script>

{#snippet toggle(/** @type {'image' | 'simple'} */ key, title, description, disabled = false)}
  <label class="flex items-start justify-between gap-4 py-3 {rowClass} {disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
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

<div class="divide-y divide-surface-container-high">
  <div>
    {@render toggle('image', text.recipe.print.image, hasImage ? text.recipe.print.imageIncluded : text.recipe.print.imageNone, !hasImage)}
    {#if hasImage}
      <div class="flex items-center justify-between gap-4 pb-3 pl-4 {rowClass} {draft.image ? '' : 'opacity-50'}">
        <label for="print-scale" class="text-body-sm text-on-surface-variant">{text.recipe.print.imageScaling}</label>
        <div class="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest">
          <button
            type="button"
            aria-label={text.recipe.print.smallerImage}
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
            aria-label={text.recipe.print.largerImage}
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

  <div>
    {@render toggle('simple', text.recipe.print.simple, text.recipe.print.simpleHint)}
  </div>

  <div class="py-3">
    <fieldset class={rowClass}>
      <legend class="text-label-md text-on-surface">{text.recipe.print.textSize}</legend>
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
