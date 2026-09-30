<script>
  import AppHeader from './lib/components/AppHeader.svelte';
  import AppFooter from './lib/components/AppFooter.svelte';
  import Toast from './lib/components/Toast.svelte';
  import WeeklyPlanner from './routes/WeeklyPlanner.svelte';
  import Catalog from './routes/Catalog.svelte';
  import RecipeDetail from './routes/RecipeDetail.svelte';
  import { route } from './lib/router.svelte.js';

  const recipeId = $derived(route.path.match(/^\/recipe\/([\w-]+)$/)?.[1]);
</script>

<AppHeader />
<main class="min-h-[calc(100vh-80px)] w-full bg-background pt-[8.5rem] xl:pt-20">
  {#if route.path === '/catalog'}
    <Catalog />
  {:else if recipeId}
    <!-- Keyed so per-recipe state (servings) resets when moving between recipes. -->
    {#key recipeId}
      <RecipeDetail id={recipeId} day={route.query.day} />
    {/key}
  {:else}
    <WeeklyPlanner />
  {/if}
</main>
<AppFooter />
<Toast />
