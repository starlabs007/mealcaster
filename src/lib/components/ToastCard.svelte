<script>
  import { fly } from 'svelte/transition';
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { toast, toastFocus, dismissToast, pauseToast, resumeToast } from '../toast.svelte.js';
  import { text } from '../text.js';
  import { undoShortcutHint } from '../undoShortcut.js';
  import { fitToast, toastPlain } from '../toastText.js';

  const hint = undoShortcutHint(typeof navigator === 'undefined' ? '' : navigator.platform);

  /**
   * The visible toast with its Undo and close buttons. `Toast` shows it floating; a screen that docks toasts (the
   * grocery store bar) shows it in place over its own bar instead.
   * @type {{ class?: string, fly?: number }}
   */
  let { class: className = '', fly: flyY = 16 } = $props();

  /** @param {HTMLElement} el */
  const engaged = (el) => el.matches(':hover') || el.contains(document.activeElement);

  /**
   * Fills the message in, shortening recipe titles until it fits the three-line clamp (rules in toastText.js); again
   * when the width changes.
   * @param {HTMLElement} node @param {string} message
   */
  function fitLines(node, message) {
    const fits = (/** @type {string} */ shown) => {
      node.textContent = shown;
      return node.scrollHeight <= node.clientHeight + 1;
    };
    let width = 0;
    const fit = () => {
      width = node.clientWidth;
      node.textContent = fitToast(message, fits);
    };
    fit();
    const observer = new ResizeObserver(() => node.clientWidth !== width && fit());
    observer.observe(node);
    return {
      /** @param {string} next */
      update(next) {
        message = next;
        fit();
      },
      destroy: () => observer.disconnect(),
    };
  }
</script>

{#key toast.id}
  {#if toast.message}
    <div
      transition:fly={{ y: flyY, duration: 200 }}
      class="pointer-events-auto flex items-center gap-4 rounded-xl bg-secondary px-4 py-3 text-body-sm text-on-secondary shadow-lift {className}"
      role="group"
      data-toast
      onmouseenter={pauseToast}
      onfocusin={pauseToast}
      onmouseleave={(e) => engaged(e.currentTarget) || resumeToast()}
      onfocusout={(e) => e.currentTarget.contains(/** @type {Node | null} */ (e.relatedTarget)) || e.currentTarget.matches(':hover') || resumeToast()}
    >
      <!-- Three lines at most: recipe titles are shortened first, so what happened stays whole. Visual only: screen
           readers get the whole message. -->
      <span class="sr-only">{toastPlain(toast.message)}</span>
      <span use:fitLines={toast.message} aria-hidden="true" class="line-clamp-3 min-w-0 flex-1 break-words" title={toastPlain(toast.message)}></span>
      {#if toast.action}
        <button
          type="button"
          aria-keyshortcuts={toast.action.shortcut ? 'Meta+Z Control+Z' : undefined}
          class="-my-2.5 min-h-11 min-w-11 shrink-0 rounded px-1 font-semibold text-secondary-fixed md:fine:my-0 md:fine:min-h-6 md:fine:px-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
          onclick={() => {
            toast.action?.run();
            dismissToast();
            const back = toastFocus.cameFrom;
            tick().then(() => back instanceof HTMLElement && back.isConnected && back.focus());
          }}
        >
          {toast.action.label}{#if toast.action.shortcut}<span class="ml-1 hidden font-normal fine:inline">({hint})</span>{/if}
        </button>
      {/if}
      <button
        type="button"
        aria-label={text.common.dismiss}
        class="-my-2.5 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-secondary/70 md:fine:my-0 md:fine:-mr-1 md:fine:h-6 md:fine:w-6 hover:bg-on-secondary/10 hover:text-on-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-secondary"
        onclick={dismissToast}
      >
        <Icon name="close" class="text-[18px]" />
      </button>
    </div>
  {/if}
{/key}
