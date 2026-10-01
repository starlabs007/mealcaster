<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayCard from '../lib/components/DayCard.svelte';
  import { currentWeek } from '../lib/planner.svelte.js';

  const days = $derived(currentWeek());
</script>

<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
  <PlannerHeader />

  <section aria-label="Dinners this week" class="flex flex-col gap-4">
    {#each days as day (day.iso)}
      <DayCard {day} />
    {/each}
  </section>
</div>
