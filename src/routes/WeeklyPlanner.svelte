<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayCard from '../lib/components/DayCard.svelte';
  import SwitchDaysDialog from '../lib/components/SwitchDaysDialog.svelte';
  import { onMount, tick } from 'svelte';
  import { currentWeek, spotlight, statusOf, switchDays, switchTargets } from '../lib/planner.svelte.js';
  import { createPointerDrag } from '../lib/pointerDrag.js';
  import { text } from '../lib/text.js';
  import { devicePrefs } from '../lib/devicePrefs.svelte.js';
  import { formatWeekday } from '../lib/dates.js';

  const days = $derived(currentWeek());
  let switching = $state('');

  // Dragging a planned meal onto another evening does what Switch Days… does.
  let drag = $state({ from: '', over: '', targets: /** @type {string[]} */ ([]) });
  const mover = createPointerDrag({
    axis: 'y',
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

  /** @param {string} iso @returns {'' | 'source' | 'over' | 'target' | 'off'} */
  function dropState(iso) {
    if (!drag.from) return '';
    if (iso === drag.from) return 'source';
    if (iso === drag.over) return 'over';
    return drag.targets.includes(iso) ? 'target' : 'off';
  }

  // Coming back from the catalog with a meal just picked: bring that day into view (the highlight
  // itself is drawn by the day card and fades on its own).
  onMount(async () => {
    const iso = spotlight.iso;
    if (!iso) return;
    await tick();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`day-${iso}`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  });
</script>

<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
  <PlannerHeader />

  <section aria-label={text.planner.daysAria} class="flex flex-col {devicePrefs.plannerMinimal ? 'gap-2.5' : 'gap-4'}">
    <label class="flex cursor-pointer items-center gap-2 self-end text-label-md text-on-surface-variant">
      <input type="checkbox" bind:checked={devicePrefs.plannerMinimal} class="h-4 w-4 rounded accent-primary" />
      {text.planner.minimalView}
    </label>
    {#each days as day (day.iso)}
      <DayCard
        {day}
        minimal={devicePrefs.plannerMinimal}
        onswitch={(iso) => (switching = iso)}
        draghandle={mover.handle}
        drop={dropState(day.iso)}
      />
    {/each}
  </section>
</div>

{#if switching}
  <SwitchDaysDialog iso={switching} onclose={() => (switching = '')} />
{/if}
