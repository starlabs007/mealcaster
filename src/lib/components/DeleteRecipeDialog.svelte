<script>
  // "Delete this recipe?" confirmation. Not a native <dialog>, for the reason given in SwitchDaysDialog: showModal()
  // would put it above the Undo toast. So Tab is kept inside by hand, and Escape, Cancel and the scrim give focus back
  // to the button that opened it. Confirming doesn't: the page navigates away.
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { text } from '../text.js';

  /** @type {{ title: string, opener?: HTMLElement | null, onconfirm: () => void, onclose: () => void }} */
  let { title, opener = null, onconfirm, onclose } = $props();

  /** @type {HTMLElement | undefined} */
  let dialog = $state();
  // The safe choice gets focus first.
  $effect(() => /** @type {HTMLElement | null | undefined} */ (dialog?.querySelector('[data-cancel]'))?.focus());

  /** Escape closes; Tab and Shift+Tab wrap around inside the dialog. @param {KeyboardEvent} e */
  function onkeydown(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab' || !dialog) return;
    const items = /** @type {HTMLElement[]} */ ([...dialog.querySelectorAll('button:not(:disabled)')]);
    const first = items[0];
    const last = items[items.length - 1];
    const inside = dialog.contains(document.activeElement);
    if (e.shiftKey ? !inside || document.activeElement === first : !inside || document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  }

  async function close() {
    onclose();
    await tick();
    opener?.focus();
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape handled on window) -->
<div
  class="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/40 p-0 backdrop-blur-md sm:items-center sm:p-4 print:hidden"
  onclick={(e) => e.target === e.currentTarget && close()}
>
  <div
    bind:this={dialog}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="delete-title"
    aria-describedby="delete-body"
    class="w-full max-w-sm rounded-t-2xl bg-surface p-6 shadow-lift sm:rounded-2xl"
  >
    <h2 id="delete-title" class="font-display text-headline-sm text-on-surface">{text.recipe.deleteDialog.title}</h2>
    <p id="delete-body" class="mt-2 text-body-sm text-on-surface-variant">
      <strong>{title}</strong>{text.recipe.deleteDialog.afterTitle}
    </p>
    <div class="mt-5 flex justify-end gap-2 max-sm:flex-col-reverse">
      <button type="button" data-cancel class="btn-outline min-h-11 justify-center fine:min-h-0" onclick={close}>{text.common.cancel}</button>
      <button type="button" class="btn min-h-11 justify-center bg-secondary text-on-secondary shadow-sm hover:opacity-90 fine:min-h-0" onclick={onconfirm}>
        <Icon name="delete" class="text-[16px]" /> {text.common.delete}
      </button>
    </div>
  </div>
</div>
