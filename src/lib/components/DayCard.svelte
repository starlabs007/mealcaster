<script>
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import { surpriseMe, markDiningOut, clearDay } from '../planner.svelte.js';
  import { formatShort, formatWeekday } from '../dates.js';
  import { href } from '../router.svelte.js';

  /**
   * @type {{ day: {
   *   iso: string,
   *   weekday: number,
   *   isToday: boolean,
   *   isPast: boolean,
   *   status: import('../planner.svelte.js').DayStatus,
   *   recipe?: import('../data/recipes.js').Recipe,
   * } }}
   */
  let { day } = $props();

  const weekdayName = $derived(formatWeekday(day.iso));
  const hasMeal = $derived(day.status === 'planned' || day.status === 'completed');
  const dimmed = $derived(day.status === 'completed' || day.status === 'missed');

  const cardClass = $derived(
    day.isToday
      ? 'relative overflow-hidden border-2 border-primary/30 bg-surface-container-lowest shadow-sm'
      : day.status === 'completed'
        ? 'border border-surface-container-high bg-surface-container-lowest/60 opacity-60'
        : day.status === 'planned'
          ? 'border border-surface-container-high bg-surface-container-lowest shadow-sm'
          : `border border-dashed border-outline-variant bg-surface-container-low/70 ${dimmed ? 'opacity-60' : ''}`,
  );

</script>

<article
  aria-label="{weekdayName} {formatShort(day.iso)}{day.isToday ? ' (today)' : ''}"
  class="flex flex-col gap-4 rounded-xl p-4 transition-all sm:flex-row md:p-5 {hasMeal ? '' : 'sm:items-center'} {cardClass}"
>
  {#if day.isToday}
    <div class="absolute left-0 top-0 h-full w-1.5 bg-primary" aria-hidden="true"></div>
  {/if}

  <!-- Day label column -->
  <div class="flex flex-shrink-0 items-start justify-between gap-1 sm:w-36 sm:flex-col sm:self-stretch {day.isToday ? 'pl-1' : ''}">
    <div>
      <div
        class="text-sm uppercase tracking-wide {day.isToday
          ? 'font-bold text-secondary'
          : 'font-semibold text-outline'}"
      >
        {weekdayName}
      </div>
      <div class="font-display text-on-surface {day.isToday ? 'text-lg' : 'text-base'}">{formatShort(day.iso)}</div>
    </div>

    {#if day.isToday}
      <span class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-label-sm text-on-primary shadow-sm">• TODAY</span>
    {:else if day.status === 'completed'}
      <span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-sm text-primary">
        <Icon name="check_circle" class="text-[13px]" /> Completed
      </span>
    {:else if day.status === 'planned'}
      <span class="rounded bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">Planned</span>
    {:else}
      <span class="rounded bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-outline">
        {day.status === 'diningOut' ? 'Night off' : day.status === 'missed' ? 'Not logged' : 'Open'}
      </span>
    {/if}
  </div>

  {#if hasMeal && day.recipe}
    {@const recipe = day.recipe}
    {@const emphasized = day.isToday || day.status === 'planned'}
    <div class="flex flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
      <RecipeImage
        src={recipe.image}
        alt={recipe.title}
        class="w-full flex-shrink-0 rounded-lg {emphasized ? 'h-40 shadow-sm sm:h-28 sm:w-32' : 'h-32 sm:h-24 sm:w-28'}"
      />
      <div class="min-w-0 flex-1">
        <h3 class="font-display text-on-surface {emphasized ? 'text-lg' : 'line-clamp-2 text-base'}">{recipe.title}</h3>
        <p class="mt-1 text-xs text-on-surface-variant">{[recipe.badge.label, `${recipe.prepMinutes + recipe.cookMinutes} min`, `Serves ${recipe.serves}`].filter(Boolean).join(' · ')}</p>
        <div class="mt-3 flex items-center gap-4">
          <a
            href={href(`/recipe/${recipe.id}`, { day: day.iso })}
            class="inline-flex items-center gap-1 text-xs font-semibold transition-all {day.isToday
              ? 'rounded-md bg-primary-container px-3 py-1.5 text-on-primary shadow-sm hover:bg-primary'
              : day.status === 'planned'
                ? 'rounded-md bg-surface-container-high px-3 py-1.5 text-on-surface hover:bg-surface-dim'
                : 'text-primary hover:underline'}"
          >
            View Recipe <Icon name="arrow_forward" class="text-[14px]" />
          </a>
          {#if day.status === 'planned'}
            <a
              href={href('/catalog', { day: day.iso })}
              class="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-secondary"
            >
              <Icon name="sync_alt" class="text-[14px]" /> Swap Meal
            </a>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex w-full flex-1 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
          <Icon name={day.status === 'diningOut' ? 'storefront' : 'restaurant'} class="text-2xl" />
        </div>
        <div>
          {#if day.status === 'diningOut'}
            <h3 class="font-display text-base text-on-surface">Dining out or leftovers</h3>
            <p class="mt-0.5 text-xs text-on-surface-variant">A night off from the stove — nothing to prep or shop for.</p>
          {:else if day.status === 'missed'}
            <h3 class="font-display text-base text-on-surface">No dinner was logged</h3>
            <p class="mt-0.5 text-xs text-on-surface-variant">This evening has passed without a planned meal.</p>
          {:else}
            <h3 class="font-display text-base text-on-surface">No dinner planned yet for {weekdayName}</h3>
            <p class="mt-0.5 text-xs text-on-surface-variant">Choose a meal, let the app pick one, or take the night off.</p>
          {/if}
        </div>
      </div>

      {#if day.status === 'open'}
        <div class="flex w-full flex-shrink-0 flex-wrap items-center gap-2 pt-2 sm:w-auto sm:flex-nowrap sm:pt-0">
          <a href={href('/catalog', { day: day.iso })} class="btn-primary basis-full py-2 sm:basis-auto">
            <Icon name="add" class="text-[15px]" /> Choose a Meal
          </a>
          <button type="button" class="btn-outline flex-1 py-2 text-on-surface sm:flex-none" onclick={() => surpriseMe(day.iso)}>
            <Icon name="casino" class="text-[15px]" /> Surprise Me
          </button>
          <button type="button" class="btn-outline flex-1 py-2 text-on-surface sm:flex-none" onclick={() => markDiningOut(day.iso)}>
            <Icon name="storefront" class="text-[15px]" /> Dining Out
          </button>
        </div>
      {:else if day.status === 'diningOut' && !day.isPast}
        <button type="button" class="btn-outline flex-shrink-0 py-2 text-on-surface" onclick={() => clearDay(day.iso)}>
          <Icon name="undo" class="text-[15px]" /> Plan a Meal Instead
        </button>
      {/if}
    </div>
  {/if}
</article>
