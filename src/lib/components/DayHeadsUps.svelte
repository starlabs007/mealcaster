<script>
  // A day card's heads-ups (headsUps.js): the "N days ahead" pill for its own dinner (that prep was due on an earlier
  // card), its own heads-ups due on the day, then reminders for the next dinners ("For tomorrow: soak the chickpeas").
  // Nothing on past days. A reminder links to its recipe for that evening. Used by DayGridCard and DayListCard;
  // `minimal` = one line per note (Minimal view).
  import Icon from './Icon.svelte';
  import { leadDays } from '../headsUps.js';
  import { formatWeekday } from '../dates.js';
  import { text } from '../text.js';
  import { href } from '../router.svelte.js';

  /**
   * @type {{ day: ReturnType<typeof import('../planner.svelte.js').currentWeek>[number], named?: boolean,
   *   minimal?: boolean, class?: string }}
   * `named`: reminder labels add the dinner's name ("For tomorrow · Hummus"), where the card is wide enough.
   */
  let { day, named = false, minimal = false, class: extra = '' } = $props();

  const own = $derived(!day.isPast && day.status === 'planned' ? (day.recipe?.headsUps ?? []) : []);
  const lead = $derived(leadDays({ headsUps: own }));
  const label = (r) =>
    named
      ? text.common.headsUps.forDinner(r.days, formatWeekday(r.dinner), r.recipe.shortTitle || r.recipe.title)
      : text.common.headsUps.forDay(r.days, formatWeekday(r.dinner));
  const notes = $derived([
    ...own
      .filter((h) => h.daysBefore === 0)
      .map((h) => ({ icon: 'alarm', label: day.isToday ? text.common.headsUps.today : text.common.headsUps.lead(0), text: h.text, link: '', hidden: '' })),
    ...(day.isPast ? [] : day.reminders).map((r) => ({
      icon: 'event_upcoming',
      label: label(r),
      text: r.headsUp.text,
      link: href(`/recipe/${r.recipe.id}`, { day: r.dinner }),
      // The narrow grid leaves the dinner's name out of the label; a screen reader still hears where the link goes.
      hidden: named ? '' : r.recipe.shortTitle || r.recipe.title,
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
        ? 'flex min-w-0 items-center gap-1.5 rounded-md bg-tone-paprika px-2 py-1 text-body-sm text-on-surface'
        : 'flex min-w-0 gap-1.5 rounded-lg bg-tone-paprika px-2.5 py-2'}
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

{#snippet content(/** @type {{ icon: string, label: string, text: string, link: string, hidden: string }} */ note)}
  {#if minimal}
    <Icon name={note.icon} class="flex-shrink-0 text-[15px] text-secondary" />
    <span class="min-w-0 truncate" title={note.text}><span class="font-semibold text-secondary">{note.label}:</span> {note.text}</span>
  {:else}
    <Icon name={note.icon} class="mt-px flex-shrink-0 text-[16px] text-secondary" />
    <span class="block min-w-0">
      <span class="block truncate text-label-sm uppercase text-secondary" title={note.label}>{note.label}{#if note.hidden}<span class="sr-only"> · {note.hidden}</span>{/if}</span>
      <span class="line-clamp-3 break-words text-body-sm text-on-surface" title={note.text}>{note.text}</span>
    </span>
  {/if}
{/snippet}
