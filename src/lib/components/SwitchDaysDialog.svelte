<script>
  // "Switch Days…" picker: the planned meal on `iso` trades places with the evening chosen here.
  // Not a native <dialog>: showModal() puts it in the top layer, above the Undo toast (z-[80]), and makes the toast
  // inert. So Tab is kept inside by hand.
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import { planner, statusOf, switchDays, switchTargets } from '../planner.svelte.js';
  import { recipeById } from '../recipes.svelte.js';
  import { text } from '../text.js';
  import { formatShort, formatWeekday } from '../dates.js';

  /** @type {{ iso: string, onclose: () => void }} */
  let { iso, onclose } = $props();

  const moving = $derived(recipeById.get(planner.entries[iso]?.recipeId ?? ''));
  const targets = $derived(switchTargets(iso));

  // Focus goes back here on close: the drag handle or Switch Days… button that opened the picker.
  const opener = /** @type {HTMLElement | null} */ (document.activeElement);

  /** @type {HTMLElement | undefined} */
  let dialog = $state();
  $effect(() => /** @type {HTMLElement | null | undefined} */ (dialog?.querySelector('li button'))?.focus());

  /** Escape closes; Tab and Shift+Tab wrap around inside the dialog. @param {KeyboardEvent} e */
  function onkeydown(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab' || !dialog) return;
    const items = /** @type {HTMLElement[]} */ ([...dialog.querySelectorAll('button:not(:disabled), [href]')]);
    const first = items[0];
    const last = items[items.length - 1];
    const inside = dialog.contains(document.activeElement);
    if (e.shiftKey ? !inside || document.activeElement === first : !inside || document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  }

  let closed = false;
  /** @param {string} [to] the evening the meal went to @param {boolean} [followMeal] it went to an open evening */
  async function close(to, followMeal = false) {
    if (closed) return;
    closed = true;
    onclose();
    await tick();
    // A meal moved to an open evening takes its controls along: focus follows the meal (even when the old evening's
    // ⋯ button survives, because an open evening has its own menu).
    const card = to && (followMeal || !opener?.isConnected) ? document.getElementById(`day-${to}`) : null;
    const back = card
      ? (card.querySelector(`[data-switch-opener="${opener?.dataset.switchOpener}"]`) ?? card.querySelector('[data-switch-opener]'))
      : opener;
    /** @type {HTMLElement | null} */ (back)?.focus();
  }

  /** @param {string} d */
  function describe(d) {
    const status = statusOf(d);
    if (status === 'diningOut') return { icon: 'storefront', label: text.planner.switchDialog.nightOff };
    if (status === 'open') return { icon: 'restaurant', label: text.planner.switchDialog.open };
    return { recipe: recipeById.get(planner.entries[d].recipeId) };
  }

  /** @param {string} d */
  function pick(d) {
    const intoOpen = statusOf(d) === 'open';
    switchDays(iso, d);
    close(d, intoOpen);
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/40 p-0 backdrop-blur-md sm:items-center sm:p-4 print:hidden"
  onclick={(e) => e.target === e.currentTarget && close()}
>
  <div
    bind:this={dialog}
    role="dialog"
    aria-modal="true"
    aria-labelledby="switch-dialog-title"
    class="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lift sm:max-h-[80dvh] sm:rounded-2xl"
  >
    <div class="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
      <div class="min-w-0">
        <h2 id="switch-dialog-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
          <Icon name="swap_vert" class="text-[20px] text-primary" /> {text.planner.switchDialog.title}
        </h2>
        <div class="mt-3 flex items-center gap-3">
          {#if moving}<RecipeImage src={moving.image} alt="" class="h-12 w-12 flex-shrink-0 rounded-lg" />{/if}
          <p class="text-body-sm text-on-surface-variant">
            {text.planner.switchDialog.moveBefore} <span class="font-semibold text-on-surface">{moving?.title ?? text.planner.switchDialog.thisMeal}</span> {text.planner.switchDialog.moveAfter(formatWeekday(iso))}
          </p>
        </div>
      </div>
      <button type="button" aria-label={text.common.close} class="focus-ring rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high" onclick={() => close()}>
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
        {#each targets as d (d)}
          {@const { icon, label, recipe } = describe(d)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container"
              onclick={() => pick(d)}
            >
              <span class="w-24 flex-shrink-0">
                <span class="block text-sm font-semibold uppercase tracking-wide text-on-surface-variant">{formatWeekday(d)}</span>
                <span class="block text-xs text-on-surface-variant">{formatShort(d)}</span>
              </span>
              {#if recipe}
                <RecipeImage src={recipe.image} alt="" class="h-12 w-12 flex-shrink-0 rounded-lg" />
                <span class="min-w-0 flex-1 truncate text-body-md text-on-surface">{recipe.title}</span>
              {:else}
                <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
                  <Icon name={icon} class="text-2xl" />
                </span>
                <span class="min-w-0 flex-1 truncate text-body-md text-on-surface-variant">{label}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
      <p class="mt-3 text-xs text-on-surface-variant">{text.planner.switchDialog.note(formatWeekday(iso))}</p>
    </div>
  </div>
</div>
