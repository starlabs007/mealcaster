<script module>
  // Mise-en-place check state per recipe, kept for the session so it survives
  // hopping between recipes and the weekly plan.
  /** @type {Record<string, string[]>} */
  const checkedByRecipe = $state({});
</script>

<script>
  import Icon from '../lib/components/Icon.svelte';
  import { formatQty } from '../lib/format.js';
  import { renderMarkdown } from '../lib/markdown.js';
  import RecipeImage from '../lib/components/RecipeImage.svelte';
  import PrintOptionsDialog from '../lib/components/PrintOptionsDialog.svelte';
  import RecipePrintSimple from '../lib/components/RecipePrintSimple.svelte';
  import { printOptions, setPrintOptions, TEXT_DELTA } from '../lib/printOptions.svelte.js';
  import { recipeById, formatMinutes, deleteRecipe, restoreRecipe } from '../lib/recipes.svelte.js';
  import { isFavorite, toggleFavorite } from '../lib/favorites.svelte.js';
  import { groceryKeys, ingredientKeys, addToGrocery } from '../lib/grocery.svelte.js';
  import { planner, dayOfRecipe, nextPlannedAfter, firstOpenDay, assignRecipe } from '../lib/planner.svelte.js';
  import { href, navigate } from '../lib/router.svelte.js';
  import { formatLong, formatWeekday } from '../lib/dates.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { tick } from 'svelte';

  /** @type {{ id: string, day?: string }} */
  let { id, day: dayParam } = $props();

  // App.svelte keys this component by id, so reading it once is intentional.
  // svelte-ignore state_referenced_locally
  const recipe = recipeById.get(id);
  let servings = $state(recipe?.serves ?? 2);
  if (recipe) checkedByRecipe[recipe.id] ??= [];

  const day = $derived(
    recipe && dayParam && planner.entries[dayParam]?.recipeId === recipe.id ? dayParam : recipe && dayOfRecipe(recipe.id),
  );
  const editable = $derived(!!day && day >= planner.today);
  const next = $derived(day ? nextPlannedAfter(day) : undefined);
  const openDay = $derived(day ? undefined : firstOpenDay());
  const favorite = $derived(recipe ? isFavorite(recipe.id) : false);
  const scale = $derived(recipe ? servings / recipe.serves : 1);

  const allKeys = recipe ? ingredientKeys(recipe.id) : [];
  const checked = $derived(recipe ? checkedByRecipe[recipe.id] : []);
  const onList = $derived(groceryKeys());
  const notOnList = $derived(allKeys.filter((k) => !onList.has(k)));
  const uncheckedToPush = $derived(notOnList.filter((k) => !checked.includes(k)));

  function toggleCheck(key) {
    const list = checkedByRecipe[recipe.id];
    checkedByRecipe[recipe.id] = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
  }

  function toggleAll() {
    checkedByRecipe[recipe.id] = checked.length === allKeys.length ? [] : [...allKeys];
  }

  function push(keys, what) {
    const added = addToGrocery(keys);
    showToast(`Added ${added} ${added === 1 ? 'ingredient' : 'ingredients'} ${what} to your grocery list.`);
  }

  function planOn(iso) {
    assignRecipe(iso, recipe.id);
    showToast(`${recipe.shortTitle} planned for ${formatLong(iso)}.`);
  }

  let confirmingDelete = $state(false);
  /** @type {HTMLElement | undefined} */
  let confirmDialog = $state();

  $effect(() => {
    if (confirmingDelete) confirmDialog?.focus();
  });

  function remove() {
    confirmingDelete = false;
    const removed = deleteRecipe(recipe.id);
    navigate('/catalog');
    showToast(`${recipe.shortTitle} deleted.`, { label: 'Undo', run: () => restoreRecipe(removed) }, 10000);
  }

  let choosingPrint = $state(false);
  const photo = recipe ? (recipe.hero ?? recipe.image) : undefined;
  const textDelta = $derived(TEXT_DELTA[printOptions.textSize] ?? 0);

  /** @param {import('../lib/printOptions.svelte.js').PrintOptions} options */
  async function print(options) {
    setPrintOptions(options);
    choosingPrint = false;
    await tick(); // let the dialog close before the print snapshot
    window.print();
  }

  /** @param {import('../lib/data/recipes.js').Step} step @param {number} i */
  function stepTone(step, i) {
    if (step.critical) return 'bg-secondary-fixed/50 text-secondary';
    if (i === recipe.steps.length - 1) return 'bg-primary-fixed/50 text-primary';
    return 'bg-surface-container-high text-on-surface-variant';
  }

  /** "15 mins", "1 min", "3.5 hrs" */
  const mins = (m) => (m >= 60 ? formatMinutes(m) : `${m} ${m === 1 ? 'min' : 'mins'}`);

  const stats = recipe
    ? [
        { icon: 'emoji_symbols', label: 'Prep Time', value: mins(recipe.prepMinutes) },
        { icon: 'skillet', label: 'Cook Time', value: mins(recipe.cookMinutes) },
        { icon: 'schedule', label: 'Total Time', value: mins(recipe.minutes) },
      ]
    : [];
