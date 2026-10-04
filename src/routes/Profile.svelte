<script>
  // Profile & Settings. Planning, aisle mappings, ingredients I have and recipe tags belong to the
  // household and sync to the [Settings] tab of the Google Sheet (tag names live on the recipes);
  // everything under "This device" is remembered here only.
  import { untrack } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import PrintOptionsFields from '../lib/components/PrintOptionsFields.svelte';
  import { recipes, isSample, isSuggestedTag, normalizeTag, tagChoices, TAG_MAX } from '../lib/recipes.svelte.js';
  import { settings, setReturnToPlanner, setWeekStartDay } from '../lib/settings.svelte.js';
  import { realignWeeks } from '../lib/weekStart.svelte.js';
  import { printOptions, setPrintOptions } from '../lib/printOptions.svelte.js';
  import { devicePrefs, setHideRecent } from '../lib/devicePrefs.svelte.js';
  import { TONES, tagClass, toneClassOf, setTagTone, renameTag, deleteTag, resetTagColors } from '../lib/tagColors.svelte.js';
  import { RECENT_DAYS, planner } from '../lib/planner.svelte.js';
  import { weekStartOf } from '../lib/dates.js';
  import WipeDataDialog from '../lib/components/WipeDataDialog.svelte';
  import HaveListDialog from '../lib/components/HaveListDialog.svelte';
  import AisleMappingsDialog from '../lib/components/AisleMappingsDialog.svelte';
  import { sheets } from '../lib/sheets.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  let confirmingWipe = $state(false);
  const haveList = $derived([...settings.have].sort((a, b) => a.localeCompare(b)));
  let editingHave = $state(false);
  let editingAisles = $state(false);

  const mappings = $derived([...settings.aisles].sort((a, b) => a.name.localeCompare(b.name)));
  const synced = $derived(Boolean(sheets.spreadsheet));

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function changeWeekStart(event) {
    const wasThisWeek = planner.weekStart === weekStartOf(new Date());
    setWeekStartDay(Number(event.currentTarget.value));
    realignWeeks(wasThisWeek);
    showToast(`Weeks now start on ${weekdays[settings.weekStartDay]}.`);
  }

  // Print defaults save as they change.
  let print = $state({ ...printOptions });
  $effect(() => {
    const next = $state.snapshot(print);
    untrack(() => setPrintOptions(next));
  });

  function resetColors() {
    resetTagColors();
    showToast('Tag colours reset.');
  }

  // Recipe tags: every tag in use, built-in suggestions first. Only the person's own can change.
  const tagRows = $derived(
    tagChoices(recipes.flatMap((r) => r.tags))
      .map((tag) => ({ tag, count: recipes.filter((r) => r.tags.includes(tag)).length }))
      .filter((t) => t.count),
  );
  const samplesShown = $derived(recipes.some((r) => isSample(r.id)));
  const recipeCount = (n) => `${n} recipe${n === 1 ? '' : 's'}`;
  /** @type {{ from: string, text: string } | null} */
  let renaming = $state(null);

  function rename(event) {
    event.preventDefault();
    if (!renaming) return;
    const { from, text } = renaming;
    const count = recipes.filter((r) => r.tags.includes(from)).length;
    const merging = tagRows.find((t) => t.tag !== from && t.tag === normalizeTag(text));
    try {
      const undo = renameTag(from, text);
      renaming = null;
      if (!undo) return;
      const message = merging ? `Merged “${from}” into “${merging.tag}”.` : `Renamed “${from}” to “${normalizeTag(text)}” on ${recipeCount(count)}.`;
      showToast(message, { label: 'Undo', run: undo });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Couldn’t rename the tag.');
    }
  }

  function remove(tag, count) {
    if (renaming?.from === tag) renaming = null;
    try {
      const undo = deleteTag(tag);
      if (undo) showToast(`Removed “${tag}” from ${recipeCount(count)}.`, { label: 'Undo', run: undo });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Couldn’t delete the tag.');
    }
  }
</script>

