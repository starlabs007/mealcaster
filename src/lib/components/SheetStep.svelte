<script>
  // Connection step 2: the spreadsheet. Create one, choose one from Drive, or download an empty
  // template to set one up by hand. Tab names (advanced) are a draft saved when leaving the step
  // by any of its actions: Create / Choose read them, and the sync uses them.
  import Icon from './Icon.svelte';
  import { SCHEMA, sheets, defaultSettings, saveSheetsSettings, clearSheetsSettings, spreadsheetUrl, shortId, tabNameError } from '../sheets.svelte.js';
  import { googleConfigured } from '../google/config.js';
  import { syncPhase, chooseSpreadsheet, createNewSpreadsheet } from '../sync/sync.svelte.js';
  import { emptyWorkbook } from '../sheetsTemplate.js';
  import { downloadBlob } from '../xlsx.js';
  import { showToast } from '../toast.svelte.js';

  /** @type {{ onback: () => void, onnext: () => void }} */
  let { onback, onnext } = $props();

  const pick = () => structuredClone({ tabs: $state.snapshot(sheets.tabs), syncProvisions: sheets.syncProvisions });
  let draft = $state(pick());
  let working = $state(false);
  const busy = $derived(working || syncPhase() === 'syncing');
  // Firefox's Enhanced Tracking Protection blocks the Google Picker frame's sign-in cookies:
  // it stays blank or says the API developer key is invalid. Pages can't tell, so always hint.
  const firefox = /firefox/i.test(navigator.userAgent);

  // Required tabs, then the optional grocery list tab.
  const REQUIRED = /** @type {const} */ ([
    { key: 'weeklyPlan', label: 'Weekly meals', icon: 'calendar_month' },
    { key: 'recipes', label: 'Recipes', icon: 'menu_book' },
    { key: 'settings', label: 'Settings', icon: 'tune' },
  ]);
  const GROCERY = /** @type {const} */ ({ key: 'provisions', label: 'Grocery list', icon: 'shopping_basket' });
  const used = $derived([...REQUIRED.map((t) => t.key), ...(draft.syncProvisions ? [GROCERY.key] : [])]);

  // Name for a new spreadsheet; shown in the create card, or on demand once one is linked.
  let newName = $state('MealCaster');
  let creating = $state(false);
  const tabErrors = $derived(
    Object.fromEntries(used.map((key) => [key, tabNameError(draft.tabs[key], used.filter((k) => k !== key).map((k) => draft.tabs[k]))])),
  );
  const tabsValid = $derived(Object.values(tabErrors).every((e) => !e));
  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(pick()));
  let advancedOpen = $state(false);

  /** Saves the tab names; false (and the section opened) if they need fixing. */
  function commit() {
    if (!tabsValid) {
      advancedOpen = true;
      showToast('Fix the tab names first.');
      return false;
    }
    if (dirty) saveSheetsSettings({ ...$state.snapshot(sheets), ...$state.snapshot(draft) });
    return true;
  }

  /** @param {() => Promise<boolean>} action */
  async function link(action) {
    if (!commit()) return;
    working = true;
    try {
      if (await action()) onnext();
    } finally {
      working = false;
    }
  }

  function next() {
    if (commit()) onnext();
  }

  function downloadTemplate() {
    if (!tabsValid) return commit();
    downloadBlob(emptyWorkbook($state.snapshot(draft)), 'MealCaster_Template.xlsx');
    showToast('Template downloaded.');
  }

  // Not connected: forget every saved Sheets setting (tab names, sync strategy, last account, column mapping).
  function clearSaved() {
    const previous = $state.snapshot(sheets);
    clearSheetsSettings();
    draft = { tabs: defaultSettings().tabs, syncProvisions: defaultSettings().syncProvisions };
    showToast('Saved Sheets settings cleared.', {
      label: 'Undo',
      run: () => {
        saveSheetsSettings(previous);
        draft = pick();
      },
    });
  }

  const inputClass =
    'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
</script>

