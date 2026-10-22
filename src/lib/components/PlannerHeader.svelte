<script>
  import Icon from './Icon.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { planner, weekSummary, weekOffset, autoFillRemaining, copyLastWeek, resetWeek, resetCount, RECENT_DAYS } from '../planner.svelte.js';
  import { text } from '../text.js';
  import { addDays, formatLong, formatShort } from '../dates.js';
  import { MediaQuery } from 'svelte/reactivity';
  import { tick } from 'svelte';

  const summary = $derived(weekSummary());
  const offset = $derived(weekOffset());
  const title = $derived(
    offset === 0
      ? text.planner.header.thisWeek
      : offset === -1
        ? text.planner.header.lastWeek
        : offset === 1
          ? text.planner.header.nextWeek
          : text.planner.header.weekOf(formatShort(planner.weekStart)),
  );
  // A week entirely in the past is read-only history.
  const editable = $derived(addDays(planner.weekStart, 6) >= planner.today);

  // On phones the actions fit one row: Copy joins Reset Week in the ⋯ menu. From `md` Reset Week is a quiet text button
  // beside Copy. It says how many evenings it clears and is left out when there are none.
  const wide = new MediaQuery('min-width: 768px');
  const resettable = $derived(resetCount());
  // Copy takes the week before the viewed one; on next week that is this week.
  const copyLabel = $derived(offset === 1 ? text.planner.header.copyThisWeek : text.planner.header.copyPrevious);
  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const more = $derived([
    ...(wide.current ? [] : [{ id: 'copy', label: copyLabel, icon: 'content_copy', onselect: copyLastWeek }]),
    ...(resettable && !wide.current ? [{ id: 'reset', label: text.planner.header.resetWeek(resettable), icon: 'refresh', onselect: reset }] : []),
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

<div class="flex flex-col justify-between gap-3 border-b border-surface-container-highest pb-4 md:flex-row md:items-end md:gap-4">
  <!-- Phones have 8 px page gutters: bare text gets 8 px more so it isn't set against the screen edge (cards have their own padding). -->
  <!-- The title keeps one line from md: the controls on the right wrap instead (two lines of title pushed tonight's actions below 800 px at 1024). -->
  <div class="px-2 md:shrink-0 md:px-0">
    <!-- The fixed header's week stepper shows the dates on phones. -->
    <p class="mb-1.5 hidden text-xs font-semibold text-on-surface-variant md:block">
      {formatLong(planner.weekStart)} – {formatLong(addDays(planner.weekStart, 6))}
    </p>
    <h1 id="planner-title" class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">{title}</h1>
  </div>

  <div class="flex flex-col gap-1.5 md:items-end">
    <div class="flex flex-nowrap items-center gap-2 md:max-w-[420px] md:flex-wrap md:justify-end lg:max-w-none">
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
        <!-- aria-disabled, not disabled: pressing the last Auto-fill must not drop focus to <body>. A press on a full week just says so. -->
        <button
          bind:this={autoFillButton}
          type="button"
          class="ml-auto min-h-11 flex-shrink-0 md:ml-0 md:min-h-0 {summary.open
            ? 'btn-primary'
            : 'btn-outline cursor-not-allowed border-outline-variant text-on-surface-variant hover:bg-transparent'}"
          aria-disabled={!summary.open}
          onclick={autoFillRemaining}
        >
          <Icon name="auto_fix_high" class="text-[16px]" />
          <span class="sm:hidden">{text.planner.header.autoFillShort}</span><span class="hidden sm:inline">{text.planner.header.autoFill}</span>
        </button>
        {#if wide.current}
          <button type="button" class="btn-outline" onclick={copyLastWeek}>
            <Icon name="content_copy" class="text-[16px]" /> {copyLabel}
          </button>
          {#if resettable}
            <button type="button" class="focus-ring rounded px-1 text-xs font-semibold text-on-surface-variant underline-offset-2 hover:text-on-surface hover:underline" onclick={reset}>
              {text.planner.header.resetWeek(resettable)}
            </button>
          {/if}
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
