<script>
  // View / edit dialog for "Ingredients I Have": add, search and remove. Changes save as they happen.
  import Icon from './Icon.svelte';
  import { settings, setHave } from '../settings.svelte.js';
  import { showToast } from '../toast.svelte.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  let draft = $state('');
  let query = $state('');
  /** @type {HTMLElement | undefined} */
  let input = $state();
  $effect(() => input?.focus());

  const all = $derived([...settings.have].sort((a, b) => a.localeCompare(b)));
  const shown = $derived(query.trim() ? all.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase())) : all);

  function add(e) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setHave(name, true);
    draft = '';
    showToast(`${name} will stay off your grocery list.`);
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
    aria-labelledby="have-dialog-title"
    class="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lift sm:max-h-[80dvh] sm:rounded-2xl"
  >
    <div class="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
      <h2 id="have-dialog-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="inventory_2" class="text-[20px] text-primary" /> Ingredients I Have
      </h2>
      <button type="button" aria-label="Close" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high" onclick={onclose}>
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <form onsubmit={add} class="flex gap-2 px-5 pb-3">
      <input
        bind:this={input}
        required
        bind:value={draft}
        aria-label="Ingredient"
        placeholder="Add an ingredient, e.g. Egg noodles"
        class="{inputClass} min-w-0 flex-1"
      />
      <button type="submit" class="btn-primary shrink-0 py-2.5">Add</button>
    </form>

    {#if all.length > 6}
      <div class="px-5 pb-3">
        <input type="search" bind:value={query} aria-label="Search ingredients" placeholder="Search {all.length} ingredients" class="{inputClass} w-full" />
      </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      {#if shown.length}
        <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
          {#each shown as name (name)}
            <li class="flex items-center gap-3 px-4 py-2.5">
              <span class="min-w-0 flex-1 truncate text-body-md text-on-surface">{name}</span>
              <button
                type="button"
                aria-label="Remove {name}"
                class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
                onclick={() => setHave(name, false)}
              >
                <Icon name="delete" class="text-[18px]" />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-outline">
          {all.length ? 'No ingredient matches your search.' : 'Nothing here yet.'}
        </p>
      {/if}
    </div>
  </div>
</div>
