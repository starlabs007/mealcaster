<script>
  import { fly } from 'svelte/transition';
  import { toast, dismissToast } from '../toast.svelte.js';
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" aria-live="polite">
  {#key toast.id}
    {#if toast.message}
      <div
        transition:fly={{ y: 16, duration: 200 }}
        class="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl bg-inverse-surface px-4 py-3 text-body-sm text-inverse-on-surface shadow-lift"
      >
        <span>{toast.message}</span>
        {#if toast.action}
          <button
            type="button"
            class="shrink-0 font-semibold text-primary-fixed hover:underline"
            onclick={() => {
              toast.action?.run();
              dismissToast();
            }}
          >
            {toast.action.label}
          </button>
        {/if}
      </div>
    {/if}
  {/key}
</div>