</script>

{#if !recipe}
  <div class="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
    <Icon name="menu_book" class="text-[40px] text-outline" />
    <h1 class="font-display text-headline-lg text-on-surface">Recipe not found</h1>
    <p class="text-body-md text-on-surface-variant">It may have been removed from the household recipe box.</p>
    <a href={href('/catalog')} class="btn-primary mt-2 py-2">Browse the Recipe Catalog</a>
  </div>
{:else}
  <!-- Breadcrumb & actions bar -->
  <div class="border-b border-surface-container-high bg-surface-container-low/60 print:hidden">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-gutter-desktop">
      <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface-variant">
        <Icon name="arrow_back" class="text-[16px]" />
        {#if day}
          <a href={href('/')} class="shrink-0 font-semibold text-on-surface hover:text-primary">Weekly Dinner Plan</a>
          <span class="text-outline">/</span>
          <span class="shrink-0">{formatWeekday(day)} Dinner</span>
        {:else}
          <a href={href('/catalog')} class="shrink-0 font-semibold text-on-surface hover:text-primary">Recipe Catalog</a>
        {/if}
        <span class="text-outline">/</span>
        <span class="truncate text-on-surface" aria-current="page">{recipe.shortTitle}</span>
      </nav>

      <div class="flex flex-wrap items-center gap-2">
        <a href={href(`/recipe/${recipe.id}/edit`)} class="btn-outline">
          <Icon name="edit" class="text-[16px]" /> Edit
        </a>
        <button type="button" class="btn-outline hover:text-secondary" onclick={() => (confirmingDelete = true)}>
          <Icon name="delete" class="text-[16px]" /> Delete
        </button>
        <button
          type="button"
          aria-pressed={favorite}
          onclick={() => toggleFavorite(recipe.id)}
          class="btn-outline {favorite ? 'text-secondary' : ''}"
        >
          <Icon name="favorite" class="text-[16px] text-secondary {favorite ? 'icon-filled' : ''}" />
          {favorite ? 'Favorited' : 'Favorite'}
        </button>
        {#if editable}
          <a href={href('/catalog', { day })} class="btn-outline">
            <Icon name="swap_horiz" class="text-[16px]" /> Swap Meal
          </a>
        {:else if openDay}
          <button type="button" class="btn-outline" onclick={() => planOn(openDay)}>
            <Icon name="event_available" class="text-[16px]" /> Plan for {formatWeekday(openDay)}
          </button>
        {/if}
        <button type="button" class="btn-outline" onclick={() => (choosingPrint = true)}>
          <Icon name="print" class="text-[16px]" /> Print
        </button>
        <button
          type="button"
          disabled={!notOnList.length}
          onclick={() => push(notOnList, `from ${recipe.shortTitle}`)}
          class="btn bg-secondary text-on-secondary shadow-[0_2px_8px_-2px_rgba(162,62,24,0.3)] hover:bg-[#b34728]"
        >
          <Icon name={notOnList.length ? 'add_shopping_cart' : 'check'} class="text-[16px]" />
          {#if notOnList.length}
            Add to List
            <span class="rounded-full bg-surface-container-lowest px-1.5 py-0.5 text-label-caps text-secondary">+{notOnList.length}</span>
          {:else}
            All on List
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Styled printout (two columns, tints kept); hidden when printing the simple layout. -->
  <div
    class="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-gutter-desktop print:gap-5 print:p-0 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact] print:[&_*]:shadow-none
      {printOptions.simple ? 'print:hidden' : ''} {textDelta ? 'print-sized' : ''}"
    style="--print-delta: {textDelta}pt; --print-image: {printOptions.imageScale}%"
  >
    <!-- Title block -->
    <header class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2 print:hidden">
        {#if day}
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed/60 px-2.5 py-1 text-label-caps uppercase text-primary">
            <span class="h-1.5 w-1.5 rounded-full bg-primary"></span> Scheduled: {formatLong(day)}
          </span>
        {/if}
        {#if recipe.custom}
          <span class="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-label-sm text-secondary">
            <Icon name="family_restroom" class="text-[13px]" /> Custom recipe · saved on this device
          </span>
        {:else}
          <span class="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant">
            <Icon name="table_chart" class="text-[13px]" /> Row {recipe.sheetRow} in [Recipes] sheet
          </span>
          {#if recipe.edited}
            <span class="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-label-sm text-secondary">
              <Icon name="edit" class="text-[13px]" /> Edited on this device
            </span>
          {/if}
        {/if}
      </div>
      <h1 class="max-w-4xl font-display text-headline-xl-mobile text-primary md:text-headline-xl">{recipe.title}</h1>
      {#if recipe.description}<p class="max-w-3xl text-body-lg text-on-surface-variant">{recipe.description}</p>{/if}

      <div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:max-w-4xl print:max-w-none print:grid-cols-4">
        {#each stats as stat (stat.label)}
          <div class="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-card">
              <Icon name={stat.icon} class="text-[18px]" />
            </span>
            <div>
              <div class="text-label-caps uppercase text-outline">{stat.label}</div>
              <div class="text-body-sm font-semibold text-on-surface">{stat.value}</div>
            </div>
          </div>
        {/each}
        <div class="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-4 py-3">
          <div>
            <div class="text-label-caps uppercase text-outline">Servings</div>
            <div class="text-body-sm font-semibold text-on-surface">{servings} Servings</div>
          </div>
          <div class="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest print:hidden">
            <button type="button" aria-label="Fewer servings" class="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-40" disabled={servings <= 1} onclick={() => servings--}>
              <Icon name="remove" class="text-[16px]" />
            </button>
            <span class="w-6 text-center text-label-md text-on-surface" aria-live="polite">{servings}</span>
            <button type="button" aria-label="More servings" class="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-40" disabled={servings >= 12} onclick={() => servings++}>
              <Icon name="add" class="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 print:flex print:flex-col print:items-stretch print:gap-5">
      <!-- Printed as one column: photo, ingredients, method, then notes. -->
      <!-- Left: photo & notes -->
      <aside class="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-5 print:contents">
        <figure
          class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card print:order-1 print:mx-auto print:w-[var(--print-image)]
            {printOptions.image && photo ? '' : 'print:hidden'}"
        >
          <!-- Photo-less (custom) recipes get a shorter placeholder until the column layout kicks in. -->
          <div class="relative {recipe.hero ?? recipe.image ? 'aspect-[4/3]' : 'aspect-[3/1] lg:aspect-[4/3]'}">
            <RecipeImage src={recipe.hero ?? recipe.image} alt={recipe.title} class="h-full w-full" />
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-caps text-on-surface shadow-sm backdrop-blur-md">
                <Icon name="restaurant_menu" class="text-[13px]" /> {formatMinutes(recipe.minutes)} · Serves {recipe.serves}
              </span>
              <span class="rounded-full bg-primary-container/90 px-2.5 py-1 text-label-caps text-on-primary shadow-sm backdrop-blur-md">
                {recipe.badge.label}
              </span>
            </div>
          </div>
        </figure>

        {#if recipe.notes?.trim()}
        <section class="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-card print:order-3 print:break-inside-avoid">
          <div class="mb-4 flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
              <Icon name="auto_awesome" class="text-[18px]" />
            </span>
            <div>
              <h2 class="font-display text-headline-sm text-on-surface">Cook’s Secrets</h2>
              <p class="text-label-caps uppercase text-outline">Notes</p>
            </div>
          </div>
          <div class="notes-md rounded-r-lg border-l-4 border-secondary bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
            {@html renderMarkdown(recipe.notes)}
          </div>
        </section>
        {/if}
      </aside>

      <!-- Right: ingredients & method -->
      <div class="flex flex-col gap-8 lg:col-span-7 print:order-2 print:gap-5">
        <section class="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <Icon name="receipt_long" class="mt-0.5 text-[22px] text-secondary" />
              <div>
                <h2 class="font-display text-headline-sm text-on-surface">Mise en Place Ingredients</h2>
                <p class="text-body-sm text-on-surface-variant print:hidden">Check items as you prep or push directly to grocery</p>
              </div>
            </div>
            <button type="button" class="inline-flex shrink-0 items-center gap-1 text-label-sm text-on-surface-variant hover:text-primary print:hidden" onclick={toggleAll}>
              <Icon name={checked.length === allKeys.length ? 'remove_done' : 'done_all'} class="text-[16px]" />
              {checked.length === allKeys.length ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div class="flex flex-col gap-4">
            {#each recipe.ingredients as group, g (group.title)}
              <div class="rounded-xl bg-surface-container-low p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="text-label-caps uppercase text-secondary">{g + 1}. {group.title}</h3>
                  <span class="text-label-caps uppercase text-outline">{group.category}</span>
                </div>
                <ul class="flex flex-col">
                  {#each group.items as item, i (i)}
                    {@const key = `${recipe.id}:${g}:${i}`}
                    {@const isChecked = checked.includes(key)}
                    <li class="print:break-inside-avoid">
                      <label class="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-surface-container">
                        <input type="checkbox" class="peer sr-only" checked={isChecked} onchange={() => toggleCheck(key)} />
                        <span
                          class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container {isChecked
                            ? 'border-primary-container bg-primary-container text-on-primary'
                            : 'border-outline bg-surface-container-lowest text-transparent'}"
                          aria-hidden="true"
                        >
                          <Icon name="check" class="text-[13px]" />
                        </span>
                        <span class="flex-1 text-body-sm {isChecked ? 'text-outline line-through decoration-outline' : 'text-on-surface'}">
                          {#if item.qty != null}<strong class="font-semibold">{formatQty(item.qty * scale)}</strong>{/if}
                          {item.unit ?? ''} {item.text}
                        </span>
                        <span class="shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-label-caps text-on-surface-variant">
                          {item.tag}
                        </span>
                      </label>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>

          <div class="mt-5 flex flex-col gap-3 border-t border-surface-container-high pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p class="text-body-sm text-on-surface-variant">
              Missing something? Push every unchecked ingredient to your grocery list.
            </p>
            <button
              type="button"
              disabled={!uncheckedToPush.length}
              onclick={() => push(uncheckedToPush, 'you haven’t checked off')}
              class="btn shrink-0 border border-outline-variant bg-surface-container-high py-2 text-on-surface hover:bg-surface-dim"
            >
              <Icon name="check_circle" class="text-[16px]" />
              {uncheckedToPush.length
                ? `Push Unchecked to Grocery (${uncheckedToPush.length} ${uncheckedToPush.length === 1 ? 'item' : 'items'})`
                : 'Unchecked items are on your list'}
            </button>
          </div>
        </section>

        <section>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="flex items-center gap-2 font-display text-headline-md text-on-surface">
              <Icon name="outdoor_grill" class="text-[22px] text-primary" /> Step-by-Step Method
            </h2>
            <span class="text-label-caps uppercase text-outline">{recipe.steps.length} Essential Movements</span>
          </div>
          <ol class="flex flex-col gap-4 print:gap-3">
            {#each recipe.steps as step, i (i)}
              <li class="flex gap-4 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-card print:break-inside-avoid print:p-4">
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-body-lg font-semibold {step.critical
                    ? 'bg-secondary-fixed/50 text-secondary'
                    : 'bg-surface-container-low text-on-surface'}"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div class="flex-1">
                  <div class="mb-1.5 flex items-start justify-between gap-3">
                    <h3 class="font-display text-headline-sm text-on-surface">{step.title}</h3>
                    {#if step.minutes}
                      <span class="shrink-0 rounded-full px-2 py-0.5 text-label-caps uppercase {stepTone(step, i)}">
                        {mins(step.minutes)}
                      </span>
                    {/if}
                  </div>
                  <div class="notes-md text-body-sm text-on-surface-variant">{@html renderMarkdown(step.text)}</div>
                </div>
              </li>
            {/each}
          </ol>
        </section>
      </div>
    </div>

    <!-- Bottom navigation -->
    <div class="flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card">
          <Icon name="cloud_off" class="text-[20px]" />
        </span>
        <div>
          <p class="text-label-md text-on-surface">Saved on this device</p>
          <p class="text-body-sm text-outline">Google Sheets sync isn’t connected yet.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        {#if editable}
          <a href={href('/catalog', { day })} class="btn-outline py-2 text-on-surface">Swap Recipe from Catalog</a>
        {/if}
        {#if next}
          <a href={href(`/recipe/${next.recipe.id}`, { day: next.iso })} class="btn-primary py-2">
            Next: {formatWeekday(next.iso)} {next.recipe.shortTitle} <Icon name="arrow_forward" class="text-[16px]" />
          </a>
        {:else}
          <a href={href('/')} class="btn-primary py-2">
            Back to Weekly Menu <Icon name="arrow_forward" class="text-[16px]" />
          </a>
        {/if}
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && (confirmingDelete = false)} />

{#if recipe && printOptions.simple}
  <RecipePrintSimple
    {recipe}
    {servings}
    {scale}
    {mins}
    {textDelta}
    image={printOptions.image ? photo : undefined}
    imageScale={printOptions.imageScale}
  />
{/if}

{#if choosingPrint}
  <PrintOptionsDialog hasImage={!!photo} onprint={print} onclose={() => (choosingPrint = false)} />
{/if}

{#if confirmingDelete}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-md print:hidden"
    onclick={(e) => e.target === e.currentTarget && (confirmingDelete = false)}
  >
    <div
      bind:this={confirmDialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-body"
      tabindex="-1"
      class="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-lift focus:outline-none"
    >
      <h2 id="delete-title" class="font-display text-headline-sm text-on-surface">Delete this recipe?</h2>
      <p id="delete-body" class="mt-2 text-body-sm text-on-surface-variant">
        <strong>{recipe.title}</strong> will be removed from your recipes. You can undo this right after.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="btn-outline" onclick={() => (confirmingDelete = false)}>Cancel</button>
        <button type="button" class="btn bg-secondary text-on-secondary shadow-sm hover:opacity-90" onclick={remove}>
          <Icon name="delete" class="text-[16px]" /> Delete
        </button>
      </div>
    </div>
  </div>
{/if}
