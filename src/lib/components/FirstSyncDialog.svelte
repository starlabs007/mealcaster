<script>
  // First sync with data both in the spreadsheet and on this device: merge the
  // two (the sheet wins where both have the same item) or keep only the sheet.
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { sheets } from '../sheets.svelte.js';
  import { syncState, syncNow, cancelFirstSync } from '../sync/sync.svelte.js';

  /** @type {HTMLElement} */
  let dialog;
  let choice = $state(/** @type {'merge' | 'sheetOnly'} */ ('merge'));

  const counts = $derived(syncState.choice);
  const rows = $derived(
    [
      { key: 'recipes', label: 'Recipes', icon: 'menu_book' },
      { key: 'weeklyPlan', label: 'Planned dinners', icon: 'calendar_month' },
      sheets.syncProvisions && { key: 'provisions', label: 'Grocery lines', icon: 'shopping_basket' },
      { key: 'settings', label: 'Settings', icon: 'tune' },
    ].filter(Boolean),
  );

  onMount(() => dialog.focus());

  function go() {
    syncNow({ choice });
  }
</script>

<div class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md">
  <div
    bind:this={dialog}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="first-sync-title"
    aria-describedby="first-sync-subtitle"
    tabindex="-1"
    class="relative my-4 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-12px_rgba(28,28,24,0.25)] focus:outline-none"
  >
    <div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-primary via-primary-container to-secondary"></div>
    <div class="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6">
      <div class="flex items-start gap-4">
        <span class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/70 text-primary sm:flex">
          <Icon name="merge" class="text-[24px]" />
        </span>
        <div class="flex flex-col gap-1">
          <h2 id="first-sync-title" class="font-display text-headline-sm text-on-surface sm:text-headline-md">
            Combine with “{sheets.spreadsheetName || 'your spreadsheet'}”?
          </h2>
          <p id="first-sync-subtitle" class="text-body-md text-on-surface-variant">
            The spreadsheet and this device both have data. Choose what happens on this first sync.
          </p>
        </div>
      </div>

      {#if counts}
        <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
          <div class="grid grid-cols-[1fr_auto_auto] gap-x-6 bg-surface-container-low px-4 py-2 text-label-caps uppercase text-on-surface-variant">
            <span></span><span class="text-right">Spreadsheet</span><span class="text-right">This device</span>
          </div>
          {#each rows as row (row.key)}
            <div class="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-t border-surface-container-high px-4 py-2.5 text-body-md">
              <span class="flex items-center gap-2 text-on-surface"><Icon name={row.icon} class="text-[18px] text-primary" /> {row.label}</span>
              <span class="w-20 text-right tabular-nums text-on-surface">{counts.sheet[row.key]}</span>
              <span class="w-20 text-right tabular-nums text-on-surface">{counts.device[row.key]}</span>
            </div>
          {/each}
        </div>
      {/if}

      <div class="flex flex-col gap-2" role="radiogroup" aria-label="First sync">
        {#each [
          { value: 'merge', title: 'Merge both', text: 'Add what’s only on this device to the spreadsheet. Where both have the same recipe, dinner or grocery line, the spreadsheet’s version is kept.', icon: 'join' },
          { value: 'sheetOnly', title: 'Use the spreadsheet only', text: 'Replace this device’s recipes, plan and grocery list with the spreadsheet’s. Anything only on this device is removed.', icon: 'cloud_download' },
        ] as option (option.value)}
          <label
            class="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors {choice === option.value
              ? 'bg-surface-container-low ring-1 ring-primary-container/40'
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

      {#if syncState.error}
        <p class="text-body-sm text-secondary" role="alert">{syncState.error}</p>
      {/if}
    </div>

    <div class="flex flex-col-reverse gap-2 border-t border-surface-container-high bg-surface-container-low px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-7">
      <button type="button" class="btn px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-high" disabled={syncState.busy} onclick={cancelFirstSync}>
        Don’t Connect
      </button>
      <button
        type="button"
        class="btn px-5 py-2 text-body-md shadow-sm {choice === 'sheetOnly' ? 'bg-secondary text-on-secondary hover:bg-secondary/90' : 'btn-primary'}"
        disabled={syncState.busy}
        onclick={go}
      >
        <Icon name={syncState.busy ? 'progress_activity' : 'sync'} class="text-[18px] {syncState.busy ? 'animate-spin' : ''}" />
        {syncState.busy ? 'Syncing…' : choice === 'merge' ? 'Merge & Sync' : 'Replace This Device'}
      </button>
    </div>
  </div>
</div>
