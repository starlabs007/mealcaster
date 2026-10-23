<script>
  import ToastCard from './ToastCard.svelte';
  import { toast, toastFocus } from '../toast.svelte.js';
  import { MediaQuery } from 'svelte/reactivity';

  const wide = new MediaQuery('min-width: 768px');

  // Pressing Undo removes the toast and the button with it; focus goes back to where the keyboard came from, if
  // that control is still there, rather than dropping to <body>.
  /** @param {FocusEvent} e */
  const track = (e) => {
    if (e.target instanceof Element && !e.target.closest('[data-toast]')) toastFocus.cameFrom = e.target;
  };
</script>

<svelte:window onfocusin={track} />

<!-- Above dialogs (z-[70]), so a toast from inside one isn't dimmed by its backdrop. On phones it sits at the bottom,
     within thumb reach of Undo; from `md` it is centred just below the planner's toolbar (title, summary pill, Auto-fill,
     Copy, Clear: bottom ~290 px below `lg`, where the controls sit under the title, ~262 px under the two-row header
     from `lg`, ~166 px from `xl`), so the readout it reports on stays visible
     and the header tabs are never covered. Fixed, so on other screens it sits at the same height.
     A screen that docks toasts (grocery store mode) shows the card itself; this region then only announces it.
     A screen with its own bottom bar on phones (cook view) sets --toast-clearance to that bar's height. -->
<div
  class="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--toast-clearance,0px))] z-[80] flex justify-center px-4 print:hidden md:bottom-auto md:top-[19.5rem] lg:top-[17rem] xl:top-44"
  aria-live="polite"
>
  {#if toast.docked}
    {#key toast.id}<span class="sr-only">{toast.message}</span>{/key}
  {:else}
    <ToastCard class="max-w-lg" fly={wide.current ? -16 : 16} />
  {/if}
</div>
