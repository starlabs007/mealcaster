<script>
  // Tonight's lead card without a photo (none set, or it failed to load): the title set large on a cobalt-tint panel, in
  // the photo's slot, instead of a grey placeholder tile. The panel grows past `class`'s aspect ratio if the title needs
  // the room. Tags sit on white chips so every tag colour keeps its contrast on the tint.
  import { text } from '../text.js';
  import { tagClass } from '../tagColors.svelte.js';

  /** @type {{ recipe: { title: string, prepMinutes: number, cookMinutes: number, serves: number, tags: string[] }, titleClass?: string, class?: string }} */
  let { recipe, titleClass = 'text-headline-md', class: className = '' } = $props();
</script>

<div class="flex flex-col justify-between gap-3 rounded-lg bg-primary-fixed p-4 shadow-sm {className}">
  <h3 class="line-clamp-4 break-words font-display text-primary {titleClass}" title={recipe.title}>{recipe.title}</h3>
  <div class="flex min-w-0 flex-col gap-2">
    <p class="text-xs font-semibold text-on-surface-variant">{text.planner.card.meta(recipe.prepMinutes + recipe.cookMinutes, recipe.serves)}</p>
    {#if recipe.tags.length}
      <div class="flex flex-wrap gap-1.5">
        {#each recipe.tags as tag (tag)}
          <span class="max-w-full rounded-full bg-surface-container-lowest"><span class="block max-w-full truncate rounded-full px-2 py-0.5 text-label-sm {tagClass(tag)}" title={tag}>{tag}</span></span>
        {/each}
      </div>
    {/if}
  </div>
</div>
