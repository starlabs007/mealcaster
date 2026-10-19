<script module>
  /**
   * Where the catalog was left (batches shown, sort, favorites, scroll), for the same search coming back from a recipe.
   * @type {{ key: string, pages: number, sort: string, favoritesOnly: boolean, scrollY: number } | null}
   */
  let place = null;

  /** The search as shown: the day is the one being planned, so `#/catalog` and its breadcrumb's `?day=` match. */
  const placeKey = (q, day) => JSON.stringify([q.q ?? '', q.filter ?? '', q.category ?? '', day ?? '']);
</script>

<script>
  import { onDestroy, tick, untrack } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import RecipeCard from '../lib/components/RecipeCard.svelte';
  import { recipes, recipeById, tagChoices, tagIcon, normalizeTags, categoryChoices, normalizeCategory } from '../lib/recipes.svelte.js';
  import { favorites } from '../lib/favorites.svelte.js';
  import { ingredientOf } from '../lib/ingredients.svelte.js';
  import { foldKey } from '../lib/ingredients.js';
  import { planner, statusOf, currentWeek, firstOpenDay, assignRecipe, spotlightDay, surpriseMe, madeRecently, timesMade, lastMadeOn } from '../lib/planner.svelte.js';
  import { devicePrefs, setHideRecent, setHidePlanned } from '../lib/devicePrefs.svelte.js';
  import { route, href, navigate, left } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { settings } from '../lib/settings.svelte.js';
  import { text } from '../lib/text.js';
  import { formatLong, formatWeekday, weekStartOf, fromISO, weekDates } from '../lib/dates.js';

  const PAGE_SIZE = 9;
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  const sorts = [
    {
      id: 'most-cooked',
      label: text.catalog.sorts.mostCooked,
      // From the plan history; ties go to the one made most recently, then A–Z.
      compare: (a, b) =>
        timesMade(b.id) - timesMade(a.id) ||
        (lastMadeOn(b.id) ?? '').localeCompare(lastMadeOn(a.id) ?? '') ||
        a.title.localeCompare(b.title),
    },
    { id: 'quickest', label: text.catalog.sorts.quickest, compare: (a, b) => a.minutes - b.minutes },
    { id: 'name', label: text.catalog.sorts.nameAsc, compare: byTitle },
    { id: 'name-desc', label: text.catalog.sorts.nameDesc, compare: (a, b) => byTitle(b, a) },
    { id: 'recent', label: text.catalog.sorts.recent, compare: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  ];

  let query = $state('');
  let sort = $state('most-cooked');
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
  /** One category at a time ('' = any) — a recipe has at most one. */
  let category = $state('');
  let pages = $state(1);

  // Back from a recipe to the same search: pick up where the catalog was left (first run of the effect below only).
  let restore = left.path.startsWith('/recipe/') ? place : null;
  let key = '';

  // Keep search / filter in sync with the URL (header search, "Browse Recipes" links).
  // `filter` is a comma-separated list of tags (tags never contain commas).
  $effect(() => {
    query = route.query.q ?? '';
    active = normalizeTags(route.query.filter?.split(','));
    category = normalizeCategory(route.query.category);
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
  const filters = $derived(
    tagChoices([...recipes.flatMap((r) => r.tags), ...active]).filter((t) => active.includes(t) || recipes.some((r) => r.tags.includes(t))),
  );

  // Categories in use (suggested ones first); the active one stays listed even with no recipes.
  const categories = $derived(
    categoryChoices([...recipes.map((r) => r.badge.label), category]).filter(
      (c) => c === category || recipes.some((r) => r.badge.label === c),
    ),
  );

  // A day passed in the URL moves the week stepper to that day's week.
  $effect(() => {
    if (route.query.day) planner.weekStart = weekStartOf(fromISO(route.query.day));
  });

  const plannable = $derived(weekDates(planner.weekStart).filter((iso) => iso >= planner.today));
  const targetDay = $derived(
    route.query.day && plannable.includes(route.query.day) ? route.query.day : firstOpenDay(),
  );
  const targetName = $derived(targetDay ? formatWeekday(targetDay) : undefined);
  const currentPick = $derived(targetDay ? planner.entries[targetDay]?.recipeId : undefined);

  // The week's dinners, except the target day's own — swapping it should still show the current pick.
  const plannedIds = $derived(
    new Set(
      currentWeek()
        .filter((d) => (d.status === 'planned' || d.status === 'completed') && d.recipe && d.iso !== targetDay)
        .map((d) => d.recipe.id),
    ),
  );

  const results = $derived.by(() => {
    // Accents and case don't matter: "bun cha" finds Bún chả.
    const words = foldKey(query).split(' ').filter(Boolean);
    return recipes
      .filter((r) => !favoritesOnly || favorites.ids.includes(r.id))
      .filter((r) => !hideRecent || !madeRecently(r.id))
      .filter((r) => !hidePlanned || !plannedIds.has(r.id))
      .filter((r) => !category || r.badge.label === category)
      .filter((r) => active.every((t) => r.tags.includes(t)))
      .filter((r) => {
        if (!words.length) return true;
        const haystack = [
          r.title,
          r.description,
          r.badge.label,
          ...r.tags,
          ...r.ingredients.flatMap((g) => g.items.flatMap((i) => {
            const ingredient = ingredientOf(i.id);
            return ingredient ? [ingredient.name, ingredient.plural] : [];
          })),
        ];
        const searchable = foldKey(haystack.join(' '));
        return words.every((w) => searchable.includes(w));
      })
      .sort(sorts.find((s) => s.id === sort).compare);
  });
  const visible = $derived(results.slice(0, pages * PAGE_SIZE));
  const remaining = $derived(results.length - visible.length);
  const activeCount = $derived(active.length + (category ? 1 : 0) + (favoritesOnly ? 1 : 0) + (hideRecent ? 1 : 0) + (hidePlanned ? 1 : 0));

  function toggleFilter(id) {
    active = active.includes(id) ? active.filter((x) => x !== id) : [...active, id];
    pages = 1;
  }

  function clearFilters() {
    active = [];
    category = '';
    favoritesOnly = false;
    setHidePlanned(false);
    setHideRecent(false);
  }

  function chooseDay(event) {
    navigate('/catalog', { q: query, filter: active.join(','), category, day: event.currentTarget.value });
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
    if (settings.returnToPlanner) {
      spotlightDay(iso);
      navigate('/');
      return;
    }
    showToast(text.catalog.toasts.added(surprised ? text.planner.toasts.surprise(recipe.shortTitle) : recipe.shortTitle, formatLong(iso)), {
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

<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
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

  <!-- Search & sort toolbar -->
  <div class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-card lg:flex-row lg:items-center">
    <div class="relative flex-1">
      <Icon name="search" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
      <input
        type="search"
        bind:value={query}
        oninput={() => (pages = 1)}
        aria-label={text.catalog.searchAria}
        placeholder={text.catalog.searchPlaceholder}
        class="w-full rounded-xl border border-outline bg-surface-container-low py-3 pl-11 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container"
      />
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2 text-label-sm text-on-surface-variant">
        {text.catalog.sortBy}
        <select
          bind:value={sort}
          class="rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-3 pr-8 text-body-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
        >
          {#each sorts as s (s.id)}
            <option value={s.id}>{s.label}</option>
          {/each}
        </select>
      </label>
      <span class="flex items-center gap-2 text-body-sm text-on-surface-variant" aria-live="polite">
        <span class="h-1.5 w-1.5 rounded-full bg-on-surface-variant"></span>
        {@html text.catalog.displaying(visible.length, results.length)}
      </span>
    </div>
  </div>

  <!-- Filter pills -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-label-caps uppercase text-on-surface-variant">{text.catalog.filters.heading}</span>
      {#if activeCount}
        <button type="button" class="text-label-sm text-secondary underline underline-offset-4 hover:text-on-surface" onclick={clearFilters}>
          {text.catalog.filters.clearAll(activeCount)}
        </button>
      {/if}
    </div>
    {#snippet pill(on, label, icon, onclick)}
      <button
        type="button"
        aria-pressed={on}
        {onclick}
        class="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-label-md transition-all {on
          ? 'border-primary bg-primary text-on-primary shadow-sm'
          : 'border-surface-container-high bg-surface-container-lowest text-on-surface hover:border-outline-variant hover:bg-surface-container-low'}"
      >
        {#if icon}<Icon name={icon} class="text-[16px] {icon === 'favorite' && !on ? 'text-secondary' : ''} {icon === 'favorite' && on ? 'icon-filled' : ''}" />{/if}
        <span class="max-w-[16rem] truncate">{label}</span>
        {#if on && icon !== 'favorite'}<Icon name="close" class="ml-0.5 text-[14px]" />{/if}
      </button>
    {/snippet}
    <div class="flex flex-wrap gap-2">
      {@render pill(favoritesOnly, text.catalog.filters.favorites, 'favorite', () => ((favoritesOnly = !favoritesOnly), (pages = 1)))}
      {@render pill(hidePlanned, text.catalog.filters.unplanned, 'event_busy', () => (setHidePlanned(!hidePlanned), (pages = 1)))}
      {@render pill(hideRecent, text.catalog.filters.notMadeRecently, 'history', () => toggleHideRecent(!hideRecent))}
      {#each filters as tag (tag)}
        {@render pill(active.includes(tag), tag, tagIcon(tag), () => toggleFilter(tag))}
      {/each}
    </div>
    {#if categories.length > 1 || category}
      <label class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span class="text-label-caps uppercase text-on-surface-variant">{text.catalog.filters.categoryHeading}</span>
        <select
          bind:value={category}
          onchange={() => (pages = 1)}
          class="min-w-0 max-w-full truncate rounded-lg border py-2 pl-3 pr-8 text-body-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-container {category
            ? 'border-primary bg-primary-container/30 text-on-surface'
            : 'border-outline-variant bg-surface-container-lowest text-on-surface'}"
        >
          <option value="">{text.catalog.filters.anyCategory}</option>
          {#each categories as c (c)}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </label>
    {/if}
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
        class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-label-md text-on-secondary shadow-md transition-all hover:bg-[#b34728] sm:w-auto"
      >
        <Icon name="casino" class="text-[18px]" /> {text.catalog.surprise.button}
      </button>
    </div>
  {/if}
</div>
