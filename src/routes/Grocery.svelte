<script>
  import { slide } from 'svelte/transition';
  import Icon from '../lib/components/Icon.svelte';
  import {
    departments,
    deptOfTag,
    groceryLines,
    setLineStatus,
    addCustomItem,
    removeCustomItem,
  } from '../lib/grocery.svelte.js';
  import { aisles, guessAisle } from '../lib/recipes.svelte.js';
  import { planner, currentWeek, weekOffset, goToWeek, shiftWeek } from '../lib/planner.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { addDays, formatRange, formatShort, formatWeekday, isoWeek } from '../lib/dates.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { sheets, spreadsheetUrl } from '../lib/sheets.svelte.js';
  import { syncPhase, syncNow, connect } from '../lib/sync/sync.svelte.js';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import GroceryPrint from '../lib/components/GroceryPrint.svelte';

  const toneClass = {
    sage: 'bg-[#eaf0ec] text-[#2c4635]',
    saffron: 'bg-[#faf3e5] text-[#8c6517]',
    paprika: 'bg-[#faece8] text-secondary',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  };

  let aisle = $state('all');
  let showOnHand = $state(true);
  let adding = $state(false);
  let draft = $state({ name: '', note: '', aisle: 'Produce' });
  // The aisle follows the item's name (your Profile mappings first) until you pick one yourself.
  let aislePicked = false;
  const guessDraftAisle = () => {
    if (!aislePicked && draft.name.trim()) draft.aisle = guessAisle(draft.name);
  };

  const offset = $derived(weekOffset());
  /** "this week", "next week", "last week" or "the week of Oct 10" */
  const weekName = $derived(
    offset === 0 ? 'this week' : offset === 1 ? 'next week' : offset === -1 ? 'last week' : `the week of ${formatShort(planner.weekStart)}`,
  );
  const weekChoices = [
    { offset: 0, label: 'This Week' },
    { offset: 1, label: 'Next Week' },
  ];

  const lines = $derived(groceryLines());
  // Bought and on-hand lines both leave the aisle lists for the Acquired ledger.
  const shopping = $derived(lines.filter((l) => l.status === 'need'));
  const onHand = $derived(lines.filter((l) => l.status === 'owned'));
  const acquired = $derived(lines.filter((l) => l.status !== 'need'));
  const toBuy = $derived(shopping.length);
  const bought = $derived(acquired.length - onHand.length);
  const completion = $derived(toBuy + bought ? Math.round((bought / (toBuy + bought)) * 100) : 0);

  const sections = $derived(
    departments.map((d) => ({ ...d, items: shopping.filter((l) => l.dept === d.id) })),
  );
  const spread = $derived(
    sections
      .filter((s) => s.items.length)
      .map((s) => ({ ...s, pct: Math.round((s.items.length / shopping.length) * 100) })),
  );

  const sources = $derived(
    currentWeek()
      .filter((d) => d.status === 'planned' && d.recipe)
      .map((d) => ({
        day: d,
        count: shopping.filter((l) => l.recipeId === d.recipe.id).length,
      })),
  );

  function addItem(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    addCustomItem({ name, note: draft.note.trim(), dept: deptOfTag(draft.aisle) });
    showToast(`Added ${name} to your list.`);
    draft = { name: '', note: '', aisle: draft.aisle };
    aislePicked = false;
  }

  function listAsText() {
    const body = sections
      .filter((s) => s.items.length)
      .map((s) => `${s.label}\n${s.items.map((l) => `${'☐'} ${l.name} — ${l.detail}`).join('\n')}`)
      .join('\n\n');
    return `MealCaster grocery list · ${formatRange(planner.weekStart)}\n\n${body}`;
  }

  async function share() {
    const text = listAsText();
    try {
      if (navigator.share) await navigator.share({ title: 'MealCaster grocery list', text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('Grocery list copied to your clipboard.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('Couldn’t share the list from this browser.');
    }
  }
</script>

{#snippet line(item, isOnHand)}
  <li class="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-container-low/60 {isOnHand ? 'opacity-70' : ''}">
    <button
      type="button"
      role="checkbox"
      aria-checked={item.status !== 'need'}
      aria-label="{item.status === 'bought' ? 'Unmark' : 'Mark'} {item.name} as bought"
      disabled={item.status === 'owned'}
      onclick={() => setLineStatus(item.key, item.status === 'bought' ? 'need' : 'bought')}
      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors {item.status !== 'need'
        ? 'border-primary-container bg-primary-container text-on-primary'
        : 'border-outline-variant bg-surface-container-low text-transparent hover:border-primary-container'}"
    >
      <Icon name="check" class="text-[14px]" />
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-body-md font-medium {item.status !== 'need' ? 'text-outline line-through decoration-outline' : 'text-on-surface'}">
        {item.name}
      </p>
      <p class="text-body-sm text-on-surface-variant">
        {item.detail}{isOnHand ? (item.status === 'bought' ? ' • Bought' : ' • On hand') : ''}
        {#if !isOnHand}<span class="sm:hidden">· {item.source.label}</span>{/if}
      </p>
    </div>
    <span class="hidden max-w-[45%] shrink-0 truncate rounded-full px-2 py-0.5 text-label-sm sm:inline {isOnHand ? toneClass.neutral : toneClass[item.source.tone]}">
      {isOnHand ? (item.status === 'bought' ? 'Bought' : 'On hand') : `• ${item.source.label}`}
    </span>
    <div class="flex shrink-0 items-center">
      {#if isOnHand}
        <button
          type="button"
          title="Need to buy after all"
          aria-label="Move {item.name} back to the shopping list"
          class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
          onclick={() => setLineStatus(item.key, 'need')}
        >
          <Icon name="add_shopping_cart" class="text-[18px]" />
        </button>
        {#if item.custom}
          <button
            type="button"
            aria-label="Delete {item.name}"
            class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
            onclick={() => removeCustomItem(item.key)}
          >
            <Icon name="delete" class="text-[18px]" />
          </button>
        {/if}
      {:else}
        <button
          type="button"
          title="Already have it — mark as on hand"
          aria-label="Mark {item.name} as on hand"
          class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
          onclick={() => setLineStatus(item.key, 'owned')}
        >
          <Icon name="inventory_2" class="text-[18px]" />
        </button>
      {/if}
    </div>
  </li>
{/snippet}

<!-- Screen only; printing uses the plain checklist below. -->
<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop print:hidden">
  <!-- Breadcrumb & sync status -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-label-md text-on-surface-variant">
      <Icon name="calendar_view_week" class="text-[16px]" />
      <a href={href('/')} class="hover:text-primary">Weekly Dinner Plan</a>
      <span class="text-outline">/</span>
      <Icon name="shopping_basket" class="text-[16px] text-secondary" />
      <span class="text-on-surface" aria-current="page">Grocery &amp; Provisions List</span>
    </nav>
    <SyncStatus variant="badge" />
  </div>

  <!-- Title & actions -->
  <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
    <div>
      <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
        Weekly Provisions &amp; Grocery List
      </h1>
      <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
        Auto-compiled from the planned dinners of {weekName} <strong class="text-on-surface">({formatRange(planner.weekStart)})</strong>.
        {#if sheets.spreadsheet && sheets.syncProvisions}
          Synced with the <code class="rounded bg-surface-container-high px-1 text-[12px]">[{sheets.tabs.provisions}]</code> tab of your Google Sheet.
        {:else}
          Saved on this device{sheets.spreadsheet ? '' : ' — connect a Google Sheet to keep it in a [Provisions] tab'}.
        {/if}
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Grocery week">
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
          <button type="button" aria-label="Earlier week" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(-1)}>
            <Icon name="chevron_left" class="text-[18px]" />
          </button>
          <span class="whitespace-nowrap px-1 text-label-md text-on-surface">{formatRange(planner.weekStart)}</span>
          <button type="button" aria-label="Later week" class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(1)}>
            <Icon name="chevron_right" class="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 md:justify-end">
      <a href={href('/sheets-sync')} class="btn-outline">
        <Icon name="sync" class="text-[16px]" /> Sheets Settings
      </a>
      <button type="button" class="btn-outline" onclick={share}>
        <Icon name="share" class="text-[16px]" /> Share
      </button>
      <button type="button" class="btn-primary" aria-expanded={adding} onclick={() => (adding = !adding)}>
        <Icon name={adding ? 'close' : 'add'} class="text-[16px]" /> {adding ? 'Close' : 'Add Item'}
      </button>
    </div>
  </div>

  {#if adding}
    <form
      transition:slide={{ duration: 180 }}
      onsubmit={addItem}
      class="grid grid-cols-1 gap-3 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-card sm:grid-cols-[2fr_2fr_1.3fr_auto] sm:items-end"
    >
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        Item
        <!-- svelte-ignore a11y_autofocus -->
        <input
          required
          autofocus
          bind:value={draft.name}
          oninput={guessDraftAisle}
          placeholder="e.g. Sparkling water"
          class="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        Quantity or note
        <input
          bind:value={draft.note}
          placeholder="e.g. 2 bottles"
          class="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        Aisle
        <select
          bind:value={draft.aisle}
          onchange={() => (aislePicked = true)}
          class="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        >
          {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
        </select>
      </label>
      <button type="submit" class="btn-primary py-2.5">Add to List</button>
    </form>
  {/if}

  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
    <!-- Left: the list -->
    <div class="flex flex-col gap-6 lg:col-span-8">
      <div class="rounded-2xl bg-surface-container-lowest p-3 shadow-card">
        <div class="flex flex-wrap gap-1" role="tablist" aria-label="Filter by aisle">
          {#each [{ id: 'all', short: 'All Aisles', count: shopping.length }, ...sections.map((s) => ({ id: s.id, short: s.short, count: s.items.length }))] as tab (tab.id)}
            <button
              type="button"
              role="tab"
              aria-selected={aisle === tab.id}
              onclick={() => (aisle = tab.id)}
              class="rounded-lg px-3 py-1.5 text-label-md transition-colors {aisle === tab.id
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-low'}"
            >
              {tab.short} ({tab.count})
            </button>
          {/each}
        </div>
        <p class="mt-2 flex items-center gap-1 px-1 text-body-sm text-outline">
          <Icon name="touch_app" class="text-[15px]" /> Tap the circle when bought, or the box icon if you already have it
        </p>
      </div>

      {#if !shopping.length && !acquired.length}
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-14 text-center">
          <Icon name="shopping_basket" class="text-[36px] text-outline" />
          <h2 class="font-display text-headline-sm text-on-surface">Nothing to buy for {weekName}</h2>
          <p class="max-w-md text-body-sm text-on-surface-variant">
            Plan a few dinners and their ingredients will be compiled here automatically.
          </p>
          <a href={href('/')} class="btn-primary mt-2 py-2">Open the weekly plan</a>
        </div>
      {/if}

      {#each sections as section (section.id)}
        {#if section.items.length && (aisle === 'all' || aisle === section.id)}
          <section aria-labelledby="dept-{section.id}">
            <div class="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 id="dept-{section.id}" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
                <Icon name={section.icon} class="text-[20px]" style="color: {section.color}" />
                {section.label}
                <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 font-sans text-label-caps uppercase text-primary">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
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

      {#if acquired.length}
        <section class="rounded-2xl bg-surface-container-low" aria-labelledby="on-hand-heading">
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <h2 id="on-hand-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="inventory_2" class="text-[20px]" />
              Already On Hand / Acquired
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-sans text-label-caps uppercase text-on-surface-variant">
                {acquired.length} acquired
              </span>
            </h2>
            <button
              type="button"
              aria-expanded={showOnHand}
              onclick={() => (showOnHand = !showOnHand)}
              class="inline-flex items-center gap-0.5 text-label-md text-on-surface-variant hover:text-on-surface"
            >
              {showOnHand ? 'Hide' : 'Show'} <Icon name={showOnHand ? 'expand_less' : 'expand_more'} class="text-[18px]" />
            </button>
          </div>
          {#if showOnHand}
            <ul transition:slide={{ duration: 180 }} class="divide-y divide-surface-container-high border-t border-surface-container-high">
              {#each acquired as item (item.key)}
                {@render line(item, true)}
              {/each}
            </ul>
          {/if}
        </section>
      {/if}
    </div>

    <!-- Right: overview, sources, sync -->
    <aside class="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card">
        <div class="flex items-center justify-between text-label-caps uppercase text-on-surface-variant">
          <span>Shopping Overview</span>
          <span class="normal-case tracking-normal text-body-sm">Week {isoWeek(addDays(planner.weekStart, 2))}</span>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <p class="flex items-baseline gap-2 text-body-md text-on-surface">
            <span class="font-display text-[40px] leading-none">{toBuy}</span> items to buy
          </p>
          <p class="text-right text-body-sm text-on-surface-variant">
            <span class="block text-body-lg text-on-surface">{onHand.length}</span> on hand
          </p>
        </div>

        <div class="mt-5">
          <div class="flex justify-between text-label-sm text-on-surface-variant">
            <span>Shopping completion</span><span>{completion}%</span>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100" aria-label="Shopping completion">
            <div class="h-full rounded-full bg-primary-container transition-all" style="width: {completion}%"></div>
          </div>
        </div>

        {#if spread.length}
          <div class="mt-5">
            <p class="text-label-sm text-on-surface-variant">Department Spread</p>
            <div class="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {#each spread as s (s.id)}
                <div style="width: {s.pct}%; background: {s.color}" title="{s.short} {s.pct}%"></div>
              {/each}
            </div>
            <ul class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-body-sm text-on-surface-variant">
              {#each spread as s (s.id)}
                <li class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full" style="background: {s.color}"></span>{s.short} ({s.pct}%)
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
            <Icon name="print" class="text-[18px]" /> Print Kitchen Checklist
          </button>
        </div>
      </section>

      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
            <Icon name="restaurant_menu" class="text-[20px]" /> Meal Sources
          </h2>
          <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
            {sources.length} {sources.length === 1 ? 'dinner' : 'dinners'}
          </span>
        </div>
        {#if sources.length}
          <ul class="flex flex-col gap-1">
            {#each sources as { day, count } (day.iso)}
              <li>
                <a
                  href={href(`/recipe/${day.recipe.id}`, { day: day.iso })}
                  class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-container-low"
                >
                  <span class="min-w-0">
                    <span class="block text-label-caps uppercase {day.isToday ? 'text-secondary' : 'text-on-surface-variant'}">
                      {day.isToday ? 'Today' : formatWeekday(day.iso)}
                    </span>
                    <span class="block truncate text-body-sm text-on-surface">{day.recipe.shortTitle}</span>
                  </span>
                  <span class="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-body-sm text-on-surface-variant">No upcoming dinners planned for {weekName}.</p>
        {/if}
        <a href={href('/')} class="mt-3 inline-flex items-center gap-1 text-label-md text-primary hover:underline">
          Open weekly dinner schedule <Icon name="arrow_forward" class="text-[16px]" />
        </a>
      </section>

      <section class="rounded-2xl bg-surface-container p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
            <Icon name="table_chart" class="text-[20px]" /> Sheets Two-Way Sync
          </h2>
          <Icon name={sheets.spreadsheet ? 'cloud_done' : 'cloud_off'} class="text-[20px] {sheets.spreadsheet ? 'text-primary' : 'text-outline'}" />
        </div>
        <div class="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3">
          <div class="flex items-center justify-between gap-2 text-label-caps uppercase text-on-surface-variant">
            <span>Target spreadsheet</span>
            {#if sheets.spreadsheet}
              <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="inline-flex min-w-0 items-center gap-1 normal-case tracking-normal text-primary hover:underline">
                <span class="truncate">{sheets.spreadsheetName || 'Open sheet'}</span><Icon name="open_in_new" class="text-[14px]" />
              </a>
            {:else}
              <span class="text-outline">Not connected</span>
            {/if}
          </div>
          <SyncStatus />
        </div>
        {#if syncPhase() === 'signedOut'}
          <button type="button" class="btn mt-3 w-full bg-surface-container-lowest py-2 text-on-surface hover:bg-surface-container-high" onclick={connect}>
            <Icon name="login" class="text-[16px]" /> Reconnect
          </button>
        {:else if syncPhase() === 'synced' || syncPhase() === 'error'}
          <button type="button" class="btn mt-3 w-full bg-surface-container-lowest py-2 text-on-surface hover:bg-surface-container-high" onclick={() => syncNow()}>
            <Icon name="sync" class="text-[16px]" /> Sync Now
          </button>
        {:else}
          <a
            href={href('/sheets-sync')}
            class="btn mt-3 w-full bg-surface-container-lowest py-2 text-on-surface hover:bg-surface-container-high"
          >
            <Icon name={sheets.spreadsheet ? 'settings' : 'add_link'} class="text-[16px]" /> {sheets.spreadsheet ? 'Sheets Settings' : 'Connect Google Sheets'}
          </a>
        {/if}
      </section>
    </aside>
  </div>
</div>

<GroceryPrint
  week={formatRange(planner.weekStart)}
  {sections}
  sources={sources.map(({ day }) => `${formatWeekday(day.iso)} ${day.recipe.shortTitle}`)}
/>
