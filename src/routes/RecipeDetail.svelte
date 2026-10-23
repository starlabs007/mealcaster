<script>
  import { byLead } from '../lib/headsUps.js';
  import Icon from '../lib/components/Icon.svelte';
  import { renderMarkdown } from '../lib/markdown.js';
  import RecipeImage from '../lib/components/RecipeImage.svelte';
  import PrintOptionsDialog from '../lib/components/PrintOptionsDialog.svelte';
  import DeleteRecipeDialog from '../lib/components/DeleteRecipeDialog.svelte';
  import RecipePrintSimple from '../lib/components/RecipePrintSimple.svelte';
  import { printOptions, setPrintOptions, TEXT_DELTA } from '../lib/printOptions.svelte.js';
  import { recipeById, formatMinutes, deleteRecipe, restoreRecipe, tagIcon, aisleLabel } from '../lib/recipes.svelte.js';
  import { tagClass } from '../lib/tagColors.svelte.js';
  import LastMade from '../lib/components/LastMade.svelte';
  import { isFavorite, toggleFavorite } from '../lib/favorites.svelte.js';
  import { groceryKeys, isOnHandKey, ingredientKeys, addToGrocery } from '../lib/grocery.svelte.js';
  import { ingredientOf, setOnHand } from '../lib/ingredients.svelte.js';
  import { preppedKeys, setPrepped, doneSteps, setDoneSteps } from '../lib/recipePrep.svelte.js';
  import { lineParts } from '../lib/ingredients.js';
  import { planner, dayOfRecipe, nextPlannedAfter, firstOpenDay, assignRecipe, tooSoonNote } from '../lib/planner.svelte.js';
  import { href, navigate } from '../lib/router.svelte.js';
  import { formatLong, formatWeekday } from '../lib/dates.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { sheetTabOf, syncPhase, PHASE_LOOK } from '../lib/sync/sync.svelte.js';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import ActionMenu from '../lib/components/ActionMenu.svelte';
  import { tick } from 'svelte';
  import { text } from '../lib/text.js';

  /** @type {{ id: string, day?: string }} */
  let { id, day: dayParam } = $props();

  // App.svelte keys this component by id, so reading it once is intentional.
  // svelte-ignore state_referenced_locally
  const recipe = recipeById.get(id);
  let servings = $state(recipe?.serves ?? 2);

  const day = $derived(
    recipe && dayParam && planner.entries[dayParam]?.recipeId === recipe.id ? dayParam : recipe && dayOfRecipe(recipe.id),
  );
  // Opened from the catalog while planning a day this recipe isn't on: carry that day back to the catalog.
  const planningDay = $derived(recipe && dayParam && planner.entries[dayParam]?.recipeId !== recipe.id ? dayParam : undefined);
  const editable = $derived(!!day && day >= planner.today);
  const next = $derived(day ? nextPlannedAfter(day) : undefined);
  const openDay = $derived(day ? undefined : firstOpenDay());
  const favorite = $derived(recipe ? isFavorite(recipe.id) : false);
  const scale = $derived(recipe ? servings / recipe.serves : 1);

  const allKeys = recipe ? ingredientKeys(recipe.id) : [];
  // A ticked line is prepped: cooking progress, kept on this device for today only.
  const prepped = $derived(recipe ? preppedKeys(recipe.id) : []);
  // At home is the ingredient's own flag (the home button): it stays off every week's grocery list until unset.
  // Lines of the same ingredient follow together.
  const atHome = $derived(allKeys.filter(isOnHandKey));
  const onList = $derived(groceryKeys());
  // Only what's missing: not on the list yet and not at home.
  const missing = $derived(allKeys.filter((k) => !onList.has(k) && !atHome.includes(k)));

  function togglePrepped(key) {
    setPrepped(recipe.id, prepped.includes(key) ? prepped.filter((k) => k !== key) : [...prepped, key]);
  }

  function toggleAll() {
    setPrepped(recipe.id, prepped.length === allKeys.length ? [] : allKeys);
  }

  // Method steps marked done (tap the number): today, on this device, like the prepped ticks.
  const stepsDone = $derived(recipe ? doneSteps(recipe.id) : []);

  /** @param {number} i */
  function toggleStep(i) {
    setDoneSteps(recipe.id, stepsDone.includes(i) ? stepsDone.filter((s) => s !== i) : [...stepsDone, i]);
  }

  /** @type {HTMLElement | undefined} */
  let methodSection = $state();
  /** @type {HTMLElement | undefined} */
  let methodHeading = $state();

  function jumpToMethod() {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    methodSection?.scrollIntoView({ behavior, block: 'start' });
    methodHeading?.focus({ preventScroll: true });
  }

  // Keeps the screen on while the method is on screen (a phone propped up in the kitchen). Released when it scrolls
  // away, the page is hidden (the browser drops it then too; it's asked for again on return) or left. Does nothing
  // where Screen Wake Lock isn't supported or is refused.
  $effect(() => {
    const section = methodSection;
    if (!section || !('wakeLock' in navigator)) return;
    let inView = false;
    let wanted = false;
    /** @type {WakeLockSentinel | null} */
    let lock = null;
    async function sync() {
      wanted = inView && document.visibilityState === 'visible';
      if (wanted && !lock) {
        try {
          const next = await navigator.wakeLock.request('screen');
          // Scrolled away or left while the request was pending.
          if (!wanted || lock) return void next.release();
          lock = next;
          next.addEventListener('release', () => {
            if (lock === next) lock = null;
          });
        } catch {
          // Refused (battery saver, no user activation yet): the screen just sleeps as usual.
        }
      } else if (!wanted && lock) {
        const held = lock;
        lock = null;
        held.release().catch(() => {});
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(section);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      inView = false;
      sync();
    };
  });

  const capFirst = (/** @type {string} */ s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** @param {string} ingredientId @param {string} name */
  function toggleAtHome(ingredientId, name) {
    const on = !ingredientOf(ingredientId)?.onHand;
    setOnHand(ingredientId, on);
    const t = text.recipe.toasts;
    showToast((on ? t.atHome : t.notAtHome)(capFirst(name)), { label: text.common.undo, run: () => setOnHand(ingredientId, !on) });
  }

  function push(keys, message) {
    showToast(message(addToGrocery(keys)));
  }

  function planOn(iso) {
    assignRecipe(iso, recipe.id);
    const note = tooSoonNote(iso);
    const planned = text.recipe.toasts.planned(recipe.shortTitle, formatLong(iso));
    showToast(note ? `${planned} ${note}` : planned);
  }

  let confirmingDelete = $state(false);
  // Safari doesn't focus a button on click, so the dialog can't read its opener from the active element.
  /** @type {HTMLElement | null} */
  let deleteOpener = $state(null);
  function remove() {
    confirmingDelete = false;
    const removed = deleteRecipe(recipe.id);
    navigate('/catalog');
    showToast(text.recipe.toasts.deleted(recipe.shortTitle), { label: text.common.undo, run: () => restoreRecipe(removed) }, 10000);
  }

  let choosingPrint = $state(false);
  const photo = recipe?.image;
  const textDelta = $derived(TEXT_DELTA[printOptions.textSize] ?? 0);

  /** @param {import('../lib/printOptions.svelte.js').PrintOptions} options */
  async function print(options) {
    setPrintOptions(options);
    choosingPrint = false;
    await tick(); // let the dialog close before the print snapshot
    window.print();
  }

  /** @param {import('../lib/data/recipes.js').Step} step @param {number} i */
  function stepTone(step, i) {
    if (step.critical) return 'bg-secondary-fixed/50 text-secondary';
    if (i === recipe.steps.length - 1) return 'bg-primary-fixed/50 text-primary';
    return 'bg-surface-container-high text-on-surface-variant';
  }

  /** "15 mins", "1 min", "3.5 hrs" */
  const mins = (m) => (m >= 60 ? formatMinutes(m) : text.recipe.minutes(m));

  // A time nobody entered (0) is left out rather than shown as "0 mins".
  const stats = recipe
    ? [
        { icon: 'emoji_symbols', label: text.recipe.stats.prep, short: text.recipe.stats.prepShort, minutes: recipe.prepMinutes, value: mins(recipe.prepMinutes) },
        { icon: 'skillet', label: text.recipe.stats.cook, short: text.recipe.stats.cookShort, minutes: recipe.cookMinutes, value: mins(recipe.cookMinutes) },
        { icon: 'schedule', label: text.recipe.stats.total, short: text.recipe.stats.totalShort, minutes: recipe.minutes, value: mins(recipe.minutes) },
      ].filter((stat) => stat.minutes > 0)
    : [];

  function askDelete() {
    confirmingDelete = true;
  }

  // Phones: Print and Delete live in a ⋯ menu, out of the row with Edit. The menu puts focus back on its button
  // before running an action, so that button becomes the delete dialog's opener.
  const more = recipe
    ? [
        { id: 'print', label: text.recipe.buttons.print, icon: 'print', onselect: () => (choosingPrint = true) },
        {
          id: 'delete',
          label: text.recipe.buttons.delete,
          icon: 'delete',
          divider: true,
          onselect: () => {
            deleteOpener = /** @type {HTMLElement | null} */ (document.activeElement);
            askDelete();
          },
        },
      ]
    : [];
</script>

{#snippet stepper()}
  <div class="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest print:hidden">
    <button type="button" aria-label={text.recipe.stats.fewer} class="flex h-11 w-11 items-center justify-center text-on-surface-variant hover:text-on-surface disabled:opacity-40 fine:h-auto fine:w-auto fine:p-1.5" disabled={servings <= 1} onclick={() => servings--}>
      <Icon name="remove" class="text-[16px]" />
    </button>
    <span class="w-6 text-center text-label-md text-on-surface" aria-hidden="true">{servings}</span>
    <button type="button" aria-label={text.recipe.stats.more} class="flex h-11 w-11 items-center justify-center text-on-surface-variant hover:text-on-surface disabled:opacity-40 fine:h-auto fine:w-auto fine:p-1.5" disabled={servings >= 12} onclick={() => servings++}>
      <Icon name="add" class="text-[16px]" />
    </button>
  </div>
{/snippet}

{#if !recipe}
  <div class="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
    <Icon name="menu_book" class="text-[40px] text-outline" />
    <h1 class="font-display text-headline-lg text-on-surface">{text.recipe.notFound.title}</h1>
    <p class="text-body-md text-on-surface-variant">{text.recipe.notFound.body}</p>
    <a href={href('/catalog')} class="btn-primary mt-2 py-2">{text.recipe.notFound.browse}</a>
  </div>
{:else}
  <!-- Breadcrumb & actions bar -->
  <div class="border-b border-surface-container-high bg-surface-container-low/60 print:hidden">
    <div class="mx-auto flex max-w-page flex-col gap-3 px-gutter py-3 md:flex-row md:items-center md:justify-between md:px-gutter-desktop">
      <nav aria-label={text.recipe.breadcrumbAria} class="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface-variant">
        <Icon name="arrow_back" class="text-[16px]" />
        {#if day}
          <a href={href('/')} class="shrink-0 font-semibold text-on-surface hover:text-primary">{text.recipe.weeklyPlan}</a>
          <span class="text-outline">/</span>
          <span class="shrink-0">{text.recipe.dayDinner(formatWeekday(day))}</span>
        {:else}
          <a href={href('/catalog', { day: planningDay })} class="shrink-0 font-semibold text-on-surface hover:text-primary">{text.recipe.catalog}</a>
        {/if}
        <span class="text-outline">/</span>
        <span class="truncate text-on-surface" aria-current="page">{recipe.shortTitle}</span>
      </nav>

      <div class="flex flex-wrap items-center gap-2">
        <a href={href(`/recipe/${recipe.id}/edit`)} class="btn-outline min-h-11 fine:min-h-0">
          <Icon name="edit" class="text-[16px]" /> {text.recipe.buttons.edit}
        </a>
        <button
          type="button"
          aria-pressed={favorite}
          onclick={() => toggleFavorite(recipe.id)}
          class="btn-outline min-h-11 fine:min-h-0 {favorite ? 'text-secondary' : ''}"
        >
          <Icon name="favorite" class="text-[16px] text-secondary {favorite ? 'icon-filled' : ''}" />
          {favorite ? text.recipe.buttons.favorited : text.recipe.buttons.favorite}
        </button>
        {#if editable}
          <a href={href('/catalog', { day })} class="btn-outline min-h-11 fine:min-h-0">
            <Icon name="swap_horiz" class="text-[16px]" /> {text.recipe.buttons.swapMeal}
          </a>
        {:else if openDay}
          <button type="button" class="btn-outline min-h-11 fine:min-h-0" onclick={() => planOn(openDay)}>
            <Icon name="event_available" class="text-[16px]" /> {text.recipe.buttons.planFor(formatWeekday(openDay))}
          </button>
        {/if}
        <button type="button" class="btn-outline min-h-11 max-md:hidden fine:min-h-0" onclick={() => (choosingPrint = true)}>
          <Icon name="print" class="text-[16px]" /> {text.recipe.buttons.print}
        </button>
        <button type="button" class="btn-outline min-h-11 max-md:hidden fine:min-h-0 hover:text-secondary" onclick={(e) => {
            deleteOpener = e.currentTarget;
            askDelete();
          }}>
          <Icon name="delete" class="text-[16px]" /> {text.recipe.buttons.delete}
        </button>
        <ActionMenu items={more} label={text.recipe.buttons.moreAria} class="border border-outline-variant bg-surface-container-lowest md:hidden" />
      </div>
    </div>
  </div>

  <!-- Styled printout (two columns, tints kept); hidden when printing the simple layout. -->
  <div
    class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-5 md:gap-8 md:px-gutter-desktop md:py-8 print:gap-5 print:p-0 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact] print:[&_*]:shadow-none
      {printOptions.simple ? 'print:hidden' : ''} {textDelta ? 'print-sized' : ''}"
    style="--print-delta: {textDelta}pt; --print-image: {printOptions.imageScale}%"
  >
    <!-- Title block -->
    <header class="flex flex-col gap-3 md:gap-4">
      <div class="flex flex-wrap items-center gap-2 print:hidden {recipe.custom || recipe.edited ? '' : 'max-md:hidden'}">
        {#if day}
          <!-- Phones: the breadcrumb already names the day. -->
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed/60 px-2.5 py-1 text-label-sm uppercase text-primary max-md:hidden">
            <span class="h-1.5 w-1.5 rounded-full bg-primary"></span> {text.recipe.badges.scheduled(formatLong(day))}
          </span>
        {/if}
        {#if recipe.custom && sheetTabOf('recipes', recipe.id)}
          <span class="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface-variant">
            <Icon name="table_chart" class="text-[13px]" /> {text.recipe.badges.customInSheet(sheetTabOf('recipes', recipe.id))}
          </span>
        {:else if recipe.custom}
          <span class="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-label-sm text-secondary">
            <Icon name="family_restroom" class="text-[13px]" /> {text.recipe.badges.customOnDevice}
          </span>
        {:else if recipe.edited}
          <span class="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-label-sm text-secondary">
            <Icon name="edit" class="text-[13px]" /> {text.recipe.badges.edited}
          </span>
        {/if}
      </div>
      <h1 class="max-w-4xl font-display text-headline-xl-mobile text-primary md:text-headline-xl">{recipe.title}</h1>
      {#if recipe.description}<p class="max-w-3xl text-body-lg text-on-surface-variant">{recipe.description}</p>{/if}
      {#if recipe.headsUps?.length}
        <!-- Things to do ahead, longest lead first. Printed too: paper cooks need them as much. -->
        <ul class="flex max-w-3xl flex-col gap-2" aria-label={text.common.headsUps.calloutAria}>
          {#each byLead(recipe.headsUps) as headsUp, i (i)}
            <li class="flex items-start gap-3 rounded-xl bg-tone-paprika px-4 py-3 print:border print:border-secondary/40 print:px-3 print:py-2">
              <Icon name="alarm" class="mt-0.5 text-[20px] text-secondary" />
              <div class="min-w-0">
                <div class="text-label-sm uppercase text-secondary">{text.common.headsUps.lead(headsUp.daysBefore)}</div>
                <p class="break-words text-body-md text-on-surface">{headsUp.text}</p>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
      <LastMade recipeId={recipe.id} class="-mt-1 text-label-md print:hidden" />
      {#if recipe.tags.length}
        <ul class="flex max-w-4xl flex-wrap gap-1.5 print:hidden" aria-label={text.recipe.tagsAria}>
          {#each recipe.tags as tag (tag)}
            <li class="max-w-full">
              <a
                href={href('/catalog', { filter: tag, day: planningDay })}
                title={text.recipe.tagTitle(tag)}
                class="inline-flex min-h-6 max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-label-sm transition-opacity hover:opacity-80 {tagClass(tag)}"
              >
                {#if tagIcon(tag)}<Icon name={tagIcon(tag)} class="text-[13px]" />{/if}
                <span class="truncate">{tag}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Phones: the times as one line; servings live in the Ingredients header. -->
      {#if stats.length}
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-on-surface-variant md:hidden print:hidden">
          <Icon name="schedule" class="text-[18px]" />
          {#each stats as stat, i (stat.label)}
            {#if i}<span aria-hidden="true">·</span>{/if}
            <span class="whitespace-nowrap">{stat.short} <strong class="font-semibold text-on-surface">{stat.value}</strong></span>
          {/each}
        </p>
      {/if}

      <div class="hidden gap-3 md:grid md:grid-cols-3 lg:max-w-4xl lg:grid-cols-4 print:grid print:max-w-none print:grid-cols-4">
        {#each stats as stat (stat.label)}
          <div class="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-card">
              <Icon name={stat.icon} class="text-[18px]" />
            </span>
            <div>
              <div class="text-label-sm uppercase text-on-surface-variant">{stat.label}</div>
              <div class="text-body-sm font-semibold text-on-surface">{stat.value}</div>
            </div>
          </div>
        {/each}
        <div class="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-4 py-3">
          <div>
            <div class="text-label-sm uppercase text-on-surface-variant">{text.recipe.stats.servings}</div>
            <div class="whitespace-nowrap text-body-sm font-semibold text-on-surface">{text.recipe.stats.servingsValue(servings)}</div>
          </div>
          {@render stepper()}
        </div>
      </div>
      <span class="sr-only" aria-live="polite">{text.recipe.stats.scaled(servings)}</span>
    </header>

    <div class="grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-12 print:flex print:flex-col print:items-stretch print:gap-5">
      <!-- Printed as one column: photo, ingredients, method, then notes. -->
      <!-- Left: photo & notes -->
      <aside class="flex flex-col gap-6 max-lg:contents lg:sticky lg:top-28 lg:col-span-5 print:contents">
        <figure
          class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card max-lg:order-1 print:order-1 print:mx-auto print:w-[var(--print-image)]
            {printOptions.image && photo ? '' : 'print:hidden'}"
        >
          <!-- Photo-less (custom) recipes get a shorter placeholder until the column layout kicks in. -->
          <div class="relative aspect-[4/1] md:aspect-[3/1] lg:aspect-[4/3] print:aspect-[4/3]">
            <RecipeImage src={recipe.image} alt={recipe.title} class="h-full w-full" />
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <!-- Phones show the times above, and servings with the ingredients. -->
              <span class="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-sm text-on-surface shadow-sm backdrop-blur-md max-md:invisible">
                <Icon name="restaurant_menu" class="text-[13px]" /> {text.recipe.photoMeta(recipe.minutes ? formatMinutes(recipe.minutes) : '', recipe.serves)}
              </span>
              {#if recipe.badge.label}
                <span class="rounded-full bg-primary-container/90 px-2.5 py-1 text-label-sm text-on-primary shadow-sm backdrop-blur-md">
                  {recipe.badge.label}
                </span>
              {/if}
            </div>
          </div>
        </figure>

        {#if recipe.notes?.trim()}
        <section class="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-card max-lg:order-3 print:order-3 print:break-inside-avoid">
          <div class="mb-4 flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
              <Icon name="auto_awesome" class="text-[18px]" />
            </span>
            <h2 class="font-display text-headline-sm text-on-surface">{text.recipe.notes.title}</h2>
          </div>
          <div class="notes-md rounded-lg bg-surface-container-low p-4 text-body-md text-on-surface-variant md:text-body-sm">
            {@html renderMarkdown(recipe.notes)}
          </div>
        </section>
        {/if}
      </aside>

      <!-- Right: ingredients & method -->
      <div class="flex flex-col gap-8 max-lg:order-2 lg:col-span-7 print:order-2 print:gap-5">
        <section class="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <Icon name="receipt_long" class="mt-0.5 text-[22px] text-secondary" />
              <div>
                <h2 class="font-display text-headline-sm text-on-surface">{text.recipe.ingredients.title}</h2>
                <p class="text-body-sm text-on-surface-variant print:hidden">{text.recipe.ingredients.hint}</p>
              </div>
            </div>
            {#if recipe.steps.length}
              <button type="button" class="focus-ring -mr-2 -mt-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 text-label-sm text-on-surface-variant hover:text-primary md:hidden print:hidden" onclick={jumpToMethod}>
                {text.recipe.method.jump} <Icon name="arrow_downward" class="text-[16px]" />
              </button>
            {/if}
          </div>

          <!-- Phones: the servings stepper sits with the amounts it scales. -->
          <div class="mb-3 flex items-center justify-between gap-3 rounded-xl bg-surface-container-low py-1 pl-4 pr-1 md:hidden print:hidden">
            <span class="text-body-md font-semibold text-on-surface">{text.recipe.stats.servings}</span>
            {@render stepper()}
          </div>

          <!-- In the tick column (icon over the circles, label over the names), so it reads as acting on the prep
               ticks, not the house buttons on the right. -->
          <button type="button" class="focus-ring -mt-2 mb-2 ml-5 inline-flex min-h-11 items-center gap-3 rounded text-label-sm text-on-surface-variant hover:text-primary fine:mt-0 fine:min-h-0 print:hidden" onclick={toggleAll}>
            <Icon name={prepped.length === allKeys.length ? 'remove_done' : 'done_all'} class="w-[18px] text-center text-[16px]" />
            {prepped.length === allKeys.length ? text.recipe.ingredients.clearAll : text.recipe.ingredients.checkAll}
          </button>

          <div class="flex flex-col gap-4">
            {#each recipe.ingredients as group, g (group.title)}
              <div class="rounded-xl bg-surface-container-low p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="text-label-sm uppercase text-secondary">{g + 1}. {group.title}</h3>
                </div>
                <ul class="flex flex-col">
                  {#each group.items as item, i (i)}
                    {@const key = `${recipe.id}:${g}:${i}`}
                    {@const isPrepped = prepped.includes(key)}
                    {@const ingredient = ingredientOf(item.id)}
                    {@const home = !!ingredient?.onHand}
                    {@const line = lineParts(item, ingredient, scale)}
                    <li class="flex items-center gap-1 print:break-inside-avoid fine:items-start">
                      <label class="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-surface-container fine:min-h-0 fine:items-start">
                        <input type="checkbox" class="peer sr-only" checked={isPrepped} onchange={() => togglePrepped(key)} />
                        <span
                          class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container print:border-outline print:bg-transparent print:text-transparent {isPrepped
                            ? 'border-primary-container bg-primary-container text-on-primary'
                            : 'border-outline bg-surface-container-lowest text-transparent'}"
                          aria-hidden="true"
                        >
                          <Icon name="check" class="text-[13px]" />
                        </span>
                        <!-- Below sm the aisle drops under the name, leaving the row's width to the name. -->
                        <span class="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:gap-3">
                        <span class="text-body-lg sm:flex-1 md:text-body-sm print:text-body-sm print:text-on-surface print:no-underline {isPrepped ? 'text-on-surface-variant line-through' : 'text-on-surface'}">
                          {#if line.amount}<strong class="font-semibold">{line.amount}</strong>{/if}
                          <span class={ingredient ? '' : 'italic'}>{line.name}</span>{#if line.note}{' '}<span class="text-on-surface-variant">({line.note})</span>{/if}{#if line.prep}, {line.prep}{/if}
                          {#if line.optional}<span class="ml-1 text-label-sm text-on-surface-variant">{text.recipe.ingredients.optional}</span>{/if}
                        </span>
                        {#if ingredient}
                          <!-- Seen, not read out: the aisle is for shopping, the line is for cooking. -->
                          <span aria-hidden="true" class="shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-label-sm text-on-surface-variant">
                            {aisleLabel(ingredient.aisle)}
                          </span>
                        {/if}
                        </span>
                      </label>
                      {#if ingredient}
                        <button
                          type="button"
                          class="group focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full fine:mt-0.5 fine:h-7 fine:w-7 print:hidden"
                          aria-pressed={home}
                          aria-label={text.recipe.ingredients.atHomeAria(line.name)}
                          title={home ? text.recipe.ingredients.atHomeTitle : text.recipe.ingredients.notAtHomeTitle}
                          onclick={() => toggleAtHome(item.id, line.name)}
                        >
                          <!-- Never a filled disc: that's the prep tick's look. At home = a solid sage house,
                               not at home = a lighter outline house, so the two differ in shape as well as colour. -->
                          <span
                            class="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-surface-container fine:h-7 fine:w-7 {home
                              ? 'text-primary'
                              : 'text-outline group-hover:text-primary'}"
                          >
                            <Icon name="home" class="text-[18px] fine:text-[16px] {home ? 'icon-filled' : ''}" />
                          </span>
                        </button>
                      {:else}
                        <span class="w-11 shrink-0 fine:w-7 print:hidden" aria-hidden="true"></span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>

          <div class="mt-5 flex flex-col gap-3 border-t border-surface-container-high pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p class="text-body-sm text-on-surface-variant">
              {text.recipe.ingredients.pushHint}
            </p>
            <button
              type="button"
              disabled={!missing.length}
              onclick={() => push(missing, (n) => text.recipe.toasts.addedFromRecipe(n, recipe.shortTitle))}
              class="min-h-11 shrink-0 justify-center py-2 fine:min-h-0 {missing.length
                ? 'btn-primary'
                : 'btn-outline disabled:opacity-100 disabled:hover:bg-surface-container-lowest disabled:hover:text-on-surface-variant'}"
            >
              <Icon name={missing.length ? 'add_shopping_cart' : 'check_circle'} class="text-[16px]" />
              {missing.length ? text.recipe.ingredients.push(missing.length) : text.recipe.ingredients.pushed}
            </button>
          </div>
        </section>

        {#if recipe.steps.length}
        <!-- The page's scroll padding clears the fixed header on a jump (app.css); the margin adds a little air. -->
        <section bind:this={methodSection} class="scroll-mt-6">
          <div class="mb-4">
            <div class="flex items-center justify-between gap-4">
              <h2 bind:this={methodHeading} tabindex="-1" class="flex items-center gap-2 font-display text-headline-md text-on-surface outline-none">
                <Icon name="outdoor_grill" class="text-[22px] text-primary" /> {text.recipe.method.title}
              </h2>
              <span class="shrink-0 text-label-sm uppercase text-on-surface-variant">{text.recipe.method.count(recipe.steps.length)}</span>
            </div>
            <p class="mt-1 text-body-sm text-on-surface-variant print:hidden">{text.recipe.method.hint}</p>
          </div>
          <ol class="flex flex-col gap-4 print:gap-3">
            {#each recipe.steps as step, i (i)}
              {@const done = stepsDone.includes(i)}
              <!-- A done step sinks into the page (oat ground, no shadow, muted title); prints as usual. -->
              <li
                class="flex gap-4 rounded-2xl border p-5 transition-colors print:break-inside-avoid print:border-surface-container-high print:bg-surface-container-lowest print:p-4 {done
                  ? 'border-transparent bg-surface-container-low'
                  : 'border-surface-container-high bg-surface-container-lowest shadow-card'}"
              >
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={text.recipe.method.doneAria(i + 1)}
                  title={done ? text.recipe.method.undoneTitle : text.recipe.method.doneTitle}
                  class="group focus-ring -m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg fine:m-0 fine:h-9 fine:w-9"
                  onclick={() => toggleStep(i)}
                >
                  <!-- A filled sage tile with a check in its corner reads as something to tap; done fills the check.
                       A done step prints like the rest. -->
                  <span
                    class="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container font-display text-body-lg font-semibold text-on-primary transition-colors group-hover:bg-primary print:bg-surface-container-low print:text-on-surface"
                  >
                    {String(i + 1).padStart(2, '0')}
                    <span
                      class="absolute -bottom-2 -right-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] transition-colors print:hidden {done
                        ? 'border-surface-container-low bg-primary text-on-primary'
                        : 'border-outline bg-surface-container-lowest text-outline group-hover:text-primary'}"
                    >
                      <Icon name="check" class="text-[12px] {done ? 'icon-filled' : ''}" />
                    </span>
                  </span>
                </button>
                <div class="flex-1">
                  <div class="mb-1.5 flex items-start justify-between gap-3">
                    <h3 class="font-display text-headline-sm print:text-on-surface {done ? 'text-on-surface-variant' : 'text-on-surface'}">{step.title}</h3>
                    {#if step.minutes}
                      <span class="shrink-0 rounded-full px-2 py-0.5 text-label-sm uppercase {stepTone(step, i)}">
                        {mins(step.minutes)}
                      </span>
                    {/if}
                  </div>
                  <div class="notes-md text-body-lg text-on-surface-variant">{@html renderMarkdown(step.text)}</div>
                </div>
              </li>
            {/each}
          </ol>
        </section>
        {/if}
      </div>
    </div>

    <!-- Bottom navigation -->
    <div class="flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card">
          <Icon name={PHASE_LOOK[syncPhase()].icon} class="text-[20px]" />
        </span>
        <div>
          <p class="text-label-md text-on-surface">{text.recipe.sync}</p>
          <SyncStatus />
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        {#if editable}
          <a href={href('/catalog', { day })} class="btn-outline min-h-11 py-2 text-on-surface fine:min-h-0">{text.recipe.buttons.swapFromCatalog}</a>
        {/if}
        {#if next}
          <a href={href(`/recipe/${next.recipe.id}`, { day: next.iso })} class="btn-outline min-h-11 py-2 text-on-surface fine:min-h-0">
            {text.recipe.buttons.next(formatWeekday(next.iso), next.recipe.shortTitle)} <Icon name="arrow_forward" class="text-[16px]" />
          </a>
        {:else}
          <a href={href('/')} class="btn-outline min-h-11 py-2 text-on-surface fine:min-h-0">
            {text.recipe.buttons.backToWeekly} <Icon name="arrow_forward" class="text-[16px]" />
          </a>
        {/if}
      </div>
    </div>
  </div>
{/if}


{#if recipe && printOptions.simple}
  <RecipePrintSimple
    {recipe}
    {servings}
    {scale}
    {mins}
    {textDelta}
    image={printOptions.image ? photo : undefined}
    imageScale={printOptions.imageScale}
  />
{/if}

{#if choosingPrint}
  <PrintOptionsDialog hasImage={!!photo} onprint={print} onclose={() => (choosingPrint = false)} />
{/if}

{#if confirmingDelete}
  <DeleteRecipeDialog title={recipe.title} opener={deleteOpener} onconfirm={remove} onclose={() => (confirmingDelete = false)} />
{/if}
