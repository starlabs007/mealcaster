<script>
  import Icon from './Icon.svelte';
  import SheetsButton from './SheetsButton.svelte';
  import { planner, shiftWeek, goToThisWeek } from '../planner.svelte.js';
  import { settings } from '../settings.svelte.js';
  import { groceryCount, thisWeekStart } from '../grocery.svelte.js';
  import { route, href, navigate } from '../router.svelte.js';
  import { text } from '../text.js';
  import { formatRange, formatRangeCompact, weekStartOf } from '../dates.js';
  import { MediaQuery } from 'svelte/reactivity';
  import { headerChrome } from '../headerChrome.svelte.js';

  // The tabs are rendered once: in the header row from `xl`, in their own row below it. (Two copies, one hidden by CSS,
  // would still be two "Primary" landmarks to some assistive tech.)
  const xl = new MediaQuery('min-width: 1280px');

  const tabs = [
    { id: 'weekly-menu', label: text.header.tabs.weeklyMenu, path: '/' },
    { id: 'recipe-catalog', label: text.header.tabs.recipeCatalog, path: '/catalog' },
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
  // On a recipe opened from the catalog while planning a day (that isn't the recipe's own), the tab returns to that day.
  const planningDay = $derived(
    route.path.startsWith('/recipe/') && route.query.day && planner.entries[route.query.day]?.recipeId !== route.path.split('/')[2]
      ? route.query.day
      : undefined,
  );

  /** @param {{ id: string }} tab */
  function tabClass(tab) {
    if (tab.id === active) return 'bg-primary-container text-on-primary shadow-sm';
    return 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface';
  }

  const groceries = $derived(groceryCount());
  // A past week's list is a record, so the button doesn't count what was left unbought there.
  const pastWeek = $derived(planner.weekStart < thisWeekStart());
  const isThisWeek = $derived(planner.weekStart === weekStartOf(new Date(), settings.weekStartDay));

  function submitSearch(event) {
    event.preventDefault();
    navigate('/catalog', { ...(route.path === '/catalog' ? route.query : {}), q: search.trim() });
  }
</script>

{#snippet navTabs(extra = '')}
  <nav aria-label={text.header.primaryNavAria} class="items-center gap-1 rounded-xl bg-surface-container-low p-1 {extra}">
    {#each tabs as tab (tab.id)}
      <a
        href={href(tab.path, tab.id === 'recipe-catalog' ? { day: planningDay } : {})}
        aria-current={tab.id === active ? 'page' : undefined}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-label-md transition-all {tabClass(tab)}"
      >
        {tab.label}
      </a>
    {/each}
    <SheetsButton />
  </nav>
{/snippet}

<!-- Fixed, or scrolling with the page while a screen asks for it (grocery store mode). -->
<header
  class="{headerChrome.scrollsAway ? 'absolute' : 'fixed'} left-0 top-0 z-50 w-full print:hidden bg-surface/90 shadow-header backdrop-blur-xl"
>
  <div class="flex h-20 w-full items-center justify-between gap-4 px-gutter md:px-gutter-desktop">
    <div class="flex items-center gap-6">
      <a href={href('/')} class="flex items-center gap-2" aria-label={text.header.homeAria}>
        <img src="./logo-mark.png" alt="" class="h-8 w-8 rounded-lg object-cover shadow-sm" />
        <span class="hidden font-display text-headline-sm tracking-tight text-primary sm:inline">{text.header.appName}</span>
      </a>
      {#if xl.current}{@render navTabs('flex')}{/if}
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <!-- Hidden at xl, where the tabs join the header row and space runs out. -->
      <form class="relative hidden items-center lg:flex xl:hidden 2xl:flex" role="search" onsubmit={submitSearch}>
        <Icon name="search" class="pointer-events-none absolute left-3 text-[18px] text-outline" />
        <input
          type="search"
          bind:value={search}
          aria-label={text.header.search.aria}
          placeholder={text.header.search.placeholder}
          class="w-60 rounded-lg border border-outline-variant/60 bg-surface-container-lowest py-1.5 pl-9 pr-3 text-body-sm text-on-surface shadow-card placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container xl:w-72"
        />
      </form>

      <div class="flex items-center gap-0.5 rounded-lg bg-surface-container-low px-0.5 sm:gap-1 sm:px-2 sm:py-1">
        <button type="button" aria-label={text.header.week.previous} class="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface sm:fine:h-auto sm:fine:w-auto sm:fine:p-1" onclick={() => shiftWeek(-1)}>
          <Icon name="chevron_left" class="text-[18px]" />
        </button>
        <button
          type="button"
          class="min-h-11 select-none whitespace-nowrap rounded-md px-1 text-label-md fine:min-h-0 text-on-surface {isThisWeek
            ? 'cursor-default'
            : 'underline decoration-dotted decoration-on-surface-variant underline-offset-4 hover:bg-surface-container-high hover:decoration-solid'}"
          title={isThisWeek ? text.header.week.thisWeek : text.header.week.backToThisWeek}
          onclick={goToThisWeek}
        >
          <span class="hidden sm:inline">{formatRange(planner.weekStart)}</span>
          <span class="sm:hidden">{formatRangeCompact(planner.weekStart)}</span>
          <!-- The visible dates come first in the name (WCAG 2.5.3), then what pressing does. -->
          <span class="sr-only">, {text.header.week.stateSuffix(isThisWeek)}</span>
        </button>
        <button type="button" aria-label={text.header.week.next} class="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface sm:fine:h-auto sm:fine:w-auto sm:fine:p-1" onclick={() => shiftWeek(1)}>
          <Icon name="chevron_right" class="text-[18px]" />
        </button>
      </div>

      <a
        href={href('/grocery')}
        aria-current={active === 'grocery' ? 'page' : undefined}
        class="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-label-md text-on-secondary shadow-[0_2px_8px_-2px_rgba(162,62,24,0.3)] transition-all hover:bg-[#b34728] sm:px-4 {active === 'grocery' ? 'ring-2 ring-secondary/30 ring-offset-2 ring-offset-surface' : ''}"
        aria-label={pastWeek ? text.header.grocery.label : text.header.grocery.aria(groceries)}
      >
        <Icon name="shopping_basket" class="text-[16px]" />
        <span class="hidden whitespace-nowrap sm:inline">{text.header.grocery.label}</span>
        {#if !pastWeek}<span class="rounded-full bg-surface-container-lowest px-1.5 py-0.5 text-label-caps text-secondary">{groceries}</span>{/if}
      </a>

      <a
        href={href('/profile')}
        aria-label={text.header.profile}
        aria-current={route.path === '/profile' ? 'page' : undefined}
        class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary ring-2 sm:flex {route.path === '/profile' ? 'ring-primary' : 'ring-surface-container-high'}"
      >
        <Icon name="person" class="text-[18px]" />
      </a>
    </div>
  </div>

  <!-- Below xl the primary tabs move to their own scrollable row. -->
  {#if !xl.current}
    <div class="overflow-x-auto border-t border-surface-container-high px-gutter py-2 md:px-gutter-desktop [scrollbar-width:none]">
      {@render navTabs('flex w-max')}
    </div>
  {/if}
</header>
