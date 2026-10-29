<script>
  // One evening as a full-width row of the planner's list: on phones, and in Minimal view on every screen (`minimal`).
  // Wider screens otherwise show the week grid (DayGridCard). Past evenings are one-line rows; only today keeps the
  // large photo. View Recipe (and Mark Done today) stay visible; the other actions sit in the ⋯ menu, as in the grid.
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import TonightPanel from './TonightPanel.svelte';
  import TonightRail from './TonightRail.svelte';
  import ActionMenu from './ActionMenu.svelte';
  import { surpriseMe, markDiningOut, clearDay, clearEvening, setDone, spotlight, switchTargets } from '../planner.svelte.js';
  import { focusDay } from '../focusDay.js';
  import { groupedActions } from '../menuGroups.js';
  import { dayActionGroups, dayMarkers, hasMeal as dayHasMeal, isMovable } from '../dayCard.js';
  import { text } from '../text.js';
  import { formatShort, formatWeekday, formatWeekdayShort } from '../dates.js';
  import { href } from '../router.svelte.js';
  import { tagClass } from '../tagColors.svelte.js';
  import DayHeadsUps from './DayHeadsUps.svelte';
  import DaySuggestion from './DaySuggestion.svelte';
  import SuggestedChip from './SuggestedChip.svelte';
  import { MediaQuery } from 'svelte/reactivity';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number], minimal?: boolean,
   *   onswitch?: (iso: string) => void, draghandle?: (iso: string) => (el: HTMLElement) => () => void,
   *   drop?: '' | 'source' | 'over' | 'target' | 'off' }}
   */
  let { day, minimal = false, onswitch, draghandle, drop = '' } = $props();

  // Phones (this list below md): tonight's link opens the recipe in cook view, "Cook" instead of View Recipe.
  const phone = new MediaQuery('max-width: 767px');

  const weekdayName = $derived(formatWeekday(day.iso));
  const hasMeal = $derived(dayHasMeal(day.status));
  // A planned meal that some other evening of the week can take (Switch Days… or dragging).
  const movable = $derived(isMovable(day.status, switchTargets(day.iso).length));
  const handle = $derived(movable && !!onswitch && !!draghandle);
  const markers = $derived(dayMarkers(day));
  // Auto-fill's suggestion, not planned yet: no ⋯ menu, its own actions (DaySuggestion).
  const suggestion = $derived(!!day.suggestion);

  // Tonight shows a title panel where the photo would be when there is none (unset, or it failed to load).
  let failedSrc = $state('');
  const imageFailed = $derived(!!failedSrc && failedSrc === day.recipe?.image);
  const panel = $derived(day.isToday && !!day.recipe && (!day.recipe.image || imageFailed));

  // The rail's fill and the check's pop play when Mark Done is pressed, not when a done card loads.
  let celebrate = $state(false);
  function toggleDone() {
    const done = day.status !== 'completed';
    celebrate = done;
    setDone(day.iso, done);
  }

  /** @type {import('./ActionMenu.svelte').MenuAction[]} */
  const actions = $derived.by(() => {
    const available = {
      swap: { id: 'swap', label: text.planner.card.swapMeal, icon: 'sync_alt', href: href('/catalog', { day: day.iso }) },
      surprise: { id: 'surprise', label: text.planner.card.surpriseMe, icon: 'casino', onselect: () => surpriseMe(day.iso) },
      switch: { id: 'switch', label: text.planner.card.switchDays, icon: 'swap_vert', onselect: () => onswitch?.(day.iso) },
      nightOff: { id: 'nightOff', label: text.planner.card.nightOffAction, icon: 'storefront', onselect: () => { markDiningOut(day.iso); focusDay(day.iso); } },
      clear: { id: 'clear', label: text.planner.card.clearEvening, icon: 'backspace', onselect: () => { clearEvening(day.iso); focusDay(day.iso); } },
    };
    return groupedActions(
      suggestion ? [] : dayActionGroups({ status: day.status, isToday: day.isToday, minimal, movable, canSwitch: !!onswitch }).map((group) => group.map((id) => available[id])),
    );
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

  // Buttons are 44 px tall on touch screens, the usual size from `md` with a mouse (Minimal view on a desktop).
  const tall = 'min-h-11 md:fine:min-h-0';

  const cardClass = $derived(
    suggestion
      ? `border-2 border-dashed border-primary/50 bg-surface-container-lowest shadow-sm ${day.isToday ? 'relative overflow-hidden' : ''}`
      : day.isToday
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
    aria-label={text.planner.card.aria(weekdayName, formatShort(day.iso), day.isToday) + (day.suggestion ? text.planner.card.suggestedAria(day.suggestion.title) : '')}
    class="focus-ring relative flex flex-col rounded-xl transition-all {minimal ? 'gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3' : 'gap-3 p-4'} {cardClass} {spotlightClass} {dropClass[drop]}"
  >
    {#if day.isToday}
      <TonightRail done={day.status === 'completed'} {celebrate} />
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
        {#if minimal && day.suggestion}
          <span class="mt-0.5 block text-label-sm uppercase text-primary">{text.planner.card.suggested}</span>
        {/if}
        {#if !minimal}
          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="font-display text-on-surface {day.isToday ? 'text-lg' : 'text-base'}">{formatShort(day.iso)}</span>
            {#if markers.tonight || markers.completed || suggestion}
              {#if suggestion}
                <span class="order-last"><SuggestedChip /></span>
              {/if}
              {#if markers.tonight}
                <span class="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-label-sm uppercase text-on-primary shadow-sm">
                  <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>{text.planner.card.tonight}
                </span>
              {/if}
              {#if markers.completed}
                <span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-sm text-primary">
                  <Icon name="check_circle" class="text-[13px] {celebrate ? 'done-pop' : ''}" /> {text.planner.card.completed}
                </span>
              {/if}
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
      {@const cookLink = day.isToday && phone.current}
      {@const recipeHref = href(`/recipe/${recipe.id}`, { day: day.iso, cook: cookLink ? '1' : undefined })}
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
              <!-- Icon-only like View Recipe and, as on the full card, tonight's primary action; the name stays "Mark Done"
                   with aria-pressed. -->
              <button
                type="button"
                aria-pressed={day.status === 'completed'}
                aria-label={text.common.markDone}
                title={text.common.markDone}
                class="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-all md:fine:h-9 md:fine:w-9 {day.status === 'completed'
                  ? 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
                  : 'bg-primary-container text-on-primary shadow-sm hover:bg-primary'}"
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
            aria-label={cookLink ? text.planner.card.cookAria(recipe.title) : text.planner.card.viewRecipeAria(recipe.title)}
            title={cookLink ? text.common.cook : text.planner.card.viewRecipe}
            class="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md transition-all md:fine:h-9 md:fine:w-9 {day.isToday || day.status === 'planned'
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-dim'
              : 'text-primary hover:bg-primary-fixed/50'}"
          >
            <Icon name={cookLink ? 'chef_hat' : 'arrow_forward'} class="text-[20px]" />
          </a>
          {#if handle}
            {@render dragHandle('')}
          {/if}
        </div>
      {:else}
        {#if day.isToday}
          {#if panel}
            <TonightPanel {recipe} class="min-h-40 w-full sm:min-h-48" />
          {:else}
            <RecipeImage bind:failed={() => imageFailed, (failed) => (failedSrc = failed ? (day.recipe?.image ?? '') : '')} src={recipe.image} alt={recipe.title} class="h-40 w-full rounded-lg shadow-sm sm:h-48" />
            <div class="min-w-0">
              <h3 class="font-display text-lg text-on-surface">{recipe.title}</h3>
              <p class="mt-1 text-xs text-on-surface-variant">{text.planner.card.meta(recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
              {@render tagList(recipe.tags, 'mt-2')}
            </div>
          {/if}
        {:else}
          <div class="flex items-start gap-3">
            <RecipeImage src={recipe.image} alt={recipe.title} class="h-16 w-16 flex-shrink-0 rounded-lg" />
            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-2 font-display text-base leading-snug text-on-surface" title={recipe.title}>{recipe.title}</h3>
              {@render tagList(recipe.tags, 'mt-1.5')}
            </div>
          </div>
        {/if}
        <!-- Other evenings: lined up with the title column, right of the 64 px thumbnail and its 12 px gap. -->
        <DayHeadsUps {day} class="items-start {day.isToday ? '' : 'ml-[4.75rem]'}" />
        <div class="flex items-center gap-2">
          <a
            href={recipeHref}
            data-day-focus
            aria-label={day.isToday ? undefined : text.planner.card.viewRecipeAria(recipe.title)}
            class="focus-ring inline-flex items-center gap-1 rounded-md bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition-all hover:bg-surface-dim {tall}"
          >
            {#if cookLink}
              <Icon name="chef_hat" class="text-[14px]" /> {text.common.cook}
            {:else}
              {text.planner.card.viewRecipe} <Icon name="arrow_forward" class="text-[14px]" />
            {/if}
          </a>
          {#if day.isToday}
            <!-- Tonight's primary action (View Recipe is tonal). Shows "Done" once pressed; the name stays "Mark Done" (it
                 contains the visible word) with aria-pressed. -->
            <button
              type="button"
              aria-pressed={day.status === 'completed'}
              aria-label={text.common.markDone}
              class="focus-ring inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {tall} {day.status === 'completed'
                ? 'bg-primary-fixed/50 text-primary hover:bg-primary-fixed'
                : 'bg-primary-container text-on-primary shadow-sm hover:bg-primary'}"
              onclick={toggleDone}
            >
              <Icon name="check_circle" class="text-[14px]" /> {day.status === 'completed' ? text.common.done : text.common.markDone}
            </button>
          {/if}
        </div>
      {/if}
    {:else if day.suggestion}
      <DaySuggestion {day} size={minimal ? 'minimal' : day.isToday ? 'tonight' : 'row'} />
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

      {#if !minimal}<DayHeadsUps {day} class="items-start" />{/if}
      {#if minimal}
        <!-- Minimal view: just Choose on open evenings. -->
      {:else if day.status === 'open'}
        <div class="flex items-center gap-2">
          <a href={href('/catalog', { day: day.iso })} data-day-focus class="btn-outline text-on-surface {tall}">
            <Icon name="add" class="text-[15px]" /> {text.planner.card.chooseMeal}
          </a>
          <button type="button" class="btn text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface {tall}" onclick={() => { surpriseMe(day.iso); focusDay(day.iso); }}>
            <Icon name="casino" class="text-[15px]" /> {text.planner.card.surpriseMe}
          </button>
        </div>
      {:else if day.status === 'diningOut'}
        <div class="flex items-center gap-2">
          <button type="button" class="btn-outline text-on-surface {tall}" onclick={() => { clearDay(day.iso); focusDay(day.iso); }}>
            <Icon name="restaurant" class="text-[15px]" /> {text.planner.card.planEvening}
          </button>
        </div>
      {/if}
    {/if}
    {#if minimal}
      <!-- Under the row, lined up with the thumbnails (from `sm`: after the 9 rem label column and its gap). -->
      <DayHeadsUps {day} minimal class="sm:basis-full sm:items-start sm:pl-[9.75rem]" />
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
    class="focus-ring flex h-11 w-11 flex-shrink-0 cursor-grab items-center justify-center rounded-md text-outline fine:hover:bg-surface-container-high fine:hover:text-on-surface active:cursor-grabbing md:fine:h-10 md:fine:w-8 {extra}"
    onclick={() => onswitch?.(day.iso)}
  >
    <Icon name="drag_indicator" class="text-[20px]" />
  </button>
{/snippet}
