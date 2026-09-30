<script>
  import Icon from './Icon.svelte';
  import { planner, shiftWeek, goToThisWeek } from '../planner.svelte.js';
  import { groceryCount } from '../grocery.svelte.js';
  import { route, href, navigate } from '../router.svelte.js';
  import { formatRange, formatRangeCompact, mondayOf } from '../dates.js';
  import { comingSoon } from '../toast.svelte.js';

  const tabs = [
    { id: 'weekly-menu', label: 'Weekly Menu', path: '/' },
    { id: 'recipe-catalog', label: 'Recipe Catalog', path: '/catalog' },
    { id: 'sheets-sync', label: 'Google Sheets Sync', path: '/sheets-sync' },
  ];
  // Recipe Detail lives under the catalog tab.
  const active = $derived(
    route.path.startsWith('/catalog') || route.path.startsWith('/recipe') ? 'recipe-catalog' : 'weekly-menu',
  );
  let search = $state('');

  const groceries = $derived(groceryCount());
  const isThisWeek = $derived(planner.weekStart === mondayOf(new Date()));

  /** @param {(typeof tabs)[number]} tab */
  function selectTab(event, tab) {
    if (tab.id !== 'sheets-sync') return;
    event.preventDefault();
    comingSoon(tab.label);
  }

  function submitSearch(event) {
    event.preventDefault();
    navigate('/catalog', { ...(route.path === '/catalog' ? route.query : {}), q: search.trim() });
  }
</script>

{#snippet navTabs(extra = '')}
  <nav aria-label="Primary" class="items-center gap-1 rounded-xl bg-surface-container-low p-1 {extra}">
    {#each tabs as tab (tab.id)}
      <a
        href={href(tab.path)}
        aria-current={tab.id === active ? 'page' : undefined}
        onclick={(e) => selectTab(e, tab)}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-label-md transition-all {tab.id === active
          ? 'bg-primary-container text-on-primary shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
      >
        {tab.label}
      </a>
    {/each}
  </nav>
{/snippet}

<header class="fixed left-0 top-0 z-50 w-full bg-surface/90 shadow-header backdrop-blur-xl">
  <div class="flex h-20 w-full items-center justify-between gap-4 px-4 md:px-gutter-desktop">
    <div class="flex items-center gap-6">
      <a href={href('/')} class="flex items-center gap-2" aria-label="MealCaster home">
        <img src="./logo-mark.png" alt="" class="h-8 w-8 rounded-lg object-cover shadow-sm" />
        <span class="hidden font-display text-headline-sm tracking-tight text-primary sm:inline">MealCaster</span>
      </a>
      {@render navTabs('hidden xl:flex')}
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <form class="relative hidden items-center lg:flex" role="search" onsubmit={submitSearch}>
        <Icon name="search" class="pointer-events-none absolute left-3 text-[18px] text-outline" />
        <input
          type="search"
          bind:value={search}
          aria-label="Search recipes"
          placeholder="Search culinary recipes, ingredients..."
          class="w-60 rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-1.5 pl-9 pr-3 text-body-sm text-on-surface shadow-card placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container xl:w-72"
        />
      </form>

      <div class="flex items-center gap-1 rounded-lg bg-surface-container-low px-1 py-1 sm:px-2">
        <button type="button" aria-label="Previous week" class="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(-1)}>
          <Icon name="chevron_left" class="text-[18px]" />
        </button>
        <button
          type="button"
          class="select-none whitespace-nowrap rounded-md px-1 text-label-md text-on-surface {isThisWeek ? 'cursor-default' : 'hover:underline'}"
          title={isThisWeek ? 'This week' : 'Back to this week'}
          onclick={goToThisWeek}
        >
          <span class="hidden sm:inline">{formatRange(planner.weekStart)}</span>
          <span class="sm:hidden">{formatRangeCompact(planner.weekStart)}</span>
        </button>
        <button type="button" aria-label="Next week" class="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface" onclick={() => shiftWeek(1)}>
          <Icon name="chevron_right" class="text-[18px]" />
        </button>
      </div>

      <a
        href="#/grocery-list"
        onclick={(e) => (e.preventDefault(), comingSoon('Quick Grocery List'))}
        class="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-label-md text-on-secondary shadow-[0_2px_8px_-2px_rgba(162,62,24,0.3)] transition-all hover:bg-[#b34728] sm:px-4"
        aria-label="Quick Grocery List, {groceries} items"
      >
        <Icon name="shopping_basket" class="text-[16px]" />
        <span class="hidden whitespace-nowrap sm:inline">Quick Grocery List</span>
        <span class="rounded-full bg-surface-container-lowest px-1.5 py-0.5 text-label-caps text-secondary">{groceries}</span>
      </a>

      <button
        type="button"
        aria-label="Profile"
        class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary ring-2 ring-surface-container-high sm:flex"
        onclick={() => comingSoon('Profile settings')}
      >
        <Icon name="person" class="text-[18px]" />
      </button>
    </div>
  </div>

  <!-- Below xl the primary tabs move to their own scrollable row. -->
  <div class="overflow-x-auto border-t border-surface-container-high px-4 py-2 xl:hidden [scrollbar-width:none]">
    {@render navTabs('flex w-max')}
  </div>
</header>
