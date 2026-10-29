<script>
  import ToastCard from './ToastCard.svelte';
  import { toast, toastFocus } from '../toast.svelte.js';
  import { toastPlain } from '../toastText.js';

  // Pressing Undo removes the toast and the button with it; focus goes back to where the keyboard came from, if
  // that control is still there, rather than dropping to <body>.
  /** @param {FocusEvent} e */
  const track = (e) => {
    if (e.target instanceof Element && !e.target.closest('[data-toast]')) toastFocus.cameFrom = e.target;
  };
</script>

<svelte:window onfocusin={track} />

<!-- Above dialogs (z-[70]), so a toast from inside one isn't dimmed by its backdrop. Bottom-centre at every width:
     within thumb reach of Undo on phones, and clear of the planner's cards and header tabs (a fixed spot under the
     planner toolbar covered the card that had just changed once the page scrolled, #137).
     A screen that docks toasts (grocery store mode) shows the card itself; this region then only announces it.
     A screen with its own bottom bar (cook view on phones, the editor's save bar) sets --toast-clearance to that bar's
     height. -->
<div
  class="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--toast-clearance,0px))] z-[80] flex justify-center px-4 print:hidden"
  aria-live="polite"
>
  {#if toast.docked}
    {#key toast.id}<span class="sr-only">{toastPlain(toast.message)}</span>{/key}
  {:else}
    <ToastCard class="max-w-lg" />
  {/if}
</div>
