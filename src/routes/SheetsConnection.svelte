<script>
  // Google Sheets connection, in three steps: 1 Google account, 2 spreadsheet (and tab names),
  // 3 sync (strategy, first sync, status). A modal over the previous page. Steps replace each
  // other in history, so Back / close return to where the screen was opened from.
  // #/sheets-sync opens the step that fits (startStep): setup from the start, else step 3.
  import { onMount } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import AccountStep from '../lib/components/AccountStep.svelte';
  import SheetStep from '../lib/components/SheetStep.svelte';
  import SyncStep from '../lib/components/SyncStep.svelte';
  import { disconnectPrompt } from '../lib/components/DisconnectDialog.svelte';
  import { sheets } from '../lib/sheets.svelte.js';
  import { auth } from '../lib/google/auth.svelte.js';
  import { syncPhase } from '../lib/sync/sync.svelte.js';
  import { startStep } from '../lib/sync/phase.js';
  import { route, goBack, replace } from '../lib/router.svelte.js';

  /** @typedef {import('../lib/sync/phase.js').ConnectionStep} ConnectionStep */

  const STEPS = /** @type {const} */ ([
    { id: 'account', label: 'Google account', subtitle: 'Sign in with the Google account whose Drive holds your spreadsheet.' },
    { id: 'sheet', label: 'Spreadsheet', subtitle: 'Choose the spreadsheet MealCaster keeps your recipes, plans and grocery lists in.' },
    { id: 'sync', label: 'Sync', subtitle: 'Choose how syncing works, then sync.' },
  ]);

  const step = $derived(STEPS.find((s) => route.path === `/sheets-sync/${s.id}`));
  const phase = $derived(syncPhase());
  const done = $derived({
    account: Boolean(auth.token),
    sheet: Boolean(sheets.spreadsheet),
    sync: phase === 'synced',
  });

  // #/sheets-sync (or an unknown step): open the step that fits.
  $effect(() => {
    if (!step) replace(`/sheets-sync/${startStep(syncPhase())}`);
  });

  /** @param {ConnectionStep} id */
  const go = (id) => replace(`/sheets-sync/${id}`);
  const close = () => goBack('/');

  /** @type {HTMLElement} */
  let dialog;
  onMount(() => {
    dialog.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = overflow);
  });

  function onKeydown(event) {
    // The Disconnect confirm handles its own Escape.
    if (event.key === 'Escape' && !disconnectPrompt.open) close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

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
    class="relative my-4 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-12px_rgba(28,28,24,0.25)] focus:outline-none"
  >
    <div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-primary via-primary-container to-secondary"></div>

    <!-- Header -->
    <div class="flex items-start justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
      <div class="flex min-w-0 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="sheets-dialog-title" class="font-display text-headline-sm text-on-surface sm:text-headline-md">Google Sheets</h2>
          <SyncStatus variant="badge" />
        </div>
        <p id="sheets-dialog-subtitle" class="text-body-md text-on-surface-variant">{step?.subtitle ?? ''}</p>
      </div>
      <button
        type="button"
        aria-label="Close"
        class="shrink-0 rounded-lg p-2 text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
        onclick={close}
      >
        <Icon name="close" class="text-[20px]" />
      </button>
    </div>

    <!-- Steps -->
    <nav aria-label="Connection steps" class="px-4 pb-2 pt-4 sm:px-8">
      <ol class="flex items-center gap-2">
        {#each STEPS as s, i (s.id)}
          {@const current = s.id === step?.id}
          <li class="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              aria-current={current ? 'step' : undefined}
              class="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-container"
              onclick={() => go(s.id)}
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-md {current
                  ? 'bg-primary text-on-primary'
                  : done[s.id]
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container-high text-on-surface-variant'}"
              >
                {#if done[s.id] && !current}<Icon name="check" class="text-[16px]" />{:else}{i + 1}{/if}
              </span>
              <span class="truncate text-label-md {current ? 'text-on-surface' : 'text-on-surface-variant max-sm:sr-only'}">
                {s.label}{#if done[s.id] && !current}<span class="sr-only"> (done)</span>{/if}
              </span>
            </button>
            {#if i < STEPS.length - 1}<span class="h-px min-w-3 flex-1 bg-outline-variant/60" aria-hidden="true"></span>{/if}
          </li>
        {/each}
      </ol>
    </nav>

    {#key step?.id}
      <div class="flex min-h-0 flex-1 flex-col">
        {#if step?.id === 'account'}
          <AccountStep onnext={() => go('sheet')} />
        {:else if step?.id === 'sheet'}
          <SheetStep onback={() => go('account')} onnext={() => go('sync')} />
        {:else if step?.id === 'sync'}
          <SyncStep onback={() => go('sheet')} {go} onclose={close} />
        {/if}
      </div>
    {/key}
  </div>
</div>
