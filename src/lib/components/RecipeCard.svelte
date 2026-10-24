<script>
  import Icon from './Icon.svelte';
  import RecipeImage from './RecipeImage.svelte';
  import { formatMinutes } from '../recipes.svelte.js';
  import { tagClass } from '../tagColors.svelte.js';
  import { isFavorite, toggleFavorite } from '../favorites.svelte.js';
  import { href } from '../router.svelte.js';
  import { text } from '../text.js';
  import LastMade from './LastMade.svelte';
  import { leadDays } from '../headsUps.js';

  /**
   * @type {{
   *   recipe: import('../data/recipes.js').Recipe,
   *   day?: string,
   *   dayName?: string,
   *   selected?: boolean,
   *   onselect?: () => void,
   * }}
   */
  let { recipe, day, dayName, selected = false, onselect } = $props();

  const favorite = $derived(isFavorite(recipe.id));
  // Days of notice a heads-up needs; on the photo so it's seen while choosing a meal for a day.
  const lead = $derived(leadDays(recipe));
</script>

<article
  class="group flex flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-lowest shadow-recipe transition-all duration-300 hover:-translate-y-1 hover:shadow-recipe-hover"
>
  <div>
    <div class="relative h-56 w-full overflow-hidden bg-surface-container">
      <a href={href(`/recipe/${recipe.id}`, { day })} tabindex="-1" aria-hidden="true">
        <RecipeImage
          src={recipe.image}
          alt={recipe.title}
          class="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
      </a>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

      <div class="absolute left-3 top-3 flex items-center gap-1.5">
        {#if recipe.minutes}
          <span class="flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-caps text-primary shadow-sm backdrop-blur-md">
            <Icon name={recipe.minutes >= 120 ? 'soup_kitchen' : 'timer'} class="text-[13px]" />
            {formatMinutes(recipe.minutes)}
          </span>
        {/if}
        {#if lead}
          <span
            class="flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-2.5 py-1 text-label-caps text-secondary shadow-sm backdrop-blur-md"
            title={recipe.headsUps?.filter((h) => h.daysBefore > 0).map((h) => h.text).join('\n')}
          >
            <Icon name="alarm" class="text-[13px]" /> {text.common.headsUps.ahead(lead)}
          </span>
        {/if}
        {#if recipe.badge.label}
          <span class="rounded-full bg-surface-container-lowest/90 px-2 py-1 text-label-caps text-on-surface-variant shadow-sm backdrop-blur-md">
            {recipe.badge.label}
          </span>
        {/if}
      </div>

      <button
        type="button"
        aria-label={favorite ? text.catalog.card.removeFavoriteAria(recipe.shortTitle) : text.catalog.card.addFavoriteAria(recipe.shortTitle)}
        aria-pressed={favorite}
        onclick={() => toggleFavorite(recipe.id)}
        class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/90 shadow-sm backdrop-blur-md transition-colors {favorite
          ? 'text-secondary'
          : 'text-outline hover:text-secondary'}"
      >
        <Icon name="favorite" class="text-[19px] {favorite ? 'icon-filled' : ''}" />
      </button>

      <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
        <span class="rounded bg-black/30 px-2 py-0.5 text-label-sm backdrop-blur-md">{text.catalog.card.serves(recipe.serves)}</span>
        {#if recipe.custom}
          <span class="rounded bg-black/30 px-2 py-0.5 text-label-sm backdrop-blur-md">{text.catalog.card.yourRecipe}</span>
        {/if}
      </div>
    </div>

    <div class="flex flex-col gap-3 p-5">
      <div class="flex flex-wrap gap-1.5">
        {#each recipe.tags as tag (tag)}
          <span class="max-w-full truncate rounded-full px-2 py-0.5 text-label-caps {tagClass(tag)}" title={tag}>{tag}</span>
        {/each}
      </div>
      <div>
        <h2 class="font-display text-headline-md leading-tight text-on-surface transition-colors group-hover:text-primary">
          <a href={href(`/recipe/${recipe.id}`, { day })}>{recipe.title}</a>
        </h2>
        <p class="mt-1.5 line-clamp-2 text-body-sm text-on-surface-variant">{recipe.description}</p>
        <LastMade recipeId={recipe.id} class="mt-2 text-label-sm" />
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2 px-5 pb-5 pt-1">
    {#if selected}
      <span class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-fixed/60 px-4 py-2.5 text-label-md text-primary">
        <Icon name="check_circle" class="text-[17px]" /> {text.catalog.card.plannedFor(dayName)}
      </span>
    {:else}
      <button
        type="button"
        disabled={!dayName}
        onclick={onselect}
        class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-label-md text-on-primary shadow-sm transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="event_available" class="text-[17px]" />
        {dayName ? text.catalog.card.selectFor(dayName) : text.catalog.card.noOpenDay}
      </button>
    {/if}
    <a
      href={href(`/recipe/${recipe.id}`, { day })}
      title={text.catalog.card.previewTitle}
      aria-label={text.catalog.card.openAria(recipe.shortTitle)}
      class="rounded-xl bg-surface-container-low p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
    >
      <Icon name="open_in_full" class="text-[18px]" />
    </a>
  </div>
</article>
