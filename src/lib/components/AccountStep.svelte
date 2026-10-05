<script>
  // Connection step 1: the Google account. Sign in (or reconnect), or switch to another account.
  import Icon from './Icon.svelte';
  import { sheets } from '../sheets.svelte.js';
  import { googleConfigured } from '../google/config.js';
  import { auth } from '../google/auth.svelte.js';
  import { syncState, syncPhase, connect, switchAccount } from '../sync/sync.svelte.js';

  /** @type {{ onnext: () => void }} */
  let { onnext } = $props();

  const signedIn = $derived(Boolean(auth.token));
  let working = $state(false);
  const busy = $derived(working || syncPhase() === 'syncing');

  /** @param {() => Promise<unknown>} action */
  async function run(action) {
    working = true;
    try {
      await action();
    } finally {
      working = false;
    }
  }
</script>

<div class="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-8">
  {#if !googleConfigured}
    <div class="flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      <Icon name="cloud_off" class="mt-0.5 text-[22px] text-outline" />
      <div class="flex flex-col gap-1">
        <span class="text-label-md text-on-surface">Google sync isn’t set up for this build</span>
        <span class="text-body-sm text-on-surface-variant">
          {import.meta.env.DEV
            ? 'Add GOOGLE_CLIENT_ID, GOOGLE_API_KEY and GOOGLE_APP_ID to repo/.env.local (see .env.example), then restart the dev server.'
            : 'Everything is saved on this device.'}
        </span>
      </div>
    </div>
  {:else if signedIn}
    <div class="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      {#if syncState.account?.photo}
        <img src={syncState.account.photo} alt="" referrerpolicy="no-referrer" class="h-11 w-11 shrink-0 rounded-full object-cover" />
      {:else}
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="person" class="text-[22px]" />
        </span>
      {/if}
      <div class="flex min-w-0 flex-col">
        <span class="truncate text-label-md text-on-surface">{syncState.account?.name || 'Signed in to Google'}</span>
        <span class="truncate text-body-sm text-on-surface-variant">{syncState.account?.email || sheets.accountEmail}</span>
      </div>
      <span class="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-fixed/70 px-2 py-0.5 text-label-caps uppercase text-primary">
        <Icon name="check" class="text-[14px]" /> Signed in
      </span>
    </div>
    <button type="button" class="btn w-fit px-0 text-body-sm text-primary hover:underline" disabled={busy} onclick={() => run(switchAccount)}>
      <Icon name="switch_account" class="text-[18px]" /> Use a different account
    </button>
  {:else}
    <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      <p class="text-body-md text-on-surface-variant">
        {#if sheets.spreadsheet}
          You’re signed out, so changes stay on this device. Reconnect{sheets.accountEmail ? ` as ${sheets.accountEmail}` : ''} to keep
          syncing “{sheets.spreadsheetName || 'your spreadsheet'}”.
        {:else}
          MealCaster keeps your recipes, plans and grocery lists in a Google Sheet in your Drive. It can only open the spreadsheet you
          choose or create — nothing else in your Drive.
        {/if}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn-primary py-2" disabled={busy} onclick={() => run(connect)}>
          <Icon name="login" class="text-[16px]" />
          {sheets.spreadsheet ? 'Reconnect' : sheets.accountEmail ? `Sign in as ${sheets.accountEmail}` : 'Sign in with Google'}
        </button>
        {#if sheets.accountEmail}
          <button type="button" class="btn px-0 text-body-sm text-primary hover:underline" disabled={busy} onclick={() => run(switchAccount)}>
            Use a different account
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if googleConfigured}
  <div class="mt-auto flex items-center justify-end gap-2 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:px-8 sm:py-4">
    <button type="button" class="btn-primary px-5 py-2 text-body-md" disabled={!signedIn || busy} onclick={onnext}>
      Continue <Icon name="arrow_forward" class="text-[18px]" />
    </button>
  </div>
{/if}
