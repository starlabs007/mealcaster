<script>
  import { fly } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import { toast, dismissToast, pauseToast, resumeToast } from '../toast.svelte.js';
  import { text } from '../text.js';

  /** @param {HTMLElement} el */
  const engaged = (el) => el.matches(':hover') || el.contains(document.activeElement);
</script>

<!-- Above dialogs (z-[70]), so a toast from inside one isn't dimmed by its backdrop. -->
<div class="pointer-events-none fixed inset-x-0 top-6 z-[80] flex justify-center px-4 print:hidden" aria-live="polite">
  {#key toast.id}
    {#if toast.message}
      <div
        transition:fly={{ y: -16, duration: 200 }}
        class="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl bg-secondary px-4 py-3 text-body-sm text-on-secondary shadow-lift"
        role="group"
        onmouseenter={pauseToast}
        onfocusin={pauseToast}
        onmouseleave={(e) => engaged(e.currentTarget) || resumeToast()}
        onfocusout={(e) => e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget)) || e.currentTarget.matches(':hover') || resumeToast()}
      >
        <span>{toast.message}</span>
        {#if toast.action}
          <button
            type="button"
            class="shrink-0 rounded font-semibold text-secondary-fixed hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
            onclick={() => {
              toast.action?.run();
              dismissToast();
            }}
          >
            {toast.action.label}
          </button>
        {/if}
        <button
          type="button"
          aria-label={text.common.dismiss}
          class="-mr-1 shrink-0 rounded-md p-0.5 text-on-secondary/70 hover:bg-on-secondary/10 hover:text-on-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
          onclick={dismissToast}
        >
          <Icon name="close" class="text-[18px]" />
        </button>
      </div>
    {/if}
  {/key}
</div>
