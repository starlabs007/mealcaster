<script>
  import AppHeader from './lib/components/AppHeader.svelte';
  import AppFooter from './lib/components/AppFooter.svelte';
  import Toast from './lib/components/Toast.svelte';
  import WeeklyPlanner from './routes/WeeklyPlanner.svelte';
</script>

<AppHeader />
<main class="min-h-[calc(100vh-80px)] w-full bg-background pt-[8.5rem] xl:pt-20">
  <WeeklyPlanner />
</main>
<AppFooter />
<Toast />
