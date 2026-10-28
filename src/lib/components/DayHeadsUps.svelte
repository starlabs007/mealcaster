<script>
  // A day card's heads-ups (headsUps.js): the "N days ahead" pill for its own dinner (that prep was due on an earlier
  // card), its own heads-ups due on the day, then reminders for the next dinners ("For tomorrow: soak the chickpeas").
  // Nothing on past days. A reminder names its dinner and links to its recipe for that evening. Used by DayGridCard and DayListCard;
  // `minimal` = two short lines per note (Minimal view).
  import Icon from './Icon.svelte';
  import { leadDays } from '../headsUps.js';
  import { formatWeekday } from '../dates.js';
  import { text } from '../text.js';
  import { href } from '../router.svelte.js';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number], minimal?: boolean,
   *   class?: string }}
   */
  let { day, minimal = false, class: extra = '' } = $props();

  const own = $derived(!day.isPast && day.status === 'planned' ? (day.recipe?.headsUps ?? []) : []);
  const lead = $derived(leadDays({ headsUps: own }));
  const notes = $derived([
    ...own
      .filter((h) => h.daysBefore === 0)
      .map((h) => ({ icon: 'alarm', label: day.isToday ? text.common.headsUps.today : text.common.headsUps.lead(0), dinner: '', text: h.text, link: '' })),
    ...(day.isPast ? [] : day.reminders).map((r) => ({
      icon: 'event_upcoming',
      label: text.common.headsUps.forDay(r.days, formatWeekday(r.dinner)),
      dinner: r.recipe.title,
      text: r.headsUp.text,
      link: href(`/recipe/${r.recipe.id}`, { day: r.dinner }),
    })),
  ]);
</script>

{#if lead || notes.length}
  <div class="flex min-w-0 flex-col {minimal ? 'gap-1' : 'gap-1.5'} {extra}">
    {#if lead}
      {@const ahead = own.filter((h) => h.daysBefore > 0).map((h) => h.text)}
      <span
        class="inline-flex w-fit max-w-full items-center gap-1 rounded-full bg-tone-paprika px-2 py-0.5 text-label-sm text-secondary"
        title={ahead.join('\n')}
      >
        <Icon name="alarm" class="text-[13px]" /> <span aria-hidden="true">{text.common.headsUps.ahead(lead)}</span>
        <span class="sr-only">{text.common.headsUps.aheadAria(lead, ahead)}</span>
      </span>
    {/if}
    {#each notes as note, i (i)}
      <!-- Minimal: the two 16 px lines plus padding make the 44 px touch target (no empty band under them); compact
           with a mouse from md. Full: 2 px less below, where the sentence's line box leaves room under the baseline
           that the small-caps label above doesn't, so the two read as even. -->
      {@const box = minimal
        ? 'flex min-w-0 max-w-full items-start gap-1.5 rounded-md bg-tone-paprika px-2 py-1.5 text-body-sm leading-4 text-on-surface md:fine:py-0.5'
        : 'flex min-w-0 max-w-full gap-1.5 rounded-lg bg-tone-paprika px-2.5 pb-1.5 pt-2'}
      <!-- A reminder is a link (a darker tone on hover); the card's own heads-up isn't (View Recipe is right there). -->
      {#if note.link}
        <a href={note.link} class="focus-ring {box} transition-colors hover:bg-secondary-fixed/60 {minimal ? 'min-h-11 md:fine:min-h-0' : ''}">
          {@render content(note)}
        </a>
      {:else}
        <div class={box}>{@render content(note)}</div>
      {/if}
    {/each}
  </div>
{/if}

{#snippet content(/** @type {{ icon: string, label: string, dinner: string, text: string, link: string }} */ note)}
  {#if minimal}
    {@const label = note.dinner ? text.common.headsUps.forDinner(note.label, note.dinner) : note.label}
    <Icon name={note.icon} class="flex-shrink-0 text-[15px] leading-4 text-secondary" />
    <!-- Two lines, each cut on its own: when and for which dinner, then the sentence. -->
    <span class="block min-w-0">
      <span class="block truncate font-semibold text-secondary" title={label}>{label}</span>
      <span class="block truncate" title={note.text}>{note.text}</span>
    </span>
  {:else}
    <Icon name={note.icon} class="mt-px flex-shrink-0 text-[16px] text-secondary" />
    <span class="block min-w-0">
      <span class="block truncate text-label-sm uppercase text-secondary" title={note.label}>{note.label}</span>
      <!-- The dinner it's for (full title), in its own case on up to two lines: fits the narrow grid, and an all-caps
           name reads badly. -->
      {#if note.dinner}<span class="mt-0.5 line-clamp-2 break-words text-body-sm font-semibold text-on-surface" title={note.dinner}>{note.dinner}</span>{/if}
      <span class="line-clamp-3 break-words text-body-sm text-on-surface" title={note.text}>{note.text}</span>
    </span>
  {/if}
{/snippet}
