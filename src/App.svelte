<script>
  import AppHeader from './lib/components/AppHeader.svelte';
  import AppFooter from './lib/components/AppFooter.svelte';
  import Toast from './lib/components/Toast.svelte';
  import WeeklyPlanner from './routes/WeeklyPlanner.svelte';
  import Catalog from './routes/Catalog.svelte';
  import RecipeDetail from './routes/RecipeDetail.svelte';
  import Grocery from './routes/Grocery.svelte';
  import Profile from './routes/Profile.svelte';
  import SheetsConnection from './routes/SheetsConnection.svelte';
  import RecipeEditor from './routes/RecipeEditor.svelte';
  import ColumnConflicts from './routes/ColumnConflicts.svelte';
  import DisconnectDialog, { disconnectPrompt } from './lib/components/DisconnectDialog.svelte';
  import { syncState } from './lib/sync/sync.svelte.js';
  import { route, navigate } from './lib/router.svelte.js';
  import { recipeById } from './lib/recipes.svelte.js';
  import { text } from './lib/text.js';

  const recipeId = $derived(route.path.match(/^\/recipe\/([\w-]+)$/)?.[1]);
  const editId = $derived(route.path.match(/^\/recipe\/([\w-]+)\/edit$/)?.[1]);

  // One title per route, so the tab, history and screen readers say where you are.
  const pageTitle = $derived.by(() => {
    const pages = text.common.pages;
    const path = route.path;
    if (path === '/catalog') return pages.catalog;
    if (path === '/grocery') return pages.grocery;
    if (path === '/profile') return pages.profile;
    if (path === '/recipe/new') return pages.newRecipe;
    if (editId) return pages.editRecipe(recipeById.get(editId)?.title ?? '');
    if (recipeId) return recipeById.get(recipeId)?.title ?? pages.catalog;
    if (path === '/sheets-sync/columns') return pages.columns;
    if (path === '/sheets-sync' || path.startsWith('/sheets-sync/')) return pages.sheets;
    return pages.planner;
  });
  $effect(() => {
    document.title = text.common.pageTitle(pageTitle);
  });

  // A first sync that needs an answer (e.g. after reconnecting) is answered on the connection screen's sync step.
  $effect(() => {
    if (syncState.choice && route.path !== '/sheets-sync/sync') navigate('/sheets-sync/sync');
  });
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
{#if route.path === '/sheets-sync/columns'}
  <ColumnConflicts />
{:else if route.path === '/sheets-sync' || route.path.startsWith('/sheets-sync/')}
  <!-- The connection steps sit over the page they were opened from. -->
  <SheetsConnection />
{/if}
{#if disconnectPrompt.open}
  <DisconnectDialog />
{/if}
<AppFooter />
<Toast />
