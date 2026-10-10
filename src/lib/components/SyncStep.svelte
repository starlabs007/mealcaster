<script>
  // Connection step 3: what's connected, how it syncs (saved as soon as it changes), the first
  // sync and its choice, then status, Sync Now, column problems and Disconnect.
  import Icon from './Icon.svelte';
  import SyncStatus from './SyncStatus.svelte';
  import FirstSyncChoice from './FirstSyncChoice.svelte';
  import { disconnectPrompt } from './DisconnectDialog.svelte';
  import { sheets, saveSheetsSettings, spreadsheetUrl, shortId } from '../sheets.svelte.js';
  import { auth } from '../google/auth.svelte.js';
  import { syncState, syncPhase, syncFromClick, connect, initialized } from '../sync/sync.svelte.js';
  import { navigate } from '../router.svelte.js';
  import { showToast } from '../toast.svelte.js';

  /** @type {{ onback: () => void, go: (step: import('../sync/phase.js').ConnectionStep) => void, onclose: () => void }} */
  let { onback, go, onclose } = $props();

  const phase = $derived(syncPhase());
  const signedIn = $derived(Boolean(auth.token));
  const checkedTabs = $derived(Object.keys(sheets.schemaCheck ?? {}).length);

  /** @param {Partial<import('../sheets.svelte.js').SheetsSettings>} fields */
  const save = (fields) => saveSheetsSettings({ ...$state.snapshot(sheets), ...fields });

  // Switching to Sheets as Backup after the first sync rewrites the spreadsheet on the next pass: confirm it.
  let confirmBackup = $state(false);
  /** @param {'bidirectional' | 'pushOnly'} value */
  function chooseDirection(value) {
    confirmBackup = false;
    if (value === sheets.direction) return;
    if (value === 'pushOnly' && initialized()) confirmBackup = true;
    else save({ direction: value });
  }

  async function firstSync() {
    await syncFromClick();
    if (syncPhase() === 'synced') showToast(`Connected to “${sheets.spreadsheetName || 'your spreadsheet'}”.`);
  }

  const DIRECTIONS = [
    {
      value: 'bidirectional',
      title: 'Bidirectional Sync',
      text: 'Changes in Sheets or MealCaster reflect in both. If both changed the same row, the Google Sheet wins.',
      icon: 'sync_alt',
    },
    {
      value: 'pushOnly',
      title: 'Sheets as Backup',
      text: 'The sheet is an online backup that mirrors this device; edits made in the sheet are overwritten.',
      icon: 'arrow_forward',
    },
  ];
</script>

