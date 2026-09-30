<script>
  import { onMount } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import {
    SCHEMA,
    sheets,
    defaultSettings,
    saveSheetsSettings,
    clearSheetsSettings,
    spreadsheetIdFrom,
    spreadsheetUrl,
    shortId,
    tabNameError,
  } from '../lib/sheets.svelte.js';
  import { starterWorkbook } from '../lib/sheetsTemplate.js';
  import { downloadBlob } from '../lib/xlsx.js';
  import { recipes } from '../lib/recipes.svelte.js';
  import { goBack, navigate } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  // Edits happen on a draft; Save commits it, Cancel / close discards it.
  let draft = $state(structuredClone($state.snapshot(sheets)));
  /** @type {HTMLElement} */
  let dialog;

  const spreadsheetId = $derived(spreadsheetIdFrom(draft.spreadsheet));
  const urlError = $derived(draft.spreadsheet.trim() !== '' && !spreadsheetId);

  const tabKeys = $derived(
    /** @type {('weeklyPlan' | 'recipes' | 'provisions')[]} */ (
      draft.syncProvisions ? ['weeklyPlan', 'recipes', 'provisions'] : ['weeklyPlan', 'recipes']
    ),
  );
  const tabErrors = $derived(
    Object.fromEntries(
      tabKeys.map((key) => [
        key,
        tabNameError(
          draft.tabs[key],
          tabKeys.filter((k) => k !== key).map((k) => draft.tabs[k]),
        ),
      ]),
    ),
  );
  const tabsValid = $derived(Object.values(tabErrors).every((e) => !e));

  const comparable = ({ savedAt, ...rest }) => JSON.stringify(rest);
  const dirty = $derived(comparable($state.snapshot(draft)) !== comparable($state.snapshot(sheets)));
  const checkedTabs = $derived(Object.keys(sheets.schemaCheck ?? {}).length);

  onMount(() => {
    dialog.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = overflow);
  });

  const close = () => goBack('/');

  function save() {
    if (urlError || !tabsValid) return;
    draft.spreadsheet = spreadsheetId ?? '';
    saveSheetsSettings($state.snapshot(draft));
    showToast('Sheets settings saved on this device.');
    close();
  }

  function clearSaved() {
    const previous = $state.snapshot(sheets);
    clearSheetsSettings();
    draft = defaultSettings();
    showToast('Saved Sheets settings cleared.', {
      label: 'Undo',
      run: () => {
        saveSheetsSettings(previous);
        draft = structuredClone(previous);
      },
    });
  }

  function exportTemplate() {
    downloadBlob(starterWorkbook($state.snapshot(draft)), 'MealCaster_Starter_Template.xlsx');
    showToast('Template downloaded — in Google Sheets use File → Import → Upload.');
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  const inputClass =
    'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet sectionLabel(text, aside = '')}
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h3 class="text-label-caps uppercase tracking-wider text-primary">{text}</h3>
    {#if aside}<span class="text-label-sm text-outline">{aside}</span>{/if}
  </div>
{/snippet}

{#snippet headerChips(columns)}
  <div class="flex flex-col gap-2">
    <span class="text-label-sm text-outline">Expected column headers</span>
    <div class="flex flex-wrap gap-1.5">
      {#each columns as column (column)}
        <span class="inline-flex items-center gap-1.5 rounded-md bg-surface-container-high px-2 py-1 text-label-sm text-on-surface-variant">
          <span class="h-1.5 w-1.5 rounded-full bg-primary-container"></span>{column}
        </span>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet tabInput(key, label)}
  <label class="flex flex-col gap-1">
    <span class="sr-only">{label} sheet tab name</span>
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body-sm text-outline">Sheet tab:</span>
      <input
        type="text"
        bind:value={draft.tabs[key]}
        maxlength="40"
        aria-invalid={tabErrors[key] ? 'true' : undefined}
        class="{inputClass} pl-[4.75rem] {tabErrors[key] ? 'border-secondary' : 'border-outline-variant'}"
      />
    </div>
    {#if tabErrors[key]}<span class="text-body-sm text-secondary">{tabErrors[key]}</span>{/if}
  </label>
{/snippet}

{#snippet tabCard(key, icon, title)}
  <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-on-surface">
        <Icon name={icon} class="text-[20px] text-primary" />
        <span class="text-label-md">{title}</span>
      </div>
      <span class="rounded-md bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
        {SCHEMA[key].length} columns
      </span>
    </div>
    {@render tabInput(key, title)}
    {@render headerChips(SCHEMA[key])}
  </div>
{/snippet}

{#snippet toggle(key, title, description)}
  <label class="flex cursor-pointer items-start justify-between gap-4 py-3">
    <span class="flex flex-col">
      <span class="text-label-md text-on-surface">{title}</span>
      <span class="text-body-sm text-on-surface-variant">{description}</span>
    </span>
    <span class="relative mt-0.5 inline-flex shrink-0">
      <input type="checkbox" role="switch" bind:checked={draft[key]} class="peer sr-only" />
      <span class="h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2"></span>
      <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform peer-checked:translate-x-5"></span>
    </span>
  </label>
{/snippet}

{#snippet directionOption(value, title, description, icon)}
  <label
    class="flex cursor-pointer items-start justify-between gap-3 rounded-lg p-3 transition-colors {draft.direction === value
      ? 'bg-surface-container-low ring-1 ring-primary-container/40'
      : 'hover:bg-surface-container-low'}"
  >
    <span class="flex items-start gap-3">
      <input type="radio" name="syncDirection" {value} bind:group={draft.direction} class="mt-1 h-4 w-4 accent-primary" />
      <span class="flex flex-col">
        <span class="text-label-md text-on-surface">{title}</span>
        <span class="text-body-sm text-on-surface-variant">{description}</span>
      </span>
    </span>
    <Icon name={icon} class="text-[20px] text-outline" />
  </label>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md"
  onclick={(e) => e.target === e.currentTarget && close()}
>
  <div
    bind:this={dialog}
    role="dialog"
    aria-modal="true"
    aria-labelledby="sheets-dialog-title"
    aria-describedby="sheets-dialog-subtitle"
    tabindex="-1"
    class="relative my-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-12px_rgba(28,28,24,0.25)] focus:outline-none"
  >
    <div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-primary via-primary-container to-secondary"></div>

    <!-- Header -->
    <div class="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-8 sm:pb-4 sm:pt-6">
      <div class="flex items-start gap-4">
        <div class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-sm sm:flex">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <rect fill="#107C41" height="18" rx="2" width="15" x="4.5" y="3" />
            <rect fill="#ffffff" height="2" rx="0.5" width="9" x="7.5" y="7" />
            <rect fill="#ffffff" height="2" rx="0.5" width="9" x="7.5" y="11" />
            <rect fill="#ffffff" height="2" rx="0.5" width="4" x="7.5" y="15" />
            <rect fill="#c5ead0" height="2" rx="0.5" width="3.5" x="13" y="15" />
          </svg>
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="sheets-dialog-title" class="font-display text-headline-sm text-on-surface sm:text-headline-md">
              Google Sheets Connection &amp; Settings
            </h2>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">
              <span class="h-1.5 w-1.5 rounded-full bg-outline"></span> Not connected
            </span>
          </div>
          <p id="sheets-dialog-subtitle" class="text-body-md text-on-surface-variant">
            Configure the two-sheet database for your weekly meal plans and custom recipes.
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Close settings"
        class="shrink-0 rounded-lg p-2 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        onclick={close}
      >
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <!-- Body -->
    <div class="flex flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-8">
      <!-- 01 Account & spreadsheet -->
      <section class="flex flex-col gap-3" aria-label="Account and target spreadsheet">
        {@render sectionLabel('01. Account & Target Spreadsheet', 'Google sign-in not set up yet')}
        <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-card">
          <div class="flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low/60 p-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-outline">
                <Icon name="person" class="text-[20px]" />
              </span>
              <div class="flex flex-col">
                <span class="text-label-md text-on-surface">Google account</span>
                <span class="text-body-sm text-outline">Sign-in arrives with live sync — until then everything stays on this device.</span>
              </div>
            </div>
            <button type="button" class="btn-outline shrink-0 self-start sm:self-auto" disabled title="Google sign-in isn’t available yet">
              <Icon name="login" class="text-[16px]" /> Sign in with Google
            </button>
          </div>

          <div class="flex items-start gap-3">
            <span class="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary sm:flex">
              <Icon name="description" class="text-[24px]" />
            </span>
            <label class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-label-md text-on-surface">Target spreadsheet</span>
              <input
                type="text"
                inputmode="url"
                autocomplete="off"
                spellcheck="false"
                bind:value={draft.spreadsheet}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                aria-invalid={urlError ? 'true' : undefined}
                aria-describedby="spreadsheet-hint"
                class="{inputClass} {urlError ? 'border-secondary' : 'border-outline-variant'}"
              />
              <span id="spreadsheet-hint" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">
                {#if urlError}
                  <span class="text-secondary">That doesn’t look like a Google Sheets link or spreadsheet ID.</span>
                {:else if spreadsheetId}
                  <span class="text-on-surface-variant">ID: {shortId(spreadsheetId)}</span>
                  <span class="text-outline">•</span>
                  <a href={spreadsheetUrl(spreadsheetId)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary-container">
                    Open in Google Sheets <Icon name="open_in_new" class="text-[14px]" />
                  </a>
                {:else}
                  <span class="text-outline">Paste the link from your browser’s address bar while the sheet is open.</span>
                {/if}
              </span>
            </label>
          </div>

          <div class="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-label-sm text-on-surface-variant">
            <Icon name={spreadsheetId ? 'link' : 'link_off'} class="text-[16px] {spreadsheetId ? 'text-primary' : 'text-outline'}" />
            {spreadsheetId
              ? 'Spreadsheet linked — access is verified once Google sign-in is enabled.'
              : 'No spreadsheet linked yet.'}
          </div>
        </div>

        <!-- Starter template -->
        <div class="flex flex-col gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/60 text-primary">
              <Icon name="table_chart" class="text-[20px]" />
            </span>
            <div class="flex max-w-sm flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-label-md text-on-surface">Starting with a new spreadsheet?</span>
                <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">Ready-to-use</span>
              </div>
              <p class="text-body-sm text-on-surface-variant">
                Export a template with your {recipes.length} recipes, planned dinners{draft.syncProvisions ? ' and grocery list' : ''} already filled in,
                then import it into a blank Google Sheet (File → Import → Upload).
              </p>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" class="btn-outline py-2">
              <Icon name="add" class="text-[16px]" /> Open Blank Sheet
            </a>
            <button
              type="button"
              class="btn bg-primary-fixed/70 py-2 text-primary hover:bg-primary-fixed"
              disabled={!tabsValid}
              title={tabsValid ? undefined : 'Fix the tab names first'}
              onclick={exportTemplate}
            >
              <Icon name="download" class="text-[16px]" /> Export Template (.xlsx)
            </button>
          </div>
        </div>
      </section>

      <!-- 02 Tab mapping -->
      <section class="flex flex-col gap-3" aria-label="Tab mapping">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-label-caps uppercase tracking-wider text-primary">02. Two-Sheet Tab Mapping</h3>
          <label class="flex cursor-pointer items-center gap-2 text-label-sm text-on-surface-variant">
            <input type="checkbox" bind:checked={draft.autoDetect} class="h-4 w-4 rounded accent-primary" />
            Auto-detect schema headers
          </label>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          {@render tabCard('weeklyPlan', 'calendar_month', 'Weekly Meals Tab')}
          {@render tabCard('recipes', 'menu_book', 'Recipe Catalog Tab')}
        </div>
        <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
          <label class="flex cursor-pointer items-start gap-3">
            <input type="checkbox" bind:checked={draft.syncProvisions} class="mt-0.5 h-4 w-4 rounded accent-primary" />
            <span class="flex flex-col">
              <span class="flex items-center gap-2 text-label-md text-on-surface">
                <Icon name="shopping_basket" class="text-[18px] text-secondary" /> Grocery List Tab
                <span class="rounded-md bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">Optional</span>
              </span>
              <span class="text-body-sm text-on-surface-variant">Also keep the weekly grocery &amp; provisions list in a third tab.</span>
            </span>
          </label>
          {#if draft.syncProvisions}
            <div class="grid gap-3 md:grid-cols-2">
              {@render tabInput('provisions', 'Grocery List Tab')}
              {@render headerChips(SCHEMA.provisions)}
            </div>
          {/if}
        </div>
        <div class="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed/70 text-secondary">
              <Icon name="difference" class="text-[20px]" />
            </span>
            <div class="flex flex-col gap-0.5">
              <span class="text-label-md text-on-surface">Column headers</span>
              <span class="text-body-sm text-on-surface-variant">
                {checkedTabs
                  ? `Mapping saved for ${checkedTabs} tab${checkedTabs === 1 ? '' : 's'}. Check again after renaming or adding columns.`
                  : 'Renamed or moved columns in your sheet? Check its headers against what MealCaster expects.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="btn-outline shrink-0 self-start py-2 sm:self-auto"
            disabled={dirty}
            title={dirty ? 'Save or cancel your changes first' : undefined}
            onclick={() => navigate('/sheets-sync/columns')}
          >
            <Icon name="fact_check" class="text-[16px]" /> Check Column Headers
          </button>
        </div>
      </section>

      <!-- 03 Sync strategy -->
      <section class="flex flex-col gap-3" aria-label="Sync strategy">
        {@render sectionLabel('03. Sync Strategy & Automation', 'Applies once connected')}
        <div class="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 shadow-card sm:p-4">
          <div class="grid gap-2 md:grid-cols-2" role="radiogroup" aria-label="Sync direction">
            {@render directionOption('bidirectional', 'Bidirectional Sync', 'Changes in Sheets or MealCaster reflect in both', 'sync_alt')}
            {@render directionOption('pushOnly', 'MealCaster → Sheets', 'Google Sheets as a read-only historical export', 'arrow_forward')}
          </div>
          <div class="divide-y divide-surface-container-high px-1">
            {@render toggle('instantPush', 'Instant Reactive Push', 'Update connected rows immediately whenever a dinner or custom recipe changes. Off means syncing only when you press Sync.')}
            {@render toggle('snapshots', 'Automatic Version Snapshot', 'Create a date-stamped backup tab before batch updates.')}
          </div>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="flex flex-col-reverse gap-3 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <div>
        {#if sheets.savedAt}
          <button type="button" class="btn px-0 text-body-md text-secondary hover:underline" onclick={clearSaved}>
            <Icon name="link_off" class="text-[18px]" /> Clear Saved Settings
          </button>
        {/if}
      </div>
      <div class="flex items-center justify-end gap-2">
        <button type="button" class="btn px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-high" onclick={close}>Cancel</button>
        <button
          type="button"
          class="btn-primary px-5 py-2 text-body-md"
          disabled={!dirty || urlError || !tabsValid}
          onclick={save}
        >
          <Icon name="check" class="text-[18px]" /> Save Settings
        </button>
      </div>
    </div>
  </div>
</div>
