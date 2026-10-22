<script>
  import { fly } from 'svelte/transition';
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { toast, dismissToast, pauseToast, resumeToast } from '../toast.svelte.js';
  import { text } from '../text.js';
  import { MediaQuery } from 'svelte/reactivity';

  const wide = new MediaQuery('min-width: 768px');

  /** @param {HTMLElement} el */
  const engaged = (el) => el.matches(':hover') || el.contains(document.activeElement);

  // Pressing Undo removes the toast and the button with it; focus goes back to where the keyboard came from, if
  // that control is still there, rather than dropping to <body>.
  /** @type {EventTarget | null} */
  let cameFrom = null;
  /** @param {FocusEvent} e */
  const track = (e) => {
    if (e.target instanceof Element && !e.target.closest('[data-toast]')) cameFrom = e.target;
  };
</script>

<svelte:window onfocusin={track} />

<!-- Above dialogs (z-[70]), so a toast from inside one isn't dimmed by its backdrop. On phones it sits at the bottom,
     within thumb reach of Undo; from `md` at the top, just below the fixed header (80 px, plus the tab row below `xl`) so it
     never covers the tabs. -->
<div
  class="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 print:hidden md:bottom-auto md:top-36 xl:top-24"
  aria-live="polite"
>
  {#key toast.id}
    {#if toast.message}
      <div
        transition:fly={{ y: wide.current ? -16 : 16, duration: 200 }}
        class="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl bg-secondary px-4 py-3 text-body-sm text-on-secondary shadow-lift"
        role="group"
        data-toast
        onmouseenter={pauseToast}
        onfocusin={pauseToast}
        onmouseleave={(e) => engaged(e.currentTarget) || resumeToast()}
        onfocusout={(e) => e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget)) || e.currentTarget.matches(':hover') || resumeToast()}
      >
        <span>{toast.message}</span>
        {#if toast.action}
          <button
            type="button"
            class="-my-2.5 min-h-11 min-w-11 shrink-0 rounded px-1 font-semibold text-secondary-fixed md:my-0 md:min-h-0 md:px-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
            onclick={() => {
              toast.action?.run();
              dismissToast();
              const back = cameFrom;
              tick().then(() => back instanceof HTMLElement && back.isConnected && back.focus());
            }}
          >
            {toast.action.label}
          </button>
        {/if}
        <button
          type="button"
          aria-label={text.common.dismiss}
          class="-my-2.5 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-secondary/70 md:my-0 md:-mr-1 md:h-auto md:w-auto md:p-0.5 hover:bg-on-secondary/10 hover:text-on-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
          onclick={dismissToast}
        >
          <Icon name="close" class="text-[18px]" />
        </button>
      </div>
    {/if}
  {/key}
</div>
