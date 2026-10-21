<script>
  // A ⋯ button with a menu of actions: arrow keys, Home / End, Escape (focus back on the button), Tab and a click
  // outside close it. The menu is moved to <body> and fixed-positioned, so a card's overflow, opacity or a grid
  // can't clip or fade it; it closes on scroll and resize rather than following the button.
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * @typedef {{ id: string, label: string, icon: string, href?: string, onselect?: () => void }} MenuAction
   * @type {{ items: MenuAction[], label: string, title?: string, class?: string, opener?: string }}
   */
  let { items, label, title, class: className = '', opener } = $props();

  let open = $state(false);
  let position = $state({ top: 0, right: 0 });
  /** @type {HTMLButtonElement | undefined} */
  let toggle = $state();
  /** @type {HTMLElement | undefined} */
  let menu = $state();
  const menuId = `menu-${Math.random().toString(36).slice(2, 8)}`;

  const entries = () => /** @type {HTMLElement[]} */ ([...(menu?.querySelectorAll('[role="menuitem"]') ?? [])]);

  /** @param {'first' | 'last'} [focus] */
  function show(focus = 'first') {
    const rect = /** @type {HTMLButtonElement} */ (toggle).getBoundingClientRect();
    position = { top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) };
    open = true;
    tick().then(() => {
      // Opens upwards when there's no room below (a card near the bottom of a phone screen).
      const height = menu?.offsetHeight ?? 0;
      if (rect.bottom + 6 + height > window.innerHeight - 8 && rect.top - 6 - height >= 8) position.top = rect.top - 6 - height;
      const list = entries();
      (focus === 'last' ? list.at(-1) : list[0])?.focus();
    });
  }

  /** @param {boolean} [refocus] */
  function close(refocus = true) {
    if (!open) return;
    open = false;
    if (refocus) toggle?.focus();
  }

  /** Focus goes back to the button first, so a dialog the action opens returns focus there. @param {MenuAction} action */
  function select(action) {
    close();
    action.onselect?.();
  }

  /** @param {KeyboardEvent} event */
  function onToggleKey(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  }

  /** @param {KeyboardEvent} event */
  function onMenuKey(event) {
    const list = entries();
    const at = list.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const move = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[event.key];
    if (move !== undefined) {
      event.preventDefault();
      list[(move + list.length) % list.length]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // Tab continues from the button, not from the end of <body>.
      event.preventDefault();
      close();
    }
  }

  $effect(() => {
    if (!open) return;
    const outside = (/** @type {PointerEvent} */ e) => {
      const target = /** @type {Node} */ (e.target);
      if (!menu?.contains(target) && !toggle?.contains(target)) close(false);
    };
    const dismiss = () => close(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  });

  /** @param {HTMLElement} node */
  function toBody(node) {
    document.body.appendChild(node);
    return () => node.remove();
  }

  const itemClass =
    'flex w-full items-center gap-2.5 px-3 py-3 text-left md:py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-high focus:bg-surface-container-high focus:outline-none';
</script>

<button
  bind:this={toggle}
  type="button"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-controls={open ? menuId : undefined}
  aria-label={label}
  title={title ?? label}
  data-switch-opener={opener}
  class="focus-ring flex h-11 w-11 flex-shrink-0 md:h-8 md:w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface {open
    ? 'bg-surface-container-high text-on-surface'
    : ''} {className}"
  onclick={() => (open ? close() : show())}
  onkeydown={onToggleKey}
>
  <Icon name="more_horiz" class="text-[20px]" />
</button>

{#if open}
  <div
    {@attach toBody}
    bind:this={menu}
    id={menuId}
    role="menu"
    tabindex="-1"
    aria-label={label}
    class="fixed z-[65] min-w-48 overflow-hidden rounded-xl bg-surface-container-lowest py-1 shadow-lift ring-1 ring-outline-variant/40 print:hidden"
    style="top: {position.top}px; right: {position.right}px"
    onkeydown={onMenuKey}
  >
    {#each items as action (action.id)}
      {#if action.href}
        <a role="menuitem" tabindex="-1" href={action.href} class={itemClass} onclick={() => close(false)}>
          <Icon name={action.icon} class="text-[18px] text-on-surface-variant" />{action.label}
        </a>
      {:else}
        <button role="menuitem" tabindex="-1" type="button" class={itemClass} onclick={() => select(action)}>
          <Icon name={action.icon} class="text-[18px] text-on-surface-variant" />{action.label}
        </button>
      {/if}
    {/each}
  </div>
{/if}
