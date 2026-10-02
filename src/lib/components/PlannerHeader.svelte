<script>
  import Icon from './Icon.svelte';
  import { planner, weekSummary, autoFillRemaining, copyLastWeek, resetWeek } from '../planner.svelte.js';
  import { addDays, formatLong, formatShort, weekStartOf } from '../dates.js';

  const summary = $derived(weekSummary());
  const weekOffset = $derived(
    Math.round((Date.parse(planner.weekStart) - Date.parse(weekStartOf(new Date()))) / (7 * 86_400_000)),
  );
  const title = $derived(
    weekOffset === 0
      ? 'This Week’s Dinner Plan'
      : weekOffset === -1
        ? 'Last Week’s Dinner Plan'
        : weekOffset === 1
          ? 'Next Week’s Dinner Plan'
          : `Week of ${formatShort(planner.weekStart)}`,
  );
  // A week entirely in the past is read-only history.
  const editable = $derived(addDays(planner.weekStart, 6) >= planner.today);
</script>

<div class="flex flex-col justify-between gap-4 border-b border-surface-container-highest pb-4 md:flex-row md:items-end">
  <div>
    <div class="mb-1.5 flex flex-wrap items-center gap-2">
      <span class="text-sm font-bold uppercase tracking-widest text-secondary">Weekly Schedule</span>
      <span class="text-xs text-outline">•</span>
      <span class="text-xs font-semibold text-on-surface-variant">
        {formatLong(planner.weekStart)} – {formatLong(addDays(planner.weekStart, 6))}
      </span>
    </div>
    <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">{title}</h1>
  </div>

  <div class="flex flex-wrap items-center gap-2 pt-2 md:max-w-[420px] md:justify-end md:pt-0 lg:max-w-none">
    <div class="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 text-xs">
      <span class="h-2 w-2 rounded-full bg-primary {summary.open ? 'animate-pulse' : ''}"></span>
      <span class="font-semibold text-on-surface">{summary.planned} of 7 Dinners</span>
      {#if editable}
        <span class="text-[11px] text-outline">
          ({summary.open ? `${summary.open} Open ${summary.open === 1 ? 'slot' : 'slots'} left` : 'All set'})
        </span>
      {/if}
    </div>
    {#if editable}
      <button type="button" class="btn-primary" disabled={!summary.open} onclick={autoFillRemaining}>
        <Icon name="auto_fix_high" class="text-[16px]" /> Auto-fill Remaining
      </button>
      <button type="button" class="btn-outline" onclick={copyLastWeek}>
        <Icon name="content_copy" class="text-[16px]" /> Copy Last Week
      </button>
      <button type="button" class="btn-outline" onclick={resetWeek}>
        <Icon name="refresh" class="text-[16px]" /> Reset Week
      </button>
    {/if}
  </div>
</div>
