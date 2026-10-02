<script>
  // Profile & Settings. Aisle mappings belong to the household and sync to the [Settings] tab
  // of the Google Sheet; everything under "This device" is remembered here only.
  import { untrack } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import PrintOptionsFields from '../lib/components/PrintOptionsFields.svelte';
  import { aisles } from '../lib/data/aisles.js';
  import { aisleLabel } from '../lib/recipes.svelte.js';
  import { settings, setAisleMapping, removeAisleMapping, setReturnToPlanner, setWeekStartDay } from '../lib/settings.svelte.js';
  import { mappingKey } from '../lib/aisleMap.js';
  import { realignWeeks } from '../lib/weekStart.svelte.js';
  import { printOptions, setPrintOptions } from '../lib/printOptions.svelte.js';
  import { devicePrefs, setHideRecent } from '../lib/devicePrefs.svelte.js';
  import { resetTagColors } from '../lib/tagColors.svelte.js';
  import { RECENT_DAYS, planner } from '../lib/planner.svelte.js';
  import { weekStartOf } from '../lib/dates.js';
  import WipeDataDialog from '../lib/components/WipeDataDialog.svelte';
  import { sheets } from '../lib/sheets.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  let confirmingWipe = $state(false);
  let draft = $state({ name: '', tag: 'Pantry' });
  const mappings = $derived([...settings.aisles].sort((a, b) => a.name.localeCompare(b.name)));
  const synced = $derived(Boolean(sheets.spreadsheet) && sheets.syncSettings);

  function addMapping(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const existing = settings.aisles.some((m) => mappingKey(m.name) === mappingKey(name));
    setAisleMapping(name, draft.tag);
    showToast(`${existing ? 'Updated' : 'Added'} ${name} → ${aisleLabel(draft.tag)}.`);
    draft = { name: '', tag: draft.tag };
  }

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
      Planning and Aisle Mappings are shared through your Google Sheet; the rest stay on this device.
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
          {#if sheets.spreadsheet}
            Syncing the Settings tab is switched off.
          {:else}
            Connect a Google Sheet to share these with your other devices.
          {/if}
          <a href={href('/sheets-sync')} class="text-primary underline">Sheets settings</a>
        </span>
      </p>
    {:else}
      <SyncStatus />
    {/if}

    <form onsubmit={addMapping} class="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.3fr_auto] sm:items-end">
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        Ingredient
        <input required bind:value={draft.name} placeholder="e.g. Oat milk" class={inputClass} />
      </label>
      <label class="flex flex-col gap-1 text-label-sm text-on-surface-variant">
        Aisle
        <select bind:value={draft.tag} class={inputClass}>
          {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
        </select>
      </label>
      <button type="submit" class="btn-primary py-2.5">Add Mapping</button>
    </form>

    {#if mappings.length}
      <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl border border-surface-container-high">
        {#each mappings as m (m.name)}
          <li class="flex items-center gap-3 px-4 py-2.5">
            <span class="min-w-0 flex-1 truncate text-body-md text-on-surface">{m.name}</span>
            <select
              aria-label="Aisle for {m.name}"
              value={m.tag}
              onchange={(e) => setAisleMapping(m.name, e.currentTarget.value)}
              class="{inputClass} py-1.5"
            >
              {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
            </select>
            <button
              type="button"
              aria-label="Remove {m.name}"
              class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
              onclick={() => removeAisleMapping(m.name)}
            >
              <Icon name="delete" class="text-[18px]" />
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="rounded-xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-outline">
        No custom mappings yet.
      </p>
    {/if}
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

      <div class="flex items-start justify-between gap-4 py-3">
        <span class="flex flex-col">
          <span class="text-label-md text-on-surface">Tag colours</span>
          <span class="text-body-sm text-on-surface-variant">Colours are handed out as tags appear. Reset to hand them out again from scratch.</span>
        </span>
        <button type="button" class="btn-outline shrink-0 py-2" onclick={resetColors}>Reset Colours</button>
      </div>
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
