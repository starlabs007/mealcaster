<script>
  // One evening in the planner's week grid (from `md` up): a column of the week, `lead` for tonight's (wider, with
  // the larger title and Mark Done). Phones and Minimal view use DayListCard instead. View Recipe (and Mark Done
  // tonight) stay visible; the other actions sit in the ⋯ menu.
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { surpriseMe, markDiningOut, clearDay, setDone, spotlight, switchTargets } from '../planner.svelte.js';
  import { text } from '../text.js';
  import { formatShort, formatWeekday, formatWeekdayShort } from '../dates.js';
  import { href } from '../router.svelte.js';
  import { tagClass } from '../tagColors.svelte.js';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number], lead?: boolean,
   *   onswitch?: (iso: string) => void, draghandle?: (iso: string) => (el: HTMLElement) => () => void,
   *   drop?: '' | 'source' | 'over' | 'target' | 'off' }}
   */
  let { day, lead = false, onswitch, draghandle, drop = '' } = $props();

  const weekdayName = $derived(formatWeekday(day.iso));
  const hasMeal = $derived(day.status === 'planned' || day.status === 'completed');
  const movable = $derived(day.status === 'planned' && switchTargets(day.iso).length > 0);
  const handle = $derived(movable && !!onswitch && !!draghandle);

  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const actions = $derived.by(() => {
    const surprise = { id: 'surprise', label: text.planner.card.surpriseMe, icon: 'casino', onselect: () => surpriseMe(day.iso) };
    const nightOff = { id: 'nightOff', label: text.planner.card.diningOut, icon: 'storefront', onselect: () => markDiningOut(day.iso) };
    if (day.status === 'open') return [surprise, nightOff];
    if (day.status !== 'planned') return [];
    return [
      { id: 'swap', label: text.planner.card.swapMeal, icon: 'sync_alt', href: href('/catalog', { day: day.iso }) },
      surprise,
      nightOff,
      ...(onswitch && movable ? [{ id: 'switch', label: text.planner.card.switchDays, icon: 'swap_vert', onselect: () => onswitch(day.iso) }] : []),
    ];
  });

  // While a meal is dragged: the card it came from, the one under the pointer, the ones it can go to, the rest.
  const dropClass = {
    '': '',
    source: '!opacity-30',
    over: 'ring-4 ring-secondary/60 ring-offset-2 !opacity-100',
    target: 'outline-dashed outline-2 outline-offset-2 outline-primary/40',
    off: '!opacity-40',
  };

  const cardClass = $derived(
    day.isToday
      ? 'overflow-hidden border-2 border-primary/30 bg-surface-container-lowest shadow-sm'
      : day.status === 'completed'
        ? 'border border-surface-container-high bg-surface-container-low shadow-sm'
        : day.status === 'planned'
          ? 'border border-surface-container-high bg-surface-container-lowest shadow-sm'
          : day.status === 'missed'
            ? 'border border-dashed border-outline-variant bg-surface-container'
            : 'border border-dashed border-outline-variant bg-surface-container-low/70',
  );
</script>

<article
  id="day-{day.iso}"
  data-drag-source
  data-drop-id={day.iso}
  aria-label={text.planner.card.aria(weekdayName, formatShort(day.iso), day.isToday)}
  class="relative flex w-full min-w-0 flex-col rounded-xl transition-all gap-3 p-3 {cardClass} {spotlight.iso ===
  day.iso
    ? 'ring-4 ring-secondary/60 ring-offset-2 !opacity-100 shadow-lift'
    : ''} {dropClass[drop]}"