{#snippet switchRow(checked, title, description, onchange)}
  <label class="flex cursor-pointer items-start justify-between gap-4 py-3">
    <span class="flex flex-col">
      <span class="text-label-md text-on-surface">{title}</span>
      <span class="text-body-sm text-on-surface-variant">{description}</span>
    </span>
    <span class="relative mt-0.5 inline-flex shrink-0">
      <input type="checkbox" role="switch" {checked} onchange={(e) => onchange(e.currentTarget.checked)} class="peer sr-only" />
      <span class="h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2"></span>
      <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform peer-checked:translate-x-5"></span>
    </span>
  </label>
{/snippet}

<div class="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
  <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-label-md text-on-surface-variant">
    <Icon name="calendar_view_week" class="text-[16px]" />
    <a href={href('/')} class="hover:text-primary">Weekly Dinner Plan</a>
    <span class="text-outline">/</span>
    <Icon name="person" class="text-[16px] text-primary" />
    <span class="text-on-surface" aria-current="page">Profile &amp; Settings</span>
  </nav>

  <div>
    <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">Profile &amp; Settings</h1>
    <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
      Planning, Aisle Mappings, Ingredients I Have and Recipe Tags are shared through your Google Sheet; the rest stay on this
      device.
    </p>
  </div>

  <!-- Shared through the sheet -->
  <section class="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="planning-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="planning-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="calendar_month" class="text-[20px] text-primary" /> Planning
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? `Synced · [${sheets.tabs.settings}]` : 'Saved on this device'}
      </span>
    </div>
    {@render switchRow(
      settings.returnToPlanner,
      'Return to the planner after choosing a meal',
      'In the catalog, picking a meal (or Surprise Me) takes you back to the weekly plan. Switch off to stay in the catalog and see a confirmation instead.',
      setReturnToPlanner,
    )}
    <label class="flex items-start justify-between gap-4 py-3">
      <span class="flex flex-col">
        <span class="text-label-md text-on-surface">Week starts on</span>
        <span class="text-body-sm text-on-surface-variant">
          The first day of the weekly plan and the grocery week. Your plan keeps its dates; grocery lists move to the new weeks.
        </span>
      </span>
      <select value={settings.weekStartDay} onchange={changeWeekStart} class="{inputClass} shrink-0">
        {#each weekdays as day, i (i)}<option value={i}>{day}</option>{/each}
      </select>
    </label>
  </section>

  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="aisle-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="aisle-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="shelves" class="text-[20px] text-primary" /> Aisle Mappings
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? `Synced · [${sheets.tabs.settings}]` : 'Saved on this device'}
      </span>
    </div>
    <p class="max-w-2xl text-body-sm text-on-surface-variant">
      Tell MealCaster where an ingredient lives. When you add or paste ingredients in the recipe editor, or add a
      grocery item, a name here is used before the built-in guesses. “oat milk” also matches “2 cups oat milk”, and the
      longest name wins.
    </p>
    {#if !synced}
      <p class="flex items-start gap-2 text-body-sm text-on-surface-variant">
        <Icon name="cloud_off" class="mt-0.5 text-[16px] text-outline" />
        <span>
          Connect a Google Sheet to share these with your other devices.
          <a href={href('/sheets-sync')} class="text-primary underline">Sheets settings</a>
        </span>
      </p>
    {:else}
      <SyncStatus />
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-label-md {mappings.length ? 'text-on-surface' : 'text-outline'}">
        {mappings.length ? `${mappings.length} mapping${mappings.length === 1 ? '' : 's'}` : 'No custom mappings yet.'}
      </span>
      <button type="button" class="btn-outline shrink-0 py-2" onclick={() => (editingAisles = true)}>
        <Icon name="edit" class="text-[16px]" /> View / Edit
      </button>
    </div>
  </section>

  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="have-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="have-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="inventory_2" class="text-[20px] text-primary" /> Ingredients I Have
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? `Synced · [${sheets.tabs.settings}]` : 'Saved on this device'}
      </span>
    </div>
    <p class="max-w-2xl text-body-sm text-on-surface-variant">
      These never appear on your grocery list, in any week, until you remove them. Check an ingredient on a recipe to
      add it here. A name matches an ingredient exactly (any case, plural ok): “noodles” won’t hide “egg noodles”.
    </p>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-label-md {haveList.length ? 'text-on-surface' : 'text-outline'}">
        {haveList.length ? `${haveList.length} ingredient${haveList.length === 1 ? '' : 's'}` : 'Nothing here yet.'}
      </span>
      <button type="button" class="btn-outline shrink-0 py-2" onclick={() => (editingHave = true)}>
        <Icon name="edit" class="text-[16px]" /> View / Edit
      </button>
    </div>
  </section>

  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="tags-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="tags-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="sell" class="text-[20px] text-primary" /> Recipe Tags
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? `Synced · [${sheets.tabs.settings}]` : 'Saved on this device'}
      </span>
    </div>
    <p class="max-w-2xl text-body-sm text-on-surface-variant">
      Every tag your recipes use. Pick a colour for your own tags, or rename or delete them: renaming or deleting changes every
      recipe with that tag{samplesShown ? ', sample recipes included (their editor then offers Revert to Original)' : ''}, and renaming to a
      tag you already use merges the two. The built-in tags can’t be changed. New tags get a colour as they appear.
    </p>

    {#if tagRows.length}
      <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
        {#each tagRows as { tag, count } (tag)}
          {@const builtIn = isSuggestedTag(tag)}
          <li class="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            {#if renaming?.from === tag}
              <form onsubmit={rename} class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  aria-label="New name for {tag}"
                  required
                  autofocus
                  maxlength={TAG_MAX}
                  bind:value={renaming.text}
                  onkeydown={(e) => e.key === 'Escape' && (renaming = null)}
                  class="{inputClass} min-w-0 flex-1 py-1.5"
                />
                <button type="submit" class="btn-primary py-1.5">Rename</button>
                <button type="button" class="btn-outline py-1.5" onclick={() => (renaming = null)}>Cancel</button>
              </form>
            {:else}
              <span class="flex min-w-0 flex-1 items-center gap-2">
                <span class="max-w-full truncate rounded-full px-2 py-0.5 text-label-caps {tagClass(tag)}" title={tag}>{tag}</span>
                <span class="shrink-0 text-body-sm text-outline">{recipeCount(count)}</span>
              </span>
              {#if builtIn}
                <span class="text-label-sm text-outline">Built-in</span>
              {:else}
                <span role="radiogroup" aria-label="Colour for {tag}" class="flex items-center gap-1.5">
                  {#each TONES as tone (tone)}
                    {@const on = settings.tagColors[tag] === tone}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={tone[0].toUpperCase() + tone.slice(1)}
                      title={tone[0].toUpperCase() + tone.slice(1)}
                      class="flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant {toneClassOf(tone)} {on
                        ? 'ring-2 ring-primary ring-offset-1'
                        : ''}"
                      onclick={() => setTagTone(tag, tone)}
                    >
                      <span class="h-2.5 w-2.5 rounded-full bg-current"></span>
                    </button>
                  {/each}
                </span>
                <span class="flex items-center">
                  <button
                    type="button"
                    aria-label="Rename {tag}"
                    class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                    onclick={() => (renaming = { from: tag, text: tag })}
                  >
                    <Icon name="edit" class="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete {tag}"
                    class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
                    onclick={() => remove(tag, count)}
                  >
                    <Icon name="delete" class="text-[18px]" />
                  </button>
                </span>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-outline">
        No recipe uses a tag yet.
      </p>
    {/if}

    <div class="flex items-start justify-between gap-4">
      <span class="text-body-sm text-on-surface-variant">Reset hands every tag a colour again, from scratch, for everyone sharing the sheet.</span>
      <button type="button" class="btn-outline shrink-0 py-2" onclick={resetColors}>Reset Colours</button>
    </div>
  </section>

  <!-- This device only -->
  <section class="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="device-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="device-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="devices" class="text-[20px] text-primary" /> This Device
      </h2>
      <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">Not synced</span>
    </div>

    <div class="divide-y divide-surface-container-high">
      <div class="py-3">
        <h3 class="flex items-center gap-2 text-label-md text-on-surface"><Icon name="print" class="text-[16px] text-outline" /> Recipe printing</h3>
        <p class="text-body-sm text-on-surface-variant">Defaults for the Print Options dialog on a recipe.</p>
        <div class="mt-1 max-w-md">
          <PrintOptionsFields bind:draft={print} />
        </div>
      </div>

      {@render switchRow(
        devicePrefs.hideRecent,
        'Catalog: hide recently made recipes',
        `Starts the catalog with “Not made in ${RECENT_DAYS} days” switched on.`,
        setHideRecent,
      )}
    </div>
  </section>

  <!-- Danger zone -->
  <section class="flex flex-col gap-3 rounded-2xl border-2 border-secondary/40 bg-surface-container-lowest p-5" aria-labelledby="danger-heading">
    <h2 id="danger-heading" class="flex items-center gap-2 font-display text-headline-sm text-secondary">
      <Icon name="warning" class="text-[20px]" /> Danger Zone
    </h2>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-xl text-body-sm text-on-surface-variant">
        <strong class="text-on-surface">Disconnect and erase all local data.</strong> Signs out of Google and permanently removes
        every recipe, plan, grocery list and setting saved in this browser, then starts MealCaster fresh. Your Google Sheet is not
        changed. This can’t be undone — handy for testing a clean start.
      </p>
      <button type="button" class="btn shrink-0 bg-secondary py-2.5 text-on-secondary hover:bg-[#b34728]" onclick={() => (confirmingWipe = true)}>
        <Icon name="delete_forever" class="text-[16px]" /> Disconnect &amp; Erase…
      </button>
    </div>
  </section>
</div>

{#if confirmingWipe}
  <WipeDataDialog onclose={() => (confirmingWipe = false)} />
{/if}

{#if editingHave}
  <HaveListDialog onclose={() => (editingHave = false)} />
{/if}

{#if editingAisles}
  <AisleMappingsDialog onclose={() => (editingAisles = false)} />
{/if}
