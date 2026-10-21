<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayListCard from '../lib/components/DayListCard.svelte';
  import DayGridCard from '../lib/components/DayGridCard.svelte';
  import SwitchDaysDialog from '../lib/components/SwitchDaysDialog.svelte';
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { currentWeek, forgetLastChange, planner, spotlight, statusOf, switchDays, switchTargets, undoLastChange } from '../lib/planner.svelte.js';
  import { createPointerDrag } from '../lib/pointerDrag.js';
  import { text } from '../lib/text.js';
  import { devicePrefs } from '../lib/devicePrefs.svelte.js';
  import { formatWeekday } from '../lib/dates.js';
  import { isUndoShortcut } from '../lib/undoShortcut.js';
  import { focusDay } from '../lib/focusDay.js';

  const days = $derived(currentWeek());
  let switching = $state('');

  // From `md` up the week is a grid in calendar order, then from `xl` one row of seven with tonight's column wider.
  // Phones, and Minimal view on any screen, use the list of day cards.
  const wide = new MediaQuery('min-width: 768px');
  // Past days beside a live week are narrow tiles (a fully past or future week keeps full cards).
  const compact = (/** @type {{ isPast: boolean }} */ d) => d.isPast && days.some((x) => !x.isPast);
  const columns = $derived(days.map((d) => (d.isToday ? '1.6fr' : compact(d) ? '0.55fr' : '1fr')).join(' '));
  // Below `xl`, 8 tracks: a narrow tile takes 1, an evening 2, so tonight always lands in the first row. After an
  // odd number of past days tonight takes 3, which fills that row and makes it wider, as from `xl`.
  const pastTiles = $derived(days.filter(compact).length);
  const wideTonight = (/** @type {{ isToday: boolean }} */ d) => d.isToday && pastTiles % 2 === 1;
  const span = (/** @type {{ isToday: boolean, isPast: boolean }} */ d) =>
    compact(d) ? 'md:col-span-1' : wideTonight(d) ? 'md:col-span-3' : 'md:col-span-2';

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

  /** @param {string} iso @returns {'' | 'source' | 'over' | 'target' | 'off'} */
  function dropState(iso) {
    if (!drag.from) return '';
    if (iso === drag.from) return 'source';
    if (iso === drag.over) return 'over';
    return drag.targets.includes(iso) ? 'target' : 'off';
  }

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
    const top = (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12;
    const rect = card.getBoundingClientRect();
    const by = Math.min(rect.top - top, rect.bottom - (window.innerHeight - 12));
    if (by > 0) window.scrollTo({ top: window.scrollY + by, behavior });
  });
</script>

<svelte:window onkeydown={undoKey} />

<div class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-6 md:px-gutter-desktop">
  <PlannerHeader />

  <section aria-labelledby="planner-title" class="flex flex-col {devicePrefs.plannerMinimal ? 'gap-2.5' : 'gap-4'}">
    <label class="flex min-h-11 cursor-pointer items-center gap-2 self-end md:min-h-0 text-label-md text-on-surface-variant">
      <input type="checkbox" bind:checked={devicePrefs.plannerMinimal} class="h-4 w-4 rounded accent-primary" />
      {text.planner.minimalView}
    </label>
    {#if wide.current && !devicePrefs.plannerMinimal}
      <div class="grid gap-3 md:grid-cols-8 xl:[grid-template-columns:var(--week-columns)]" style="--week-columns: {columns}">
        {#each days as day (day.iso)}
          <div class="flex min-w-0 {span(day)} xl:col-span-1">
            <DayGridCard
              {day}
              lead={day.isToday}
              compact={compact(day)}
              wide={wideTonight(day)}
              onswitch={(iso) => (switching = iso)}
              draghandle={gridMover.handle}
              drop={dropState(day.iso)}
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
          drop={dropState(day.iso)}
        />
      {/each}
    {/if}
  </section>
</div>

{#if switching}
  <SwitchDaysDialog iso={switching} onclose={() => (switching = '')} />
{/if}
