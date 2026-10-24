<script>
  // Profile & Settings. Planning and recipe tags belong to the household and sync to the [Settings]
  // tab of the Google Sheet (tag names live on the recipes), ingredients to the [Ingredients] tab;
  // everything under "This device" is remembered here only.
  import { untrack } from 'svelte';
  import { tagColourName, weekdays } from '../lib/sheetText.js';
  import { text } from '../lib/text.js';
  import Icon from '../lib/components/Icon.svelte';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import PrintOptionsFields from '../lib/components/PrintOptionsFields.svelte';
  import { recipes, isSample, isSuggestedTag, normalizeTag, tagChoices, TAG_MAX } from '../lib/recipes.svelte.js';
  import { settings, setReturnToPlanner, setWeekStartDay } from '../lib/settings.svelte.js';
  import { realignWeeks } from '../lib/weekStart.svelte.js';
  import { printOptions, setPrintOptions } from '../lib/printOptions.svelte.js';
  import { devicePrefs, setHideRecent, setHidePlanned } from '../lib/devicePrefs.svelte.js';
  import { TONES, tagClass, toneClassOf, setTagTone, renameTag, deleteTag, resetTagColors } from '../lib/tagColors.svelte.js';
  import { RECENT_DAYS, planner } from '../lib/planner.svelte.js';
  import { weekStartOf } from '../lib/dates.js';
  import WipeDataDialog from '../lib/components/WipeDataDialog.svelte';
  import IngredientsDialog from '../lib/components/IngredientsDialog.svelte';
  import { ingredients } from '../lib/ingredients.svelte.js';
  import { sheets } from '../lib/sheets.svelte.js';
  import { href } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { NEARLY_FULL, STORAGE_BUDGET, protectStorage, storageState, storageUsed } from '../lib/storage.svelte.js';
  import { isPhotoDataUrl } from '../lib/google/api.js';
  import { dataWorkbook } from '../lib/sheetsTemplate.js';
  import { downloadBlob } from '../lib/xlsx.js';
  import { toISO } from '../lib/dates.js';
  import { listWords, mergeTarget, sizeText, storageShare, tagUsage } from '../lib/profileView.js';

  const inputClass =
    'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container';

  /** A group of related device options in This Device. */
  const deviceCard = 'flex flex-col rounded-xl border border-surface-container-high p-4';

  let confirmingWipe = $state(false);
  let editingIngredients = $state(false);

  // Export: everything on this device as a workbook with the tabs (and tab names) the sheet uses.
  const exportContents = $derived(
    listWords(
      [text.profile.device.export.ingredients(ingredients.length), text.profile.device.export.recipes(recipes.length), text.profile.device.export.plannedDinners, sheets.syncProvisions && text.profile.device.export.groceryList, text.profile.device.export.settings].filter(Boolean),
      text.profile.device.export.and,
    ),
  );
  function exportData() {
    downloadBlob(dataWorkbook($state.snapshot(sheets)), `MealCaster_Export_${toISO(new Date())}.xlsx`);
    showToast(text.profile.device.export.downloaded);
  }
  const inStock = $derived(ingredients.filter((i) => i.onHand).length);
  const synced = $derived(Boolean(sheets.spreadsheet));

  function changeWeekStart(event) {
    const wasThisWeek = planner.weekStart === weekStartOf(new Date());
    setWeekStartDay(Number(event.currentTarget.value));
    realignWeeks(wasThisWeek);
    showToast(text.profile.planning.weekStartChanged(weekdays[settings.weekStartDay]));
  }

  // Print defaults save as they change.
  let print = $state({ ...printOptions });
  $effect(() => {
    const next = $state.snapshot(print);
    untrack(() => setPrintOptions(next));
  });

  // Storage on this device: localStorage holds everything, photos waiting for Drive included.
  const used = $derived((storageState.saves, storageUsed()));
  // Some browsers allow more than the usual 5 MB; past it, the estimate says nothing useful.
  const overBudget = $derived(storageShare(used, STORAGE_BUDGET).over);
  const usedShare = $derived(storageShare(used, STORAGE_BUDGET).share);
  const pendingPhotos = $derived(recipes.filter((r) => isPhotoDataUrl(r.image)));
  const pendingPhotoSize = $derived(pendingPhotos.reduce((n, r) => n + r.image.length, 0));

  async function askToKeep() {
    await protectStorage({ ask: true });
    if (storageState.persisted) showToast(text.profile.storage.keepYes);
    else showToast(text.profile.storage.keepNo);
  }

  function resetColors() {
    resetTagColors();
    showToast(text.profile.tags.toasts.coloursReset);
  }

  // Recipe tags: every tag in use, built-in suggestions first. Only the person's own can change.
  const tagRows = $derived(tagUsage(tagChoices(recipes.flatMap((r) => r.tags)), recipes));
  const samplesShown = $derived(recipes.some((r) => isSample(r.id)));
  const recipeCount = text.profile.tags.recipeCount;
  /** @type {{ from: string, text: string } | null} */
  let renaming = $state(null);

  function rename(event) {
    event.preventDefault();
    if (!renaming) return;
    const { from, text: typed } = renaming;
    const count = recipes.filter((r) => r.tags.includes(from)).length;
    const merging = mergeTarget(tagRows, from, typed);
    try {
      const undo = renameTag(from, typed);
      renaming = null;
      if (!undo) return;
      const message = merging ? text.profile.tags.toasts.merged(from, merging.tag) : text.profile.tags.toasts.renamed(from, normalizeTag(typed), recipeCount(count));
      showToast(message, { label: text.common.undo, run: undo });
    } catch (error) {
      showToast(error instanceof Error ? error.message : text.profile.tags.toasts.renameFailed);
    }
  }

  function remove(tag, count) {
    if (renaming?.from === tag) renaming = null;
    try {
      const undo = deleteTag(tag);
      if (undo) showToast(text.profile.tags.toasts.removed(tag, recipeCount(count)), { label: text.common.undo, run: undo });
    } catch (error) {
      showToast(error instanceof Error ? error.message : text.profile.tags.toasts.deleteFailed);
    }
  }
