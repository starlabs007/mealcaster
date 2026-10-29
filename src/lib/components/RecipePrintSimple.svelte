<script>
  // The "Simple layout" printout: one column, plain text, sections headed by large
  // bold titles. Never shown on screen. Sizes are in em so the text size option
  // only has to set the base size.
  import { lineParts } from '../ingredients.js';
  import { ingredientOf } from '../ingredients.svelte.js';
  import { renderMarkdown } from '../markdown.js';
  import { text } from '../text.js';

  /** @type {{ recipe: any, servings: number, scale: number, image: string | undefined, imageScale: number, textDelta: number, mins: (m: number) => string }} */
  let { recipe, servings, scale, image, imageScale, textDelta, mins } = $props();

  const meta = $derived(
    [
      recipe.prepMinutes && text.recipe.print.simplePage.prep(mins(recipe.prepMinutes)),
      recipe.cookMinutes && text.recipe.print.simplePage.cook(mins(recipe.cookMinutes)),
      recipe.minutes && text.recipe.print.simplePage.total(mins(recipe.minutes)),
      text.recipe.print.simplePage.servings(servings),
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
    <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">{text.recipe.print.simplePage.ingredients}</h2>
    {#each recipe.ingredients as group (group.title)}
      <div class="mb-[0.6em] break-inside-avoid">
        {#if recipe.ingredients.length > 1}<h3 class="font-bold">{group.title}</h3>{/if}
        <ul class="list-disc pl-[1.3em]">
          {#each group.items as item, i (i)}
            {@const line = lineParts(item, ingredientOf(item.id), scale)}
            <li>
              {#if line.amount}<strong>{line.amount}</strong>{/if}
              {line.name}{#if line.note}{' '}({line.note}){/if}{#if line.prep}, {line.prep}{/if}{#if line.optional}{' '}({text.recipe.print.simplePage.optional}){/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>

  {#if recipe.steps.length}
  <section>
    <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">{text.recipe.print.simplePage.method}</h2>
    <ol>
      {#each recipe.steps as step, i (i)}
        <li class="mb-[0.7em] break-inside-avoid">
          <h3 class="font-bold">
            {i + 1}.{#if step.title}{' '}{step.title}{/if}{#if step.minutes}<span class="font-normal text-on-surface-variant">&nbsp;{step.title ? '· ' : ''}{mins(step.minutes)}</span>{/if}
          </h3>
          <div class="notes-md">{@html renderMarkdown(step.text)}</div>
        </li>
      {/each}
    </ol>
  </section>
  {/if}

  {#if recipe.notes?.trim()}
    <section class="break-inside-avoid">
      <h2 class="mb-[0.4em] mt-[1.1em] break-after-avoid font-display text-[1.6em] font-bold leading-tight">{text.recipe.notes.title}</h2>
      <div class="notes-md">{@html renderMarkdown(recipe.notes)}</div>
    </section>
  {/if}
</article>
