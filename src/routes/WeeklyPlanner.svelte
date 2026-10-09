<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayCard from '../lib/components/DayCard.svelte';
  import SwitchDaysDialog from '../lib/components/SwitchDaysDialog.svelte';
  import { onMount, tick } from 'svelte';
  import { currentWeek, spotlight } from '../lib/planner.svelte.js';
  import { devicePrefs } from '../lib/devicePrefs.svelte.js';

  const days = $derived(currentWeek());
  let switching = $state('');

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

  <section aria-label="Dinners this week" class="flex flex-col {devicePrefs.plannerMinimal ? 'gap-2.5' : 'gap-4'}">
    <label class="flex cursor-pointer items-center gap-2 self-end text-label-md text-on-surface-variant">
      <input type="checkbox" bind:checked={devicePrefs.plannerMinimal} class="h-4 w-4 rounded accent-primary" />
      Minimal view
    </label>
    {#each days as day (day.iso)}
      <DayCard {day} minimal={devicePrefs.plannerMinimal} onswitch={(iso) => (switching = iso)} />
    {/each}
  </section>
</div>

{#if switching}
  <SwitchDaysDialog iso={switching} onclose={() => (switching = '')} />
{/if}