>
  {#if day.isToday}
    <div class="absolute left-0 top-0 h-full w-1.5 bg-primary" aria-hidden="true"></div>
  {/if}

  <div class="flex items-start gap-1 {day.isToday ? 'pl-1' : ''}">
    <div class="min-w-0 flex-1">
      <!-- Seven columns from xl are narrow: "Wed" there, beside the ⋯ and ⠿ buttons. -->
      <div class="truncate text-sm uppercase tracking-wide {day.isToday ? 'font-bold text-secondary' : 'font-semibold text-on-surface-variant'}">
        {#if lead}{weekdayName}{:else}<span class="xl:hidden">{weekdayName}</span><span class="hidden xl:inline">{formatWeekdayShort(day.iso)}</span>{/if}
      </div>
      <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-display text-on-surface {lead ? 'text-lg' : 'text-base'}">{formatShort(day.iso)}</span>
        {#if day.status === 'completed'}
          <span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-sm text-primary">
            <Icon name="check_circle" class="text-[13px]" /> {text.planner.card.completed}
          </span>
        {:else if day.isToday}
          <span class="rounded-full bg-primary px-2.5 py-0.5 text-label-sm uppercase text-on-primary shadow-sm">{text.planner.card.tonight}</span>
        {:else if day.status === 'diningOut'}
          <span class="rounded bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">{text.planner.card.nightOff}</span>
        {:else if day.status === 'missed'}
          <span class="rounded bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">{text.planner.card.notLogged}</span>
        {/if}
      </div>
    </div>
    {#if actions.length}
      <ActionMenu items={actions} label={text.planner.card.moreAria(weekdayName)} opener="menu" class="-mr-1 -mt-1" />
    {/if}
    {#if handle}
      <!-- Drag to another evening; a press opens the Switch Days picker (the keyboard and screen-reader way). -->
      <button
        type="button"
        {@attach draghandle(day.iso)}
        data-switch-opener="handle"
        aria-label={text.planner.card.moveHandle(weekdayName)}
        title={text.planner.card.moveHandleHint}
        class="focus-ring -mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-md text-outline hover:bg-surface-container-high hover:text-on-surface active:cursor-grabbing"
        onclick={() => onswitch(day.iso)}
      >
        <Icon name="drag_indicator" class="text-[20px]" />
      </button>
    {/if}
  </div>

  {#if hasMeal && day.recipe}
    {@const recipe = day.recipe}
    {@const recipeHref = href(`/recipe/${recipe.id}`, { day: day.iso })}
    <RecipeImage
      src={recipe.image}
      alt={recipe.title}
      class="aspect-[4/3] w-full flex-shrink-0 rounded-lg {day.status === 'completed' ? 'saturate-50' : ''} {lead ? 'shadow-sm' : 'xl:aspect-[4/5]'}"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <h3 class="line-clamp-2 font-display text-on-surface {lead ? 'text-headline-md' : 'text-base leading-snug'}" title={recipe.title}>{recipe.title}</h3>
      {#if lead}
        <p class="text-xs text-on-surface-variant">{text.planner.card.meta(recipe.badge.label, recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
      {/if}
      {#if recipe.tags.length}
        <!-- Up to five lines of tags (16 px each + 6 px gaps) in a narrow column; the rest wrap out of sight (no half tags). -->
        <div class="flex flex-wrap gap-1.5 {lead ? '' : 'max-h-[104px] overflow-hidden'}">
          {#each recipe.tags as tag (tag)}
            <span class="max-w-full flex-shrink-0 truncate rounded-full px-2 py-0.5 text-label-caps {tagClass(tag)}" title={tag}>{tag}</span>
          {/each}
        </div>
      {/if}
      <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <a
          href={recipeHref}
          aria-label={lead ? undefined : text.planner.card.viewRecipeAria(recipe.title)}
          class="focus-ring inline-flex items-center gap-1 text-xs font-semibold transition-all {day.isToday
            ? 'rounded-md bg-primary-container px-3 py-1.5 text-on-primary shadow-sm hover:bg-primary'
            : day.status === 'planned'
              ? 'rounded-md bg-surface-container-high px-3 py-1.5 text-on-surface hover:bg-surface-dim'
              : '-mx-1 -my-1 min-h-6 rounded px-1 py-1 text-primary hover:underline'}"
        >
          {text.planner.card.viewRecipe} <Icon name="arrow_forward" class="text-[14px]" />
        </a>
        {#if day.isToday}
          <!-- A fixed label with aria-pressed, so it's announced as "Mark Done, pressed" (not "Done, pressed"). -->
          <button
            type="button"
            aria-pressed={day.status === 'completed'}
            class="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {day.status === 'completed'
              ? 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
              : 'border border-outline-variant text-on-surface hover:bg-surface-container-high'}"
            onclick={() => setDone(day.iso, day.status !== 'completed')}
          >
            <Icon name="check_circle" class="text-[14px]" /> {text.planner.card.markDone}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Empty evenings (open, night off, not logged) sit centred in their card, like the photo placeholder. -->
    <div class="flex flex-1 flex-col items-center justify-center gap-3 pb-8 text-center">
      <!-- Stacked: side by side, the text wraps word by word in the narrow seven-column cells. -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-outline">
          <Icon name={day.status === 'diningOut' ? 'storefront' : 'restaurant'} class="text-xl" />
        </div>
        <h3 class="font-display text-base leading-snug text-on-surface">
          {day.status === 'diningOut'
            ? text.planner.card.diningOutTitle
            : day.status === 'missed'
              ? text.planner.card.missedTitle
              : text.planner.card.nothingPlanned}
        </h3>
      </div>
      {#if lead && day.status === 'diningOut'}
        <p class="text-xs text-on-surface-variant">{text.planner.card.diningOutNote}</p>
      {:else if lead && day.status === 'missed'}
        <p class="text-xs text-on-surface-variant">{text.planner.card.missedNote}</p>
      {/if}
      {#if day.status === 'open'}
        <a href={href('/catalog', { day: day.iso })} class="btn-outline py-2 text-on-surface">
          <Icon name="add" class="text-[15px]" /> {text.planner.card.chooseMeal}
        </a>
      {:else if day.status === 'diningOut' && !day.isPast}
        <button type="button" class="btn-outline py-2 text-on-surface" onclick={() => clearDay(day.iso)}>
          <Icon name="undo" class="text-[15px]" /> {text.planner.card.planInstead}
        </button>
      {/if}
    </div>
  {/if}
</article>
