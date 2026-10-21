<script>
  import { slide } from 'svelte/transition';
  import { text } from '../lib/text.js';
  import { SvelteSet } from 'svelte/reactivity';
  import Icon from '../lib/components/Icon.svelte';
  import Combobox from '../lib/components/Combobox.svelte';
  import {
    departments,
    groceryLines,
    stockHiddenLines,
    setLineStatus,
    addItem,
    removeAdded,
    thisWeekStart,
    weekDinners,
  } from '../lib/grocery.svelte.js';
  import { aisles, aisleLabel, guessAisle } from '../lib/recipes.svelte.js';
  import { addIngredient, findIngredient, ingredients, setOnHand } from '../lib/ingredients.svelte.js';
  import { shoppingName } from '../lib/ingredients.js';
  import { planner, weekOffset, goToWeek, shiftWeek } from '../lib/planner.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { formatRange, formatShort, formatWeekday, isoWeek, mondayInWeek } from '../lib/dates.js';
  import { devicePrefs } from '../lib/devicePrefs.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { sheets } from '../lib/sheets.svelte.js';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import GroceryPrint from '../lib/components/GroceryPrint.svelte';

  const toneClass = {
    sage: 'bg-[#eaf0ec] text-[#2c4635]',
    saffron: 'bg-[#faf3e5] text-[#8c6517]',
    paprika: 'bg-[#faece8] text-secondary',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  };

  let aisle = $state('all');
  let showBought = $state(true);
  let adding = $state(false);
  let draft = $state({ name: '', note: '', aisle: 'Produce', everyWeek: false });
  // The aisle follows the item's name until you pick one yourself; an existing ingredient keeps its own.
  let aislePicked = false;
  const draftIngredient = $derived(draft.name.trim() ? findIngredient(draft.name) : undefined);
  const onDraftName = () => {
    if (draftIngredient) draft.aisle = draftIngredient.aisle;
    else if (!aislePicked && draft.name.trim()) draft.aisle = guessAisle(draft.name);
  };

  const ingredientSuggestions = $derived(
    ingredients
      .map((i) => ({ value: i.name, label: i.name, hint: aisleLabel(i.aisle), keys: i.plural ? [i.plural] : [] }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  const offset = $derived(weekOffset());
  /** "this week", "next week", "last week" or "the week of Oct 10" */
  const weekName = $derived(
    offset === 0 ? text.grocery.weekName.thisWeek : offset === 1 ? text.grocery.weekName.nextWeek : offset === -1 ? text.grocery.weekName.lastWeek : text.grocery.weekName.weekOf(formatShort(planner.weekStart)),
  );
  const weekChoices = [
    { offset: 0, label: text.grocery.weekPicker.thisWeek },
    { offset: 1, label: text.grocery.weekPicker.nextWeek },
  ];
  // A past week's list stays as it was: stock changes don't reach it.
  const pastWeek = $derived(planner.weekStart < thisWeekStart());

  const lines = $derived(groceryLines());
  const haveHidden = $derived([...stockHiddenLines()].sort((a, b) => a.name.localeCompare(b.name)));
  // Bought lines leave the aisle lists for the Bought ledger.
  const shopping = $derived(lines.filter((l) => l.status === 'need'));
  const acquired = $derived(lines.filter((l) => l.status === 'bought'));
  const toBuy = $derived(shopping.length);
  const bought = $derived(acquired.length);
  const completion = $derived(toBuy + bought ? Math.round((bought / (toBuy + bought)) * 100) : 0);

  const sections = $derived(
    departments.map((d) => ({ ...d, where: text.grocery.where[d.id], items: shopping.filter((l) => l.dept === d.id) })),
  );
  const spread = $derived(
    sections
      .filter((s) => s.items.length)
      .map((s) => ({ ...s, pct: Math.round((s.items.length / shopping.length) * 100) })),
  );

  const sources = $derived(
    weekDinners()
      .map((d) => ({
        day: d,
        count: shopping.filter((l) => l.sources.some((s) => s.recipeId === d.recipe.id)).length,
      })),
  );

  // Lines whose meal labels are all shown ("+N more" tapped).
  const expanded = new SvelteSet();

  function submitItem(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const existing = draftIngredient;
    const ingredient = existing ?? addIngredient({ name, aisle: draft.aisle });
    const wasOnHand = ingredient.onHand;
    addItem(ingredient.id, draft.note.trim(), draft.everyWeek);
    const label = shoppingName(ingredient);
    showToast(text.grocery.toasts.added(label, draft.everyWeek, weekName, wasOnHand));
    draft = { name: '', note: '', aisle: draft.aisle, everyWeek: draft.everyWeek };
    aislePicked = false;
  }

  /** @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  function markOnHand(item) {
    setOnHand(item.ingredientId, true);
    showToast(text.grocery.toasts.onHand(item.name), { label: text.common.undo, run: () => setOnHand(item.ingredientId, false) });
  }

  /** @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  function removeItem(item) {
    const everyWeek = item.every != null;
    const undo = removeAdded(item.ingredientId);
    showToast(text.grocery.toasts.removed(item.name, everyWeek), { label: text.common.undo, run: undo });
  }

  /** @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  function needIt(item) {
    setOnHand(item.ingredientId, false);
    showToast(text.grocery.toasts.needIt(item.name));
  }

  function listAsText() {
    const body = sections
      .filter((s) => s.items.length)
      .map((s) => `${s.label}\n${s.items.map((l) => `${'☐'} ${l.name}${l.amount ? ` — ${l.amount}` : ''}`).join('\n')}`)
      .join('\n\n');
    return `${text.grocery.shareText.heading(formatRange(planner.weekStart))}\n\n${body}`;
  }

  async function share() {
    const body = listAsText();
    try {
      if (navigator.share) await navigator.share({ title: text.grocery.shareText.title, text: body });
      else {
        await navigator.clipboard.writeText(body);
        showToast(text.grocery.toasts.copied);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showToast(text.grocery.toasts.shareFailed);
    }
  }
</script>

{#snippet chips(item, done)}
  {@const all = expanded.has(item.key) || item.sources.length <= 3}
  {@const shown = all ? item.sources : item.sources.slice(0, 2)}
  <ul class="mt-1 flex flex-wrap gap-1" aria-label={text.grocery.line.sourcesAria}>
    {#each shown as s, i (i)}
      <li class="max-w-full rounded-xl px-2 py-0.5 text-label-sm {toneClass[done ? 'neutral' : s.tone]}">
        {s.label}{#if s.note}<span class="opacity-80">{` · ${s.note}`}</span>{/if}
      </li>
    {/each}
    {#if !all}
      <li>
        <button
          type="button"
          class="rounded-full px-2 py-0.5 text-label-sm text-primary hover:bg-surface-container-high"
          aria-label={text.grocery.line.showAllAria(item.sources.length, item.name)}
          onclick={() => expanded.add(item.key)}
        >
          {text.grocery.line.more(item.sources.length - 2)}
        </button>
      </li>
    {/if}
  </ul>
{/snippet}

{#snippet line(item, done)}
  <li class="group flex gap-3 px-4 transition-colors hover:bg-surface-container-low/60 {devicePrefs.groceryMinimal ? 'items-center py-2' : 'items-start py-3.5'} {done ? 'opacity-70' : ''}">
    <button
      type="button"
      role="checkbox"
      aria-checked={item.status === 'bought'}
      aria-label={text.grocery.line.markBoughtAria(item.status === 'bought', item.name)}
      onclick={() => setLineStatus(item.ingredientId, item.status === 'bought' ? 'need' : 'bought')}
      class="{devicePrefs.groceryMinimal ? '' : 'mt-0.5'} flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors {item.status === 'bought'
        ? 'border-primary-container bg-primary-container text-on-primary'
        : 'border-outline-variant bg-surface-container-low text-transparent hover:border-primary-container'}"
    >
      <Icon name="check" class="text-[14px]" />
    </button>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-baseline gap-x-2">
        <span class="text-body-md font-medium {done ? 'text-outline line-through decoration-outline' : 'text-on-surface'}">{item.name}</span>
        {#if item.amount}<span class="text-body-sm text-on-surface-variant">{item.amount}</span>{/if}
        {#if item.optional}
          <span class="rounded bg-surface-container-high px-1.5 py-px text-label-caps uppercase text-on-surface-variant">{text.grocery.line.optional}</span>
        {/if}
      </p>
      {#if !devicePrefs.groceryMinimal}{@render chips(item, done)}{/if}
    </div>
    <div class="flex shrink-0 items-center">
      {#if done}
        <button
          type="button"
          title={text.grocery.line.needAfterAllTitle}
          aria-label={text.grocery.line.moveBackAria(item.name)}
          class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
          onclick={() => setLineStatus(item.ingredientId, 'need')}
        >
          <Icon name="add_shopping_cart" class="text-[18px]" />
        </button>
      {:else if !pastWeek}
        <button
          type="button"
          title={text.grocery.line.onHandTitle}
          aria-label={text.grocery.line.onHandAria(item.name)}
          class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
          onclick={() => markOnHand(item)}
        >
          <Icon name="inventory_2" class="text-[18px]" />
        </button>
      {/if}
      {#if item.added != null || item.every != null}
        <button
          type="button"
          title={item.every != null ? text.grocery.line.removeEveryTitle : text.grocery.line.removeTitle}
          aria-label={text.grocery.line.removeAria(item.name)}
          class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
          onclick={() => removeItem(item)}
        >
          <Icon name="delete" class="text-[18px]" />
        </button>
      {/if}
    </div>
  </li>
{/snippet}

<!-- Screen only; printing uses the plain checklist below. -->
<div class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-6 md:px-gutter-desktop print:hidden">
  <!-- Breadcrumb & sync status -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <nav aria-label={text.grocery.breadcrumbAria} class="flex items-center gap-1.5 text-label-md text-on-surface-variant">
      <Icon name="calendar_view_week" class="text-[16px]" />
      <a href={href('/')} class="hover:text-primary">{text.grocery.weeklyPlan}</a>
      <span class="text-outline">/</span>
      <Icon name="shopping_basket" class="text-[16px] text-secondary" />
      <span class="text-on-surface" aria-current="page">{text.grocery.crumb}</span>
    </nav>
    <SyncStatus variant="badge" />
  </div>

  <!-- Title & actions -->
  <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
    <div>
      <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
        {text.grocery.title}
      </h1>
      {#if !devicePrefs.groceryMinimal}
      <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
        {text.grocery.introBefore(weekName)} <strong class="text-on-surface">({formatRange(planner.weekStart)})</strong>.
        {#if sheets.spreadsheet && sheets.syncProvisions}
          {text.grocery.syncedBefore} <code class="rounded bg-surface-container-high px-1 text-[12px]">[{sheets.tabs.provisions}]</code> {text.grocery.syncedAfter}
        {:else}
          {text.grocery.savedOnDevice(!!sheets.spreadsheet)}
        {/if}
      </p>
      {/if}
      <div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={text.grocery.weekPicker.aria}>
        <div class="inline-flex rounded-lg bg-surface-container-low p-1">
          {#each weekChoices as choice (choice.offset)}
            <button
              type="button"
              aria-pressed={offset === choice.offset}
              class="rounded-md px-3 py-1.5 text-label-md transition-colors {offset === choice.offset
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
              onclick={() => goToWeek(choice.offset)}
            >
              {choice.label}
            </button>
          {/each}
        </div>
        <div class="inline-flex items-center gap-1 rounded-lg bg-surface-container-low p-1">
          <button type="button" aria-label={text.grocery.weekPicker.earlier} class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(-1)}>
            <Icon name="chevron_left" class="text-[18px]" />
          </button>
          <span class="whitespace-nowrap px-1 text-label-md text-on-surface">{formatRange(planner.weekStart)}</span>
          <button type="button" aria-label={text.grocery.weekPicker.later} class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(1)}>
            <Icon name="chevron_right" class="text-[18px]" />
          </button>
        </div>
        <label class="flex cursor-pointer items-center gap-2 px-1 text-label-md text-on-surface-variant">
          <input type="checkbox" bind:checked={devicePrefs.groceryMinimal} class="h-4 w-4 rounded accent-primary" />
          {text.grocery.weekPicker.minimalView}
        </label>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 md:justify-end">
      {#if !devicePrefs.groceryMinimal}
        <button type="button" class="btn-outline" onclick={share}>
          <Icon name="share" class="text-[16px]" /> {text.grocery.share}
        </button>
      {/if}
      <button type="button" class="btn-primary" aria-expanded={adding} onclick={() => (adding = !adding)}>
        <Icon name={adding ? 'close' : 'add'} class="text-[16px]" /> {adding ? text.grocery.closeForm : text.grocery.addItem}
      </button>
    </div>
  </div>

  {#if adding}
    <form
      transition:slide={{ duration: 180 }}
      onsubmit={submitItem}
      class="grid grid-cols-1 gap-3 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-card sm:grid-cols-[2fr_2fr_1.3fr_auto] sm:items-end"
    >
      <div class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        <span class="flex items-center gap-2">
          {text.grocery.form.ingredient}
          {#if draft.name.trim() && !draftIngredient}
            <span class="rounded bg-[#ffdead] px-1.5 py-px text-label-caps uppercase text-tertiary" title={text.grocery.form.newBadgeTitle(draft.name.trim())}>{text.grocery.form.newBadge}</span>
          {/if}
        </span>
        <Combobox
          label={text.grocery.form.ingredient}
          placeholder={text.grocery.form.placeholder}
          suggestions={ingredientSuggestions}
          bind:value={draft.name}
          oninput={onDraftName}
          onpick={onDraftName}
          inputClass="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </div>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        {text.grocery.form.noteLabel}
        <input
          bind:value={draft.note}
          placeholder={text.grocery.form.notePlaceholder}
          class="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        {text.grocery.form.aisle}
        <select
          bind:value={draft.aisle}
          disabled={!!draftIngredient}
          title={draftIngredient ? text.grocery.form.aisleKnownTitle : undefined}
          onchange={() => (aislePicked = true)}
          class="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-60"
        >
          {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
        </select>
      </label>
      <button type="submit" class="btn-primary py-2.5" disabled={!draft.name.trim()}>{text.grocery.form.submit}</button>
      <fieldset class="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-on-surface sm:col-span-full">
        <legend class="sr-only">{text.grocery.form.weeksLegend}</legend>
        <label class="flex items-center gap-2">
          <input type="radio" name="item-weeks" checked={!draft.everyWeek} onchange={() => (draft.everyWeek = false)} class="accent-primary-container" />
          {text.grocery.form.justWeek(weekName)}
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" name="item-weeks" checked={draft.everyWeek} onchange={() => (draft.everyWeek = true)} class="accent-primary-container" />
          <span>{text.grocery.form.everyWeek} <span class="text-on-surface-variant">{text.grocery.form.everyWeekHint}</span></span>
        </label>
      </fieldset>
    </form>
  {/if}

  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
    <!-- Left: the list -->
    <div class="flex flex-col gap-6 {devicePrefs.groceryMinimal ? 'lg:col-span-12' : 'lg:col-span-8'}">
      {#if !devicePrefs.groceryMinimal}
      <div class="rounded-2xl bg-surface-container-lowest p-3 shadow-card">
        <div class="flex flex-wrap gap-1" role="tablist" aria-label={text.grocery.filterAria}>
          {#each [{ id: 'all', short: text.grocery.allAisles, count: shopping.length }, ...sections.map((s) => ({ id: s.id, short: s.short, count: s.items.length }))] as tab (tab.id)}
            <button
              type="button"
              role="tab"
              aria-selected={aisle === tab.id}
              onclick={() => (aisle = tab.id)}
              class="rounded-lg px-3 py-1.5 text-label-md transition-colors {aisle === tab.id
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-low'}"
            >
              {text.grocery.tabLabel(tab.short, tab.count)}
            </button>
          {/each}
        </div>
        <p class="mt-2 flex items-center gap-1 px-1 text-body-sm text-outline">
          <Icon name="touch_app" class="text-[15px]" /> {text.grocery.tapHint}
        </p>
      </div>
      {/if}

      {#if !shopping.length && !acquired.length}
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-14 text-center">
          <Icon name="shopping_basket" class="text-[36px] text-outline" />
          <h2 class="font-display text-headline-sm text-on-surface">{text.grocery.empty.title(weekName)}</h2>
          <p class="max-w-md text-body-sm text-on-surface-variant">
            {text.grocery.empty.body}
          </p>
          <a href={href('/')} class="btn-primary mt-2 py-2">{text.grocery.empty.openPlan}</a>
        </div>
      {/if}

      {#each sections as section (section.id)}
        {#if section.items.length && (devicePrefs.groceryMinimal || aisle === 'all' || aisle === section.id)}
          <section aria-labelledby="dept-{section.id}">
            <div class="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 id="dept-{section.id}" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
                <Icon name={section.icon} class="text-[20px]" style="color: {section.color}" />
                {section.label}
                <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 font-sans text-label-caps uppercase text-primary">
                  {text.grocery.itemCount(section.items.length)}
                </span>
              </h2>
              <span class="hidden text-body-sm text-outline sm:inline">{section.where}</span>
            </div>
            <ul class="divide-y divide-surface-container-high overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-card">
              {#each section.items as item (item.key)}
                {@render line(item, false)}
              {/each}
            </ul>
          </section>
        {/if}
      {/each}

      {#if haveHidden.length && !devicePrefs.groceryMinimal}
        <details class="group rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant">
          <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
            <Icon name="visibility_off" class="text-[16px] text-outline" />
            <span class="flex-1">
              {#if pastWeek}
                {text.grocery.leftOff.past(haveHidden.length)}
              {:else}
                {text.grocery.leftOff.current(haveHidden.length)}
              {/if}
            </span>
            <Icon name="expand_more" class="text-[18px] text-outline transition-transform group-open:rotate-180" />
          </summary>
          <ul class="divide-y divide-surface-container-high border-t border-surface-container-high px-3">
            {#each haveHidden as h (h.key)}
              <li class="flex items-center gap-2 py-1.5">
                <span class="min-w-0 flex-1">
                  <span class="text-on-surface">{h.name}</span>
                  <span class="text-outline">{[h.amount, h.sources.map((s) => s.label).join(', ')].filter(Boolean).join(' · ')}</span>
                </span>
                {#if !pastWeek}
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-label-md text-primary hover:bg-surface-container-high"
                    aria-label={text.grocery.leftOff.needAria(h.name)}
                    onclick={() => needIt(h)}
                  >
                    <Icon name="add_shopping_cart" class="text-[16px]" /> {text.grocery.leftOff.needIt}
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
          <p class="border-t border-surface-container-high px-3 py-2">
            {#if pastWeek}
              {text.grocery.leftOff.pastNote}
            {:else}
              {text.grocery.leftOff.currentNote}
            {/if}
          </p>
        </details>
      {/if}

      {#if acquired.length && !devicePrefs.groceryMinimal}
        <section class="rounded-2xl bg-surface-container-low" aria-labelledby="bought-heading">
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <h2 id="bought-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="shopping_bag" class="text-[20px]" />
              {text.grocery.bought.title}
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-sans text-label-caps uppercase text-on-surface-variant">
                {text.grocery.itemCount(acquired.length)}
              </span>
            </h2>
            <button
              type="button"
              aria-expanded={showBought}
              onclick={() => (showBought = !showBought)}
              class="inline-flex items-center gap-0.5 text-label-md text-on-surface-variant hover:text-on-surface"
            >
              {showBought ? text.grocery.bought.hide : text.grocery.bought.show} <Icon name={showBought ? 'expand_less' : 'expand_more'} class="text-[18px]" />
            </button>
          </div>
          {#if showBought}
            <ul transition:slide={{ duration: 180 }} class="divide-y divide-surface-container-high border-t border-surface-container-high">
              {#each acquired as item (item.key)}
                {@render line(item, true)}
              {/each}
            </ul>
          {/if}
        </section>
      {/if}
    </div>

    <!-- Right: overview + print -->
    {#if !devicePrefs.groceryMinimal}
    <aside class="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card">
        <div class="flex items-center justify-between text-label-caps uppercase text-on-surface-variant">
          <span>{text.grocery.overview.title}</span>
          <span class="normal-case tracking-normal text-body-sm">{text.grocery.overview.week(isoWeek(mondayInWeek(planner.weekStart)))}</span>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <p class="flex items-baseline gap-2 text-body-md text-on-surface">
            <span class="font-display text-[40px] leading-none">{toBuy}</span> {text.grocery.overview.toBuy}
          </p>
          <p class="text-right text-body-sm text-on-surface-variant">
            <span class="block text-body-lg text-on-surface">{haveHidden.length}</span> {text.grocery.overview.onHand}
          </p>
        </div>

        <div class="mt-5">
          <div class="flex justify-between text-label-sm text-on-surface-variant">
            <span>{text.grocery.overview.completion}</span><span>{completion}%</span>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100" aria-label={text.grocery.overview.completion}>
            <div class="h-full rounded-full bg-primary-container transition-all" style="width: {completion}%"></div>
          </div>
        </div>

        {#if spread.length}
          <div class="mt-5">
            <p class="text-label-sm text-on-surface-variant">{text.grocery.overview.spread}</p>
            <div class="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {#each spread as s (s.id)}
                <div style="width: {s.pct}%; background: {s.color}" title={text.grocery.overview.spreadTitle(s.short, s.pct)}></div>
              {/each}
            </div>
            <ul class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-body-sm text-on-surface-variant">
              {#each spread as s (s.id)}
                <li class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full" style="background: {s.color}"></span>{text.grocery.overview.spreadItem(s.short, s.pct)}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="mt-5 flex flex-col gap-2">
          <button
            type="button"
            class="btn bg-secondary py-2.5 text-on-secondary shadow-[0_2px_8px_-2px_rgba(162,62,24,0.3)] hover:bg-[#b34728]"
            onclick={() => window.print()}
          >
            <Icon name="print" class="text-[18px]" /> {text.grocery.overview.print}
          </button>
        </div>
      </section>
    </aside>
    {/if}
  </div>
</div>

<GroceryPrint
  week={formatRange(planner.weekStart)}
  {sections}
  sources={sources.map(({ day }) => `${formatWeekday(day.iso)} ${day.recipe.shortTitle}`)}
/>
