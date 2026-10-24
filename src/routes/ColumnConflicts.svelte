<script>
  import { onMount } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import { text } from '../lib/text.js';
  import { SCHEMA, sheets, saveSchemaCheck } from '../lib/sheets.svelte.js';
  import { defaultAisle, status, tagColourName, tagColourSection, weekStartsOnRow, weekdays } from '../lib/sheetText.js';
  import {
    COLUMN_INFO,
    analyzeRows,
    appendSlots as slotsFor,
    appendUndecided,
    applyAutoAppend,
    columnLetter,
    needsRepair,
    parsePastedRows,
    pickColumn,
    repairedHeaderRow,
    resolutionAfterRepair,
    resolutionFromSaved,
    summarizeResolution,
    toSavedCheck,
  } from '../lib/schemaCheck.js';
  import { goBack } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { auth } from '../lib/google/auth.svelte.js';
  import { readTopRows, writeHeaderRow } from '../lib/google/api.js';
  import { syncNow } from '../lib/sync/sync.svelte.js';

  /** @typedef {keyof typeof SCHEMA} TabKey */
  /** @typedef {import('../lib/schemaCheck.js').Resolution} Resolution */
  /** @typedef {{ headers: string[], rows: string[][], resolution: Record<string, Resolution> | null }} TabCheck */

  const TAB_ICON = { ingredients: 'grocery', recipes: 'menu_book', weeklyPlan: 'calendar_month', provisions: 'shopping_basket', settings: 'tune' };

  // Header rows that show off each kind of conflict, for trying the screen out.
  const EXAMPLES = {
    ingredients: [
      ['ID', 'Ingredient', 'Plurals', 'Department', 'In_Stock'],
      ['green-onion', 'green onion', 'green onions', 'Produce', 'TRUE'],
      ['nuoc-mam', 'nuoc mam', '', defaultAisle, 'FALSE'],
    ],
    recipes: [
      ['Recipe_ID', 'Course_Type', 'Title', 'Ingredients_JSON', 'Preparation_Steps', 'Image_URL', 'Cooking_Method', 'Recipe_Notes', 'Favorite', 'Serves'],
      ['salmon-01', 'Seafood', 'Pan-Seared Crispy Salmon', '[{"id":"salmon-fillet","qty":2,"note":"180 g each"}]', '1. Score the salmon skin…', '', 'Pan-sear', 'Rest 2 minutes before plating.', 'TRUE', '2'],
      ['risotto-02', 'Vegetarian', 'Wild Mushroom Risotto', '[{"id":"arborio-rice","qty":300,"unit":"g"}]', '1. Bring the stock to a gentle simmer…', '', 'Stovetop', '', 'FALSE', '4'],
    ],
    weeklyPlan: [
      ['Date', 'Day_Of_Week', 'Recipe_ID_Assigned', 'Completed_Flag', 'Custom_Notes', 'Guest_Count'],
      ['2026-10-19', 'Monday', 'salmon-01', 'TRUE', '', '2'],
      ['2026-10-20', 'Tuesday', 'risotto-02', 'FALSE', 'Double the batch', '4'],
    ],
    provisions: [
      ['Week_Of', 'Item', 'Quantity', 'Aisle', 'Status'],
      ['2026-10-17', 'Salmon fillets', '2 × 180 g', 'Seafood', status.toBuy],
      ['2026-10-17', 'Arborio rice', '300 g', defaultAisle, status.onHand],
    ],
    settings: [
      ['Type', 'Setting', 'Setting value'],
      [weekStartsOnRow.Section, weekStartsOnRow.Name, weekdays[6]],
      [tagColourSection, 'Vegetarian', tagColourName('sage')],
    ],
  };

  const tabKeys = /** @type {TabKey[]} */ (
    [
      'ingredients',
      'recipes',
      'weeklyPlan',
      ...(sheets.syncProvisions ? ['provisions'] : []),
      'settings',
    ]
  );

  /** Rebuilds a tab's check from what was saved last time. @param {TabKey} key @returns {TabCheck} */
  function fromSaved(key) {
    const saved = sheets.schemaCheck?.[key];
    if (!saved) return { headers: [], rows: [], resolution: null };
    const resolution = resolutionFromSaved(key, saved);
    return { headers: [...saved.headers], rows: $state.snapshot(saved.sample), resolution };
  }

  let checks = $state(/** @type {Record<TabKey, TabCheck>} */ (Object.fromEntries(tabKeys.map((k) => [k, fromSaved(k)]))));
  let active = $state(/** @type {TabKey} */ (tabKeys.find((k) => sheets.schemaCheck?.[k]) ?? tabKeys[0]));
  let autoAppend = $state(sheets.autoAppendOptional ?? true);
  // Signed in with a spreadsheet linked: read and repair the sheet directly.
  const live = Boolean(auth.token && sheets.spreadsheet);
  let loading = $state(false);
  let readError = $state('');
  /** Tabs that don't exist yet or have no header row — sync sets those up itself. */
  let blankTabs = $state(/** @type {Partial<Record<TabKey, 'missing' | 'empty'>>} */ ({}));
  let pasteText = $state('');
  let pasteError = $state('');
  /** @type {HTMLElement} */
  let dialog;

  /** Facts about one tab: statuses, conflicts and what was detected. @param {TabKey} key */
  function summarize(key) {
    const { headers, resolution } = checks[key];
    return resolution ? summarizeResolution(key, headers, resolution) : null;
  }

  const summaries = $derived(Object.fromEntries(tabKeys.map((k) => [k, summarize(k)])));
  const current = $derived(checks[active]);
  const summary = $derived(summaries[active]);
  const checkedTabs = $derived(tabKeys.filter((k) => summaries[k]));
  const totalConflicts = $derived(checkedTabs.reduce((n, k) => n + summaries[k].conflicts, 0));
  // Anything to rename or add in row 1 (ignored columns stay out).
  const repairable = $derived(summary != null && needsRepair(active, current.resolution));
  const appendSlots = $derived(current.resolution ? slotsFor(active, current.headers.length, current.resolution) : {});

  onMount(() => {
    dialog.focus();
    if (live) readSheet();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = overflow);
  });

  const close = () => goBack('/sheets-sync/sync');

  /**
   * Checks a tab's first rows and keeps the result.
   * @param {unknown[][]} rows @param {TabKey} key
   * @returns {string} problem with the rows, or ''
   */
  function analyze(rows, key = active, strict = true) {
    const result = analyzeRows(key, rows, { autoAppendOptional: autoAppend, strict });
    if (result.problem) return text.sheets.columns.errors[result.problem];
    checks[key] = { headers: result.headers, rows: result.rows, resolution: result.resolution };
    return '';
  }

  /** Reads row 1–3 of every tab from the linked spreadsheet. */
  async function readSheet() {
    loading = true;
    readError = '';
    try {
      const top = await readTopRows(sheets.spreadsheet, tabKeys.map((k) => sheets.tabs[k]));
      const blanks = {};
      for (const key of tabKeys) {
        const rows = top[sheets.tabs[key]];
        const empty = !rows?.length || rows[0].every((c) => String(c ?? '').trim() === '');
        if (empty) {
          blanks[key] = rows ? 'empty' : 'missing';
          checks[key] = { headers: [], rows: [], resolution: null };
        } else analyze(rows, key, false);
      }
      blankTabs = blanks;
    } catch (error) {
      readError = text.sheets.columns.errors.readFailed(error.message);
    } finally {
      loading = false;
    }
  }

  function checkPasted() {
    const rows = parsePastedRows(pasteText);
    pasteError = rows.length ? analyze(rows) : text.sheets.columns.errors.pasteFirst;
    if (!pasteError) pasteText = '';
  }

  function useExample() {
    pasteError = analyze(structuredClone(EXAMPLES[active]));
  }

  function startOver() {
    if (live) readSheet();
    else checks[active] = { headers: [], rows: [], resolution: null };
  }

  /** @param {string} column @param {Partial<Resolution>} patch */
  function update(column, patch) {
    Object.assign(current.resolution[column], patch);
  }

  /** Picks the sheet column for an expected column; a column feeds only one field. */
  function pick(column, value) {
    current.resolution = pickColumn(active, current.headers, current.resolution, column, value);
  }

  function setAutoAppend(on) {
    autoAppend = on;
    for (const key of checkedTabs) checks[key].resolution = applyAutoAppend(key, checks[key].resolution, on);
  }

  /** Accepts every suggestion, adds every missing column, and copies the fixed row 1. */
  async function repair() {
    const previous = $state.snapshot(current);
    const key = active;
    current.resolution = appendUndecided(key, current.resolution);
    const row = repairedHeaderRow(key, current.headers, current.resolution);
    const tab = sheets.tabs[key];
    try {
      if (live) await writeHeaderRow(sheets.spreadsheet, tab, row);
      else await navigator.clipboard.writeText(row.join('\t'));
    } catch (error) {
      checks[key] = previous;
      showToast(live ? text.sheets.columns.toasts.updateFailed(error.message) : text.sheets.columns.toasts.clipboardFailed);
      return;
    }
    // From here on the check describes the repaired sheet (once the row is pasted, when copied).
    const resolution = resolutionAfterRepair(key, row, current.resolution, autoAppend);
    checks[key] = { headers: row, rows: current.rows.map((r) => [...r, ...Array(row.length - r.length).fill('')]), resolution };
    showToast(live ? text.sheets.columns.toasts.repairedLive(tab) : text.sheets.columns.toasts.repairedCopied(tab), {
      label: text.common.undo,
      run: async () => {
        checks[key] = previous;
        // Put the old headers back, blanking the cells repair added.
        if (live) await writeHeaderRow(sheets.spreadsheet, tab, [...previous.headers, ...Array(row.length - previous.headers.length).fill('')]);
      },
    });
  }

  function save() {
    if (totalConflicts || !checkedTabs.length) return;
    const now = new Date().toISOString();
    const result = Object.fromEntries(checkedTabs.map((key) => [key, toSavedCheck(key, $state.snapshot(checks[key]), now)]));
    saveSchemaCheck(result, autoAppend);
    showToast(live ? text.sheets.columns.toasts.savedLive : text.sheets.columns.toasts.savedPaste);
    close();
    syncNow();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  const BADGE = {
    bound: { icon: 'verified', label: text.sheets.columns.badges.bound, class: 'bg-primary-fixed/60 text-primary' },
    mapped: { icon: 'link', label: text.sheets.columns.badges.mapped, class: 'bg-primary-fixed/60 text-primary' },
    suggested: { icon: 'alt_route', label: text.sheets.columns.badges.suggested, class: 'bg-[#ffdead] text-tertiary' },
    missing: { icon: 'error', label: text.sheets.columns.badges.missing, class: 'bg-secondary-fixed text-secondary' },
    append: { icon: 'add_column_right', label: text.sheets.columns.badges.append, class: 'bg-surface-container-high text-primary' },
    ignored: { icon: 'block', label: text.sheets.columns.badges.ignored, class: 'bg-surface-container-high text-on-surface-variant' },
  };

  const detectedText = (s) =>
    [s.missing && text.sheets.columns.missing(s.missing), s.renamed && text.sheets.columns.renamed(s.renamed), s.extras.length && text.sheets.columns.unrecognized(s.extras.length)]
      .filter(Boolean)
      .join(', ') || text.sheets.columns.allMatch;

  const truncate = (v, n = 70) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet statusBadge(status, score)}
  {@const b = BADGE[status]}
  <span class="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-label-sm {b.class}">
    <Icon name={b.icon} class="text-[14px]" />
    {b.label}{status === 'suggested' ? ` ${Math.round(score * 100)}%` : ''}
  </span>
{/snippet}

