<script>
  // View / edit dialog for "Aisle Mappings": add, search, change an aisle and remove. Changes save as they happen.
  import Icon from './Icon.svelte';
  import { aisles } from '../data/aisles.js';
  import { aisleLabel } from '../recipes.svelte.js';
  import { settings, setAisleMapping, removeAisleMapping } from '../settings.svelte.js';
  import { mappingKey } from '../aisleMap.js';
  import { showToast } from '../toast.svelte.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  let draft = $state({ name: '', tag: 'Pantry' });
  let query = $state('');
  /** @type {HTMLElement | undefined} */
  let input = $state();
  $effect(() => input?.focus());

  const all = $derived([...settings.aisles].sort((a, b) => a.name.localeCompare(b.name)));
  const shown = $derived(query.trim() ? all.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())) : all);

  function add(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const existing = settings.aisles.some((m) => mappingKey(m.name) === mappingKey(name));
    setAisleMapping(name, draft.tag);
    showToast(`${existing ? 'Updated' : 'Added'} ${name} → ${aisleLabel(draft.tag)}.`);
    draft = { name: '', tag: draft.tag };
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
    aria-labelledby="aisle-dialog-title"
    class="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lift sm:max-h-[80dvh] sm:rounded-2xl"
  >
    <div class="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
      <h2 id="aisle-dialog-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="shelves" class="text-[20px] text-primary" /> Aisle Mappings
      </h2>
      <button type="button" aria-label="Close" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high" onclick={onclose}>
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <form onsubmit={add} class="grid grid-cols-1 gap-2 px-5 pb-3 sm:grid-cols-[2fr_1.3fr_auto]">
      <input
        bind:this={input}
        required
        bind:value={draft.name}
        aria-label="Ingredient"
        placeholder="Ingredient, e.g. Oat milk"
        class={inputClass}
      />
      <select bind:value={draft.tag} aria-label="Aisle" class={inputClass}>
        {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
      </select>
      <button type="submit" class="btn-primary py-2.5">Add Mapping</button>
    </form>

    {#if all.length > 6}
      <div class="px-5 pb-3">
        <input type="search" bind:value={query} aria-label="Search mappings" placeholder="Search {all.length} mappings" class="{inputClass} w-full" />
      </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      {#if shown.length}
        <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
          {#each shown as m (m.name)}
            <li class="flex items-center gap-3 px-4 py-2.5">
              <span class="min-w-0 flex-1 truncate text-body-md text-on-surface">{m.name}</span>
              <select
                aria-label="Aisle for {m.name}"
                value={m.tag}
                onchange={(e) => setAisleMapping(m.name, e.currentTarget.value)}
                class="{inputClass} py-1.5"
              >
                {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
              </select>
              <button
                type="button"
                aria-label="Remove {m.name}"
                class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
                onclick={() => removeAisleMapping(m.name)}
              >
                <Icon name="delete" class="text-[18px]" />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-outline">
          {all.length ? 'No mapping matches your search.' : 'No custom mappings yet.'}
        </p>
      {/if}
    </div>
  </div>
</div>
