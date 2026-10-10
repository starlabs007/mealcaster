<script>
  // View / edit dialog for the ingredient list: add, search, mark in stock, edit name / plural / aisle, merge two
  // ingredients and delete unused ones. Changes save as they happen; merge and delete offer Undo.
  import Icon from './Icon.svelte';
  import Combobox from './Combobox.svelte';
  import { aisles } from '../data/aisles.js';
  import { aisleLabel } from '../recipes.svelte.js';
  import { addIngredient, findIngredient, ingredientOf, ingredients, setOnHand, updateIngredient } from '../ingredients.svelte.js';
  import { deleteIngredient, ingredientUses, mergeIngredient } from '../ingredientActions.svelte.js';
  import { foldKey, suggest, tidyIngredientName } from '../ingredients.js';
  import { guessAisle } from '../ingredientText.js';
  import { showToast } from '../toast.svelte.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  let draft = $state({ name: '', aisle: 'Pantry' });
  let aislePicked = false;
  let query = $state('');
  /** @type {'all' | 'stock' | 'unused'} */
  let filter = $state('all');
  /** @type {HTMLElement | undefined} */
  let input = $state();
  // Not on phones: the keyboard would cover the list.
  $effect(() => {
    if (matchMedia('(min-width: 640px)').matches) input?.focus();
  });

  /** The row being edited: its fields, or a merge target being picked. */
  /** @type {{ id: string, name: string, plural: string, aisle: string, merging: boolean, into: string } | null} */
  let editing = $state(null);

  const uses = $derived(ingredientUses());
  const all = $derived([...ingredients].sort((a, b) => a.name.localeCompare(b.name)));
  const counts = $derived({
    stock: all.filter((i) => i.onHand).length,
    unused: all.filter((i) => !uses.has(i.id)).length,
  });
  const shown = $derived.by(() => {
    const q = foldKey(query);
    return all.filter(
      (i) =>
        (filter === 'all' || (filter === 'stock' ? i.onHand : !uses.has(i.id))) &&
        (!q || foldKey(i.name).includes(q) || foldKey(i.plural).includes(q)),
    );
  });

  const recipeCount = (n) => (n ? `${n} recipe${n === 1 ? '' : 's'}` : 'Not in a recipe');

  function add(event) {
    event.preventDefault();
    const name = tidyIngredientName(draft.name);
    if (!name) return;
    const existing = findIngredient(name);
    if (existing) {
      query = existing.name;
      filter = 'all';
      showToast(`You already have ${existing.name}.`);
      return;
    }
    const added = addIngredient({ name, aisle: draft.aisle });
    showToast(`Added ${added.name} (${aisleLabel(added.aisle)}).`);
    draft = { name: '', aisle: draft.aisle };
    aislePicked = false;
  }

  function onDraftName() {
    if (!aislePicked && draft.name.trim()) draft.aisle = guessAisle(draft.name);
  }

  /** @param {import('../ingredients.js').Ingredient} i */
  function edit(i) {
    editing = { id: i.id, name: i.name, plural: i.plural, aisle: i.aisle, merging: false, into: '' };
  }

  /** Another ingredient already called `text` (name or plural), if any. */
  const takenBy = (text, id) => {
    const other = text.trim() ? findIngredient(text) : undefined;
    return other && other.id !== id ? other : undefined;
  };
  const nameClash = $derived(editing && !editing.merging ? takenBy(editing.name, editing.id) : undefined);
  const pluralClash = $derived(editing && !editing.merging ? takenBy(editing.plural, editing.id) : undefined);

  function save(event) {
    event.preventDefault();
    if (!editing || nameClash || pluralClash || !tidyIngredientName(editing.name)) return;
    updateIngredient(editing.id, { name: editing.name, plural: editing.plural, aisle: editing.aisle });
    showToast(`Saved ${ingredientOf(editing.id)?.name}.`);
    editing = null;
  }

  const mergeTargets = $derived(
    editing
      ? all.filter((i) => i.id !== editing.id).map((i) => ({ value: i.name, label: i.name, hint: aisleLabel(i.aisle), keys: i.plural ? [i.plural] : [] }))
      : [],
  );
  const mergeInto = $derived(editing?.merging && editing.into.trim() ? takenBy(editing.into, editing.id) : undefined);

  /** @param {string} from @param {import('../ingredients.js').Ingredient | undefined} into */
  function merge(from, into) {
    const a = ingredientOf(from);
    if (!a || !into) return;
    const n = uses.get(from) ?? 0;
    const name = a.name;
    const undo = mergeIngredient(from, into.id);
    if (!undo) return;
    editing = null;
    showToast(`Merged ${name} into ${into.name}${n ? ` (${recipeCount(n)} updated)` : ''}.`, { label: 'Undo', run: undo });
  }

  /** @param {import('../ingredients.js').Ingredient} i */
  function remove(i) {
    const undo = deleteIngredient(i.id);
    if (!undo) return;
    editing = null;
    showToast(`Deleted ${i.name}.`, { label: 'Undo', run: undo });
  }

  function onkeydown(e) {
    // A suggestion list closing takes the Escape (it calls preventDefault).
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (editing) editing = null;
    else onclose();
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/40 p-0 backdrop-blur-md sm:items-center sm:p-4 print:hidden"
  onclick={(e) => e.target === e.currentTarget && onclose()}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="ingredients-dialog-title"
    class="flex h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lift sm:h-[min(85dvh,46rem)] sm:rounded-2xl"
  >
    <div class="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
      <h2 id="ingredients-dialog-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="grocery" class="text-[20px] text-primary" /> Ingredients
        <span class="font-sans text-body-sm text-outline">{all.length}</span>
      </h2>
      <button type="button" aria-label="Close" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high" onclick={onclose}>
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <form onsubmit={add} class="grid grid-cols-[1fr_auto] gap-2 px-5 pb-3 sm:grid-cols-[2fr_1.3fr_auto]">
      <input
        bind:this={input}
        required
        bind:value={draft.name}
        oninput={onDraftName}
        aria-label="New ingredient"
        placeholder="New ingredient, e.g. bananas"
        autocomplete="off"
        class="{inputClass} col-span-2 sm:col-span-1"
      />
      <select bind:value={draft.aisle} onchange={() => (aislePicked = true)} aria-label="Aisle" class={inputClass}>
        {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
      </select>
      <button type="submit" class="btn-primary py-2.5"><span class="sm:hidden">Add</span><span class="hidden sm:inline">Add Ingredient</span></button>
    </form>

    <div class="flex flex-col gap-2 px-5 pb-3">
      {#if all.length > 6}
        <input type="search" bind:value={query} aria-label="Search ingredients" placeholder="Search {all.length} ingredients" class="{inputClass} w-full" />
      {/if}
      <div class="flex flex-wrap gap-1" role="group" aria-label="Show">
        {#each [{ id: 'all', label: `All (${all.length})` }, { id: 'stock', label: `In stock (${counts.stock})` }, { id: 'unused', label: `Not in a recipe (${counts.unused})` }] as f (f.id)}
          <button
            type="button"
            aria-pressed={filter === f.id}
            onclick={() => (filter = /** @type {any} */ (f.id))}
            class="rounded-lg px-3 py-1.5 text-label-md transition-colors {filter === f.id
              ? 'bg-surface-container-high text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container-low'}"
          >
            {f.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      {#if shown.length}
        <!-- No overflow-hidden: it would clip the merge picker's suggestion list. -->
        <ul class="divide-y divide-surface-container-high rounded-xl border border-surface-container-high">
          {#each shown as i (i.id)}
            {@const n = uses.get(i.id) ?? 0}
            <li class="px-4 py-2.5">
              <div class="flex items-center gap-3">
                <label class="flex shrink-0 cursor-pointer items-center" title={i.onHand ? 'In stock — untick when you run out' : 'Tick when you have it at home'}>
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    checked={i.onHand}
                    aria-label="{i.name} in stock"
                    onchange={(e) => setOnHand(i.id, e.currentTarget.checked)}
                  />
                  <span
                    class="flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container {i.onHand
                      ? 'border-primary-container bg-primary-container text-on-primary'
                      : 'border-outline-variant text-transparent'}"
                  >
                    <Icon name="check" class="text-[13px]" />
                  </span>
                </label>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-body-md text-on-surface">
                    {i.name}{#if i.plural}<span class="text-outline">{` · ${i.plural}`}</span>{/if}
                  </span>
                  <span class="block truncate text-body-sm text-on-surface-variant">{aisleLabel(i.aisle)} · {recipeCount(n)}</span>
                </span>
                <button
                  type="button"
                  aria-label="Edit {i.name}"
                  aria-expanded={editing?.id === i.id}
                  class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                  onclick={() => (editing?.id === i.id ? (editing = null) : edit(i))}
                >
                  <Icon name={editing?.id === i.id ? 'expand_less' : 'edit'} class="text-[18px]" />
                </button>
              </div>

              {#if editing?.id === i.id}
                {#if !editing.merging}
                  <form onsubmit={save} class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                      Name
                      <input required bind:value={editing.name} autocomplete="off" class="{inputClass} py-1.5 {nameClash ? 'border-secondary' : ''}" />
                    </label>
                    <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                      Plural <span class="sr-only">(optional)</span>
                      <input bind:value={editing.plural} autocomplete="off" placeholder="None" class="{inputClass} py-1.5 {pluralClash ? 'border-secondary' : ''}" />
                    </label>
                    <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                      Aisle
                      <select bind:value={editing.aisle} class="{inputClass} py-1.5">
                        {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
                      </select>
                    </label>
                    {#if nameClash ?? pluralClash}
                      {@const other = nameClash ?? pluralClash}
                      <p class="flex flex-wrap items-center gap-x-2 text-body-sm text-secondary sm:col-span-3">
                        “{other.name}” is already an ingredient.
                        <button type="button" class="text-label-md text-primary hover:underline" onclick={() => merge(i.id, other)}>
                          Merge {i.name} into it
                        </button>
                      </p>
                    {/if}
                    <p class="text-body-sm text-on-surface-variant sm:col-span-3">
                      Changes show in every recipe that uses it{n ? ` (${recipeCount(n)})` : ''}. Leave Plural empty for words like rice or mint.
                    </p>
                    <div class="flex flex-wrap items-center gap-2 sm:col-span-3">
                      <button type="submit" class="btn-primary py-1.5" disabled={!!(nameClash ?? pluralClash)}>Save</button>
                      <button type="button" class="btn-outline py-1.5" onclick={() => (editing = null)}>Cancel</button>
                      <span class="flex-1"></span>
                      <button type="button" class="btn-outline py-1.5" onclick={() => (editing.merging = true)}>
                        <Icon name="call_merge" class="text-[16px]" /> Merge into…
                      </button>
                      <button
                        type="button"
                        class="btn-outline py-1.5 text-secondary disabled:opacity-50"
                        disabled={n > 0}
                        title={n ? `Used by ${recipeCount(n)} — merge it into another ingredient instead` : undefined}
                        onclick={() => remove(i)}
                      >
                        <Icon name="delete" class="text-[16px]" /> Delete
                      </button>
                    </div>
                    {#if n > 0}
                      <p class="text-body-sm text-outline sm:col-span-3">Only ingredients no recipe uses can be deleted.</p>
                    {/if}
                  </form>
                {:else}
                  <div class="mt-3 flex flex-col gap-2">
                    <p class="text-body-sm text-on-surface-variant">
                      Every recipe line and grocery item using <strong class="text-on-surface">{i.name}</strong> will use the ingredient you pick, and
                      {i.name} is removed. Use it for duplicates, like “yellow onion” and “onion” (put “yellow” in the recipe’s note).
                    </p>
                    <div class="flex flex-wrap items-center gap-2">
                      <Combobox
                        label="Merge {i.name} into"
                        placeholder="Ingredient to keep"
                        suggestions={mergeTargets}
                        bind:value={editing.into}
                        class="min-w-0 flex-1"
                        inputClass="{inputClass} w-full py-1.5"
                      />
                      <button type="button" class="btn-primary py-1.5" disabled={!mergeInto} onclick={() => merge(i.id, mergeInto)}>
                        Merge
                      </button>
                      <button type="button" class="btn-outline py-1.5" onclick={() => (editing.merging = false)}>Back</button>
                    </div>
                    {#if editing.into.trim() && !mergeInto && !suggest(mergeTargets, editing.into, 1).length}
                      <p class="text-body-sm text-secondary">No ingredient by that name.</p>
                    {/if}
                  </div>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-outline">
          {all.length ? 'No ingredient matches.' : 'No ingredients yet — they’re added with your recipes.'}
        </p>
      {/if}
    </div>
  </div>
</div>
