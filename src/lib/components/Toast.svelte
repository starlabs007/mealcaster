<script>
  import { fly } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import { toast, dismissToast } from '../toast.svelte.js';
</script>

<div class="pointer-events-none fixed inset-x-0 top-6 z-[60] flex justify-center px-4 print:hidden" aria-live="polite">
  {#key toast.id}
    {#if toast.message}
      <div
        transition:fly={{ y: -16, duration: 200 }}
        class="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl bg-secondary px-4 py-3 text-body-sm text-on-secondary shadow-lift"
      >
        <span>{toast.message}</span>
        {#if toast.action}
          <button
            type="button"
            class="shrink-0 font-semibold text-secondary-fixed hover:underline"
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
          aria-label="Dismiss"
          class="-mr-1 shrink-0 rounded-md p-0.5 text-on-secondary/70 hover:bg-on-secondary/10 hover:text-on-secondary"
          onclick={dismissToast}
        >
          <Icon name="close" class="text-[18px]" />
        </button>
      </div>
    {/if}
  {/key}
</div>