{#snippet summaryRow(icon, label, value, step, extra)}
  <div class="flex items-center gap-3 px-4 py-3">
    <Icon name={icon} class="text-[20px] text-primary" />
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="text-label-caps uppercase text-on-surface-variant">{label}</span>
      <span class="truncate text-body-md text-on-surface">{value}</span>
      {#if extra}{@render extra()}{/if}
    </div>
    <button type="button" class="btn shrink-0 px-2 py-1 text-body-sm text-primary hover:bg-surface-container-high" onclick={() => go(step)}>
      Change
    </button>
  </div>
{/snippet}

{#snippet openLink()}
  <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="inline-flex w-fit items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-container">
    Open in Google Sheets <Icon name="open_in_new" class="text-[14px]" />
  </a>
{/snippet}

<div class="flex flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-8">
  {#if !sheets.spreadsheet}
    <div class="flex flex-col items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      <p class="text-body-md text-on-surface-variant">No spreadsheet is linked yet, so everything is saved on this device.</p>
      <button type="button" class="btn-primary py-2" onclick={() => go('sheet')}>
        <Icon name="table_chart" class="text-[16px]" /> Choose a Spreadsheet
      </button>
    </div>
  {:else}
    <!-- What's connected -->
    <div class="divide-y divide-surface-container-high rounded-xl bg-surface-container-lowest shadow-card">
      {@render summaryRow('person', 'Google account', syncState.account?.email || sheets.accountEmail || (signedIn ? 'Signed in' : 'Signed out'), 'account')}
      {@render summaryRow('table_chart', 'Spreadsheet', sheets.spreadsheetName || shortId(sheets.spreadsheet), 'sheet', openLink)}
    </div>

    {#if phase === 'choose'}
      <FirstSyncChoice oncancel={() => go('sheet')} />
    {:else}
      <!-- How it syncs -->
      <section class="flex flex-col gap-2" aria-labelledby="sync-how">
        <h3 id="sync-how" class="text-label-caps uppercase tracking-wider text-primary">How to sync</h3>
        <div class="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 shadow-card">
          <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Sync direction">
            {#each DIRECTIONS as option (option.value)}
              {@const selected = (confirmBackup ? 'pushOnly' : sheets.direction) === option.value}
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors {selected
                  ? 'bg-surface-container-low ring-1 ring-primary-container/40'
                  : 'hover:bg-surface-container-low'}"
              >
                <input
                  type="radio"
                  name="syncDirection"
                  value={option.value}
                  checked={selected}
                  disabled={phase === 'syncing'}
                  onchange={() => chooseDirection(/** @type {any} */ (option.value))}
                  class="mt-1 h-4 w-4 accent-primary"
                />
                <span class="flex flex-1 flex-col">
                  <span class="text-label-md text-on-surface">{option.title}</span>
                  <span class="text-body-sm text-on-surface-variant">{option.text}</span>
                </span>
                <Icon name={option.icon} class="text-[20px] text-outline" />
              </label>
            {/each}
          </div>
          {#if confirmBackup}
            <div class="flex flex-col gap-3 rounded-lg bg-secondary-fixed/50 p-3" role="alert">
              <p class="flex items-start gap-2 text-body-sm text-on-surface">
                <Icon name="warning" class="shrink-0 text-[18px] text-secondary" />
                <span>
                  The next sync will make “{sheets.spreadsheetName || 'the spreadsheet'}” match this device: rows that differ are
                  overwritten and rows only in the spreadsheet are deleted, including edits made there by other devices.
                </span>
              </p>
              <div class="flex flex-wrap justify-end gap-2">
                <button type="button" class="btn px-3 py-1.5 text-body-sm text-on-surface hover:bg-surface-container-high" onclick={() => (confirmBackup = false)}>
                  Keep Bidirectional
                </button>
                <button
                  type="button"
                  class="btn bg-secondary px-3 py-1.5 text-body-sm text-on-secondary hover:bg-secondary/90"
                  onclick={() => {
                    confirmBackup = false;
                    save({ direction: 'pushOnly' });
                  }}
                >
                  Switch to Backup
                </button>
              </div>
            </div>
          {/if}
          <label class="flex cursor-pointer items-start justify-between gap-4 border-t border-surface-container-high px-1 pt-3">
            <span class="flex flex-col">
              <span class="text-label-md text-on-surface">Instant Reactive Push</span>
              <span class="text-body-sm text-on-surface-variant">
                Push changes a moment after you make them. Off means syncing only on connect, when you return to the app, or when you
                press Sync Now.
              </span>
            </span>
            <span class="relative mt-0.5 inline-flex shrink-0">
              <input
                type="checkbox"
                role="switch"
                checked={sheets.instantPush}
                onchange={(e) => save({ instantPush: e.currentTarget.checked })}
                class="peer sr-only"
              />
              <span class="h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2"></span>
              <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform peer-checked:translate-x-5"></span>
            </span>
          </label>
        </div>
      </section>

      <!-- Sync -->
      <section class="flex flex-col gap-2" aria-labelledby="sync-now">
        <h3 id="sync-now" class="text-label-caps uppercase tracking-wider text-primary">Sync</h3>
        <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <SyncStatus variant="line" />
          <div class="shrink-0">
            {#if phase === 'signedOut'}
              <button type="button" class="btn-primary py-2" onclick={connect}><Icon name="login" class="text-[16px]" /> Reconnect</button>
            {:else if phase === 'pending'}
              <button type="button" class="btn-primary py-2" onclick={firstSync}><Icon name="sync" class="text-[16px]" /> Start Syncing</button>
            {:else if phase === 'conflict'}
              <button type="button" class="btn bg-secondary py-2 text-on-secondary hover:bg-secondary/90" onclick={() => navigate('/sheets-sync/columns')}>
                <Icon name="difference" class="text-[16px]" /> Resolve Columns
              </button>
            {:else if phase === 'syncing'}
              <button type="button" class="btn-primary py-2" disabled><Icon name="progress_activity" class="animate-spin text-[16px]" /> Syncing…</button>
            {:else}
              <button type="button" class="btn-outline py-2" onclick={() => syncFromClick()}><Icon name="sync" class="text-[16px]" /> Sync Now</button>
            {/if}
          </div>
        </div>
        <div class="flex flex-col gap-2 px-1 text-body-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
          <span>
            {checkedTabs
              ? `Column mapping saved for ${checkedTabs} tab${checkedTabs === 1 ? '' : 's'}.`
              : 'Renamed or moved columns in your sheet?'}
          </span>
          <button type="button" class="btn w-fit px-0 text-body-sm text-primary hover:underline" disabled={phase === 'syncing'} onclick={() => navigate('/sheets-sync/columns')}>
            <Icon name="fact_check" class="text-[16px]" /> Check Column Headers
          </button>
        </div>
      </section>
    {/if}
  {/if}
</div>

<div class="mt-auto flex items-center justify-between gap-2 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:px-8 sm:py-4">
  <div class="flex items-center gap-1">
    <button type="button" class="btn px-3 py-2 text-body-md text-on-surface hover:bg-surface-container-high" onclick={onback}>
      <Icon name="arrow_back" class="text-[18px]" /> Back
    </button>
    {#if sheets.spreadsheet}
      <button
        type="button"
        class="btn px-3 py-2 text-body-md text-secondary hover:bg-secondary-fixed/50"
        onclick={(e) => Object.assign(disconnectPrompt, { open: true, returnFocus: e.currentTarget })}
      >
        <Icon name="link_off" class="text-[18px]" /> Disconnect…
      </button>
    {/if}
  </div>
  <button type="button" class="btn-primary px-5 py-2 text-body-md" onclick={onclose}>Done</button>
</div>
