<script>
  // First sync with data both in the spreadsheet and on this device (connection step 3): merge the
  // two (the sheet wins where both have the same item) or keep only the sheet. In backup sync
  // (Sheets as Backup) it instead confirms that the spreadsheet's rows will be overwritten or removed
  // to match the device; restoring is offered only if the device is empty. Nothing is written before
  // an answer. "Don't Connect" unlinks the spreadsheet (staying signed in) to choose another.
  import Icon from './Icon.svelte';
  import { sheets } from '../sheets.svelte.js';
  import { syncState, syncNow, cancelFirstSync, restoreFromSheet } from '../sync/sync.svelte.js';

  /** @type {{ oncancel: () => void }} */
  let { oncancel } = $props();

  let choice = $state(/** @type {'merge' | 'sheetOnly'} */ ('merge'));

  const counts = $derived(syncState.choice);
  const backup = $derived(Boolean(counts?.backup));
  const deviceEmpty = $derived(!counts || counts.device.ingredients + counts.device.recipes + counts.device.weeklyPlan + counts.device.provisions === 0);
  const rows = $derived(
    [
      { key: 'ingredients', label: 'Ingredients', icon: 'grocery' },
      { key: 'recipes', label: 'Recipes', icon: 'menu_book' },
      { key: 'weeklyPlan', label: 'Planned dinners', icon: 'calendar_month' },
      sheets.syncProvisions && { key: 'provisions', label: 'Grocery lines', icon: 'shopping_basket' },
      { key: 'settings', label: 'Settings', icon: 'tune' },
    ].filter(Boolean),
  );

  function go() {
    syncNow({ choice: backup ? 'confirm' : choice });
  }

  function cancel() {
    cancelFirstSync();
    oncancel();
  }
</script>

<section class="flex flex-col gap-4 rounded-xl bg-[#ffdead]/40 p-4 ring-1 ring-tertiary/30" aria-labelledby="first-sync-title" role="alert">
  <div class="flex items-start gap-3">
    <Icon name={backup ? 'warning' : 'merge'} class="mt-0.5 text-[22px] text-tertiary" />
    <div class="flex flex-col gap-1">
      <h3 id="first-sync-title" class="text-label-md text-on-surface">
        {backup ? (deviceEmpty ? 'Empty' : 'Overwrite') : 'Combine with'} “{sheets.spreadsheetName || 'your spreadsheet'}”{backup ? ' to match this device?' : '?'}
      </h3>
      <p class="text-body-sm text-on-surface-variant">
        {#if backup}
          {#if deviceEmpty}
            This device has no ingredients, recipes, plan or grocery list, but the spreadsheet does.
          {:else}
            The spreadsheet already has data.
          {/if}
          In Sheets as Backup mode the spreadsheet is a copy of this device, so syncing will overwrite matching rows and delete the rest
          of what is listed under Spreadsheet.
          {#if deviceEmpty}To get that data onto this device instead, restore it: sync switches to Bidirectional.{/if}
        {:else}
          The spreadsheet and this device both have data. Choose what happens on this first sync.
        {/if}
      </p>
    </div>
  </div>

  {#if counts}
    <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
      <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 bg-surface-container-low px-4 py-2 text-label-caps uppercase text-on-surface-variant">
        <span></span><span class="text-right">Spreadsheet</span><span class="text-right">This device</span>
      </div>
      {#each rows as row (row.key)}
        <div class="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-t border-surface-container-high px-4 py-2 text-body-md">
          <span class="flex items-center gap-2 text-on-surface"><Icon name={row.icon} class="text-[18px] text-primary" /> {row.label}</span>
          <span class="w-20 text-right tabular-nums text-on-surface">{counts.sheet[row.key]}</span>
          <span class="w-20 text-right tabular-nums text-on-surface">{counts.device[row.key]}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if !backup}
    <div class="flex flex-col gap-2" role="radiogroup" aria-label="First sync">
      {#each [
        { value: 'merge', title: 'Merge both', text: 'Add what’s only on this device to the spreadsheet. Where both have the same recipe, dinner or grocery line, the spreadsheet’s version is kept.', icon: 'join' },
        { value: 'sheetOnly', title: 'Use the spreadsheet only', text: 'Replace this device’s ingredients, recipes, plan and grocery list with the spreadsheet’s. Anything only on this device is removed.', icon: 'cloud_download' },
      ] as option (option.value)}
        <label
          class="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-container-lowest p-3 transition-colors {choice === option.value
            ? 'ring-1 ring-primary-container/60'
            : 'hover:bg-surface-container-low'}"
        >
          <input type="radio" name="firstSync" value={option.value} bind:group={choice} class="mt-1 h-4 w-4 accent-primary" />
          <span class="flex flex-1 flex-col">
            <span class="text-label-md text-on-surface">{option.title}</span>
            <span class="text-body-sm text-on-surface-variant">{option.text}</span>
          </span>
          <Icon name={option.icon} class="text-[20px] text-outline" />
        </label>
      {/each}
    </div>
  {/if}

  {#if syncState.error}
    <p class="text-body-sm text-secondary">{syncState.error}</p>
  {/if}

  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
    <button type="button" class="btn px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-high" disabled={syncState.busy} onclick={cancel}>
      Don’t Connect
    </button>
    {#if backup && deviceEmpty}
      <button type="button" class="btn-outline px-4 py-2 text-body-md" disabled={syncState.busy} onclick={restoreFromSheet}>
        <Icon name="cloud_download" class="text-[18px]" /> Restore From Spreadsheet
      </button>
    {/if}
    <button
      type="button"
      class="btn px-5 py-2 text-body-md shadow-sm {backup || choice === 'sheetOnly' ? 'bg-secondary text-on-secondary hover:bg-secondary/90' : 'btn-primary'}"
      disabled={syncState.busy}
      onclick={go}
    >
      <Icon name={syncState.busy ? 'progress_activity' : 'sync'} class="text-[18px] {syncState.busy ? 'animate-spin' : ''}" />
      {syncState.busy ? 'Syncing…' : backup ? (deviceEmpty ? 'Empty Spreadsheet' : 'Overwrite Spreadsheet') : choice === 'merge' ? 'Merge & Sync' : 'Replace This Device'}
    </button>
  </div>
</section>
