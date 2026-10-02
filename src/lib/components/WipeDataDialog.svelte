<script>
  // Confirmation for "Disconnect & erase local data". Cancel is the default action.
  import Icon from './Icon.svelte';
  import { sheets } from '../sheets.svelte.js';
  import { wipeLocalData } from '../wipe.js';

  /** @type {{ onclose: () => void }} */
  let { onclose } = $props();

  /** @type {HTMLElement | undefined} */
  let cancel = $state();
  $effect(() => cancel?.focus());

  const erased = [
    'Every recipe you added or edited, deleted samples and favorites',
    'Your meal plan and grocery lists',
    'Aisle mappings, print defaults and other settings',
    'The Google Sheets connection, tab names and sync history',
  ];
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-inverse-surface/40 p-4 backdrop-blur-md print:hidden"
  onclick={(e) => e.target === e.currentTarget && onclose()}
>
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="wipe-title"
    aria-describedby="wipe-desc"
    class="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-lift"
  >
    <div class="h-1.5 w-full bg-secondary"></div>
    <div class="p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-fixed/70 text-secondary">
          <Icon name="warning" class="text-[20px]" />
        </span>
        <h2 id="wipe-title" class="font-display text-headline-sm text-on-surface">Erase all local data?</h2>
      </div>

      <div id="wipe-desc" class="mt-3 flex flex-col gap-3 text-body-sm text-on-surface-variant">
        <p>
          This signs you out of Google and permanently removes the following from <strong class="text-on-surface">this browser</strong>.
          It can’t be undone.
        </p>
        <ul class="list-disc pl-5">
          {#each erased as item (item)}<li>{item}</li>{/each}
        </ul>
        <p>
          {#if sheets.spreadsheet}
            Your Google Sheet <strong class="text-on-surface">“{sheets.spreadsheetName || 'spreadsheet'}”</strong> is not changed. Anything
            that was synced can be brought back by connecting to it again.
          {:else}
            Nothing is connected, so there is no copy elsewhere — anything not exported will be lost.
          {/if}
        </p>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button bind:this={cancel} type="button" class="btn-outline" onclick={onclose}>Cancel</button>
        <button type="button" class="btn bg-secondary text-on-secondary hover:bg-[#b34728]" onclick={wipeLocalData}>
          <Icon name="delete_forever" class="text-[16px]" /> Erase Everything
        </button>
      </div>
    </div>
  </div>
</div>
