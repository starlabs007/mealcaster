<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayListCard from '../lib/components/DayListCard.svelte';
  import DayGridCard from '../lib/components/DayGridCard.svelte';
  import SwitchDaysDialog from '../lib/components/SwitchDaysDialog.svelte';
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import Icon from '../lib/components/Icon.svelte';
  import { acceptSuggestions, currentWeek, discardSuggestions, forgetLastChange, planner, spotlight, statusOf, switchDays, switchTargets, undoLastChange, weekSuggestions } from '../lib/planner.svelte.js';
  import { createPointerDrag } from '../lib/pointerDrag.js';
  import { columnTemplate, dropState, gridPlan } from '../lib/plannerLayout.js';
  import { text } from '../lib/text.js';
  import { devicePrefs } from '../lib/devicePrefs.svelte.js';
  import { formatWeekday } from '../lib/dates.js';
  import { isUndoShortcut } from '../lib/undoShortcut.js';
  import { focusDay } from '../lib/focusDay.js';

  const days = $derived(currentWeek());
  // Auto-fill's suggestions for this week wait in a bar under it: Accept All plans them, Discard drops them.
  const suggestedDays = $derived(weekSuggestions());

  // Toasts sit just above the bar while it shows (like the recipe editor's save bar). A short week doesn't scroll, so
  // the bar can sit higher than its sticky spot: measure from its top edge, not its height.
  /** @param {HTMLElement} bar */
  function clearBar(bar) {
    const root = document.documentElement.style;
    // The toast region already keeps 1 rem from the bottom.
    const fit = () => root.setProperty('--toast-clearance', `${Math.max(0, window.innerHeight - bar.getBoundingClientRect().top + 8 - 16)}px`);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    observer.observe(document.body);
    window.addEventListener('scroll', fit, { passive: true });
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', fit);
      window.removeEventListener('resize', fit);
      root.removeProperty('--toast-clearance');
    };
  }

  // The bar goes with the suggestions: focus moves to the first evening rather than dropping to the page.
  function accept() {
    const first = suggestedDays[0];
    acceptSuggestions();
    focusDay(first);
  }
  function discard() {
    const first = suggestedDays[0];
    discardSuggestions();
    focusDay(first);
  }
  let switching = $state('');

  // From `md` up the week is a grid in calendar order, then from `xl` one row of seven with tonight's column wider.
  // Phones, and Minimal view on any screen, use the list of day cards.
  const wide = new MediaQuery('min-width: 768px');
  // The grid: narrow past tiles, tonight wider (see gridPlan).
  const plan = $derived(gridPlan(days));
  const columns = $derived(columnTemplate(plan));
  // Tailwind needs the whole class names.
  const spanClass = { 1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3' };

  // Dragging a planned meal onto another evening does what Switch Days… does.
  let drag = $state({ from: '', over: '', targets: /** @type {string[]} */ ([]) });
  /** @param {'y'} [axis] */
  const dragger = (axis) => createPointerDrag({
    axis,
    zIndex: 60, // above the sticky header, below dialogs and toasts
    ghostClass: 'shadow-lift',
    autoScroll: { insets: () => ({ top: document.querySelector('header')?.getBoundingClientRect().bottom ?? 0 }) },
    canDrop: (_, to) => drag.targets.includes(to),
    onStart: (from) => (drag = { from, over: '', targets: switchTargets(from) }),
    onOver: (over, ghost) => {
      drag.over = over ?? '';
      // The floating card says what letting go will do (app.css draws it).
      if (!over) delete ghost.dataset.dropLabel;
      else ghost.dataset.dropLabel = (statusOf(over) === 'open' ? text.planner.drop.moveTo : text.planner.drop.switchWith)(formatWeekday(over));
    },
    onDrop: (from, to) => switchDays(from, to),
    onEnd: () => (drag = { from: '', over: '', targets: [] }),
  });
  const listMover = dragger('y');
  const gridMover = dragger();

  // Cmd/Ctrl+Z takes back the last planner change, also after its toast has gone; leaving the planner forgets it.
  // If the focused control goes with the change, focus moves to its day card's main control.
  /** @param {KeyboardEvent} event */
  async function undoKey(event) {
    if (!isUndoShortcut(event)) return;
    const day = document.activeElement?.closest('[id^="day-"]')?.id.slice(4);
    if (!undoLastChange()) return;
    event.preventDefault();
    await tick();
    if (day && !document.activeElement?.closest('[id^="day-"]')) focusDay(day);
  }
  onDestroy(forgetLastChange);

  // Coming back from the catalog with a meal just picked: bring that day into view (the highlight
  // itself is drawn by the day card and fades on its own). Otherwise the list (phones, Minimal view) brings
  // today into view when it's this week: scrolled just far enough to show the whole card, below the fixed header.
  // A change made on this screen (Auto-fill, Surprise Me…) rings the days it touched: in the list, which can be
  // taller than the screen, scroll to the first of them (a no-op when it is already in view).
  $effect(() => {
    const iso = spotlight.days[0];
    if (!iso || (wide.current && !devicePrefs.plannerMinimal)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    untrack(() => tick().then(() => document.getElementById(`day-${iso}`)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })));
  });

  onMount(async () => {
    const iso = spotlight.days[0] || (wide.current && !devicePrefs.plannerMinimal ? '' : days.find((d) => d.iso === planner.today)?.iso);
    if (!iso) return;
    await tick();
    const card = document.getElementById(`day-${iso}`);
    if (!card) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (spotlight.days.length) return card.scrollIntoView({ block: 'center', behavior });
    // The toast sits at the bottom (up to about 94 px tall with its inset): keep tonight above it, so pressing
    // Mark Done doesn't hide the button under its own toast.
    const bottom = window.innerHeight - 106;
    const reveal = (scrolled = window.scrollY) => {
      const top = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12;
      const rect = card.getBoundingClientRect();
      // Measured against the target scroll position, so a second call during the smooth scroll lands in the same place.
      const shift = window.scrollY - scrolled;
      const by = Math.min(rect.top + shift - top, rect.bottom + shift - bottom);
      if (by > 0) window.scrollTo({ top: scrolled + by, behavior });
      return by > 0 ? scrolled + by : scrolled;
    };
    const target = reveal();
    // Web fonts (the icon ligatures and the display-face titles) can still be loading and grow the list above tonight by a
    // few dozen px, which would leave Mark Done under the fold on phones; measure again once they are in.
    if (document.fonts.status !== 'loaded') document.fonts.ready.then(() => reveal(target));
  });
