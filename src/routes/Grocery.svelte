<script>
  import { slide } from 'svelte/transition';
  import { tick, untrack } from 'svelte';
  import { text } from '../lib/text.js';
  import { MediaQuery, SvelteMap, SvelteSet } from 'svelte/reactivity';
  import Icon from '../lib/components/Icon.svelte';
  import Combobox from '../lib/components/Combobox.svelte';
  import ActionMenu from '../lib/components/ActionMenu.svelte';
  import ToastCard from '../lib/components/ToastCard.svelte';
  import {
    departments,
    deptOfTag,
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
  import { formatRange, formatRangeCompact, formatShort, formatWeekday } from '../lib/dates.js';
  import { devicePrefs, setGroceryHintSeen } from '../lib/devicePrefs.svelte.js';
  import { headerChrome } from '../lib/headerChrome.svelte.js';
  import { showToast, toast } from '../lib/toast.svelte.js';
  import { sheets } from '../lib/sheets.svelte.js';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import GroceryPrint from '../lib/components/GroceryPrint.svelte';

  const toneClass = {
    sage: 'bg-tone-sage text-on-tone-sage',
    saffron: 'bg-tone-saffron text-on-tone-saffron',
    paprika: 'bg-tone-paprika text-secondary',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  };

  // Touch screens open in store mode (the list first, for the shop); "Full List" switches for this visit. With a mouse
  // the Minimal view checkbox keeps today's lighter list instead.
  const coarse = new MediaQuery('pointer: coarse');
  const store = $derived(coarse.current && !devicePrefs.groceryFull);
  const minimal = $derived(coarse.current ? store : devicePrefs.groceryMinimal);

  // In store mode the app header scrolls away with the page; the store bar pins at the top, aisle headings under it.
  // Toasts show over the store bar there, so they never cover a line under the thumb.
  $effect(() => {
    headerChrome.scrollsAway = store;
    toast.docked = store;
    return () => (headerChrome.scrollsAway = toast.docked = false);
  });
  let barHeight = $state(0);

  let aisle = $state('all');
  // A new week starts unfiltered.
  $effect(() => {
    planner.weekStart;
    untrack(() => (aisle = 'all'));
  });
  // Bought starts open in the full view and folded to one row in minimal view.
  let showBoughtFull = $state(true);
  let showBoughtMinimal = $state(false);
  const showBought = $derived(minimal ? showBoughtMinimal : showBoughtFull);
  /** @type {HTMLButtonElement | undefined} */
  let boughtToggle = $state();
  let showSkipped = $state(false);
  /** @type {HTMLButtonElement | undefined} */
  let skippedToggle = $state();
  let adding = $state(false);
  let draft = $state({ name: '', note: '', aisle: 'Produce', everyWeek: false });
  // The aisle follows the item's name until you pick one yourself; an existing ingredient keeps its own.
  let aislePicked = false;
  const draftIngredient = $derived(draft.name.trim() ? findIngredient(draft.name) : undefined);
  const onDraftName = () => {
    if (draftIngredient) draft.aisle = draftIngredient.aisle;
    else if (!aislePicked && draft.name.trim()) draft.aisle = guessAisle(draft.name);
  };

  /** The list shows names with a capital first letter. @param {string} s */
  const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const ingredientSuggestions = $derived(
    ingredients
      .map((i) => ({ value: capFirst(i.name), label: capFirst(i.name), hint: aisleLabel(i.aisle), keys: i.plural ? [i.plural] : [] }))
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
  const passed = $derived(lines.filter((l) => l.status === 'skipped'));
  const toBuy = $derived(shopping.length);
  const bought = $derived(acquired.length);
  const skipped = $derived(passed.length);
  // Nothing on the list at all, or everything ticked off.
  const nothingListed = $derived(!toBuy && !bought && !skipped);
  const allBought = $derived(!toBuy && bought + skipped > 0);
  // A skipped line is handled for the week: it counts toward done but not as bought.
  const completion = $derived(toBuy + bought + skipped ? Math.round(((bought + skipped) / (toBuy + bought + skipped)) * 100) : 0);

  const sections = $derived(
    departments.map((d) => ({ ...d, ...text.grocery.departments[d.id], items: shopping.filter((l) => l.dept === d.id) })),
  );
  // Aisle tabs only for aisles with something left; the chosen one falls back to All when it empties.
  const aisleTabs = $derived([
    { id: 'all', short: text.grocery.allAisles, count: shopping.length },
    ...sections.filter((s) => s.items.length).map((s) => ({ id: s.id, short: s.short, count: s.items.length })),
  ]);
  const activeAisle = $derived(aisleTabs.some((t) => t.id === aisle) ? aisle : 'all');
  // The Add Item form lists aisles under the department the list puts them in.
  const aisleGroups = departments
    .map((d) => ({ label: text.grocery.departments[d.id].label, options: aisles.filter((a) => deptOfTag(a.tag) === d.id) }))
    .filter((g) => g.options.length);

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
    const label = capFirst(shoppingName(ingredient));
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

  // A tapped line shows its new state for a moment before it moves, so a quick second tap lands on the same line
  // (and is ignored) rather than on the one sliding up into its place. Key → whether it's becoming bought.
  const HOLD_MS = 500;
  const holding = new SvelteMap();
  /** @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  const looksBought = (item) => holding.get(item.key) ?? item.status === 'bought';

  /** @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  function tapLine(item) {
    if (holding.has(item.key)) return;
    holding.set(item.key, item.status !== 'bought');
    const week = planner.weekStart;
    setTimeout(() => {
      holding.delete(item.key);
      if (planner.weekStart === week) toggleLine(item);
    }, HOLD_MS);
  }

  /**
   * Ticks a line (it moves to Bought) or unticks it (back to its aisle), with an Undo toast, which the toast's live
   * region also announces. Focus moves on to the next line of the list it left, so it doesn't drop to <body>.
   * @param {import('../lib/grocery.svelte.js').GroceryLine} item
   */
  function toggleLine(item) {
    const wasBought = item.status === 'bought';
    // Ticking the last line folds the Bought list under the finish message.
    if (!wasBought && toBuy === 1) showBoughtFull = showBoughtMinimal = showSkipped = false;
    const rows = /** @type {HTMLElement[]} */ ([...document.querySelectorAll(`[data-line-toggle][data-was="${wasBought}"]`)]);
    const at = rows.findIndex((el) => el.dataset.lineToggle === item.key);
    const nextKey = (rows[at + 1] ?? rows[at - 1])?.dataset.lineToggle;
    setLineStatus(item.ingredientId, wasBought ? 'need' : 'bought');
    showToast(wasBought ? text.grocery.toasts.needIt(item.name) : text.grocery.toasts.got(item.name), {
      label: text.common.undo,
      run: () => setLineStatus(item.ingredientId, wasBought ? 'bought' : 'need'),
    });
    const byKey = (/** @type {string} */ key) => /** @type {HTMLElement | null} */ (document.querySelector(`[data-line-toggle="${CSS.escape(key)}"]`));
    // After the last line to buy, Bought's Show / Hide button; after the last bought one, the line back in its aisle.
    tick().then(() => (nextKey ? byKey(nextKey) : wasBought ? byKey(item.key) : (boughtToggle ?? skippedToggle))?.focus());
  }

  /**
   * Skips a line for the viewed week (sold out): it moves to Skipped and comes back next week. Focus goes on to the next line.
   * @param {import('../lib/grocery.svelte.js').GroceryLine} item
   */
  function skipItem(item) {
    const rows = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-line-toggle][data-was="false"]')]);
    const at = rows.findIndex((el) => el.dataset.lineToggle === item.key);
    const nextKey = (rows[at + 1] ?? rows[at - 1])?.dataset.lineToggle;
    if (toBuy === 1) showBoughtFull = showBoughtMinimal = showSkipped = false;
    setLineStatus(item.ingredientId, 'skipped');
    showToast(text.grocery.toasts.skipped(item.name), { label: text.common.undo, run: () => setLineStatus(item.ingredientId, 'need') });
    tick().then(() => (nextKey ? /** @type {HTMLElement | null} */ (document.querySelector(`[data-line-toggle="${CSS.escape(nextKey)}"]`)) : (boughtToggle ?? skippedToggle))?.focus());
  }

  /** Puts a skipped line back on the list. @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  function restoreItem(item) {
    setLineStatus(item.ingredientId, 'need');
    showToast(text.grocery.toasts.needIt(item.name), { label: text.common.undo, run: () => setLineStatus(item.ingredientId, 'skipped') });
    tick().then(() => /** @type {HTMLElement | null} */ (document.querySelector(`[data-line-toggle="${CSS.escape(item.key)}"]`))?.focus());
  }

  /**
   * A line's other actions: icon buttons with a mouse, a ⋯ menu on touch so they aren't beside the tick.
   * @param {import('../lib/grocery.svelte.js').GroceryLine} item @param {boolean} done
   */
  function lineActions(item, done) {
    const actions = [];
    if (!done && !pastWeek) {
      actions.push({ id: 'skip', icon: 'event_busy', label: text.grocery.line.skipMenu, title: text.grocery.line.skipTitle, aria: text.grocery.line.skipAria(item.name), onselect: () => skipItem(item) });
      actions.push({ id: 'on-hand', icon: 'home', label: text.grocery.line.onHandMenu, title: text.grocery.line.onHandTitle, aria: text.grocery.line.onHandAria(item.name), onselect: () => markOnHand(item) });
    }
    if (item.added != null || item.every != null)
      actions.push({ id: 'remove', icon: 'delete', label: text.grocery.line.removeMenu, title: item.every != null ? text.grocery.line.removeEveryTitle : text.grocery.line.removeTitle, aria: text.grocery.line.removeAria(item.name), onselect: () => removeItem(item) });
    return actions;
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

  /** @param {boolean} on */
  function setStore(on) {
    devicePrefs.groceryFull = !on;
    window.scrollTo({ top: 0 });
  }

  // The Add Item form opens at the top of the list with its Ingredient field ready.
  /** @type {HTMLFormElement | undefined} */
  let form = $state();
  async function openForm() {
    adding = true;
    await tick();
    form?.querySelector('input')?.focus();
  }

  const syncLine = $derived(
    sheets.spreadsheet && sheets.syncProvisions ? text.grocery.store.synced(sheets.tabs.provisions) : text.grocery.savedOnDevice(!!sheets.spreadsheet),
  );
  const storeMenu = $derived([
    ...(pastWeek ? [] : [{ id: 'add', icon: 'add', label: text.grocery.addItem, onselect: openForm }]),
    ...(offset !== 0 ? [{ id: 'this-week', icon: 'today', label: text.grocery.store.thisWeek, onselect: () => goToWeek(0) }] : []),
    ...(offset !== 1 ? [{ id: 'next-week', icon: 'date_range', label: text.grocery.store.nextWeek, onselect: () => goToWeek(1) }] : []),
    { id: 'earlier', icon: 'chevron_left', label: text.grocery.store.earlier, onselect: () => shiftWeek(-1) },
    { id: 'later', icon: 'chevron_right', label: text.grocery.store.later, onselect: () => shiftWeek(1) },
    { id: 'share', icon: 'share', label: text.grocery.share, divider: true, onselect: share },
    ...(nothingListed ? [] : [{ id: 'print', icon: 'print', label: text.grocery.printList, onselect: () => window.print() }]),
    { id: 'full', icon: 'view_list', label: text.grocery.store.fullList, note: text.grocery.store.fullListNote, divider: true, onselect: () => setStore(false) },
    // A rule before the week group, whichever of its items comes first.
  ].map((a, i) => (i === 1 ? { ...a, divider: true } : a)));

  /** Which dinners a line is for, as one line of small print (store mode shows it in the line's ⋯ menu). @param {import('../lib/grocery.svelte.js').GroceryLine} item */
  const forNote = (item) => text.grocery.line.forNote(item.sources.map((s) => (s.note ? `${s.label} · ${s.note}` : s.label)));
</script>

{#snippet chips(item, done)}
  {@const all = expanded.has(item.key) || item.sources.length <= 3}
  {@const shown = all ? item.sources : item.sources.slice(0, 2)}
  <ul class="mt-1 flex flex-wrap gap-1" aria-label={text.grocery.line.sourcesAria}>
    {#each shown as s, i (i)}
      <li class="max-w-full rounded-xl px-2 py-0.5 text-label-sm {toneClass[done ? 'neutral' : s.tone]}">
        {s.label}{#if s.note}<span>{` · ${s.note}`}</span>{/if}
      </li>
    {/each}
    {#if !all}
      <li>
        <button
          type="button"
          class="focus-ring -my-2.5 min-h-11 rounded-full px-2 py-0.5 text-label-sm text-primary hover:bg-surface-container-high md:fine:my-0 md:fine:min-h-0"
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
  {@const actions = lineActions(item, done)}
  {@const skippedLine = item.status === 'skipped'}
  <li class="flex gap-1 px-2 transition-colors hover:bg-surface-container-low/60 {minimal ? 'items-center py-0.5' : 'items-start py-1'}">
    <div class="min-w-0 flex-1">
      <!-- The whole name / amount area ticks the line; the circle is only its picture. -->
      <button
        type="button"
        role={skippedLine ? undefined : 'checkbox'}
        aria-checked={skippedLine ? undefined : looksBought(item)}
        aria-label={skippedLine ? text.grocery.line.restoreAria(item.name) : undefined}
        data-line-toggle={item.key}
        data-was={skippedLine ? 'skipped' : item.status === 'bought'}
        onclick={() => (skippedLine ? restoreItem(item) : tapLine(item))}
        class="focus-ring group/tick flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left"
      >
        {#if skippedLine}
          <span aria-hidden="true" class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors group-hover/tick:border-primary-container group-hover/tick:text-primary">
            <Icon name="undo" class="text-[16px]" />
          </span>
        {:else}
        <span
          aria-hidden="true"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors {looksBought(item)
            ? 'border-primary-container bg-primary-container text-on-primary'
            : 'border-outline bg-surface-container-low text-transparent group-hover/tick:border-primary-container'}"
        >
          <Icon name="check" class="text-[16px]" />
        </span>
        {/if}
        <span class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span class="font-medium {store ? 'text-body-lg' : 'text-body-md'} {skippedLine ? 'text-on-surface-variant' : done ? 'text-on-surface-variant line-through decoration-on-surface-variant' : 'text-on-surface'}">{item.name}</span>
          {#if item.amount}<span class="text-on-surface-variant {store ? 'text-body-md' : 'text-body-sm'}">{item.amount}</span>{/if}
          {#if item.optional}
            <span class="rounded bg-surface-container-high px-1.5 py-px text-label-caps uppercase text-on-surface-variant">{text.grocery.line.optional}</span>
          {/if}
        </span>
      </button>
      {#if !minimal}<div class="-mt-1 pb-1.5 pl-11">{@render chips(item, done)}</div>{/if}
    </div>
    {#if actions.length || (store && item.sources.length)}
      <div class="flex shrink-0 items-center {minimal ? '' : 'pt-1.5'}">
        <span class="hidden fine:contents">
          {#each actions as action (action.id)}
            <button
              type="button"
              title={action.title}
              aria-label={action.aria}
              class="focus-ring rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high {action.id === 'remove' ? 'hover:text-secondary' : 'hover:text-primary'}"
              onclick={action.onselect}
            >
              <Icon name={action.icon} class="text-[18px]" />
            </button>
          {/each}
        </span>
        <span class="contents fine:hidden">
          <ActionMenu items={actions} label={text.grocery.line.menuAria(item.name)} heading={store && item.sources.length ? forNote(item) : undefined} />
        </span>
      </div>
    {/if}
  </li>
{/snippet}

<!-- Screen only; printing uses the plain checklist below. -->
<div class="mx-auto flex w-full flex-col px-gutter md:px-gutter-desktop print:hidden {minimal ? 'max-w-3xl' : 'max-w-page'} {store ? 'gap-4 pb-6' : 'gap-6 py-6'}">
  {#if store}
  <!-- Store mode: one bar with the week, what's left and everything else in ⋯. It pins at the top once the header
       has scrolled away. -->
  <div
    bind:offsetHeight={barHeight}
    class="sticky top-0 z-20 -mx-gutter flex min-h-14 items-center gap-2 border-b border-surface-container-high bg-background py-1 pl-gutter pr-2 md:-mx-gutter-desktop md:pl-gutter-desktop"
  >
    <h1 class="flex min-w-0 flex-1 items-baseline gap-2 font-display text-headline-sm text-on-surface">
      <span class="sr-only">{text.grocery.title}:</span>
      <span class="truncate">{text.grocery.store.weekTitle(weekName)}</span>
      <span class="whitespace-nowrap font-sans text-body-sm text-on-surface-variant">{formatRangeCompact(planner.weekStart)}</span>
    </h1>
    {#if pastWeek}
      {#if !nothingListed}<p class="whitespace-nowrap text-label-md text-on-surface-variant">{text.grocery.store.boughtOf(bought, toBuy + bought)}{skipped ? ` · ${text.grocery.past.skipped(skipped)}` : ''}</p>{/if}
    {:else if toBuy}
      <p class="whitespace-nowrap text-label-md text-on-surface">{text.grocery.store.left(toBuy)}</p>
    {/if}
    <ActionMenu items={storeMenu} label={text.grocery.store.menuAria} footnote={syncLine} />
    <ToastCard class="absolute inset-x-2 inset-y-1 md:inset-x-4" fly={-8} />
  </div>
  {:else}
  <!-- Breadcrumb & sync status -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <nav aria-label={text.grocery.breadcrumbAria} class="flex items-center gap-1.5 text-label-md text-on-surface-variant">
      <Icon name="calendar_view_week" class="text-[16px]" />
      <a href={href('/')} class="focus-ring inline-flex min-h-11 items-center rounded hover:text-primary md:fine:min-h-0">{text.grocery.weeklyPlan}</a>
      <span class="text-on-surface-variant" aria-hidden="true">/</span>
      <Icon name="shopping_basket" class="text-[16px] text-secondary" />
      <span class="text-on-surface" aria-current="page">{text.grocery.crumb}</span>
    </nav>
    <SyncStatus variant="badge" note={syncLine} />
  </div>

  <!-- Title & actions -->
  <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
    <div>
      <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
        {text.grocery.title}
      </h1>
      {#if !minimal}
      <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
        {text.grocery.introBefore(weekName)} <strong class="text-on-surface">({formatRange(planner.weekStart)})</strong>.
      </p>
      {/if}
      <div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={text.grocery.weekPicker.aria}>
        <div class="inline-flex rounded-lg bg-surface-container-low p-1">
          {#each weekChoices as choice (choice.offset)}
            <button
              type="button"
              aria-pressed={offset === choice.offset}
              class="focus-ring min-h-11 rounded-md px-3 py-1.5 text-label-md transition-colors md:fine:min-h-0 {offset === choice.offset
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
              onclick={() => goToWeek(choice.offset)}
            >
              {choice.label}
            </button>
          {/each}
        </div>
        {#if !coarse.current}
        <label class="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-label-md text-on-surface-variant md:fine:min-h-0">
          <input type="checkbox" bind:checked={devicePrefs.groceryMinimal} class="focus-ring h-4 w-4 rounded accent-primary" />
          {text.grocery.weekPicker.minimalView}
        </label>
        {/if}
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 md:justify-end {minimal ? 'md:shrink-0' : ''}">
      {#if coarse.current}
        <button type="button" class="btn-outline min-h-11" onclick={() => setStore(true)}>
          <Icon name="storefront" class="text-[16px]" /> {text.grocery.store.storeMode}
        </button>
      {/if}
      {#if !minimal}
        <button type="button" class="btn-outline min-h-11 md:fine:min-h-0" onclick={share}>
          <Icon name="share" class="text-[16px]" /> {text.grocery.share}
        </button>
      {/if}
      {#if !nothingListed}
        <button type="button" class="btn-outline min-h-11 md:fine:min-h-0" onclick={() => window.print()}>
          <Icon name="print" class="text-[16px]" /> {text.grocery.printList}
        </button>
      {/if}
      {#if !pastWeek}
        <button type="button" class="btn-primary min-h-11 md:fine:min-h-0" aria-expanded={adding} onclick={() => (adding ? (adding = false) : openForm())}>
          <Icon name={adding ? 'close' : 'add'} class="text-[16px]" /> {adding ? text.grocery.closeForm : text.grocery.addItem}
        </button>
      {/if}
    </div>
  </div>

  {/if}

  {#if adding && !pastWeek}
    <form
      bind:this={form}
      transition:slide={{ duration: 180 }}
      onsubmit={submitItem}
      class="grid grid-cols-1 gap-3 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-card sm:grid-cols-[2fr_2fr_1.3fr] sm:items-end"
    >
      {#if store}
        <div class="-my-2 -mr-2 flex items-center justify-between sm:col-span-full">
          <h2 class="font-display text-headline-sm text-on-surface">{text.grocery.addItem}</h2>
          <button type="button" class="focus-ring flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high" aria-label={text.grocery.closeForm} onclick={() => (adding = false)}>
            <Icon name="close" class="text-[20px]" />
          </button>
        </div>
      {/if}
      <div class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        <span class="flex items-center gap-2">
          {text.grocery.form.ingredient}
          {#if draft.name.trim() && !draftIngredient}
            <span class="rounded bg-tertiary-fixed px-1.5 py-px text-label-caps uppercase text-tertiary" title={text.grocery.form.newBadgeTitle(draft.name.trim())}>{text.grocery.form.newBadge}</span>
          {/if}
        </span>
        <Combobox
          label={text.grocery.form.ingredient}
          placeholder={text.grocery.form.placeholder}
          suggestions={ingredientSuggestions}
          bind:value={draft.name}
          oninput={onDraftName}
          onpick={onDraftName}
          inputClass="min-h-11 w-full rounded-lg border md:fine:min-h-0 border-outline bg-surface-container-lowest px-3 py-2 text-[16px] fine:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </div>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        {text.grocery.form.noteLabel}
        <input
          bind:value={draft.note}
          placeholder={text.grocery.form.notePlaceholder}
          class="min-h-11 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-[16px] fine:text-body-md md:fine:min-h-0 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        {text.grocery.form.aisle}
        <select
          bind:value={draft.aisle}
          disabled={!!draftIngredient}
          title={draftIngredient ? text.grocery.form.aisleKnownTitle : undefined}
          onchange={() => (aislePicked = true)}
          class="min-h-11 rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-[16px] fine:text-body-md md:fine:min-h-0 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-60"
        >
          {#each aisleGroups as group (group.label)}
            <optgroup label={group.label}>
              {#each group.options as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
            </optgroup>
          {/each}
        </select>
      </label>
      <fieldset class="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-on-surface sm:col-span-2">
        <legend class="sr-only">{text.grocery.form.weeksLegend}</legend>
        <label class="flex min-h-11 cursor-pointer items-center gap-2 md:fine:min-h-0">
          <input type="radio" name="item-weeks" checked={!draft.everyWeek} onchange={() => (draft.everyWeek = false)} class="focus-ring accent-primary-container" />
          {text.grocery.form.justWeek(weekName)}
        </label>
        <label class="flex min-h-11 cursor-pointer items-center gap-2 md:fine:min-h-0">
          <input type="radio" name="item-weeks" checked={draft.everyWeek} onchange={() => (draft.everyWeek = true)} class="focus-ring accent-primary-container" />
          <span>{text.grocery.form.everyWeek} <span class="text-on-surface-variant">{text.grocery.form.everyWeekHint}</span></span>
        </label>
      </fieldset>
      <button type="submit" class="btn-primary sm:col-start-3 min-h-11 py-2.5 md:fine:min-h-0" disabled={!draft.name.trim()}>{text.grocery.form.submit}</button>
    </form>
  {/if}

  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
    <!-- Left: the list -->
    <div class="flex flex-col {store ? 'gap-3' : 'gap-6'} {minimal ? 'lg:col-span-12' : 'lg:col-span-8'}">
      {#if pastWeek && !nothingListed}
        <p class="flex items-start gap-2 px-1 text-body-sm text-on-surface-variant {store ? 'pt-1' : ''}">
          <Icon name="history" class="mt-px text-[16px]" /> {text.grocery.past.note}
        </p>
      {/if}
      {#if !minimal && toBuy}
      <div class="rounded-2xl bg-surface-container-lowest p-3 shadow-card">
        <div class="flex flex-wrap gap-1" role="group" aria-label={text.grocery.filterAria}>
          {#each aisleTabs as tab (tab.id)}
            <button
              type="button"
              aria-pressed={activeAisle === tab.id}
              onclick={() => (aisle = tab.id)}
              class="focus-ring min-h-11 rounded-lg px-3 py-1.5 text-label-md transition-colors md:fine:min-h-0 {activeAisle === tab.id
                ? 'bg-primary-container text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low'}"
            >
              {text.grocery.tabLabel(tab.short, tab.count)}
            </button>
          {/each}
        </div>
        {#if !pastWeek}
          {#if !devicePrefs.groceryHintSeen}
          <p class="mt-2 flex items-center gap-1 px-1 text-body-sm text-on-surface-variant">
            <Icon name="touch_app" class="text-[15px]" /> {text.grocery.tapHint}
            <button type="button" class="focus-ring ml-1 inline-flex min-h-11 items-center rounded-md px-2 text-label-md text-primary hover:bg-surface-container-high md:fine:min-h-0" onclick={() => setGroceryHintSeen()}>{text.grocery.tapHintDismiss}</button>
          </p>
          {/if}
        {/if}
      </div>
      {/if}

      {#if nothingListed}
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-14 text-center">
          <Icon name="shopping_basket" class="text-[36px] text-outline" />
          {#if pastWeek}
            <h2 class="font-display text-headline-sm text-on-surface">{text.grocery.empty.pastTitle(weekName)}</h2>
            <p class="max-w-md text-body-sm text-on-surface-variant">{text.grocery.empty.pastBody}</p>
          {:else}
            <h2 class="font-display text-headline-sm text-on-surface">{text.grocery.empty.title(weekName)}</h2>
            <p class="max-w-md text-body-sm text-on-surface-variant">
              {text.grocery.empty.body}
            </p>
            <a href={href('/')} class="btn-primary mt-2 min-h-11 py-2 md:fine:min-h-0">{text.grocery.empty.openPlan}</a>
          {/if}
        </div>
      {:else if allBought}
        <div class="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-low px-6 text-center {store ? 'py-8' : 'py-12'}">
          <Icon name="check_circle" class="text-[36px] text-primary-container" />
          <h2 class="font-display text-headline-sm text-on-surface">{text.grocery.done.title(bought, skipped)}</h2>
          {#if !pastWeek}<p class="max-w-md text-body-sm text-on-surface-variant">{text.grocery.done.body(weekName)}</p>{/if}
        </div>
      {/if}

      {#each sections as section (section.id)}
        {#if section.items.length && (minimal || activeAisle === 'all' || activeAisle === section.id)}
          <section aria-labelledby="dept-{section.id}">
            <div
              class="flex items-center justify-between gap-2 px-1 {store ? 'sticky z-10 -mx-1 mb-1 min-h-9 bg-background' : 'mb-2'}"
              style={store ? `top: ${barHeight}px` : undefined}
            >
              <h2 id="dept-{section.id}" class="flex items-center gap-2 font-display text-on-surface {store ? 'text-body-lg font-semibold' : 'text-headline-sm'}">
                <Icon name={section.icon} class={store ? 'text-[18px]' : 'text-[20px]'} style="color: {section.color}" />
                {section.label}
                <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 font-sans text-label-caps uppercase text-primary">
                  {text.grocery.itemCount(section.items.length)}
                </span>
              </h2>
            </div>
            <ul class="divide-y divide-surface-container-high overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-card">
              {#each section.items as item (item.key)}
                {@render line(item, false)}
              {/each}
            </ul>
          </section>
        {/if}
      {/each}

      {#if haveHidden.length && !minimal}
        <details class="group rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant">
          <summary class="focus-ring flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
            <Icon name="home" class="text-[16px] text-on-surface-variant" />
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
                  <span class="text-on-surface-variant">{[h.amount, h.sources.map((s) => s.label).join(', ')].filter(Boolean).join(' · ')}</span>
                </span>
                {#if !pastWeek}
                  <button
                    type="button"
                    class="focus-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 py-1 text-label-md md:fine:min-h-0 text-primary hover:bg-surface-container-high"
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

      {#if acquired.length}
        <section class="rounded-2xl bg-surface-container-low" aria-labelledby="bought-heading">
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <h2 id="bought-heading" class="flex items-center gap-2 font-display text-on-surface {store ? 'text-body-lg font-semibold' : 'text-headline-sm'}">
              <Icon name="shopping_bag" class={store ? 'text-[18px]' : 'text-[20px]'} />
              {text.grocery.bought.title}
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-sans text-label-caps uppercase text-on-surface-variant">
                {text.grocery.itemCount(acquired.length)}
              </span>
            </h2>
            <button
              bind:this={boughtToggle}
              type="button"
              aria-expanded={showBought}
              onclick={() => (minimal ? (showBoughtMinimal = !showBoughtMinimal) : (showBoughtFull = !showBoughtFull))}
              class="focus-ring -mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-md px-2 text-label-md md:fine:mr-0 md:fine:min-h-0 md:fine:px-0 text-on-surface-variant hover:text-on-surface"
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

      {#if passed.length}
        <section class="rounded-2xl bg-surface-container-low" aria-labelledby="skipped-heading">
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <h2 id="skipped-heading" class="flex items-center gap-2 font-display text-on-surface {store ? 'text-body-lg font-semibold' : 'text-headline-sm'}">
              <Icon name="event_busy" class={store ? 'text-[18px]' : 'text-[20px]'} />
              {text.grocery.skipped.title}
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-sans text-label-caps uppercase text-on-surface-variant">
                {text.grocery.itemCount(passed.length)}
              </span>
            </h2>
            <button
              bind:this={skippedToggle}
              type="button"
              aria-expanded={showSkipped}
              onclick={() => (showSkipped = !showSkipped)}
              class="focus-ring -mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-md px-2 text-label-md md:fine:mr-0 md:fine:min-h-0 md:fine:px-0 text-on-surface-variant hover:text-on-surface"
            >
              {showSkipped ? text.grocery.skipped.hide : text.grocery.skipped.show} <Icon name={showSkipped ? 'expand_less' : 'expand_more'} class="text-[18px]" />
            </button>
          </div>
          {#if showSkipped}
            <ul transition:slide={{ duration: 180 }} class="divide-y divide-surface-container-high border-t border-surface-container-high">
              {#each passed as item (item.key)}
                {@render line(item, true)}
              {/each}
            </ul>
            <p class="border-t border-surface-container-high px-4 py-2 text-body-sm text-on-surface-variant">{text.grocery.skipped.note}</p>
          {/if}
        </section>
      {/if}
    </div>

    <!-- Right: overview -->
    {#if !minimal}
    <aside class="flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4">
      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card">
        <div class="flex items-center justify-between text-label-caps uppercase text-on-surface-variant">
          <span>{text.grocery.overview.title}</span>
          <span class="normal-case tracking-normal text-body-sm">{formatRange(planner.weekStart)}</span>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <p class="flex items-baseline gap-2 text-body-md text-on-surface">
            {#if pastWeek}
              <span class="font-display text-[40px] leading-none">{bought}</span> {text.grocery.past.boughtOf(toBuy + bought)}{#if skipped}<span class="text-body-sm text-on-surface-variant">· {text.grocery.past.skipped(skipped)}</span>{/if}
            {:else}
              <span class="font-display text-[40px] leading-none">{toBuy}</span> {text.grocery.overview.toBuy}
            {/if}
          </p>
          <p class="text-right text-body-sm text-on-surface-variant">
            <span class="block text-body-lg text-on-surface">{haveHidden.length}</span> {text.grocery.overview.onHand}
          </p>
        </div>

        {#if skipped && !pastWeek}<p class="mt-3 text-body-sm text-on-surface-variant">{text.grocery.overview.skipped(skipped)}</p>{/if}

        {#if !pastWeek}
        <div class="mt-5">
          <div class="flex justify-between text-label-sm text-on-surface-variant">
            <span>{text.grocery.overview.completion}</span><span>{completion}%</span>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100" aria-label={text.grocery.overview.completion}>
            <div class="h-full rounded-full bg-primary-container transition-all" style="width: {completion}%"></div>
          </div>
        </div>
        {/if}
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
