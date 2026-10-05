<script>
  import AppHeader from './lib/components/AppHeader.svelte';
  import AppFooter from './lib/components/AppFooter.svelte';
  import Toast from './lib/components/Toast.svelte';
  import WeeklyPlanner from './routes/WeeklyPlanner.svelte';
  import Catalog from './routes/Catalog.svelte';
  import RecipeDetail from './routes/RecipeDetail.svelte';
  import Grocery from './routes/Grocery.svelte';
  import Profile from './routes/Profile.svelte';
  import SheetsSettings from './routes/SheetsSettings.svelte';
  import RecipeEditor from './routes/RecipeEditor.svelte';
  import ColumnConflicts from './routes/ColumnConflicts.svelte';
  import FirstSyncDialog from './lib/components/FirstSyncDialog.svelte';
  import DisconnectDialog, { disconnectPrompt } from './lib/components/DisconnectDialog.svelte';
  import { syncState } from './lib/sync/sync.svelte.js';
  import { route } from './lib/router.svelte.js';
  import { recipeById } from './lib/recipes.svelte.js';

  const recipeId = $derived(route.path.match(/^\/recipe\/([\w-]+)$/)?.[1]);
  const editId = $derived(route.path.match(/^\/recipe\/([\w-]+)\/edit$/)?.[1]);
</script>

<AppHeader />
<main class="min-h-[calc(100vh-80px)] w-full bg-background pt-[8.5rem] xl:pt-20 print:pt-0">
  {#if route.path === '/catalog'}
    <Catalog />
  {:else if route.path === '/grocery'}
    <Grocery />
  {:else if route.path === '/profile'}
    <Profile />
  {:else if route.path === '/recipe/new'}
    {#key route.path}<RecipeEditor />{/key}
  {:else if editId}
    {#key editId}<RecipeEditor id={editId} />{/key}
  {:else if recipeId}
    <!-- Keyed so per-recipe state (servings) resets when moving between recipes, and so the
         page redraws when the recipe itself is replaced (e.g. undoing a revert). -->
    {#key recipeById.get(recipeId) ?? recipeId}
      <RecipeDetail id={recipeId} day={route.query.day} />
    {/key}
  {:else}
    <WeeklyPlanner />
  {/if}
</main>
{#if route.path === '/sheets-sync'}
  <!-- The settings modal sits over the weekly menu, as in the mock. -->
  <SheetsSettings />
{:else if route.path === '/sheets-sync/columns'}
  <ColumnConflicts />
{/if}
{#if syncState.choice}
  <FirstSyncDialog />
{/if}
{#if disconnectPrompt.open}
  <DisconnectDialog />
{/if}
<AppFooter />
<Toast />
