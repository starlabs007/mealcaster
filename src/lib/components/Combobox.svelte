<script>
  // Text field with suggestions that ignore case and accents ("rau ram" finds rau răm), unlike a native
  // <datalist>, whose matching the browser does on its own. Free text is always allowed. Keyboard: ↓/↑ move,
  // Enter picks, Esc closes. Touch: options keep the field focused, so iOS Safari's keyboard stays up.
  import { foldKey, suggest } from '../ingredients.js';

  /**
   * @type {{
   *   value?: string,
   *   suggestions: import('../ingredients.js').Suggestion[],
   *   limit?: number,
   *   openOnFocus?: boolean,
   *   label: string,
   *   placeholder?: string,
   *   class?: string,
   *   inputClass?: string,
   *   listClass?: string,
   *   align?: 'left' | 'right',
   *   invalid?: boolean,
   *   onpick?: (option: import('../ingredients.js').Suggestion) => void,
   *   oninput?: () => void,
   * }}
   */
  let {
    value = $bindable(''),
    suggestions,
    limit = 8,
    openOnFocus = false,
    label,
    placeholder = '',
    class: wrapClass = '',
    inputClass = '',
    listClass = 'min-w-full w-max max-w-[min(20rem,85vw)]',
    // Which edge the list lines up with: 'right' for a field near the right of the screen, so it opens leftwards.
    align = 'left',
    invalid = false,
    onpick,
    oninput,
  } = $props();

  const uid = $props.id();
  let open = $state(false);
  let active = $state(-1);

  const shown = $derived(open ? suggest(suggestions, value, limit) : []);
  // Nothing to offer when the one match is exactly what's typed.
  const options = $derived(shown.length === 1 && foldKey(shown[0].value) === foldKey(value) ? [] : shown);

  /** @param {import('../ingredients.js').Suggestion} option */
  function pick(option) {
    value = option.value;
    open = false;
    active = -1;
    onpick?.(option);
  }

  /** @param {KeyboardEvent} event */
  function onkeydown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        open = true;
        active = -1;
        return;
      }
      if (!options.length) return;
      const last = options.length - 1;
      if (event.key === 'ArrowDown') active = active >= last ? 0 : active + 1;
      else active = active <= 0 ? last : active - 1;
    } else if (event.key === 'Enter' && open && options[active]) {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === 'Escape' && open && options.length) {
      event.preventDefault();
      open = false;
    } else if (event.key === 'Tab') {
      open = false;
    }
  }
</script>

<div class="relative {wrapClass}">
  <input
    type="text"
    role="combobox"
    aria-label={label}
    aria-autocomplete="list"
    aria-expanded={options.length > 0}
    aria-controls="{uid}-list"
    aria-activedescendant={options[active] ? `${uid}-${active}` : undefined}
    aria-invalid={invalid ? 'true' : undefined}
    autocomplete="off"
    autocapitalize="none"
    spellcheck="false"
    {placeholder}
    bind:value
    oninput={() => {
      open = true;
      active = -1;
      oninput?.();
    }}
    onfocus={() => {
      if (openOnFocus) open = true;
    }}
    onblur={() => (open = false)}
    {onkeydown}
    class="w-full {inputClass}"
  />
  {#if options.length}
    <ul
      id="{uid}-list"
      role="listbox"
      aria-label="{label}: suggestions"
      class="absolute {align === 'right' ? 'right-0' : 'left-0'} top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg {listClass}"
    >
      {#each options as option, i (option.value)}
        <!-- Picked by pointer here; the keyboard works from the field (aria-activedescendant). -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="{uid}-{i}"
          role="option"
          aria-selected={i === active}
          class="flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-body-sm text-on-surface {i === active ? 'bg-surface-container-high' : 'hover:bg-surface-container'}"
          onpointerdown={(e) => e.preventDefault()}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => pick(option)}
        >
          <span class="truncate">{option.label}</span>
          {#if option.hint}<span class="shrink-0 text-label-sm text-outline">{option.hint}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
