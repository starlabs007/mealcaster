<script>
  // Auto-fill's suggestion on an open evening (#91), inside its day card (DayGridCard, DayListCard): the recipe, and
  // Another (re-roll) and Remove. Not planned until Accept All in the planner's bar, so no View Recipe, Mark Done, ⋯ or
  // drag handle. `size`: `lead` tonight in the grid, `grid` another column, `tonight` / `row` the phone list, `minimal`
  // one line.
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import TonightPanel from './TonightPanel.svelte';
  import { removeSuggestion, rerollSuggestion } from '../planner.svelte.js';
  import { focusDay } from '../focusDay.js';
  import { text } from '../text.js';
  import { formatWeekday } from '../dates.js';
  import { tagClass } from '../tagColors.svelte.js';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number],
   *   size: 'lead' | 'grid' | 'tonight' | 'row' | 'minimal', wide?: boolean }}
   */
  // `wide`: tonight across three tracks below `xl`, with a flatter photo (as DayGridCard does for a planned tonight).
  let { day, size, wide = false } = $props();
  const flat = $derived(wide ? 'md:aspect-[16/10] xl:aspect-[4/3]' : '');

  const recipe = $derived(day.suggestion);
  const weekdayName = $derived(formatWeekday(day.iso));
  // Tonight without a photo (unset, or it failed to load) shows the title panel, as a planned tonight does.
  let failedSrc = $state('');
  const panel = $derived((size === 'lead' || size === 'tonight') && !!recipe && (!recipe.image || failedSrc === recipe.image));
  const failed = { get: () => !!recipe && failedSrc === recipe.image, set: (/** @type {boolean} */ f) => (failedSrc = f ? (recipe?.image ?? '') : '') };
  // Buttons are 44 px tall on touch screens; compact with a mouse.
  const tall = $derived(size === 'grid' || size === 'lead' ? 'min-h-11 fine:min-h-0' : 'min-h-11 md:fine:min-h-0');

  // Another in cobalt tint, like the Suggested chip (Accept All in the bar stays the one solid primary). The dice is set
  // at 18 px: at 15 its dots run together. (`autorenew` was tried: alone in Minimal view it reads as refresh.)
  const anotherClass = 'btn bg-primary-fixed text-primary hover:bg-primary-fixed/70';

  // Another changes the card in place and keeps focus on the button: say what came up.
  let announce = $state('');
  function another() {
    const next = rerollSuggestion(day.iso);
    if (next) announce = text.planner.toasts.rerolled(weekdayName, next.title);
  }
  function remove() {
    removeSuggestion(day.iso);
    focusDay(day.iso);
  }
</script>

{#if recipe}
  <span class="sr-only" aria-live="polite">{announce}</span>
  {#if size === 'minimal'}
    <div class="flex flex-1 items-center gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <RecipeImage src={recipe.image} alt="" class="h-8 w-8 flex-shrink-0 rounded-md" />
        <h3 class="min-w-0 flex-1 truncate font-display text-sm text-on-surface">{recipe.title}</h3>
      </div>
      <button type="button" data-day-focus aria-label={text.planner.card.anotherAria(weekdayName)} title={text.planner.card.another} class="{anotherClass} h-11 w-11 flex-shrink-0 px-0 md:fine:h-9 md:fine:w-9" onclick={another}>
        <Icon name="casino" class="text-[20px]" />
      </button>
      <button type="button" aria-label={text.planner.card.removeSuggestionAria(weekdayName)} title={text.planner.card.removeSuggestion} class="btn h-11 w-11 flex-shrink-0 px-0 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface md:fine:h-9 md:fine:w-9" onclick={remove}>
        <Icon name="close" class="text-[18px]" />
      </button>
    </div>
  {:else if size === 'lead' || size === 'grid'}
    {#if panel}
      <TonightPanel {recipe} class="aspect-[4/3] w-full flex-shrink-0 {flat}" titleClass={wide ? 'text-headline-md lg:text-headline-lg xl:text-headline-md' : 'text-headline-md'} />
    {:else}
      <RecipeImage bind:failed={failed.get, failed.set} src={recipe.image} alt="" class="aspect-[4/3] w-full flex-shrink-0 rounded-lg {size === 'grid' ? 'xl:aspect-[4/5]' : 'shadow-sm'} {flat}" />
    {/if}
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if !panel}
      <h3 class="font-display text-on-surface {size === 'lead' ? 'line-clamp-3 text-headline-md' : 'line-clamp-2 text-base leading-snug'}" title={recipe.title}>{recipe.title}</h3>
      {#if size === 'lead'}
        <p class="text-xs text-on-surface-variant">{text.planner.card.meta(recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
      {/if}
      {@render tagList(size === 'lead' ? '' : 'max-h-[114px] overflow-hidden')}
      {/if}
      <div class="mt-auto pt-1">{@render actions()}</div>
    </div>
  {:else if size === 'tonight'}
    {#if panel}
      <TonightPanel {recipe} class="min-h-40 w-full sm:min-h-48" />
    {:else}
      <RecipeImage bind:failed={failed.get, failed.set} src={recipe.image} alt="" class="h-40 w-full rounded-lg sm:h-48" />
      <div class="min-w-0">
        <h3 class="font-display text-lg text-on-surface">{recipe.title}</h3>
        <p class="mt-1 text-xs text-on-surface-variant">{text.planner.card.meta(recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
        {@render tagList('mt-2')}
      </div>
    {/if}
    {@render actions()}
  {:else}
    <div class="flex items-start gap-3">
      <RecipeImage src={recipe.image} alt="" class="h-16 w-16 flex-shrink-0 rounded-lg" />
      <div class="min-w-0 flex-1">
        <h3 class="line-clamp-2 font-display text-base leading-snug text-on-surface" title={recipe.title}>{recipe.title}</h3>
        {@render tagList('mt-1.5')}
      </div>
    </div>
    {@render actions()}
  {/if}
{/if}

{#snippet actions()}
  <div class="flex flex-wrap items-center gap-2">
    <!-- Another is the card's main control: focus lands here after a change to the evening. -->
    <button type="button" data-day-focus aria-label={text.planner.card.anotherAria(weekdayName)} class="{anotherClass} {tall}" onclick={another}>
      <Icon name="casino" class="text-[18px]" /> {text.planner.card.another}
    </button>
    <button type="button" aria-label={text.planner.card.removeSuggestionAria(weekdayName)} class="btn text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface {tall}" onclick={remove}>
      <Icon name="close" class="text-[15px]" /> {text.planner.card.removeSuggestion}
    </button>
  </div>
{/snippet}

{#snippet tagList(/** @type {string} */ extra)}
  {#if recipe?.tags.length}
    <div class="flex flex-wrap gap-1.5 {extra}">
      {#each recipe.tags as tag (tag)}
        <span class="max-w-full flex-shrink-0 truncate rounded-full px-2 py-0.5 text-label-sm {tagClass(tag)}" title={tag}>{tag}</span>
      {/each}
    </div>
  {/if}
{/snippet}
