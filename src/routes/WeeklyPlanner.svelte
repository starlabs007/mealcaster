<script>
  import PlannerHeader from '../lib/components/PlannerHeader.svelte';
  import DayCard from '../lib/components/DayCard.svelte';
  import { currentWeek } from '../lib/planner.svelte.js';

  const days = $derived(currentWeek());
</script>

<div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
  <PlannerHeader />

  <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
    <section aria-label="Dinners this week" class="flex flex-col gap-4 lg:col-span-8">
      {#each days as day (day.iso)}
        <DayCard {day} />
      {/each}
    </section>
    <!-- Right column reserved for the sidebar cards (meal pool, sync status) in a later iteration. -->
    <aside class="hidden lg:col-span-4 lg:block" aria-hidden="true"></aside>
  </div>
</div>
