<script>
  import Icon from './Icon.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { planner, weekSummary, weekOffset, autoFillRemaining, copyLastWeek, resetWeek, RECENT_DAYS } from '../planner.svelte.js';
  import { text } from '../text.js';
  import { addDays, formatLong, formatShort } from '../dates.js';
  import { MediaQuery } from 'svelte/reactivity';

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

  // On phones the actions fit one row: Copy Last Week joins Reset Week in the ⋯ menu.
  const wide = new MediaQuery('min-width: 768px');
  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const more = $derived([
    ...(wide.current ? [] : [{ id: 'copy', label: text.planner.header.copyLastWeek, icon: 'content_copy', onselect: copyLastWeek }]),
    { id: 'reset', label: text.planner.header.resetWeek, icon: 'refresh', onselect: resetWeek },
  ]);
</script>

<div class="flex flex-col justify-between gap-3 border-b border-surface-container-highest pb-4 md:flex-row md:items-end md:gap-4">
  <div>
    <!-- The fixed header's week stepper shows the dates on phones. -->
    <div class="mb-1.5 hidden flex-wrap items-center gap-2 md:flex">
      <span class="text-sm font-bold uppercase tracking-widest text-secondary">{text.planner.header.eyebrow}</span>
      <span class="text-xs text-outline">•</span>
      <span class="text-xs font-semibold text-on-surface-variant">
        {formatLong(planner.weekStart)} – {formatLong(addDays(planner.weekStart, 6))}
      </span>
    </div>
    <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">{title}</h1>
  </div>

  <div class="flex flex-col gap-1.5 md:items-end">
    <div class="flex flex-nowrap items-center gap-2 md:max-w-[420px] md:flex-wrap md:justify-end lg:max-w-none">
      <div class="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 text-xs">
        <span class="h-2 w-2 rounded-full bg-primary {summary.open ? 'motion-safe:animate-pulse' : ''}"></span>
        <span class="font-semibold text-on-surface">{text.planner.header.dinners(summary.planned)}</span>
        {#if editable}
          <span class="hidden text-[11px] text-outline sm:inline">
            ({summary.open ? text.planner.header.openLeft(summary.open) : text.planner.header.allSet})
          </span>
        {/if}
      </div>
      {#if editable}
        <button type="button" class="btn-primary ml-auto min-h-11 flex-shrink-0 md:ml-0 md:min-h-0" disabled={!summary.open} onclick={autoFillRemaining}>
          <Icon name="auto_fix_high" class="text-[16px]" />
          <span class="sm:hidden">{text.planner.header.autoFillShort}</span><span class="hidden sm:inline">{text.planner.header.autoFill}</span>
        </button>
        {#if wide.current}
          <button type="button" class="btn-outline" onclick={copyLastWeek}>
            <Icon name="content_copy" class="text-[16px]" /> {text.planner.header.copyLastWeek}
          </button>
        {/if}
        <ActionMenu items={more} label={text.planner.header.moreAria} class="border border-outline-variant bg-surface-container-lowest" />
      {/if}
    </div>
    {#if editable && summary.open}
      <p class="text-xs text-on-surface-variant">{text.planner.header.autoFillNote(RECENT_DAYS)}</p>
    {/if}
  </div>
</div>
