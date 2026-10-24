<script>
  import Icon from './Icon.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { planner, weekSummary, weekOffset, autoFillRemaining, copyLastWeek, resetWeek, resetCount, RECENT_DAYS } from '../planner.svelte.js';
  import { text } from '../text.js';
  import { addDays, formatLong, weekLabel } from '../dates.js';
  import { MediaQuery } from 'svelte/reactivity';
  import { tick } from 'svelte';

  const summary = $derived(weekSummary());
  const offset = $derived(weekOffset());
  const title = $derived(weekLabel(offset, text.planner.header, planner.weekStart));
  // A week entirely in the past is read-only history.
  const editable = $derived(addDays(planner.weekStart, 6) >= planner.today);

  // Reset Week lives in the ⋯ menu at every width, with what it keeps as small print: one click wipes up to 7 evenings, so
  // it isn't set 8 px from Copy. The menu says how many evenings it clears and is left out when there are none. On phones
  // the actions fit one row: Copy joins it in the menu.
  const wide = new MediaQuery('min-width: 768px');
  const resettable = $derived(resetCount());
  // Copy takes the week before the viewed one; on next week that is this week.
  const copyLabel = $derived(offset === 1 ? text.planner.header.copyThisWeek : text.planner.header.copyPrevious);
  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const more = $derived([
    ...(wide.current ? [] : [{ id: 'copy', label: copyLabel, icon: 'content_copy', onselect: copyLastWeek }]),
    ...(resettable ? [{ id: 'reset', label: text.planner.header.resetWeek(resettable), icon: 'delete_sweep', note: text.planner.header.resetKeeps, divider: true, onselect: reset }] : []),
  ]);

  // When the button that ran the reset goes with it, focus moves to Auto-fill rather than dropping to the page.
  /** @type {HTMLButtonElement | undefined} */
  let autoFillButton = $state();
  async function reset() {
    resetWeek();
    await tick();
    if (!more.length && !resetCount()) autoFillButton?.focus();
  }
</script>

<div class="flex flex-col justify-between gap-3 border-b border-surface-container-highest pb-4 lg:flex-row lg:items-end lg:gap-4">
  <!-- Phones have 8 px page gutters: bare text gets 8 px more so it isn't set against the screen edge (cards have their own padding). -->
  <!-- Below lg the controls sit in one row under the title; from lg the title keeps one line and the controls wrap on its
       right instead (two lines of title pushed tonight's actions below 800 px at 1024). -->
  <div class="px-2 lg:shrink-0 md:px-0">
    <!-- The fixed header's week stepper shows the dates on phones. -->
    <p class="mb-1.5 hidden text-xs font-semibold text-on-surface-variant md:block">
      {formatLong(planner.weekStart)} – {formatLong(addDays(planner.weekStart, 6))}
    </p>
    <h1 id="planner-title" class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">{title}</h1>
  </div>

  <div class="flex flex-col gap-1.5 lg:items-end">
    <div class="flex flex-nowrap items-center gap-2 md:flex-wrap lg:justify-end">
      <div class="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 text-xs">
        <span class="h-2 w-2 rounded-full bg-primary"></span>
        <span class="whitespace-nowrap font-semibold text-on-surface">
          <span class="sm:hidden">{text.planner.header.countsShort(summary.planned, summary.off)}</span><span class="hidden sm:inline">{text.planner.header.counts(summary.planned, summary.off)}</span>
        </span>
        {#if editable}
          <span class="whitespace-nowrap text-[11px] text-on-surface-variant">
            (<span class="sm:hidden">{summary.open ? text.planner.header.toPlanShort(summary.open) : text.planner.header.allSet}</span><span class="hidden sm:inline">{summary.open ? text.planner.header.toPlan(summary.open) : text.planner.header.allSet}</span>)
          </span>
        {/if}
      </div>
      {#if editable}
        <!-- aria-disabled, not disabled: pressing the last Auto-fill must not drop focus to <body>. A press on a full week just says so.
             Off, it reads as off beside Copy: dashed border, no fill, muted label, no hover change. -->
        <button
          bind:this={autoFillButton}
          type="button"
          class="ml-auto min-h-11 flex-shrink-0 md:ml-0 md:fine:min-h-0 {summary.open
            ? 'btn-primary'
            : 'btn-outline cursor-not-allowed border-dashed bg-transparent text-outline hover:bg-transparent hover:text-outline'}"
          aria-disabled={!summary.open}
          onclick={autoFillRemaining}
        >
          <Icon name="auto_fix_high" class="text-[16px]" />
          <span class="sm:hidden">{text.planner.header.autoFillShort}</span><span class="hidden sm:inline">{text.planner.header.autoFill}</span>
        </button>
        {#if wide.current}
          <button type="button" class="btn-outline min-h-11 fine:min-h-0" onclick={copyLastWeek}>
            <Icon name="content_copy" class="text-[16px]" /> {copyLabel}
          </button>
        {/if}
        {#if more.length}
          <ActionMenu items={more} label={text.planner.header.moreAria} class="border border-outline-variant bg-surface-container-lowest" />
        {/if}
      {/if}
    </div>
    {#if editable && summary.open}
      <p class="px-2 text-xs text-on-surface-variant md:px-0">{text.planner.header.autoFillNote(RECENT_DAYS)}</p>
    {/if}
  </div>
</div>
