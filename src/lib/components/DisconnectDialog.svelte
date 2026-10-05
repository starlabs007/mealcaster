<script module>
  // Confirmation for "Disconnect" from Google Sheets. Mounted in App.svelte (not where it's
  // opened from: the header's backdrop blur would trap a fixed overlay inside the header).
  export const disconnectPrompt = $state({ open: false, /** @type {HTMLElement | null} */ returnFocus: null });
</script>

<script>
  import Icon from './Icon.svelte';
  import { sheets } from '../sheets.svelte.js';
  import { disconnect } from '../sync/sync.svelte.js';

  /** @type {HTMLElement | undefined} */
  let cancel = $state();
  $effect(() => cancel?.focus());

  function close() {
    disconnectPrompt.open = false;
    disconnectPrompt.returnFocus?.focus();
  }

  function confirm() {
    disconnectPrompt.open = false;
    disconnect();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md print:hidden"
  onclick={(e) => e.target === e.currentTarget && close()}
>
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="disconnect-title"
    aria-describedby="disconnect-desc"
    class="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-lift"
  >
    <div class="h-1.5 w-full bg-secondary"></div>
    <div class="p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-fixed/70 text-secondary">
          <Icon name="link_off" class="text-[20px]" />
        </span>
        <h2 id="disconnect-title" class="font-display text-headline-sm text-on-surface">Disconnect from Google Sheets?</h2>
      </div>

      <div id="disconnect-desc" class="mt-3 flex flex-col gap-3 text-body-sm text-on-surface-variant">
        <p>
          This signs you out of Google and stops syncing with
          <strong class="text-on-surface">“{sheets.spreadsheetName || 'your spreadsheet'}”</strong>.
        </p>
        <p>
          Your recipes, plans and grocery lists stay on this device, and the spreadsheet isn’t changed. You can connect to it again
          later.
        </p>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button bind:this={cancel} type="button" class="btn-outline" onclick={close}>Cancel</button>
        <button type="button" class="btn bg-secondary text-on-secondary hover:bg-[#b34728]" onclick={confirm}>
          <Icon name="link_off" class="text-[16px]" /> Disconnect
        </button>
      </div>
    </div>
  </div>
</div>
