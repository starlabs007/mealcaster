<script>
  import Icon from './Icon.svelte';
  import { syncPhase, PHASE_LOOK } from '../sync/sync.svelte.js';
  import { planner, shiftWeek, goToThisWeek } from '../planner.svelte.js';
  import { settings } from '../settings.svelte.js';
  import { groceryCount } from '../grocery.svelte.js';
  import { route, href, navigate } from '../router.svelte.js';
  import { formatRange, formatRangeCompact, weekStartOf } from '../dates.js';

  const tabs = [
    { id: 'weekly-menu', label: 'Weekly Menu', path: '/' },
    { id: 'recipe-catalog', label: 'Recipe Catalog', path: '/catalog' },
    { id: 'sheets-sync', label: 'Google Sheets Sync', path: '/sheets-sync' },
  ];
  // Recipe Detail lives under the catalog tab.
  const active = $derived(
    route.path.startsWith('/catalog') || route.path.startsWith('/recipe')
      ? 'recipe-catalog'
      : route.path === '/grocery'
        ? 'grocery'
        : route.path.startsWith('/sheets-sync')
          ? 'sheets-sync'
          : 'weekly-menu',
  );
  let search = $state('');

  // The Sheets tab is coloured by sync status rather than by being the current page.
  const sheetsLook = $derived(PHASE_LOOK[syncPhase()]);
  const SHEETS_TONE = {
    ok: 'bg-primary-fixed text-primary shadow-sm',
    busy: 'bg-[#ffdead] text-tertiary shadow-sm',
    warn: 'bg-[#ffdead] text-tertiary shadow-sm',
    bad: 'bg-secondary-fixed text-secondary shadow-sm',
    off: '',
  };

  /** @param {{ id: string }} tab */
  function tabClass(tab) {
    const current = tab.id === active;
    const tone = tab.id === 'sheets-sync' ? SHEETS_TONE[sheetsLook.tone] : '';
    if (tone) return `${tone} ${current ? 'ring-2 ring-inset ring-current/40' : 'hover:brightness-95'}`;
    if (current) return tab.id === 'sheets-sync' ? 'bg-surface-container-highest text-on-surface shadow-sm' : 'bg-primary-container text-on-primary shadow-sm';
    return 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface';
  }

  const groceries = $derived(groceryCount());
  const isThisWeek = $derived(planner.weekStart === weekStartOf(new Date(), settings.weekStartDay));

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
        title={tab.id === 'sheets-sync' ? `Google Sheets: ${sheetsLook.short}` : undefined}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-label-md transition-all {tabClass(tab)}"
      >
        <span class="inline-flex items-center gap-1.5">
          {#if tab.id === 'sheets-sync'}
            <Icon name={sheetsLook.icon} class="text-[16px] {sheetsLook.tone === 'busy' ? 'animate-spin' : ''}" />
          {/if}
          {tab.label}
          {#if tab.id === 'sheets-sync'}<span class="sr-only">({sheetsLook.short})</span>{/if}
        </span>
      </a>
    {/each}
  </nav>
{/snippet}

<header class="fixed left-0 top-0 z-50 w-full print:hidden bg-surface/90 shadow-header backdrop-blur-xl">
  <div class="flex h-20 w-full items-center justify-between gap-4 px-4 md:px-gutter-desktop">
    <div class="flex items-center gap-6">
      <a href={href('/')} class="flex items-center gap-2" aria-label="MealCaster home">
        <img src="./logo-mark.png" alt="" class="h-8 w-8 rounded-lg object-cover shadow-sm" />
        <span class="hidden font-display text-headline-sm tracking-tight text-primary sm:inline">MealCaster</span>
      </a>
      {@render navTabs('hidden xl:flex')}
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <!-- Hidden at xl, where the tabs join the header row and space runs out. -->
      <form class="relative hidden items-center lg:flex xl:hidden 2xl:flex" role="search" onsubmit={submitSearch}>
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
        href={href('/grocery')}
        aria-current={active === 'grocery' ? 'page' : undefined}
        class="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-label-md text-on-secondary shadow-[0_2px_8px_-2px_rgba(162,62,24,0.3)] transition-all hover:bg-[#b34728] sm:px-4 {active === 'grocery' ? 'ring-2 ring-secondary/30 ring-offset-2 ring-offset-surface' : ''}"
        aria-label="Quick Grocery List, {groceries} items"
      >
        <Icon name="shopping_basket" class="text-[16px]" />
        <span class="hidden whitespace-nowrap sm:inline">Quick Grocery List</span>
        <span class="rounded-full bg-surface-container-lowest px-1.5 py-0.5 text-label-caps text-secondary">{groceries}</span>
      </a>

      <a
        href={href('/profile')}
        aria-label="Profile & Settings"
        aria-current={route.path === '/profile' ? 'page' : undefined}
        class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary ring-2 sm:flex {route.path === '/profile' ? 'ring-primary' : 'ring-surface-container-high'}"
      >
        <Icon name="person" class="text-[18px]" />
      </a>
    </div>
  </div>

  <!-- Below xl the primary tabs move to their own scrollable row. -->
  <div class="overflow-x-auto border-t border-surface-container-high px-4 py-2 xl:hidden [scrollbar-width:none]">
    {@render navTabs('flex w-max')}
  </div>
</header>
