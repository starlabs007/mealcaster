<script>
  // The "Simple layout" printout: one column, plain text, sections headed by large
  // bold titles. Never shown on screen. Sizes are in em so the text size option
  // only has to set the base size.
  import { formatQty } from '../format.js';
  import { renderMarkdown } from '../markdown.js';

  /** @type {{ recipe: any, servings: number, scale: number, image: string | undefined, imageScale: number, textDelta: number, mins: (m: number) => string }} */
  let { recipe, servings, scale, image, imageScale, textDelta, mins } = $props();

  const meta = $derived(
    [
      recipe.prepMinutes && `Prep ${mins(recipe.prepMinutes)}`,
      recipe.cookMinutes && `Cook ${mins(recipe.cookMinutes)}`,
      recipe.minutes && `Total ${mins(recipe.minutes)}`,
      `${servings} ${servings === 1 ? 'serving' : 'servings'}`,
    ].filter(Boolean),
  );
</script>

<article class="hidden text-on-surface print:block" style="font-size: {11 + textDelta}pt; line-height: 1.4">
  <h1 class="font-display text-[2.2em] font-bold leading-tight">{recipe.title}</h1>
  {#if recipe.description}<p class="mt-[0.4em] italic">{recipe.description}</p>{/if}
  <p class="mt-[0.4em] text-[0.95em] text-on-surface-variant">{meta.join(' · ')}</p>

  {#if image}
    <img src={image} alt="" class="mx-auto mt-[1em] block aspect-[4/3] break-inside-avoid object-cover" style="width: {imageScale}%" />
  {/if}

  <section>
    <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">Ingredients</h2>
    {#each recipe.ingredients as group (group.title)}
      <div class="mb-[0.6em] break-inside-avoid">
        {#if recipe.ingredients.length > 1}<h3 class="font-bold">{group.title}</h3>{/if}
        <ul class="list-disc pl-[1.3em]">
          {#each group.items as item, i (i)}
            <li>
              {#if item.qty != null}<strong>{formatQty(item.qty * scale)}</strong>{/if}
              {item.unit ?? ''} {item.text}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>

  <section>
    <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">Method</h2>
    <ol>
      {#each recipe.steps as step, i (i)}
        <li class="mb-[0.7em] break-inside-avoid">
          <h3 class="font-bold">
            {i + 1}. {step.title}{#if step.minutes}<span class="font-normal text-on-surface-variant">&nbsp;· {mins(step.minutes)}</span>{/if}
          </h3>
          <div class="notes-md">{@html renderMarkdown(step.text)}</div>
        </li>
      {/each}
    </ol>
  </section>

  {#if recipe.notes?.trim()}
    <section class="break-inside-avoid">
      <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">Cook’s Secrets</h2>
      <div class="notes-md">{@html renderMarkdown(recipe.notes)}</div>
    </section>
  {/if}
</article>
