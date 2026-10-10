<script>
  // Header Google Sheets button. Not connected: a plain link to the connection screen. Connected:
  // a split button — the main action follows the sync state (Reconnect, Sync Now, Resolve Columns…)
  // and the menu offers the connection screen, the spreadsheet and Disconnect. Below `sm` it's
  // icon-only and a tap opens the menu, which then lists the main action first.
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { sheets, spreadsheetUrl } from '../sheets.svelte.js';
  import { syncPhase, syncFromClick, connect, PHASE_LOOK } from '../sync/sync.svelte.js';
  import { headerActions } from '../sync/phase.js';
  import { route, href, navigate } from '../router.svelte.js';
  import { disconnectPrompt } from './DisconnectDialog.svelte';

  const phase = $derived(syncPhase());
  const look = $derived(PHASE_LOOK[phase]);
  const actions = $derived(headerActions(phase));
  const current = $derived(route.path.startsWith('/sheets-sync'));
  const label = $derived(`Google Sheets: ${look.short}`);

  // Coloured by sync status rather than by being the current page.
  const TONE = {
    ok: 'bg-primary-fixed text-primary shadow-sm',
    busy: 'bg-[#ffdead] text-tertiary shadow-sm',
    warn: 'bg-[#ffdead] text-tertiary shadow-sm',
    bad: 'bg-secondary-fixed text-secondary shadow-sm',
    off: '',
  };
  const groupClass = $derived(
    TONE[look.tone]
      ? `${TONE[look.tone]} ${current ? 'ring-2 ring-inset ring-current/40' : ''}`
      : current
        ? 'bg-surface-container-highest text-on-surface shadow-sm'
        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
  );
  const segment = 'transition-all hover:brightness-95 disabled:cursor-default disabled:hover:brightness-100';

  /** Where a link-like action goes (open in a new tab works for these). */
  const LINKS = {
    setup: () => href('/sheets-sync'),
    review: () => href('/sheets-sync'),
    settings: () => href('/sheets-sync'),
    resolveColumns: () => href('/sheets-sync/columns'),
    openSheet: () => spreadsheetUrl(sheets.spreadsheet),
  };

  /** @param {string} id */
  async function run(id) {
    close(false);
    if (id === 'syncNow') {
      await syncFromClick();
      if (syncPhase() === 'signedOut') navigate('/sheets-sync');
    }
    else if (id === 'disconnect') Object.assign(disconnectPrompt, { open: true, returnFocus: toggle });
    else if (id === 'reconnect') {
      // Reconnect in place; if that didn't work, the connection screen explains why.
      await connect();
      if (syncPhase() === 'signedOut') navigate('/sheets-sync');
    }
  }

  // ---- Menu ----------------------------------------------------------------------

  let open = $state(false);
  let position = $state({ top: 0, right: 0 });
  /** @type {HTMLButtonElement | undefined} */
  let toggle = $state();
  /** @type {HTMLElement | undefined} */
  let menu = $state();
  const menuId = `sheets-menu-${Math.random().toString(36).slice(2, 8)}`;

  const items = () => /** @type {HTMLElement[]} */ ([...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].filter((el) => el.offsetParent));

  /** @param {'first' | 'last'} [focus] */
  function show(focus = 'first') {
    // Fixed, so the scrolling tab row below `xl` doesn't clip it. The header is the containing
    // block (backdrop blur), and it sits at the top left of the viewport.
    const rect = toggle.getBoundingClientRect();
    position = { top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) };
    open = true;
    tick().then(() => {
      const list = items();
      (focus === 'last' ? list.at(-1) : list[0])?.focus();
    });
  }

  /** @param {boolean} [refocus] */
  function close(refocus = true) {
    if (!open) return;
    open = false;
    if (refocus) toggle?.focus();
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
    const list = items();
    const at = list.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const move = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[event.key];
    if (move !== undefined) {
      event.preventDefault();
      list[(move + list.length) % list.length]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close(false);
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

  // The menu's actions go away when the connection does (e.g. after Disconnect).
  $effect(() => {
    if (!actions.menu.length) open = false;
  });
</script>

{#snippet statusIcon(extra = '')}
  <Icon name={look.icon} class="text-[16px] max-sm:text-[20px] {look.tone === 'busy' ? 'animate-spin' : ''} {extra}" />
{/snippet}

{#snippet item(action, extra = '')}
  {@const link = LINKS[action.id]?.()}
  {@const cls = `flex w-full items-center gap-2.5 px-3 py-2 text-left text-label-md transition-colors focus:outline-none disabled:opacity-50 ${
    action.id === 'disconnect' ? 'text-secondary hover:bg-secondary-fixed/50 focus:bg-secondary-fixed/50' : 'text-on-surface hover:bg-surface-container-high focus:bg-surface-container-high'
  } ${extra}`}
  {#if link}
    <a
      role="menuitem"
      tabindex="-1"
      href={link}
      class={cls}
      onclick={() => close(false)}
      {...action.id === 'openSheet' ? { target: '_blank', rel: 'noopener noreferrer' } : {}}
    >
      <Icon name={action.icon} class="text-[18px]" />{action.label}
    </a>
  {:else}
    <button role="menuitem" tabindex="-1" type="button" class={cls} disabled={action.disabled} onclick={() => run(action.id)}>
      <Icon name={action.icon} class="text-[18px]" />{action.label}
    </button>
  {/if}
{/snippet}

{#if !actions.menu.length}
  <!-- Not connected: a plain link to set it up. -->
  <a
    href={LINKS.setup()}
    aria-current={current ? 'page' : undefined}
    title={label}
    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-label-md transition-all sm:px-4 {groupClass}"
  >
    {@render statusIcon()}
    <span class="max-sm:sr-only">{actions.primary.label}</span>
  </a>
{:else}
  <span class="inline-flex items-stretch whitespace-nowrap rounded-lg text-label-md {groupClass}" role="group" aria-label={label}>
    <!-- Main action (from sm up; below sm it's the menu's first item). -->
    {#if LINKS[actions.primary.id]}
      <a
        href={LINKS[actions.primary.id]()}
        aria-current={current ? 'page' : undefined}
        title={label}
        class="inline-flex items-center gap-1.5 rounded-l-lg py-2 pl-4 pr-3 max-sm:hidden {segment}"
      >
        {@render statusIcon()}{actions.primary.label}
      </a>
    {:else}
      <button
        type="button"
        title={label}
        disabled={actions.primary.disabled}
        class="inline-flex items-center gap-1.5 rounded-l-lg py-2 pl-4 pr-3 max-sm:hidden {segment}"
        onclick={() => run(actions.primary.id)}
      >
        {@render statusIcon()}{actions.primary.disabled ? 'Syncing…' : actions.primary.label}
      </button>
    {/if}
    <span class="my-2 w-px bg-current opacity-25 max-sm:hidden" aria-hidden="true"></span>
    <button
      bind:this={toggle}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      aria-label="{label} — more options"
      title="More options"
      class="inline-flex items-center rounded-lg px-3 py-2 sm:rounded-l-none sm:px-1.5 {segment}"
      onclick={() => (open ? close() : show())}
      onkeydown={onToggleKey}
    >
      {@render statusIcon('sm:hidden')}
      <Icon name="expand_more" class="text-[18px] transition-transform max-sm:hidden {open ? 'rotate-180' : ''}" />
    </button>
  </span>

  {#if open}
    <div
      bind:this={menu}
      id={menuId}
      role="menu"
      tabindex="-1"
      aria-label="Google Sheets"
      class="fixed z-[55] min-w-56 overflow-hidden rounded-xl bg-surface-container-lowest py-1 shadow-lift ring-1 ring-outline-variant/40"
      style="top: {position.top}px; right: {position.right}px"
      onkeydown={onMenuKey}
    >
      <p class="flex items-center gap-2 px-3 pb-1.5 pt-1 text-label-caps uppercase text-on-surface-variant">
        {@render statusIcon('!text-[14px]')}{look.short}
      </p>
      {@render item(actions.primary, 'sm:hidden')}
      <div class="my-1 h-px bg-surface-container-high sm:hidden" role="separator"></div>
      {#each actions.menu as action (action.id)}
        {#if action.id === 'disconnect'}<div class="my-1 h-px bg-surface-container-high" role="separator"></div>{/if}
        {@render item(action)}
      {/each}
    </div>
  {/if}
{/if}
