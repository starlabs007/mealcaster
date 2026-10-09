<script>
  // "Switch Days…" picker: the planned meal on `iso` trades places with the evening chosen here.
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import { planner, statusOf, switchDays, switchTargets } from '../planner.svelte.js';
  import { recipeById } from '../recipes.svelte.js';
  import { formatShort, formatWeekday } from '../dates.js';

  /** @type {{ iso: string, onclose: () => void }} */
  let { iso, onclose } = $props();

  const moving = $derived(recipeById.get(planner.entries[iso]?.recipeId ?? ''));
  const targets = $derived(switchTargets(iso));

  /** @type {HTMLElement | undefined} */
  let list = $state();
  $effect(() => list?.querySelector('button')?.focus());

  /** @param {string} d */
  function describe(d) {
    const status = statusOf(d);
    if (status === 'diningOut') return { icon: 'storefront', text: 'Night off' };
    if (status === 'open') return { icon: 'restaurant', text: 'Open' };
    return { recipe: recipeById.get(planner.entries[d].recipeId) };
  }

  /** @param {string} d */
  function pick(d) {
    switchDays(iso, d);
    onclose();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/40 p-0 backdrop-blur-md sm:items-center sm:p-4 print:hidden"
  onclick={(e) => e.target === e.currentTarget && onclose()}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="switch-dialog-title"
    class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lift sm:max-h-[80dvh] sm:rounded-2xl"
  >
    <div class="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
      <div class="min-w-0">
        <h2 id="switch-dialog-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
          <Icon name="swap_vert" class="text-[20px] text-primary" /> Switch Days
        </h2>
        <div class="mt-3 flex items-center gap-3">
          {#if moving}<RecipeImage src={moving.image} alt="" class="h-12 w-12 flex-shrink-0 rounded-lg" />{/if}
          <p class="text-body-sm text-on-surface-variant">
            Move <span class="font-semibold text-on-surface">{moving?.title ?? 'this meal'}</span> from {formatWeekday(iso)} to:
          </p>
        </div>
      </div>
      <button type="button" aria-label="Close" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high" onclick={onclose}>
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <ul bind:this={list} class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
        {#each targets as d (d)}
          {@const { icon, text, recipe } = describe(d)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container-high focus:bg-surface-container-high focus:outline-none"
              onclick={() => pick(d)}
            >
              <span class="w-24 flex-shrink-0">
                <span class="block text-sm font-semibold uppercase tracking-wide text-outline">{formatWeekday(d)}</span>
                <span class="block text-xs text-on-surface-variant">{formatShort(d)}</span>
              </span>
              {#if recipe}
                <RecipeImage src={recipe.image} alt="" class="h-12 w-12 flex-shrink-0 rounded-lg" />
                <span class="min-w-0 flex-1 truncate text-body-md text-on-surface">{recipe.title}</span>
              {:else}
                <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
                  <Icon name={icon} class="text-2xl" />
                </span>
                <span class="min-w-0 flex-1 truncate text-body-md text-on-surface-variant">{text}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
      <p class="mt-3 text-xs text-on-surface-variant">If that evening has a meal or a night off, it moves to {formatWeekday(iso)}.</p>
    </div>
  </div>
</div>
