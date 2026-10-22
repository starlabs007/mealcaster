<script>
  // One evening as a full-width row of the planner's list: on phones, and in Minimal view on every screen (`minimal`).
  // Wider screens otherwise show the week grid (DayGridCard). Past evenings are one-line rows; only today keeps the
  // large photo. View Recipe (and Mark Done today) stay visible; the other actions sit in the ⋯ menu, as in the grid.
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { surpriseMe, markDiningOut, clearDay, clearEvening, setDone, spotlight, switchTargets } from '../planner.svelte.js';
  import { focusDay } from '../focusDay.js';
  import { text } from '../text.js';
  import { formatShort, formatWeekday, formatWeekdayShort } from '../dates.js';
  import { href } from '../router.svelte.js';
  import { tagClass } from '../tagColors.svelte.js';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number], minimal?: boolean,
   *   onswitch?: (iso: string) => void, draghandle?: (iso: string) => (el: HTMLElement) => () => void,
   *   drop?: '' | 'source' | 'over' | 'target' | 'off' }}
   */
  let { day, minimal = false, onswitch, draghandle, drop = '' } = $props();

  const weekdayName = $derived(formatWeekday(day.iso));
  const hasMeal = $derived(day.status === 'planned' || day.status === 'completed');
  // A planned meal that some other evening of the week can take (Switch Days… or dragging).
  const movable = $derived(day.status === 'planned' && switchTargets(day.iso).length > 0);
  const handle = $derived(movable && !!onswitch && !!draghandle);

  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const actions = $derived.by(() => {
    // Minimal view keeps the ⋯ menu on tonight only (the other rows stay one-tap quiet).
    if (minimal && !day.isToday) return [];
    const surprise = { id: 'surprise', label: text.planner.card.surpriseMe, icon: 'casino', onselect: () => surpriseMe(day.iso) };
    const nightOff = { id: 'nightOff', label: text.planner.card.nightOffAction, icon: 'storefront', onselect: () => { markDiningOut(day.iso); focusDay(day.iso); } };
    if (day.status === 'open') return [surprise, nightOff];
    if (day.status !== 'planned') return [];
    return [
      { id: 'swap', label: text.planner.card.swapMeal, icon: 'sync_alt', href: href('/catalog', { day: day.iso }) },
      surprise,
      nightOff,
      ...(onswitch && movable ? [{ id: 'switch', label: text.planner.card.switchDays, icon: 'swap_vert', onselect: () => onswitch(day.iso) }] : []),
      { id: 'clear', label: text.planner.card.clearEvening, icon: 'backspace', onselect: () => { clearEvening(day.iso); focusDay(day.iso); } },
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
  const spotlightClass = $derived(spotlight.days.includes(day.iso) ? 'ring-4 ring-secondary/60 ring-offset-2 !opacity-100 shadow-lift' : '');

  // Buttons are 44 px tall on phones (touch targets), the usual size from `md` (Minimal view on a desktop).
  const tall = 'min-h-11 md:min-h-0';

  const cardClass = $derived(
    day.isToday
      ? 'relative overflow-hidden border-2 border-primary/30 bg-surface-container-lowest shadow-sm'
      : day.status === 'planned'
        ? 'border border-surface-container-high bg-surface-container-lowest shadow-sm'
        : 'border border-dashed border-outline-variant bg-surface-container-low/70',
  );
</script>

{#if day.isPast}
  <!-- History: one line with the weekday and what was eaten; a meal opens its recipe. -->
  <article
    id="day-{day.iso}"
    data-drop-id={day.iso}
    aria-label={text.planner.card.aria(weekdayName, formatShort(day.iso), false)}
    class="rounded-lg border border-surface-container-high bg-surface-container-low/60 transition-all {spotlightClass} {dropClass[drop]}"
  >
    {#if hasMeal && day.recipe}
      <a
        href={href(`/recipe/${day.recipe.id}`, { day: day.iso })}
        class="focus-ring flex min-h-12 items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-surface-container-high"
      >
        {@render pastWeekday()}
        <RecipeImage src={day.recipe.image} alt="" class="h-8 w-8 flex-shrink-0 rounded-md" />
        <span class="min-w-0 flex-1 truncate font-display text-sm text-on-surface">{day.recipe.title}</span>
        <Icon name="arrow_forward" class="flex-shrink-0 text-[18px] text-on-surface-variant" />
      </a>
    {:else}
      <div class="flex min-h-12 items-center gap-3 px-3 py-1.5">
        {@render pastWeekday()}
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-container-highest text-outline">
          <Icon name={day.status === 'diningOut' ? 'storefront' : 'restaurant'} class="text-[18px]" />
        </div>
        <span class="text-sm text-on-surface-variant">
          {day.status === 'diningOut' ? text.planner.card.nightOff : text.planner.card.noPlan}
        </span>
      </div>
    {/if}
  </article>
{:else}
  <article
    id="day-{day.iso}"
    data-drag-source
    tabindex="-1"
    data-drop-id={day.iso}
    aria-label={text.planner.card.aria(weekdayName, formatShort(day.iso), day.isToday)}
    class="focus-ring relative flex flex-col rounded-xl transition-all {minimal ? 'gap-2 p-3 sm:flex-row sm:items-center sm:gap-3' : 'gap-3 p-4'} {cardClass} {spotlightClass} {dropClass[drop]}"
  >
    {#if day.isToday}
      <div class="absolute left-0 top-0 h-full w-1.5 bg-primary" aria-hidden="true"></div>
    {/if}

    <!-- Day label, with the ⋯ menu and the drag handle on the right (Minimal view: they end the meal row instead, and
         tonight's row adds Mark Done and a Tonight marker here; from `sm` the label is a column on the left). -->
    <div data-menu-clear class="flex items-center gap-1 {day.isToday ? 'pl-1' : ''} {minimal ? 'sm:w-36 sm:flex-shrink-0' : ''}">
      <div class="min-w-0 flex-1">
        <h2 class="text-sm uppercase tracking-wide {day.isToday ? 'font-bold text-secondary' : 'font-semibold text-on-surface-variant'}">
          {weekdayName}
        </h2>
        {#if minimal && day.isToday}
          <span class="mt-0.5 inline-flex items-center gap-1.5 text-label-sm uppercase text-primary">
            <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>{text.planner.card.tonight}
          </span>
        {/if}
        {#if !minimal}
          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="font-display text-on-surface {day.isToday ? 'text-lg' : 'text-base'}">{formatShort(day.iso)}</span>
            {#if day.status === 'completed' && !day.isPast}
              <span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-sm text-primary">
                <Icon name="check_circle" class="text-[13px]" /> {text.planner.card.completed}
              </span>
            {:else if day.isToday}
              <span class="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-label-sm uppercase text-on-primary shadow-sm">
                <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>{text.planner.card.tonight}
              </span>
            {:else if day.status === 'diningOut'}
              <span class="rounded bg-surface-container-high px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">{text.planner.card.nightOff}</span>
            {/if}
          </div>
        {/if}
      </div>
      {#if actions.length && !minimal}
        <ActionMenu items={actions} label={text.planner.card.moreAria(weekdayName)} opener="menu" class="-my-1" />
      {/if}
      {#if handle && !minimal}
        {@render dragHandle('-my-1')}
      {/if}
    </div>

    {#if hasMeal && day.recipe}
      {@const recipe = day.recipe}
      {@const recipeHref = href(`/recipe/${recipe.id}`, { day: day.iso })}
      {#if minimal}
        <!-- Tonight's Mark Done and ⋯ sit at the card's top right on phones (beside the weekday); View Recipe and the drag
             handle end the title row like on every other row. DOM order = visual order, so Tab follows the eye. -->
        <div class="flex flex-1 items-center gap-3">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <RecipeImage src={recipe.image} alt={recipe.title} class="h-8 w-8 flex-shrink-0 rounded-md" />
            <h3 class="min-w-0 flex-1 truncate font-display text-sm text-on-surface">{recipe.title}</h3>
          </div>
          {#if day.isToday}
            <div class="flex items-center gap-3 max-sm:absolute max-sm:right-3 max-sm:top-3">
              <!-- Icon-only like View Recipe; the name stays "Mark Done" with aria-pressed, as on the full card. -->
              <button
                type="button"
                aria-pressed={day.status === 'completed'}
                aria-label={text.planner.card.markDone}
                title={text.planner.card.markDone}
                class="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-all md:h-9 md:w-9 {day.status === 'completed'
                  ? 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-high'}"
                onclick={() => setDone(day.iso, day.status !== 'completed')}
              >
                <Icon name="check_circle" class="text-[20px]" />
              </button>
              {#if actions.length}
                <ActionMenu items={actions} label={text.planner.card.moreAria(weekdayName)} opener="menu" />
              {/if}
            </div>
          {/if}
          <a
            href={recipeHref}
            data-day-focus
            aria-label={text.planner.card.viewRecipeAria(recipe.title)}
            title={text.planner.card.viewRecipe}
            class="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-all md:h-9 md:w-9 {day.isToday
              ? 'bg-primary-container text-on-primary shadow-sm hover:bg-primary'
              : day.status === 'planned'
                ? 'bg-surface-container-high text-on-surface hover:bg-surface-dim'
                : 'text-primary hover:bg-primary-fixed/50'}"
          >
            <Icon name="arrow_forward" class="text-[20px]" />
          </a>
          {#if handle}
            {@render dragHandle('')}
          {/if}
        </div>
      {:else}
        {#if day.isToday}
          <RecipeImage src={recipe.image} alt={recipe.title} class="h-40 w-full rounded-lg shadow-sm sm:h-48" />
          <div class="min-w-0">
            <h3 class="font-display text-lg text-on-surface">{recipe.title}</h3>
            <p class="mt-1 text-xs text-on-surface-variant">{text.planner.card.meta(recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
            {@render tagList(recipe.tags, 'mt-2')}
          </div>
        {:else}
          <div class="flex items-start gap-3">
            <RecipeImage src={recipe.image} alt={recipe.title} class="h-16 w-16 flex-shrink-0 rounded-lg" />
            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-2 font-display text-base leading-snug text-on-surface" title={recipe.title}>{recipe.title}</h3>
              {@render tagList(recipe.tags, 'mt-1.5')}
            </div>
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <a
            href={recipeHref}
            data-day-focus
            aria-label={day.isToday ? undefined : text.planner.card.viewRecipeAria(recipe.title)}
            class="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {tall} {day.isToday
              ? 'bg-primary-container text-on-primary shadow-sm hover:bg-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-dim'}"
          >
            {text.planner.card.viewRecipe} <Icon name="arrow_forward" class="text-[14px]" />
          </a>
          {#if day.isToday}
            <!-- Shows "Done" once pressed; the name stays "Mark Done" (it contains the visible word) with aria-pressed. -->
            <button
              type="button"
              aria-pressed={day.status === 'completed'}
              aria-label={text.planner.card.markDone}
              class="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {tall} {day.status === 'completed'
                ? 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
                : 'border border-outline-variant text-on-surface hover:bg-surface-container-high'}"
              onclick={() => setDone(day.iso, day.status !== 'completed')}
            >
              <Icon name="check_circle" class="text-[14px]" /> {day.status === 'completed' ? text.planner.card.done : text.planner.card.markDone}
            </button>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="flex flex-1 items-center gap-3">
        <div class="flex flex-shrink-0 items-center justify-center bg-surface-container-highest text-outline {minimal ? 'h-8 w-8 rounded-md' : 'h-12 w-12 rounded-lg'}">
          <Icon name={day.status === 'diningOut' ? 'storefront' : 'restaurant'} class={minimal ? 'text-[18px]' : 'text-2xl'} />
        </div>
        <div class="min-w-0 flex-1">
          {#if day.status === 'diningOut'}
            <h3 class="font-display text-on-surface {minimal ? 'text-sm' : 'text-base'}">{text.planner.card.nightOff}</h3>
            {#if !minimal}<p class="mt-0.5 text-xs text-on-surface-variant">{text.planner.card.nightOffNote}</p>{/if}
          {:else}
            <h3 class="font-display text-on-surface {minimal ? 'text-sm' : 'text-base'}">{text.planner.card.nothingPlanned}</h3>
          {/if}
        </div>
        {#if minimal && day.status === 'open'}
          <a
            href={href('/catalog', { day: day.iso })}
            data-day-focus
            aria-label={text.planner.card.chooseAria(weekdayName)}
            class="btn-outline flex-shrink-0 text-on-surface {tall}"
          >
            <Icon name="add" class="text-[15px]" /> {text.planner.card.choose}
          </a>
        {/if}
      </div>

      {#if minimal}
        <!-- Minimal view: just Choose on open evenings. -->
      {:else if day.status === 'open'}
        <div class="flex items-center gap-2">
          <a href={href('/catalog', { day: day.iso })} data-day-focus class="btn-outline text-on-surface {tall}">
            <Icon name="add" class="text-[15px]" /> {text.planner.card.chooseMeal}
          </a>
        </div>
      {:else if day.status === 'diningOut'}
        <div class="flex items-center gap-2">
          <button type="button" class="btn-outline text-on-surface {tall}" onclick={() => { clearDay(day.iso); focusDay(day.iso); }}>
            <Icon name="restaurant" class="text-[15px]" /> {text.planner.card.planEvening}
          </button>
        </div>
      {/if}
    {/if}
  </article>
{/if}

{#snippet pastWeekday()}
  <!-- Minimal view from `sm`: the same 9 rem label column as the upcoming rows, so the thumbnails line up. -->
  <h2 class="w-10 flex-shrink-0 {minimal ? 'sm:w-36' : ''} text-xs font-semibold uppercase tracking-wide text-on-surface-variant" aria-label={weekdayName}>{formatWeekdayShort(day.iso)}</h2>
{/snippet}

{#snippet tagList(/** @type {string[]} */ tags, /** @type {string} */ extra)}
  {#if tags.length}
    <div class="flex flex-wrap gap-1.5 {extra}">
      {#each tags as tag (tag)}
        <span class="max-w-full truncate rounded-full px-2 py-0.5 text-label-sm {tagClass(tag)}" title={tag}>{tag}</span>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet dragHandle(/** @type {string} */ extra)}
  <!-- Drag to another evening; a press opens the Switch Days picker (the keyboard and screen-reader way). -->
  <button
    type="button"
    {@attach draghandle?.(day.iso)}
    data-switch-opener="handle"
    aria-label={text.planner.card.moveHandle(weekdayName)}
    title={text.planner.card.moveHandleHint}
    class="focus-ring flex h-11 w-11 flex-shrink-0 cursor-grab items-center justify-center rounded-md text-outline hover:bg-surface-container-high hover:text-on-surface active:cursor-grabbing md:h-10 md:w-8 {extra}"
    onclick={() => onswitch?.(day.iso)}
  >
    <Icon name="drag_indicator" class="text-[20px]" />
  </button>
{/snippet}
