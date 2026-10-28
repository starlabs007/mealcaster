<script>
  // Google Sheets sync status, as a header badge or a one-line summary.
  import { onMount } from 'svelte';
  import { sheets } from '../sheets.svelte.js';
  import { text } from '../text.js';
  import { ago as timeAgo } from '../syncAgo.js';
  import { syncState, syncPhase, PHASE_LOOK } from '../sync/sync.svelte.js';

  /** @type {{ variant?: 'badge' | 'line', note?: string }} note: more detail for the badge's tooltip and screen reader text */
  let { variant = 'line', note = '' } = $props();

  // Re-render "2 min ago" as time passes.
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });

  const phase = $derived(syncPhase());

  const ago = (iso) => timeAgo(iso, now, text.header.syncStatus);

  const TONE = {
    ok: { dot: 'bg-primary', badge: 'bg-primary-fixed/70 text-primary' },
    busy: { dot: 'bg-tertiary animate-pulse', badge: 'bg-tertiary-fixed text-tertiary' },
    warn: { dot: 'bg-tertiary', badge: 'bg-tertiary-fixed text-tertiary' },
    bad: { dot: 'bg-error', badge: 'bg-error/10 text-error' },
    off: { dot: 'bg-outline', badge: 'bg-surface-container-high text-on-surface-variant' },
  };

  const summary = $derived.by(() => {
    switch (phase) {
      case 'synced':
        return syncState.lastSyncedAt ? text.header.syncStatus.syncedAt(ago(syncState.lastSyncedAt)) : text.header.syncStatus.connected;
      case 'syncing':
        return text.header.syncStatus.syncing;
      case 'pending':
        return text.header.syncStatus.pending;
      case 'signedOut':
        return text.header.syncStatus.signedOut;
      case 'choose':
        return syncState.choice?.backup
          ? text.header.syncStatus.chooseBackup
          : text.header.syncStatus.choose;
      case 'conflict': {
        const tab = syncState.conflict ? sheets.tabs[syncState.conflict.tab] : '';
        return text.header.syncStatus.conflict(tab, syncState.conflict?.columns.join(', ') ?? '');
      }
      case 'error':
        return syncState.error;
      default:
        return text.header.syncStatus.notConnected;
    }
  });
  const info = $derived({ ...PHASE_LOOK[phase], text: summary });
</script>

{#if variant === 'badge'}
  <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-caps uppercase {TONE[info.tone].badge}" title={note ? `${info.text}. ${note}` : info.text}>
    <span class="h-1.5 w-1.5 rounded-full {TONE[info.tone].dot}"></span>
    {info.short}
    {#if info.text !== info.short || note}<span class="sr-only">{`: ${[info.text !== info.short ? info.text : '', note].filter(Boolean).join('. ')}`}</span>{/if}
  </span>
{:else}
  <span class="flex items-start gap-2 text-body-sm {info.tone === 'bad' ? 'text-secondary' : 'text-on-surface-variant'}" role="status">
    <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full {TONE[info.tone].dot}"></span>
    <span>{info.text}</span>
  </span>
{/if}
