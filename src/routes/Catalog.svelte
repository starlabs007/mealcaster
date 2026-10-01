<script>
  import Icon from '../lib/components/Icon.svelte';
  import RecipeCard from '../lib/components/RecipeCard.svelte';
  import { recipes, recipeById, tagChoices, tagIcon, normalizeTags, categoryChoices, normalizeCategory } from '../lib/recipes.svelte.js';
  import { favorites } from '../lib/favorites.svelte.js';
  import { planner, statusOf, firstOpenDay, assignRecipe, surpriseMe, madeRecently, timesMade, lastMadeOn, RECENT_DAYS } from '../lib/planner.svelte.js';
  import { storageKey } from '../lib/env.js';
  import { route, href, navigate } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { formatLong, formatWeekday, mondayOf, fromISO, weekDates } from '../lib/dates.js';

  const PAGE_SIZE = 9;
  const sorts = [
    {
      id: 'most-cooked',
      label: 'Most Cooked in Household',
      // From the plan history; ties go to the one made most recently, then A–Z.
      compare: (a, b) =>
        timesMade(b.id) - timesMade(a.id) ||
        (lastMadeOn(b.id) ?? '').localeCompare(lastMadeOn(a.id) ?? '') ||
        a.title.localeCompare(b.title),
    },
    { id: 'quickest', label: 'Quickest Prep Time', compare: (a, b) => a.minutes - b.minutes },
    { id: 'recent', label: 'Recently Added to Box', compare: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  ];

  let query = $state('');
  let sort = $state('most-cooked');
  let favoritesOnly = $state(false);

  // "Not made in 7 days" is remembered on this device: skipping repeats is a standing preference.
  const HIDE_RECENT_KEY = storageKey('catalogHideRecent.v1');
  let hideRecent = $state(readHideRecent());

  function readHideRecent() {
    try {
      return localStorage.getItem(HIDE_RECENT_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /** @param {boolean} on */
  function setHideRecent(on) {
    hideRecent = on;
    pages = 1;
    try {
      localStorage.setItem(HIDE_RECENT_KEY, String(on));
    } catch {
      // In-memory only.
    }
  }
  /** @type {string[]} */
  let active = $state([]);
  /** One category at a time ('' = any) — a recipe has at most one. */
  let category = $state('');
  let pages = $state(1);

  // Keep search / filter in sync with the URL (header search, "Browse Recipes" links).
  // `filter` is a comma-separated list of tags (tags never contain commas).
  $effect(() => {
    query = route.query.q ?? '';
    active = normalizeTags(route.query.filter?.split(','));
    category = normalizeCategory(route.query.category);
    pages = 1;
  });

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
    if (route.query.day) planner.weekStart = mondayOf(fromISO(route.query.day));
  });

  const plannable = $derived(weekDates(planner.weekStart).filter((iso) => iso >= planner.today));
  const targetDay = $derived(
    route.query.day && plannable.includes(route.query.day) ? route.query.day : firstOpenDay(),
  );
  const targetName = $derived(targetDay ? formatWeekday(targetDay) : undefined);
  const currentPick = $derived(targetDay ? planner.entries[targetDay]?.recipeId : undefined);

  const results = $derived.by(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return recipes
      .filter((r) => !favoritesOnly || favorites.ids.includes(r.id))
      .filter((r) => !hideRecent || !madeRecently(r.id))
      .filter((r) => !category || r.badge.label === category)
      .filter((r) => active.every((t) => r.tags.includes(t)))
      .filter((r) => {
        if (!words.length) return true;
        const haystack = [
          r.title,
          r.description,
          r.badge.label,
          ...r.tags,
          ...r.ingredients.flatMap((g) => g.items.map((i) => i.text)),
        ]
          .join(' ')
          .toLowerCase();
        return words.every((w) => haystack.includes(w));
      })
      .sort(sorts.find((s) => s.id === sort).compare);
  });
  const visible = $derived(results.slice(0, pages * PAGE_SIZE));
  const remaining = $derived(results.length - visible.length);
  const activeCount = $derived(active.length + (category ? 1 : 0) + (favoritesOnly ? 1 : 0) + (hideRecent ? 1 : 0));

  function toggleFilter(id) {
    active = active.includes(id) ? active.filter((x) => x !== id) : [...active, id];
    pages = 1;
  }

  /** @param {string} c */
  function toggleCategory(c) {
    category = category === c ? '' : c;
    pages = 1;
  }

  function clearFilters() {
    active = [];
    category = '';
    favoritesOnly = false;
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
    if (recipe) announce(iso, recipe, 'Surprise! ');
  }

  /** Toast rather than a banner, so it's seen wherever the catalog is scrolled to. */
  function announce(iso, recipe, prefix = '') {
    showToast(`${prefix}${recipe.shortTitle} added to ${formatLong(iso)} dinner and your grocery basket was updated.`, {
      label: 'Go to Weekly View',
      run: () => navigate('/'),
    });
  }

  /** @param {string} iso */
  function dayOption(iso) {
    const status = statusOf(iso);
    const id = planner.entries[iso]?.recipeId;
    const detail =
      status === 'open' ? 'open' : status === 'diningOut' ? 'dining out' : (recipeById.get(id)?.shortTitle ?? '');
    return `${formatLong(iso)} — ${detail}`;
  }
</script>

<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
  <!-- Planning context -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <a href={href('/')} class="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" class="text-[16px]" /> Weekly Dinner Plan
      </a>
      <h1 class="mt-1 font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
        {#if !targetDay}
          Recipe Catalog
        {:else if currentPick}
          Swap {targetName}’s Dinner
        {:else}
          Choose a Dinner Meal
        {/if}
      </h1>
    </div>
    <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
    {#if plannable.length}
      <label class="flex min-w-0 items-center gap-2 text-label-md text-on-surface-variant">
        <span class="shrink-0">Planning for</span>
        <select
          class="min-w-0 max-w-full flex-1 truncate rounded-lg sm:max-w-sm border border-outline-variant bg-surface-container-lowest py-2 pl-3 pr-8 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          value={targetDay ?? ''}
          onchange={chooseDay}
        >
          {#if !targetDay}<option value="" disabled>Pick a day…</option>{/if}
          {#each plannable as iso (iso)}
            <option value={iso}>{dayOption(iso)}</option>
          {/each}
        </select>
      </label>
    {/if}
      <a href={href('/recipe/new')} class="btn-outline shrink-0 self-start py-2 sm:self-auto">
        <Icon name="add" class="text-[16px]" /> Add Custom Recipe
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
        aria-label="Search recipes and ingredients"
        placeholder="Search recipes, ingredients (e.g. salmon, pasta, lemon, tofu)..."
        class="w-full rounded-xl border border-outline bg-surface-container-low py-3 pl-11 pr-4 text-body-md text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container"
      />
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2 text-label-sm text-on-surface-variant">
        Sort by:
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
        Displaying <strong class="text-on-surface">{visible.length}</strong> of {results.length} meals
      </span>
    </div>
  </div>

  <!-- Filter pills -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-label-caps uppercase text-on-surface-variant">Filter by Culinary Attributes</span>
      {#if activeCount}
        <button type="button" class="text-label-sm text-secondary underline underline-offset-4 hover:text-on-surface" onclick={clearFilters}>
          Clear all filters ({activeCount} active)
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
      {@render pill(favoritesOnly, 'Favorites', 'favorite', () => ((favoritesOnly = !favoritesOnly), (pages = 1)))}
      {@render pill(hideRecent, `Not made in ${RECENT_DAYS} days`, 'history', () => setHideRecent(!hideRecent))}
      {#each filters as tag (tag)}
        {@render pill(active.includes(tag), tag, tagIcon(tag), () => toggleFilter(tag))}
      {/each}
    </div>
    {#if categories.length > 1 || category}
      <span class="mt-1 text-label-caps uppercase text-on-surface-variant">Filter by Category</span>
      <div class="flex flex-wrap gap-2">
        {#each categories as c (c)}
          {@render pill(category === c, c, undefined, () => toggleCategory(c))}
        {/each}
      </div>
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
  {:else if !recipes.length}
    <!-- A new household: nothing in the catalog yet. -->
    <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-16 text-center">
      <Icon name="menu_book" class="text-[36px] text-outline" />
      <h2 class="font-display text-headline-sm text-on-surface">Your recipe catalog is empty</h2>
      <p class="max-w-md text-body-sm text-on-surface-variant">
        Add your first family recipe, or connect a Google Sheet that already has your recipes.
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-2">
        <a href={href('/recipe/new')} class="btn-primary"><Icon name="add" class="text-[16px]" /> Add a Recipe</a>
        <a href={href('/sheets-sync')} class="btn-outline"><Icon name="table_chart" class="text-[16px]" /> Connect Google Sheets</a>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/70 px-6 py-16 text-center">
      <Icon name="search_off" class="text-[36px] text-outline" />
      <h2 class="font-display text-headline-sm text-on-surface">No recipes match those filters</h2>
      <p class="max-w-md text-body-sm text-on-surface-variant">Try a different ingredient or loosen a filter or two.</p>
      <button type="button" class="btn-outline mt-2" onclick={() => (clearFilters(), (query = ''))}>
        <Icon name="filter_alt_off" class="text-[16px]" /> Clear search & filters
      </button>
    </div>
  {/if}

  {#if targetDay || remaining}
    <div class="flex flex-col items-center justify-between gap-6 rounded-3xl bg-surface-container p-6 md:flex-row md:p-8">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-fixed/40 text-secondary">
          <Icon name="auto_stories" class="text-[28px]" />
        </div>
        <div>
          <h3 class="font-display text-headline-sm text-on-surface">
            {targetDay ? `Can’t decide on ${targetName}’s Dinner?` : 'Looking for more inspiration?'}
          </h3>
          <p class="mt-1 max-w-xl text-body-md text-on-surface-variant">
            {targetDay
              ? 'Roll for a random pick from the meals matching your current search and filters.'
              : 'Keep browsing the household recipe box.'}
          </p>
        </div>
      </div>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {#if targetDay}
          <button
            type="button"
            onclick={surprise}
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-label-md text-on-secondary shadow-md transition-all hover:bg-[#b34728]"
          >
            <Icon name="casino" class="text-[18px]" /> Surprise Me & Assign
          </button>
        {/if}
        {#if remaining}
          <button
            type="button"
            onclick={() => pages++}
            class="rounded-xl border border-surface-container-high bg-surface-container-lowest px-6 py-3 text-label-md text-on-surface transition-all hover:bg-surface-container-low"
          >
            Load {Math.min(remaining, PAGE_SIZE)} More Meals
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