</script>

{#snippet cardHeading(icon, title, description = '')}
  <h3 class="flex items-center gap-2 text-label-md text-on-surface"><Icon name={icon} class="text-[18px] text-primary" /> {title}</h3>
  {#if description}<p class="text-body-sm text-on-surface-variant">{description}</p>{/if}
{/snippet}

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

<div class="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-gutter py-6 md:px-gutter-desktop">
  <nav aria-label={text.profile.breadcrumbAria} class="flex items-center gap-1.5 text-label-md text-on-surface-variant">
    <Icon name="calendar_view_week" class="text-[16px]" />
    <a href={href('/')} class="hover:text-primary">{text.profile.weeklyPlan}</a>
    <span class="text-outline">/</span>
    <Icon name="person" class="text-[16px] text-primary" />
    <span class="text-on-surface" aria-current="page">{text.profile.title}</span>
  </nav>

  <div>
    <h1 class="font-display text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">{text.profile.title}</h1>
    <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
      {text.profile.intro}
    </p>
  </div>

  <!-- Shared through the sheet -->
  <section class="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="planning-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="planning-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="calendar_month" class="text-[20px] text-primary" /> {text.profile.planning.title}
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? text.profile.badges.synced(sheets.tabs.settings) : text.profile.badges.savedOnDevice}
      </span>
    </div>
    {@render switchRow(
      settings.returnToPlanner,
      text.profile.planning.returnToPlanner,
      text.profile.planning.returnToPlannerHint,
      setReturnToPlanner,
    )}
    <label class="flex items-start justify-between gap-4 py-3">
      <span class="flex flex-col">
        <span class="text-label-md text-on-surface">{text.profile.planning.weekStarts}</span>
        <span class="text-body-sm text-on-surface-variant">
          {text.profile.planning.weekStartsHint}
        </span>
      </span>
      <select value={settings.weekStartDay} onchange={changeWeekStart} class="{inputClass} shrink-0">
        {#each weekdays as day, i (i)}<option value={i}>{day}</option>{/each}
      </select>
    </label>
  </section>

  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="ingredients-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="ingredients-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="grocery" class="text-[20px] text-primary" /> {text.profile.ingredients.title}
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? text.profile.badges.synced(sheets.tabs.ingredients) : text.profile.badges.savedOnDevice}
      </span>
    </div>
    <p class="max-w-2xl text-body-sm text-on-surface-variant">
      {text.profile.ingredients.intro}
    </p>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-label-md {ingredients.length ? 'text-on-surface' : 'text-outline'}">
        {ingredients.length ? text.profile.ingredients.count(ingredients.length, inStock) : text.profile.ingredients.none}
      </span>
      <button type="button" class="btn-outline py-1.5" onclick={() => (editingIngredients = true)}>
        <Icon name="edit" class="text-[16px]" /> {text.profile.ingredients.viewEdit}
      </button>
    </div>
  </section>

  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="tags-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="tags-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="sell" class="text-[20px] text-primary" /> {text.profile.tags.title}
      </h2>
      <span class="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-label-caps uppercase text-primary">
        {synced ? text.profile.badges.synced(sheets.tabs.settings) : text.profile.badges.savedOnDevice}
      </span>
    </div>
    <p class="max-w-2xl text-body-sm text-on-surface-variant">
      {text.profile.tags.intro(samplesShown)}
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
                  aria-label={text.profile.tags.newNameAria(tag)}
                  required
                  autofocus
                  maxlength={TAG_MAX}
                  bind:value={renaming.text}
                  onkeydown={(e) => e.key === 'Escape' && (renaming = null)}
                  class="{inputClass} min-w-0 flex-1 py-1.5"
                />
                <button type="submit" class="btn-primary py-1.5">{text.profile.tags.rename}</button>
                <button type="button" class="btn-outline py-1.5" onclick={() => (renaming = null)}>{text.common.cancel}</button>
              </form>
            {:else}
              <span class="flex min-w-0 flex-1 items-center gap-2">
                <span class="max-w-full truncate rounded-full px-2 py-0.5 text-label-caps {tagClass(tag)}" title={tag}>{tag}</span>
                <span class="shrink-0 text-body-sm text-outline">{recipeCount(count)}</span>
              </span>
              {#if builtIn}
                <span class="text-label-sm text-outline">{text.profile.tags.builtIn}</span>
              {:else}
                <span role="radiogroup" aria-label={text.profile.tags.colourAria(tag)} class="flex items-center gap-1.5">
                  {#each TONES as tone (tone)}
                    {@const on = settings.tagColors[tag] === tone}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={tagColourName(tone)}
                      title={tagColourName(tone)}
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
                    aria-label={text.profile.tags.renameAria(tag)}
                    class="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                    onclick={() => (renaming = { from: tag, text: tag })}
                  >
                    <Icon name="edit" class="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label={text.profile.tags.deleteAria(tag)}
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
        {text.profile.tags.none}
      </p>
    {/if}

    <div class="flex items-start justify-between gap-4">
      <span class="text-body-sm text-on-surface-variant">{text.profile.tags.resetHint}</span>
      <button type="button" class="btn-outline shrink-0 py-2" onclick={resetColors}>{text.profile.tags.resetColours}</button>
    </div>
  </section>

  <!-- This device only -->
  <section class="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-card" aria-labelledby="device-heading">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="device-heading" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
        <Icon name="devices" class="text-[20px] text-primary" /> {text.profile.device.title}
      </h2>
      <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">{text.profile.badges.notSynced}</span>
    </div>

    <!-- One card per group of related options. -->
    <div class="flex flex-col gap-3">
      <div class="{deviceCard}">
        {@render cardHeading('print', text.profile.device.printing.title, text.profile.device.printing.hint)}
        <PrintOptionsFields bind:draft={print} rowClass="max-w-md" />
      </div>

      <div class="{deviceCard} gap-2" id="storage">
        {@render cardHeading('storage', text.profile.storage.title)}
        {#if overBudget}
          <p class="text-body-sm text-on-surface-variant">
            {text.profile.storage.overBudget(sizeText(used), sizeText(STORAGE_BUDGET))}
          </p>
        {:else}
          <p class="text-body-sm text-on-surface-variant">
            {text.profile.storage.used(sizeText(used), sizeText(STORAGE_BUDGET))}
          </p>
          <div class="h-2 max-w-md overflow-hidden rounded-full bg-surface-container-high" role="meter" aria-label={text.profile.storage.meterAria} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(usedShare * 100)}>
            <div class="h-full rounded-full {storageState.unsaved || usedShare >= NEARLY_FULL ? 'bg-secondary' : 'bg-primary'}" style="width: {Math.max(2, usedShare * 100)}%"></div>
          </div>
        {/if}
        {#if storageState.unsaved}
          <p class="flex items-start gap-2 text-body-sm text-secondary">
            <Icon name="warning" class="mt-0.5 text-[16px]" />
            <span>{@html text.profile.storage.outOfSpace(synced)}</span>
          </p>
        {:else if usedShare >= NEARLY_FULL && !overBudget}
          <p class="flex items-start gap-2 text-body-sm text-secondary">
            <Icon name="warning" class="mt-0.5 text-[16px]" />
            <span>{@html text.profile.storage.nearlyFull}</span>
          </p>
        {/if}
        {#if pendingPhotos.length}
          <p class="text-body-sm text-on-surface-variant">
            {text.profile.storage.photosWaiting(pendingPhotos.length, sizeText(pendingPhotoSize))}
            {synced ? text.profile.storage.photosUpload : text.profile.storage.photosConnect(pendingPhotos.length)}
          </p>
        {/if}
        {#if storageState.persisted === true}
          <p class="text-body-sm text-on-surface-variant">{text.profile.storage.persisted}</p>
        {:else if storageState.persisted === false}
          <div class="flex items-start justify-between gap-4">
            <span class="text-body-sm text-on-surface-variant">{text.profile.storage.notPersisted}</span>
            <button type="button" class="btn-outline shrink-0 py-2" onclick={askToKeep}>{text.profile.storage.askToKeep}</button>
          </div>
        {/if}
      </div>

      <div class="{deviceCard}">
        {@render cardHeading('menu_book', text.profile.device.catalog.title)}
        <div class="-mb-3 divide-y divide-outline-variant/40">
          {@render switchRow(
            devicePrefs.hidePlanned,
            text.profile.device.catalog.hidePlanned,
            text.profile.device.catalog.hidePlannedHint,
            setHidePlanned,
          )}
          {@render switchRow(
            devicePrefs.hideRecent,
            text.profile.device.catalog.hideRecent,
            text.profile.device.catalog.hideRecentHint(RECENT_DAYS),
            setHideRecent,
          )}
        </div>
      </div>

      <div class="{deviceCard} gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4" id="export">
        <div class="flex flex-col">
          {@render cardHeading('download', text.profile.device.export.title)}
          <p class="text-body-sm text-on-surface-variant">
            {text.profile.device.export.description(exportContents)}
          </p>
        </div>
        <button type="button" class="btn-outline shrink-0 self-start py-2 sm:self-auto" onclick={exportData}>
          <Icon name="download" class="text-[16px]" /> {text.profile.device.export.button}
        </button>
      </div>
    </div>
  </section>

  <!-- Danger zone -->
  <section class="flex flex-col gap-3 rounded-2xl border-2 border-secondary/40 bg-surface-container-lowest p-5" aria-labelledby="danger-heading">
    <h2 id="danger-heading" class="flex items-center gap-2 font-display text-headline-sm text-secondary">
      <Icon name="warning" class="text-[20px]" /> {text.profile.danger.title}
    </h2>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-xl text-body-sm text-on-surface-variant">
        {@html text.profile.danger.description}
      </p>
      <button type="button" class="btn shrink-0 bg-secondary py-2.5 text-on-secondary hover:bg-[#b34728]" onclick={() => (confirmingWipe = true)}>
        <Icon name="delete_forever" class="text-[16px]" /> {text.profile.danger.button}
      </button>
    </div>
  </section>
</div>

{#if confirmingWipe}
  <WipeDataDialog onclose={() => (confirmingWipe = false)} />
{/if}


{#if editingIngredients}
  <IngredientsDialog onclose={() => (editingIngredients = false)} />
{/if}