{#snippet columnRow(column)}
  {@const info = COLUMN_INFO[active][column]}
  {@const r = current.resolution[column]}
  {@const status = summary.statuses[column]}
  <li
    class="grid gap-3 px-4 py-4 transition-colors md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)] md:items-start md:gap-4 md:px-5 {status ===
    'missing'
      ? 'bg-secondary-fixed/25'
      : status === 'suggested'
        ? 'bg-[#ffdead]/20'
        : ''}"
  >
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono text-label-md text-on-surface">{column}</span>
        <span
          class="rounded px-1.5 py-0.5 text-label-caps uppercase {info.required
            ? 'bg-secondary-fixed text-secondary'
            : 'bg-surface-container-high text-on-surface-variant'}"
        >
          {info.required ? text.sheets.columns.required : text.sheets.columns.optional}
        </span>
      </div>
      <span class="text-body-sm text-on-surface-variant">{info.note}</span>
    </div>

    <div>{@render statusBadge(status, r.score)}</div>

    <div class="flex flex-col gap-1.5">
      <label class="sr-only" for="col-{column}">{text.sheets.columns.columnLabel(column)}</label>
      <select
        id="col-{column}"
        value={r.index === null ? '' : String(r.index)}
        onchange={(e) => pick(column, e.currentTarget.value)}
        class="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
      >
        {#each current.headers as header, index (index)}
          {#if header}<option value={String(index)}>{text.sheets.columns.colOption(header, columnLetter(index))}</option>{/if}
        {/each}
        <option value="">{text.sheets.columns.none}</option>
      </select>
      {#if status === 'suggested'}
        <span class="flex items-start gap-1 text-body-sm text-on-surface-variant">
          <Icon name="auto_awesome" class="mt-0.5 text-[14px] text-tertiary" /> {text.sheets.columns.suggestedFrom}
        </span>
      {:else if status === 'missing'}
        <span class="text-body-sm text-secondary">{text.sheets.columns.noSuchColumn}</span>
      {:else if status === 'append'}
        <span class="text-body-sm text-on-surface-variant">{text.sheets.columns.addedAs(appendSlots[column])}</span>
      {:else if status === 'ignored'}
        <span class="text-body-sm text-on-surface-variant">{text.sheets.columns.leftEmpty}</span>
      {/if}
    </div>

    <div class="min-w-0">
      {#if r.index !== null && current.rows.length}
        <div class="flex flex-col gap-1 rounded-lg bg-surface-container-low px-3 py-2 font-mono text-[12px] leading-5 text-on-surface-variant">
          {#each current.rows as row, i (i)}
            <span class="truncate" title={row[r.index] ?? ''}>
              <span class="text-outline">R{i + 2}:</span>
              {row[r.index] ? truncate(row[r.index]) : text.sheets.columns.empty}
            </span>
          {/each}
        </div>
      {:else if r.index !== null}
        <span class="text-body-sm italic text-outline">{text.sheets.columns.pasteMore}</span>
      {:else}
        <span class="text-body-sm italic text-outline">{text.sheets.columns.noData}</span>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-2 md:justify-end">
      {#if status === 'suggested'}
        <button type="button" class="btn-primary py-2" onclick={() => update(column, { match: 'confirmed' })}>
          <Icon name="check" class="text-[16px]" /> {text.sheets.columns.confirm}
        </button>
      {:else if status === 'missing'}
        {#if !info.required}
          <button type="button" class="btn bg-surface-container-high py-2 text-on-surface-variant hover:bg-surface-container-highest" onclick={() => update(column, { action: 'ignore' })}>
            {text.sheets.columns.ignore}
          </button>
        {/if}
        <button type="button" class="btn bg-secondary py-2 text-on-secondary hover:bg-secondary/90" onclick={() => update(column, { action: 'append' })}>
          <Icon name="add_column_right" class="text-[16px]" /> {text.sheets.columns.appendHeader}
        </button>
      {:else if status === 'append' || status === 'ignored'}
        <button type="button" class="btn py-2 text-on-surface-variant hover:bg-surface-container-high" onclick={() => update(column, { action: null })}>
          <Icon name="undo" class="text-[16px]" /> {text.common.undo}
        </button>
      {:else}
        <Icon name="check_circle" class="icon-filled text-[22px] text-primary-container" />
      {/if}
    </div>
  </li>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md"
  onclick={(e) => e.target === e.currentTarget && close()}
>
  <div
    bind:this={dialog}
    role="dialog"
    aria-modal="true"
    aria-labelledby="conflicts-title"
    aria-describedby="conflicts-subtitle"
    tabindex="-1"
    class="relative my-4 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-12px_rgba(28,28,24,0.25)] focus:outline-none"
  >
    <div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-secondary via-secondary-container to-[#f6bd5e]"></div>

    <!-- Header -->
    <div class="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-8 sm:pt-6">
      <div class="flex items-start gap-4">
        <div class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary shadow-sm sm:flex">
          <Icon name="difference" class="text-[26px]" />
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="conflicts-title" class="font-display text-headline-sm text-on-surface sm:text-headline-md">
              {text.sheets.columns.title}
            </h2>
            {#if !checkedTabs.length}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">
                <span class="h-1.5 w-1.5 rounded-full bg-outline"></span> {text.sheets.columns.notChecked}
              </span>
            {:else if totalConflicts}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2 py-0.5 text-label-caps uppercase text-secondary">
                <span class="h-1.5 w-1.5 rounded-full bg-secondary"></span>
                {text.sheets.columns.conflicts(totalConflicts)}
              </span>
            {:else}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed/70 px-2 py-0.5 text-label-caps uppercase text-primary">
                <span class="h-1.5 w-1.5 rounded-full bg-primary"></span> {text.sheets.columns.resolved}
              </span>
            {/if}
          </div>
          <p id="conflicts-subtitle" class="max-w-3xl text-body-md text-on-surface-variant">
            {text.sheets.columns.subtitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label={text.sheets.columns.closeAria}
        class="shrink-0 rounded-lg p-2 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        onclick={close}
      >
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <!-- Body -->
    <div class="flex flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-8 [&>*]:shrink-0">
      <!-- Detection summary -->
      <div class="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-card">
            <Icon name="table_rows" class="text-[22px]" />
          </span>
          <div class="flex flex-col gap-0.5 text-body-md text-on-surface-variant">
            <span class="text-label-md text-on-surface">
              {live ? text.sheets.columns.readFrom(sheets.spreadsheetName || text.sheets.columns.yourSpreadsheet) : text.sheets.columns.detectedFromPaste}
            </span>
            <span class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {#each tabKeys as key, i (key)}
                {#if i}<span class="text-outline">·</span>{/if}
                <span>
                  <code class="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[12px] font-semibold text-primary">{sheets.tabs[key]}</code>
                  ({summaries[key]
                    ? detectedText(summaries[key])
                    : blankTabs[key] === 'missing'
                      ? text.sheets.columns.willBeCreated
                      : blankTabs[key] === 'empty'
                        ? text.sheets.columns.emptyAddHeaders
                        : loading
                          ? text.sheets.columns.reading
                          : text.sheets.columns.notCheckedShort})
                </span>
              {/each}
            </span>
          </div>
        </div>
        {#if summary || live}
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="btn bg-secondary px-4 py-2.5 text-body-md text-on-secondary shadow-sm hover:bg-secondary/90"
              disabled={!repairable || loading}
              title={repairable ? (live ? text.sheets.columns.repairTitleLive : text.sheets.columns.repairTitlePaste) : text.sheets.columns.repairTitleMatch}
              onclick={repair}
            >
              <Icon name="build_circle" class="text-[18px]" /> {text.sheets.columns.repair}
            </button>
            <button
              type="button"
              class="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label={live ? text.sheets.columns.readAgain : text.sheets.columns.pasteNew}
              title={live ? text.sheets.columns.readAgain : text.sheets.columns.pasteNew}
              onclick={startOver}
            >
              <Icon name="refresh" class="text-[20px]" />
            </button>
          </div>
        {/if}
      </div>

      <!-- Tabs -->
      <div role="tablist" aria-label={text.sheets.columns.tabsAria} class="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl [scrollbar-width:none] bg-surface-container-low p-1">
        {#each tabKeys as key (key)}
          {@const s = summaries[key]}
          <button
            type="button"
            role="tab"
            aria-selected={key === active}
            class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-label-md transition-all sm:px-4 {key === active
              ? 'bg-surface-container-lowest text-on-surface shadow-card'
              : 'text-on-surface-variant hover:bg-surface-container-high'}"
            onclick={() => {
              active = key;
              pasteText = '';
              pasteError = '';
            }}
          >
            <Icon name={TAB_ICON[key]} class="text-[18px] {key === active ? 'text-primary' : ''}" />
            {text.sheets.columns.tab(sheets.tabs[key])}
            {#if !s}
              <span class="rounded-full bg-surface-container-high px-1.5 text-label-sm text-outline">–</span>
            {:else if s.conflicts}
              <span class="rounded-full bg-secondary-fixed px-1.5 text-label-sm text-secondary">{s.conflicts}</span>
            {:else}
              <Icon name="check_circle" class="icon-filled text-[16px] text-primary-container" />
            {/if}
          </button>
        {/each}
      </div>

      {#if !summary && live}
        <!-- Reading the sheet, or a tab sync will set up itself -->
        <div class="flex items-start gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-card">
          <Icon
            name={loading ? 'progress_activity' : readError ? 'error' : 'add_notes'}
            class="mt-0.5 text-[22px] {loading ? 'animate-spin text-outline' : readError ? 'text-secondary' : 'text-primary'}"
          />
          <div class="flex flex-col gap-1">
            {#if loading}
              <span class="text-label-md text-on-surface">{text.sheets.columns.readingSheet}</span>
            {:else if readError}
              <span class="text-label-md text-secondary">{readError}</span>
              <button type="button" class="btn w-fit px-0 text-body-sm text-primary hover:underline" onclick={readSheet}>{text.sheets.columns.tryAgain}</button>
            {:else}
              <span class="text-label-md text-on-surface">
                {blankTabs[active] === 'missing' ? text.sheets.columns.noTab(sheets.tabs[active]) : text.sheets.columns.tabEmpty(sheets.tabs[active])}
              </span>
              <span class="text-body-sm text-on-surface-variant">
                {text.sheets.columns.nothingToResolve(blankTabs[active] === 'missing')}
              </span>
            {/if}
          </div>
        </div>
      {:else if !summary}
        <!-- Paste step -->
        <div class="grid gap-5 rounded-xl bg-surface-container-lowest p-4 shadow-card sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div class="flex flex-col gap-3">
            <h3 class="font-display text-headline-sm text-on-surface">{text.sheets.columns.copyTop(sheets.tabs[active])}</h3>
            <p class="text-body-sm text-on-surface-variant">
              {text.sheets.columns.noSignIn}
            </p>
            <ol class="flex flex-col gap-2 text-body-sm text-on-surface-variant">
              {#each text.sheets.columns.pasteSteps as makeStep, i (i)}
                <li class="flex items-start gap-2">
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed/70 text-label-sm text-primary">{i + 1}</span>
                  {makeStep(sheets.tabs[active])}
                </li>
              {/each}
            </ol>
            <p class="text-body-sm text-outline">{text.sheets.columns.csvNote}</p>
          </div>
          <div class="flex flex-col gap-2">
            <label for="paste-rows" class="text-label-md text-on-surface">{text.sheets.columns.rowsLabel(sheets.tabs[active])}</label>
            <textarea
              id="paste-rows"
              rows="6"
              spellcheck="false"
              bind:value={pasteText}
              placeholder={EXAMPLES[active].map((r) => r.slice(0, 4).join('    ')).join('\n')}
              aria-invalid={pasteError ? 'true' : undefined}
              aria-describedby={pasteError ? 'paste-error' : undefined}
              class="w-full resize-y rounded-lg border bg-surface-container-low px-3 py-2 font-mono text-[12px] leading-5 text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary-container {pasteError
                ? 'border-secondary'
                : 'border-outline-variant'}"
            ></textarea>
            {#if pasteError}<span id="paste-error" class="text-body-sm text-secondary">{pasteError}</span>{/if}
            <div class="flex flex-wrap items-center justify-between gap-2">
              <button type="button" class="btn px-0 text-body-sm text-primary hover:underline" onclick={useExample}>
                <Icon name="science" class="text-[16px]" /> {text.sheets.columns.tryExample}
              </button>
              <button type="button" class="btn-primary px-4 py-2 text-body-md" disabled={!pasteText.trim()} onclick={checkPasted}>
                <Icon name="fact_check" class="text-[18px]" /> {text.sheets.columns.checkHeaders}
              </button>
            </div>
          </div>
        </div>
      {:else}
        <!-- Mapping table -->
        <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
          <div
            class="hidden gap-4 bg-surface-container-low px-5 py-3 text-label-caps uppercase tracking-wider text-on-surface-variant md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)]"
          >
            <span>{text.sheets.columns.header.expected}</span>
            <span>{text.sheets.columns.header.status}</span>
            <span>{text.sheets.columns.header.sheetColumn}</span>
            <span>{text.sheets.columns.header.preview}</span>
            <span class="text-right">{text.sheets.columns.header.action}</span>
          </div>
          <ul class="divide-y divide-surface-container-high">
            {#each SCHEMA[active] as column (column)}
              {@render columnRow(column)}
            {/each}
          </ul>
          {#if summary.extras.length}
            <div class="flex items-start gap-2 border-t border-surface-container-high bg-surface-container-low/60 px-5 py-3 text-body-sm text-on-surface-variant">
              <Icon name="help" class="mt-0.5 text-[16px] text-outline" />
              <span>
                {text.sheets.columns.unrecognizedBefore}
                {#each summary.extras as extra, i (extra.index)}{i ? ', ' : ''}<span class="font-mono text-on-surface">{extra.header}</span>{text.sheets.columns.unrecognizedCol(columnLetter(extra.index))}{/each}
                {text.sheets.columns.ignoresColumns(summary.extras.length)}
              </span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Notes -->
      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
          <Icon name="shield" class="mt-0.5 text-[20px] text-primary" />
          <div class="flex flex-col gap-1">
            <span class="text-label-md text-on-surface">{text.sheets.columns.safeTitle}</span>
            <span class="text-body-sm text-on-surface-variant">
              {#if live}
                {text.sheets.columns.safeLive}
              {:else}
                {text.sheets.columns.safePaste}
              {/if}
            </span>
          </div>
        </div>
        <label class="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-card">
          <span class="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autoAppend}
              onchange={(e) => setAutoAppend(e.currentTarget.checked)}
              class="mt-0.5 h-4 w-4 rounded accent-primary"
            />
            <span class="flex flex-col">
              <span class="text-label-md text-on-surface">{text.sheets.columns.autoAdd}</span>
              <span class="text-body-sm text-on-surface-variant">{text.sheets.columns.autoAddHint}</span>
            </span>
          </span>
          <Icon name="bolt" class="text-[20px] text-tertiary" />
        </label>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-col-reverse gap-3 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <div>
        {#if summary && !live}
          <button type="button" class="btn px-0 text-body-md text-on-surface-variant hover:text-on-surface hover:underline" onclick={startOver}>
            <Icon name="history" class="text-[18px]" /> {text.sheets.columns.pasteAgain(sheets.tabs[active])}
          </button>
        {/if}
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button type="button" class="btn px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-high" onclick={close}>{text.common.cancel}</button>
        <button
          type="button"
          class="btn-primary px-5 py-2 text-body-md"
          disabled={totalConflicts > 0 || !checkedTabs.length}
          title={totalConflicts ? text.sheets.columns.saveTitleConflicts : checkedTabs.length ? undefined : text.sheets.columns.saveTitleNone}
          onclick={save}
        >
          <Icon name="task_alt" class="text-[18px]" /> {text.sheets.columns.save}
        </button>
      </div>
    </div>
  </div>
</div>