{#snippet createForm()}
  <form
    class="flex flex-col gap-2"
    onsubmit={(e) => {
      e.preventDefault();
      if (newName.trim()) link(() => createNewSpreadsheet(newName));
    }}
  >
    <label class="flex flex-col gap-1">
      <span class="text-label-sm text-on-surface-variant">Spreadsheet name</span>
      <input type="text" bind:value={newName} maxlength="100" required class="{inputClass} border-outline-variant" />
    </label>
    <button type="submit" class="btn-primary w-fit py-2" disabled={busy || !googleConfigured || !newName.trim()}>
      <Icon name="add" class="text-[16px]" /> Create New Sheet
    </button>
  </form>
{/snippet}

{#snippet tabInput(tab)}
  <div class="flex flex-col gap-1">
    <input
      id="tab-{tab.key}"
      type="text"
      bind:value={draft.tabs[tab.key]}
      maxlength="40"
      aria-label="{tab.label} tab name"
      aria-invalid={tabErrors[tab.key] ? 'true' : undefined}
      title="{SCHEMA[tab.key].length} columns: {SCHEMA[tab.key].join(', ')}"
      class="{inputClass} {tabErrors[tab.key] ? 'border-secondary' : 'border-outline-variant'}"
    />
    {#if tabErrors[tab.key]}<span class="text-body-sm text-secondary">{tabErrors[tab.key]}</span>{/if}
  </div>
{/snippet}

<div class="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-8">
  {#if sheets.spreadsheet}
    <div class="flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/70 text-primary">
        <Icon name="table_chart" class="text-[22px]" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-label-caps uppercase text-on-surface-variant">Linked spreadsheet</span>
        <span class="truncate text-label-md text-on-surface">{sheets.spreadsheetName || shortId(sheets.spreadsheet)}</span>
        <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="inline-flex w-fit items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-container">
          Open in Google Sheets <Icon name="open_in_new" class="text-[14px]" />
        </a>
      </div>
    </div>
    {#if googleConfigured}
      {#if creating}
        <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
          <span class="text-label-md text-on-surface">Create a new spreadsheet</span>
          {@render createForm()}
          <button type="button" class="btn w-fit px-0 text-body-sm text-on-surface-variant hover:underline" onclick={() => (creating = false)}>Cancel</button>
        </div>
      {:else}
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-outline py-2" disabled={busy} onclick={() => link(chooseSpreadsheet)}>
            <Icon name="folder_open" class="text-[16px]" /> Choose a Different One
          </button>
          <button type="button" class="btn-outline py-2" disabled={busy} onclick={() => (creating = true)}>
            <Icon name="add" class="text-[16px]" /> Create a New One
          </button>
        </div>
      {/if}
    {/if}
  {:else}
    <div class="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
        <div class="flex items-center gap-2">
          <Icon name="add_circle" class="text-[22px] text-primary" />
          <span class="text-label-md text-on-surface">Create a new spreadsheet</span>
        </div>
        <p class="text-body-sm text-on-surface-variant">MealCaster makes it in your Google Drive with the right tabs. The easiest start.</p>
        {@render createForm()}
      </div>
      <!-- Either one: "or" between the cards (beside them from sm, between them below). -->
      <div class="flex items-center gap-3 sm:flex-col" aria-hidden="true">
        <span class="h-px flex-1 bg-outline-variant/60 sm:h-auto sm:w-px"></span>
        <span class="text-label-caps uppercase text-on-surface-variant">or</span>
        <span class="h-px flex-1 bg-outline-variant/60 sm:h-auto sm:w-px"></span>
      </div>
      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
        <div class="flex items-center gap-2">
          <Icon name="folder_open" class="text-[22px] text-primary" />
          <span class="text-label-md text-on-surface">Use an existing spreadsheet</span>
        </div>
        <p class="flex-1 text-body-sm text-on-surface-variant">Pick one from your Drive — for example one another device already syncs with.</p>
        <button type="button" class="btn-outline w-fit py-2" disabled={busy || !googleConfigured} onclick={() => link(chooseSpreadsheet)}>
          <Icon name="folder_open" class="text-[16px]" /> Choose from Drive
        </button>
      </div>
    </div>
  {/if}

  {#if googleConfigured && firefox}
    <p class="flex items-start gap-2 text-body-sm text-on-surface-variant">
      <Icon name="warning" class="icon-filled shrink-0 text-[20px] text-tertiary" />
      <span>
        <strong class="font-bold text-secondary">Using Firefox?</strong> If the Google Drive window stays blank or says the API
        developer key is invalid, click the shield icon in the address bar, turn off Enhanced Tracking Protection for this site, then
        reload.
      </span>
    </p>
  {/if}

  <!-- Empty template -->
  <div class="flex flex-col gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-start gap-3">
      <Icon name="description" class="mt-0.5 text-[20px] text-primary" />
      <p class="text-body-sm text-on-surface-variant">
        <span class="text-label-md text-on-surface">Setting one up yourself?</span> Download an empty template with just the header rows,
        upload it to Google Drive, open it as a Google Sheet, then choose it here.
      </p>
    </div>
    <button type="button" class="btn shrink-0 self-start bg-primary-fixed/70 py-2 text-primary hover:bg-primary-fixed sm:self-auto" onclick={downloadTemplate}>
      <Icon name="download" class="text-[16px]" /> Empty Template (.xlsx)
    </button>
  </div>

  <!-- Tab names -->
  <details bind:open={advancedOpen} class="group rounded-xl bg-surface-container-lowest shadow-card">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl p-4 [&::-webkit-details-marker]:hidden">
      <span class="flex flex-col">
        <span class="text-label-md text-on-surface">Tab names <span class="text-on-surface-variant">(advanced)</span></span>
        <span class="text-body-sm text-on-surface-variant">
          {used.map((k) => draft.tabs[k].trim() || '—').join(' · ')}{tabsValid ? '' : ' — needs fixing'}
        </span>
      </span>
      <Icon name="expand_more" class="text-[20px] text-outline transition-transform group-open:rotate-180" />
    </summary>
    <div class="flex flex-col gap-3 border-t border-surface-container-high p-4">
      <p class="text-body-sm text-on-surface-variant">Only change these to match a spreadsheet that already uses other names. MealCaster adds a tab if it’s missing.</p>
      {#each REQUIRED as tab (tab.key)}
        <div class="grid items-start gap-1.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
          <label for="tab-{tab.key}" class="flex items-center gap-2 text-label-md text-on-surface sm:pt-2">
            <Icon name={tab.icon} class="text-[18px] text-primary" /> {tab.label}
          </label>
          {@render tabInput(tab)}
        </div>
      {/each}

      <!-- Optional tab, set apart from the required ones. -->
      <div class="flex flex-col gap-3 rounded-lg border border-dashed border-outline-variant p-3">
        <span class="text-label-caps uppercase tracking-wider text-on-surface-variant">Optional</span>
        <label class="flex cursor-pointer items-start gap-3">
          <input type="checkbox" bind:checked={draft.syncProvisions} class="mt-0.5 h-4 w-4 rounded accent-primary" />
          <span class="flex flex-col">
            <span class="flex items-center gap-2 text-label-md text-on-surface">
              <Icon name={GROCERY.icon} class="text-[18px] text-primary" /> {GROCERY.label}
            </span>
            <span class="text-body-sm text-on-surface-variant">Also keep the weekly grocery list in its own tab.</span>
          </span>
        </label>
        {#if draft.syncProvisions}
          <div class="grid items-start gap-1.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
            <label for="tab-{GROCERY.key}" class="text-label-md text-on-surface-variant sm:pt-2">Tab name</label>
            {@render tabInput(GROCERY)}
          </div>
        {/if}
      </div>

      {#if sheets.spreadsheet && dirty}
        <p class="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" class="shrink-0 text-[18px] text-tertiary" />
          A renamed tab syncs as a new one: MealCaster fills the tab with the new name (adding it if needed) and leaves the old tab as it is.
        </p>
      {/if}
      {#if sheets.savedAt && !sheets.spreadsheet}
        <button type="button" class="btn w-fit px-0 text-body-sm text-secondary hover:underline" onclick={clearSaved}>
          <Icon name="restart_alt" class="text-[16px]" /> Clear Saved Settings
        </button>
      {/if}
    </div>
  </details>
</div>

<div class="mt-auto flex items-center justify-between gap-2 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:px-8 sm:py-4">
  <button type="button" class="btn px-3 py-2 text-body-md text-on-surface hover:bg-surface-container-high" onclick={onback}>
    <Icon name="arrow_back" class="text-[18px]" /> Back
  </button>
  {#if sheets.spreadsheet}
    <button type="button" class="btn-primary px-5 py-2 text-body-md" disabled={busy || !tabsValid} onclick={next}>
      Continue <Icon name="arrow_forward" class="text-[18px]" />
    </button>
  {/if}
</div>
