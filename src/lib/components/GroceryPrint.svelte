<script>
  // The printed Kitchen Checklist: one column, plain text, a department per section
  // headed by a large bold title, an empty box to tick beside each item. Only what
  // is still to buy; bought and on-hand items stay off the paper. Never shown on screen.

  /** @type {{ week: string, sections: { id: string, label: string, where: string, items: import('../grocery.svelte.js').GroceryLine[] }[], sources: string[] }} */
  let { week, sections, sources } = $props();

  const toBuy = $derived(
    sections.map((s) => ({ ...s, items: s.items.filter((l) => l.status === 'need') })).filter((s) => s.items.length),
  );
  const count = $derived(toBuy.reduce((n, s) => n + s.items.length, 0));
</script>

<article class="hidden text-on-surface print:block" style="font-size: 11pt; line-height: 1.4">
  <h1 class="font-display text-[2.2em] font-bold leading-tight">Kitchen Checklist</h1>
  <p class="mt-[0.4em] text-[0.95em] text-on-surface-variant">
    {week} · {count} {count === 1 ? 'item' : 'items'} to buy{#if sources.length}&nbsp;· for {sources.join(', ')}{/if}
  </p>

  {#each toBuy as section (section.id)}
    <section>
      <h2 class="mb-[0.3em] mt-[1.1em] flex items-baseline justify-between gap-4 break-after-avoid">
        <span class="font-display text-[1.6em] font-bold leading-tight">{section.label}</span>
        <span class="text-[0.9em] text-on-surface-variant">{section.where}</span>
      </h2>
      <ul>
        {#each section.items as item (item.key)}
          <li class="flex break-inside-avoid items-baseline gap-[0.6em] py-[0.15em]">
            <span class="inline-block h-[0.85em] w-[0.85em] shrink-0 translate-y-[0.1em] border border-on-surface"></span>
            <span class="flex-1">
              <strong class="font-semibold">{item.name}</strong>{#if item.detail}&nbsp;— {item.detail}{/if}
            </span>
            <span class="shrink-0 text-[0.9em] text-on-surface-variant">{item.source.label}</span>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="mt-[1.1em]">Nothing left to buy.</p>
  {/each}
</article>
