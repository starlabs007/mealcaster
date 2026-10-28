<script>
  // A day card's heads-ups (headsUps.js): the "N days ahead" pill for its own dinner (that prep was due on an earlier
  // card), its own heads-ups due on the day, then reminders for the next dinners ("For tomorrow: soak the chickpeas").
  // Nothing on past days. A reminder names its dinner and links to its recipe for that evening. Used by DayGridCard and DayListCard;
  // `minimal` = one line per note (Minimal view).
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
      dinner: r.recipe.shortTitle || r.recipe.title,
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
      {@const box = minimal
        ? 'flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-tone-paprika px-2 py-1 text-body-sm text-on-surface'
        : 'flex min-w-0 max-w-full gap-1.5 rounded-lg bg-tone-paprika px-2.5 py-2'}
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
    <Icon name={note.icon} class="flex-shrink-0 text-[15px] text-secondary" />
    <span class="min-w-0 truncate" title={note.text}>
      <span class="font-semibold text-secondary">{note.dinner ? text.common.headsUps.forDinner(note.label, note.dinner) : note.label}:</span> {note.text}
    </span>
  {:else}
    <Icon name={note.icon} class="mt-px flex-shrink-0 text-[16px] text-secondary" />
    <span class="block min-w-0">
      <span class="block truncate text-label-sm uppercase text-secondary" title={note.label}>{note.label}</span>
      <!-- The dinner it's for, in its own case on its own line: fits the narrow grid, and an all-caps name reads badly. -->
      {#if note.dinner}<span class="mt-0.5 block truncate text-body-sm font-semibold text-on-surface" title={note.dinner}>{note.dinner}</span>{/if}
      <span class="line-clamp-3 break-words text-body-sm text-on-surface" title={note.text}>{note.text}</span>
    </span>
  {/if}
{/snippet}
