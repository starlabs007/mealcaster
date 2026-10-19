<script>
  // Connection step 1: the Google account. Sign in (or reconnect), or switch to another account.
  import Icon from './Icon.svelte';
  import { text } from '../text.js';
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
        <span class="text-label-md text-on-surface">{text.sheets.account.notSetUp}</span>
        <span class="text-body-sm text-on-surface-variant">
          {import.meta.env.DEV
            ? text.sheets.account.devHint
            : text.sheets.account.prodHint}
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
        <span class="truncate text-label-md text-on-surface">{syncState.account?.name || text.sheets.account.signedInDefault}</span>
        <span class="truncate text-body-sm text-on-surface-variant">{syncState.account?.email || sheets.accountEmail}</span>
      </div>
      <span class="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-fixed/70 px-2 py-0.5 text-label-caps uppercase text-primary">
        <Icon name="check" class="text-[14px]" /> {text.sheets.account.signedIn}
      </span>
    </div>
    <button type="button" data-signs-in class="btn w-fit px-0 text-body-sm text-primary hover:underline" disabled={busy} onclick={() => run(switchAccount)}>
      <Icon name="switch_account" class="text-[18px]" /> {text.sheets.account.switchAccount}
    </button>
  {:else}
    <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-card">
      <p class="text-body-md text-on-surface-variant">
        {#if sheets.spreadsheet}
          {text.sheets.account.signedOutLinked(sheets.accountEmail, sheets.spreadsheetName || text.sheets.account.yourSpreadsheet)}
        {:else}
          {text.sheets.account.intro}
        {/if}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" data-signs-in class="btn-primary py-2" disabled={busy} onclick={() => run(connect)}>
          <Icon name="login" class="text-[16px]" />
          {sheets.spreadsheet ? text.common.reconnect : sheets.accountEmail ? text.sheets.account.signInAs(sheets.accountEmail) : text.sheets.account.signIn}
        </button>
        {#if sheets.accountEmail}
          <button type="button" data-signs-in class="btn px-0 text-body-sm text-primary hover:underline" disabled={busy} onclick={() => run(switchAccount)}>
            {text.sheets.account.switchAccount}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if googleConfigured}
  <div class="mt-auto flex items-center justify-end gap-2 border-t border-surface-container-high bg-surface-container-low px-4 py-3 sm:px-8 sm:py-4">
    <button type="button" class="btn-primary px-5 py-2 text-body-md" disabled={!signedIn || busy} onclick={onnext}>
      {text.sheets.account.continue} <Icon name="arrow_forward" class="text-[18px]" />
    </button>
  </div>
{/if}
