<script module>
  import { placeKey } from '../lib/catalogQuery.js';

  /**
   * Where the catalog was left (batches shown, sort, favorites, scroll), for the same search coming back from a recipe.
   * @type {{ key: string, pages: number, sort: string, favoritesOnly: boolean, scrollY: number } | null}
   */
  let place = null;

</script>

<script>
  import { onDestroy, tick, untrack } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import RecipeCard from '../lib/components/RecipeCard.svelte';
  import { recipes, recipeById, tagIcon, normalizeTags, normalizeMeals } from '../lib/recipes.svelte.js';
  import { favorites } from '../lib/favorites.svelte.js';
  import { ingredientOf } from '../lib/ingredients.svelte.js';
  import { DEFAULT_SORT, SORT_IDS, activeFilterCount, activeFilters, mealOptions, plannedIdsOf, searchRecipes, tagFilters, targetDay as dayToPlan } from '../lib/catalogQuery.js';
  import { planner, statusOf, currentWeek, firstOpenDay, assignRecipe, spotlightDay, surpriseMe, tooSoonNote, madeRecently, timesMade, lastMadeOn } from '../lib/planner.svelte.js';
  import { devicePrefs, setHideRecent, setHidePlanned } from '../lib/devicePrefs.svelte.js';
  import { route, href, navigate, left } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { settings } from '../lib/settings.svelte.js';
  import { text } from '../lib/text.js';
  import { formatLong, formatWeekday, weekStartOf, fromISO, weekDates } from '../lib/dates.js';

  const PAGE_SIZE = 9;
  const sortLabels = {
    'most-cooked': text.catalog.sorts.mostCooked,
    quickest: text.catalog.sorts.quickest,
    name: text.catalog.sorts.nameAsc,
    'name-desc': text.catalog.sorts.nameDesc,
    recent: text.catalog.sorts.recent,
  };
  const sorts = SORT_IDS.map((id) => ({ id, label: sortLabels[id] }));

  let query = $state('');
  let sort = $state(DEFAULT_SORT);
  let favoritesOnly = $state(false);
  // On by default and remembered on this device: don't offer meals the viewed week already has (planned or completed).
  const hidePlanned = $derived(devicePrefs.hidePlanned);

  // "Not made recently" is remembered on this device (see Profile): skipping repeats is a standing preference.
  const hideRecent = $derived(devicePrefs.hideRecent);

  /** @param {boolean} on */
  function toggleHideRecent(on) {
    setHideRecent(on);
    pages = 1;
  }
  /** @type {string[]} */
  let active = $state([]);
  /** Chosen meals: a recipe needs any one of them ([] = any). */
  let meals = $state([]);
  let pages = $state(1);

  // Back from a recipe to the same search: pick up where the catalog was left (first run of the effect below only).
  let restore = left.path.startsWith('/recipe/') ? place : null;
  let key = '';

  // Keep search / filter in sync with the URL (header search, "Browse Recipes" links).
  // `filter` is a comma-separated list of tags (tags never contain commas), `meals` one of meals; an older
  // link carries `category`.
  $effect(() => {
    query = route.query.q ?? '';
    active = normalizeTags(route.query.filter?.split(','));
    meals = normalizeMeals(route.query.meals ?? route.query.category);
    const back = restore?.key === placeKey(route.query, untrack(() => targetDay)) ? restore : null;
    restore = null;
    pages = back?.pages ?? 1;
    if (back) {
      sort = back.sort;
      favoritesOnly = back.favoritesOnly;
      // After the router's scroll to the top, once the restored batches are on the page.
      tick().then(() => window.scrollTo({ top: back.scrollY }));
    }
  });

  // The search as shown, for onDestroy (by then the route is the next page's).
  $effect(() => {
    if (route.path === '/catalog') key = placeKey(route.query, targetDay);
  });

  // By the time the catalog goes away the router has scrolled to the top, so the scroll comes from `left`.
  onDestroy(() => {
    place = { key, pages, sort, favoritesOnly, scrollY: left.scrollY };
  });

  /** Shows the next batch whenever the sentinel under the grid comes near the screen. @param {HTMLElement} node */
  function loadMoreWhenNear(node) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) pages++;
    }, { rootMargin: '600px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }

  // One filter per tag in use (suggested tags first); an active tag stays listed even with no recipes.
  const filters = $derived(tagFilters(recipes, active));

  // Meals in use; an active one stays listed even with no recipes.
  const mealChoices = $derived(mealOptions(recipes, meals));

  // A day passed in the URL moves the week stepper to that day's week.
  $effect(() => {
    if (route.query.day) planner.weekStart = weekStartOf(fromISO(route.query.day));
  });

  const plannable = $derived(weekDates(planner.weekStart).filter((iso) => iso >= planner.today));
  const targetDay = $derived(dayToPlan(route.query.day, plannable, firstOpenDay()));
  const targetName = $derived(targetDay ? formatWeekday(targetDay) : undefined);
  const currentPick = $derived(targetDay ? planner.entries[targetDay]?.recipeId : undefined);

  // The week's dinners, except the target day's own — swapping it should still show the current pick.
  const plannedIds = $derived(plannedIdsOf(currentWeek(), targetDay));

  const results = $derived(
    searchRecipes(
      recipes,
      { query, sort, tags: active, meals, favoritesOnly, favoriteIds: favorites.ids, hideRecent, hidePlanned, plannedIds },
      { ingredientOf, madeRecently, timesMade, lastMadeOn },
    ),
  );
  const visible = $derived(results.slice(0, pages * PAGE_SIZE));
  const remaining = $derived(results.length - visible.length);
  const activeCount = $derived(activeFilterCount({ tags: active, meals, favoritesOnly, hideRecent, hidePlanned }));

  function toggleFilter(id) {
    active = active.includes(id) ? active.filter((x) => x !== id) : [...active, id];
    pages = 1;
  }

  /** @param {string} meal */
  function toggleMeal(meal) {
    meals = meals.includes(meal) ? meals.filter((m) => m !== meal) : normalizeMeals([...meals, meal]);
    pages = 1;
  }

  let filtersOpen = $state(false);
  /** @type {HTMLButtonElement | undefined} */
  let filtersButton = $state();

  function closeFilters() {
    filtersOpen = false;
    filtersButton?.focus();
  }

  // The filters that are on, as chips under the search.
  const on = $derived(activeFilters({ tags: active, meals, favoritesOnly, hideRecent, hidePlanned }));

  /** @param {{ kind: string, value?: string }} f */
  function chipLabel(f) {
    if (f.kind === 'favorites') return text.catalog.filters.favorites;
    if (f.kind === 'unplanned') return text.catalog.filters.unplanned;
    if (f.kind === 'recent') return text.catalog.filters.notMadeRecently;
    return f.value ?? '';
  }

  /** @param {{ kind: string, value?: string }} f */
  function removeFilter(f) {
    if (f.kind === 'favorites') favoritesOnly = false;
    else if (f.kind === 'unplanned') setHidePlanned(false);
    else if (f.kind === 'recent') setHideRecent(false);
    else if (f.kind === 'meal') meals = meals.filter((m) => m !== f.value);
    else active = active.filter((t) => t !== f.value);
    pages = 1;
  }

  function clearFilters() {
    active = [];
    meals = [];
    favoritesOnly = false;
    setHidePlanned(false);
    setHideRecent(false);
  }

  function chooseDay(event) {
    navigate('/catalog', { q: query, filter: active.join(','), meals: meals.join(','), day: event.currentTarget.value });
  }

  /** @param {import('../lib/data/recipes.js').Recipe} recipe */
  function select(recipe) {
    const iso = targetDay; // targetDay moves on to the next open day once this one is filled
    if (!iso) return;
    assignRecipe(iso, recipe.id);
    announce(iso, recipe);
  }

  function surprise() {
    const iso = targetDay;
    if (!iso) return;
    const recipe = surpriseMe(iso, results.length ? results : undefined);
    if (recipe) announce(iso, recipe, true);
  }

  /**
   * Back to the planner (the default; see Profile), or a toast rather than a banner so it's seen
   * wherever the catalog is scrolled to.
   */
  function announce(iso, recipe, surprised = false) {
    // Surprise Me's own toast already says when a heads-up is late.
    const note = surprised ? '' : tooSoonNote(iso);
    if (settings.returnToPlanner) {
      spotlightDay(iso);
      navigate('/');
      if (note) showToast(note);
      return;
    }
    const added = text.catalog.toasts.added(surprised ? text.planner.toasts.surprise(recipe.shortTitle) : recipe.shortTitle, formatLong(iso));
    showToast(note ? `${added} ${note}` : added, {
      label: text.catalog.toasts.goToWeekly,
      run: () => navigate('/'),
    });
  }

  /** @param {string} iso */
  function dayOption(iso) {
    const status = statusOf(iso);
    const id = planner.entries[iso]?.recipeId;
    const detail =
      status === 'open' ? text.catalog.dayOpen : status === 'diningOut' ? text.catalog.dayDiningOut : (recipeById.get(id)?.shortTitle ?? '');
    return `${formatLong(iso)} — ${detail}`;
  }
</script>

<div class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-6 md:px-gutter-desktop">
  <!-- Planning context -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <a href={href('/')} class="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" class="text-[16px]" /> {text.catalog.backToPlanner}
      </a>
      <h1 class="mt-1 font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
        {#if !targetDay}
          {text.catalog.titles.catalog}
        {:else if currentPick}
          {text.catalog.titles.swap(targetName)}
        {:else}
          {text.catalog.titles.choose}
        {/if}
      </h1>
    </div>
    <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
    {#if plannable.length}
      <label class="flex min-w-0 items-center gap-2 text-label-md text-on-surface-variant">
        <span class="shrink-0">{text.catalog.planningFor}</span>
        <select
          class="min-w-0 max-w-full flex-1 truncate rounded-lg sm:max-w-sm border border-outline-variant bg-surface-container-lowest py-2 pl-3 pr-8 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          value={targetDay ?? ''}
          onchange={chooseDay}
        >
          {#if !targetDay}<option value="" disabled>{text.catalog.pickDay}</option>{/if}
          {#each plannable as iso (iso)}
            <option value={iso}>{dayOption(iso)}</option>
          {/each}
        </select>
      </label>
    {/if}
      <a href={href('/recipe/new')} class="btn-outline shrink-0 self-start py-2 sm:self-auto">
        <Icon name="add" class="text-[16px]" /> {text.catalog.addCustom}
      </a>
    </div>
  </div>

  <!-- Search, sort and filters on one row. The filters open in a panel; the ones that are on show as chips under it. -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <Icon name="search" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
        <input
          type="search"
          bind:value={query}
          oninput={() => (pages = 1)}
          aria-label={text.catalog.searchAria}
          placeholder={text.catalog.searchPlaceholder}
          class="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-[16px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container fine:min-h-0 fine:text-body-md"
        />
      </div>
      <label class="hidden shrink-0 sm:block">
        <span class="sr-only">{text.catalog.sortBy}</span>
        {@render sortSelect('')}
      </label>
      <button
        type="button"
        bind:this={filtersButton}
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        aria-label={text.catalog.filters.buttonAria(activeCount)}
        onclick={() => (filtersOpen = !filtersOpen)}
        class="focus-ring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-label-md transition-colors fine:min-h-0 fine:py-2 {filtersOpen
          ? 'border-primary bg-primary-fixed text-primary'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}"
      >
        <Icon name="tune" class="text-[18px]" />
        {text.catalog.filters.button}
        {#if activeCount}
          <span class="min-w-5 rounded-full bg-primary px-1.5 text-center text-label-sm leading-5 text-on-primary">{activeCount}</span>
        {/if}
      </button>
    </div>

    {#snippet sortSelect(/** @type {string} */ extra)}
      <select
        bind:value={sort}
        onchange={() => (pages = 1)}
        class="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-3 pr-8 text-[16px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container fine:min-h-0 fine:text-body-sm {extra}"
      >
        {#each sorts as s (s.id)}
          <option value={s.id}>{s.label}</option>
        {/each}
      </select>
    {/snippet}

    <!-- A full 44 px target on touch around a smaller pill. -->
    {#snippet pill(on, label, icon, onclick)}
      <button type="button" aria-pressed={on} {onclick} class="group/pill inline-flex min-h-11 items-center rounded-full focus-ring fine:min-h-0">
        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-label-md transition-colors {on
            ? 'border-primary bg-primary text-on-primary'
            : 'border-surface-container-high bg-surface-container-lowest text-on-surface group-hover/pill:border-outline-variant group-hover/pill:bg-surface-container-low'}"
        >
          {#if icon}<Icon name={icon} class="text-[16px] {icon === 'favorite' && !on ? 'text-secondary' : ''} {icon === 'favorite' && on ? 'icon-filled' : ''}" />{/if}
          <span class="max-w-[16rem] truncate">{label}</span>
        </span>
      </button>
    {/snippet}

    {#snippet group(/** @type {string} */ label, /** @type {import('svelte').Snippet} */ pills)}
      <div role="group" aria-label={label} class="flex flex-col gap-1 fine:gap-2">
        <span class="text-label-sm text-on-surface-variant">{label}</span>
        <div class="flex flex-wrap gap-x-2 fine:gap-y-2">{@render pills()}</div>
      </div>
    {/snippet}

    {#if filtersOpen}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        id="catalog-filters"
        role="region"
        aria-label={text.catalog.filters.button}
        onkeydown={(e) => e.key === 'Escape' && closeFilters()}
        class="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      >
        <label class="flex flex-col gap-1 sm:hidden">
          <span class="text-label-sm text-on-surface-variant">{text.catalog.sortBy}</span>
          {@render sortSelect('w-full')}
        </label>
        {#snippet switches()}
          {@render pill(favoritesOnly, text.catalog.filters.favorites, 'favorite', () => ((favoritesOnly = !favoritesOnly), (pages = 1)))}
          {@render pill(hidePlanned, text.catalog.filters.unplanned, 'event_busy', () => (setHidePlanned(!hidePlanned), (pages = 1)))}
          {@render pill(hideRecent, text.catalog.filters.notMadeRecently, 'history', () => toggleHideRecent(!hideRecent))}
        {/snippet}
        {@render group(text.catalog.filters.show, switches)}
        {#if mealChoices.length > 1 || meals.length}
          {#snippet mealPills()}
            {#each mealChoices as meal (meal)}
              {@render pill(meals.includes(meal), meal, undefined, () => toggleMeal(meal))}
            {/each}
          {/snippet}
          {@render group(text.catalog.filters.meals, mealPills)}
        {/if}
        {#if filters.length}
          {#snippet tagPills()}
            {#each filters as tag (tag)}
              {@render pill(active.includes(tag), tag, tagIcon(tag), () => toggleFilter(tag))}
            {/each}
          {/snippet}
          {@render group(text.catalog.filters.tags, tagPills)}
        {/if}
        <div class="flex items-center justify-between gap-3 border-t border-surface-container-high pt-3">
          {#if activeCount}
            <button type="button" class="min-h-11 text-label-md text-secondary underline underline-offset-4 hover:text-on-surface fine:min-h-0" onclick={clearFilters}>
              {text.catalog.filters.clearAll}
            </button>
          {:else}
            <span></span>
          {/if}
          <button type="button" class="btn-primary min-h-11 px-4 text-label-md fine:min-h-0 fine:py-2" onclick={closeFilters}>
            {text.catalog.filters.done(results.length)}
          </button>
        </div>
      </div>
    {/if}

    <div class="-mx-gutter flex items-center gap-x-2 overflow-x-auto px-gutter [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      <span class="shrink-0 py-1 text-body-sm text-on-surface-variant" aria-live="polite">{text.catalog.count(results.length, recipes.length)}</span>
      {#if !filtersOpen}
        {#each on as f (f.kind + (f.value ?? ''))}
          <button
            type="button"
            aria-label={text.catalog.filters.removeAria(chipLabel(f))}
            onclick={() => removeFilter(f)}
            class="group/chip inline-flex min-h-11 shrink-0 items-center rounded-full focus-ring fine:min-h-0"
          >
            <span class="inline-flex items-center gap-1 rounded-full bg-primary-fixed py-1 pl-3 pr-2 text-label-md text-primary group-hover/chip:bg-primary-fixed/70">
              <span class="max-w-[12rem] truncate">{chipLabel(f)}</span>
              <Icon name="close" class="text-[14px]" />
            </span>
          </button>
        {/each}
        {#if on.length > 1}
          <button type="button" class="min-h-11 shrink-0 px-1 text-label-md text-secondary underline underline-offset-4 hover:text-on-surface fine:min-h-0" onclick={clearFilters}>
            {text.catalog.filters.clearAll}
          </button>
        {/if}
      {/if}
    </div>
  </div>

  {#if visible.length}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each visible as recipe (recipe.id)}
        <RecipeCard
          {recipe}
          day={targetDay}
          dayName={targetName}
          selected={!!targetDay && currentPick === recipe.id}
          onselect={() => select(recipe)}
        />
      {/each}
    </div>
    {#if remaining}
      <!-- Re-created per batch so a sentinel still in range after a batch loads the next one too. -->
      {#key pages}<div {@attach loadMoreWhenNear} class="-mt-6 h-px" aria-hidden="true"></div>{/key}
    {/if}
  {:else if !recipes.length}
    <!-- A new household: nothing in the catalog yet. -->
    <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-16 text-center">
      <Icon name="menu_book" class="text-[36px] text-outline" />
      <h2 class="font-display text-headline-sm text-on-surface">{text.catalog.empty.title}</h2>
      <p class="max-w-md text-body-sm text-on-surface-variant">
        {text.catalog.empty.body}
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-2">
        <a href={href('/recipe/new')} class="btn-primary"><Icon name="add" class="text-[16px]" /> {text.catalog.empty.addRecipe}</a>
        <a href={href('/sheets-sync')} class="btn-outline"><Icon name="table_chart" class="text-[16px]" /> {text.catalog.empty.connectSheets}</a>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-16 text-center">
      <Icon name="search_off" class="text-[36px] text-outline" />
      <h2 class="font-display text-headline-sm text-on-surface">{text.catalog.noMatch.title}</h2>
      <p class="max-w-md text-body-sm text-on-surface-variant">{text.catalog.noMatch.body}</p>
      <button type="button" class="btn-outline mt-2" onclick={() => (clearFilters(), (query = ''))}>
        <Icon name="filter_alt_off" class="text-[16px]" /> {text.catalog.noMatch.clear}
      </button>
    </div>
  {/if}

  {#if targetDay}
    <div class="flex flex-col items-center justify-between gap-6 rounded-3xl bg-surface-container p-6 md:flex-row md:p-8">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-fixed/40 text-secondary">
          <Icon name="auto_stories" class="text-[28px]" />
        </div>
        <div>
          <h3 class="font-display text-headline-sm text-on-surface">{text.catalog.surprise.title(targetName)}</h3>
          <p class="mt-1 max-w-xl text-body-md text-on-surface-variant">
            {text.catalog.surprise.body}
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick={surprise}
        class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-label-md text-on-secondary shadow-md transition-all hover:bg-secondary-hover sm:w-auto"
      >
        <Icon name="casino" class="text-[18px]" /> {text.catalog.surprise.button}
      </button>
    </div>
  {/if}
</div>