</script>

<svelte:window onkeydown={undoKey} />

<div class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-6 md:px-gutter-desktop">
  <PlannerHeader />

  <section aria-labelledby="planner-title" class="flex flex-col {devicePrefs.plannerMinimal ? 'gap-2.5' : 'gap-4'}">
    <label class="flex min-h-11 cursor-pointer items-center gap-2 self-end md:fine:min-h-0 text-label-md text-on-surface-variant">
      <input type="checkbox" bind:checked={devicePrefs.plannerMinimal} class="h-4 w-4 rounded accent-primary" />
      {text.planner.minimalView}
    </label>
    {#if wide.current && !devicePrefs.plannerMinimal}
      <div class="grid gap-3 md:grid-cols-8 xl:[grid-template-columns:var(--week-columns)]" style="--week-columns: {columns}">
        {#each days as day, i (day.iso)}
          <div class="flex min-w-0 {spanClass[plan[i].tracks]} xl:col-span-1">
            <DayGridCard
              {day}
              lead={day.isToday}
              compact={plan[i].compact}
              wide={plan[i].wideTonight}
              onswitch={(iso) => (switching = iso)}
              draghandle={gridMover.handle}
              drop={dropState(drag, day.iso)}
            />
          </div>
        {/each}
      </div>
    {:else}
      {#each days as day (day.iso)}
        <DayListCard
          {day}
          minimal={devicePrefs.plannerMinimal}
          onswitch={(iso) => (switching = iso)}
          draghandle={listMover.handle}
          drop={dropState(drag, day.iso)}
        />
      {/each}
    {/if}
  </section>

  {#if suggestedDays.length}
    <div
      {@attach clearBar}
      role="region"
      aria-label={text.planner.suggestions.barAria}
      class="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl bg-surface-container-lowest/95 px-3 py-2 shadow-lift backdrop-blur sm:bottom-4 sm:px-6 sm:py-3"
    >
      <Icon name="auto_fix_high" class="hidden text-[20px] text-primary sm:block" />
      <p class="min-w-0 flex-1 leading-tight">
        <span class="block text-body-md font-semibold text-on-surface">{text.planner.suggestions.count(suggestedDays.length)}</span>
        <span class="block text-xs text-on-surface-variant">{text.planner.suggestions.notYet}</span>
      </p>
      <button type="button" class="btn-outline min-h-11 flex-shrink-0 px-4 text-body-md text-on-surface fine:min-h-0 fine:py-2" onclick={discard}>
        {text.planner.suggestions.discard}
      </button>
      <button type="button" class="btn-primary min-h-11 flex-shrink-0 px-4 text-body-md fine:min-h-0 fine:py-2" onclick={accept}>
        <Icon name="check" class="text-[18px]" /> {text.planner.suggestions.accept}
      </button>
    </div>
  {/if}
</div>

{#if switching}
  <SwitchDaysDialog iso={switching} onclose={() => (switching = '')} />
{/if}
