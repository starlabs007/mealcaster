<script module>
  import { storageKey } from '../lib/env.js';

  const DRAFT_KEY = storageKey('recipeDraft.v2');
  const EDIT_DRAFTS_KEY = storageKey('recipeEditDrafts.v1');
</script>

<script>
  import { onDestroy, tick } from 'svelte';
  import { createDraftStore, flatForm, savedGroups, sectionsOf, signature } from '../lib/recipeDraft.js';
  import { defaultAisle, defaultIngredientGroup, defaultStepTitle, groupCategory } from '../lib/sheetText.js';
  import { text } from '../lib/text.js';
  import { SvelteSet } from 'svelte/reactivity';
  import Icon from '../lib/components/Icon.svelte';
  import RecipeImage from '../lib/components/RecipeImage.svelte';
  import {
    recipes,
    recipeById,
    tagChoices,
    normalizeTag,
    TAG_MAX,
    categoryChoices,
    normalizeCategory,
    aisles,
    aisleLabel,
    parseQty,
    matchAisle,
    parseIngredientLines,
    saveRecipe,
    revertSample,
    newRecipeId,
  } from '../lib/recipes.svelte.js';
  import { SCHEMA, sheets, spreadsheetUrl } from '../lib/sheets.svelte.js';
  import { addIngredient as createIngredient, findIngredient, ingredientOf, ingredients } from '../lib/ingredients.svelte.js';
  import { UNIT_SUGGESTIONS, canonicalUnit, similarIngredients } from '../lib/ingredients.js';
  import { href, navigate } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { formatQty } from '../lib/format.js';
  import { renderMarkdown } from '../lib/markdown.js';
  import { toISO } from '../lib/dates.js';
  import { normalizeTags } from '../lib/tags.js';
  import { tagClasses } from '../lib/tagColors.svelte.js';
  import Combobox from '../lib/components/Combobox.svelte';
  import ActionMenu from '../lib/components/ActionMenu.svelte';
  import { HEADS_UP_MAX_LENGTH, MAX_EDITOR_LEAD } from '../lib/headsUps.js';

  /** @type {{ id?: string }} */
  let { id } = $props();

  // App.svelte keys this component by route, so reading the id once is intentional.
  // svelte-ignore state_referenced_locally
  const editing = id ? recipeById.get(id) : undefined;
  // svelte-ignore state_referenced_locally
  const missing = !!id && !editing;

  /**
   * An ingredient row's `text` is the ingredient's name: saving picks the ingredient with that name (or plural), or
   * creates one in `aisle`. `id` keeps the ingredient of a line whose name wasn't touched (so an unknown id survives).
   * A group is a section of rows; its `category` ("Protein"…) is the sheet's and survives a rename.
   * @typedef {{ key: number, qty: string, unit: string, text: string, id?: string, note: string, prep: string, optional: boolean, aisle: string, aisleSet: boolean }} IngredientRow
   * @typedef {{ key: number, title: string, category: string, rows: IngredientRow[] }} IngredientGroup
   * @typedef {{ key: number, title: string, text: string, minutes: string }} StepRow
   * @typedef {{
   *   title: string, description: string, image: string, category: string,
   *   serves: number, prepMinutes: number | '', cookMinutes: number | '', tags: string[],
   *   groups: IngredientGroup[], steps: StepRow[], notes: string, headsUp: string, headsUpDays: number,
   * }} Form   `headsUp` / `headsUpDays` edit the recipe's first heads-up; others (from the sheet) are kept as they are
   */

  let lastKey = 0;
  const nextKey = () => ++lastKey;
  /** @returns {IngredientRow} */
  const blankIngredient = () => ({ key: nextKey(), qty: '', unit: '', text: '', note: '', prep: '', optional: false, aisle: '', aisleSet: false });
  /** @returns {IngredientGroup} */
  const blankGroup = (rows = 1, title = '', category = '') => ({ key: nextKey(), title, category, rows: Array.from({ length: rows }, blankIngredient) });
  /** @returns {StepRow} */
  const blankStep = () => ({ key: nextKey(), title: '', text: '', minutes: '' });

  /** @returns {Form} */
  function blankForm() {
    return {
      title: '',
      description: '',
      image: '',
      category: '',
      serves: 4,
      prepMinutes: '',
      cookMinutes: '',
      tags: [],
      groups: [blankGroup(1)],
      steps: [blankStep()],
      notes: '',
      headsUp: '',
      headsUpDays: 0,
    };
  }

  /** @param {import('../lib/data/recipes.js').Recipe} r @returns {Form} */
  function formFrom(r) {
    return {
      title: r.title,
      description: r.description,
      image: r.image ?? '',
      category: r.badge.label,
      serves: r.serves,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      tags: [...r.tags],
      groups: r.ingredients.length
        ? r.ingredients.map((g) => ({
            key: nextKey(),
            title: g.title,
            category: g.category,
            rows: g.items.map((item) => {
              const ingredient = ingredientOf(item.id);
              return {
                key: nextKey(),
                qty: item.qty == null ? '' : formatQty(item.qty),
                unit: item.unit ?? '',
                text: ingredient?.name ?? item.id,
                id: item.id,
                note: item.note ?? '',
                prep: item.prep ?? '',
                optional: Boolean(item.optional),
                aisle: ingredient?.aisle ?? defaultAisle,
                aisleSet: true,
              };
            }),
          }))
        : [blankGroup(1)],
      steps: r.steps.map((s) => ({
        key: nextKey(),
        title: s.title,
        text: s.text,
        minutes: s.minutes ? String(s.minutes) : '',
      })),
      notes: r.notes ?? '',
      headsUp: r.headsUps?.[0]?.text ?? '',
      headsUpDays: r.headsUps?.[0]?.daysBefore ?? 0,
    };
  }

  const drafts = createDraftStore(localStorage, DRAFT_KEY, EDIT_DRAFTS_KEY);
  /** What the form looks like when nothing was changed: the recipe as saved, or a blank one. */
  const opened = editing ? formFrom(editing) : blankForm();
  const baseline = signature(opened);

  /** The saved draft with fresh row keys, so they can't collide with rows added from here on. @returns {Form | null} */
  function loadDraft() {
    // Edit drafts kept before heads-ups (#209) were signed without the two heads-up fields (they come last).
    const { headsUp, headsUpDays, ...beforeHeadsUps } = opened;
    let draft =
      drafts.read(editing?.id, baseline) ??
      (editing ? drafts.read(editing.id, signature(beforeHeadsUps)) ?? drafts.read(editing.id, signature(flatForm(beforeHeadsUps))) : null);
    if (!draft) return null;
    draft = { headsUp, headsUpDays, ...draft };
    if (!Array.isArray(draft.groups)) {
      const { ingredients: rows = [], steps, notes, ...head } = draft;
      const categoryOf = (title) => editing?.ingredients.find((g) => g.title.toLowerCase() === title.toLowerCase())?.category ?? '';
      const groups = sectionsOf(rows, categoryOf);
      draft = { ...head, groups: groups.length ? groups : [blankGroup(1)], steps, notes };
    }
    draft.groups = draft.groups.map((g) => ({
      ...blankGroup(0),
      ...g,
      key: nextKey(),
      rows: (g.rows ?? []).map((row) => ({ ...blankIngredient(), ...row, key: nextKey() })),
    }));
    draft.steps = draft.steps.map((step) => ({ ...step, key: nextKey() }));
    draft.tags = normalizeTags(draft.tags);
    draft.category = normalizeCategory(draft.category);
    return draft;
  }

  const savedDraft = loadDraft();
  let notesPreview = $state(false);
  let stepPreview = $state(false);
  let form = $state(savedDraft ?? (editing ? formFrom(editing) : blankForm()));

  // ---- Unsaved changes -----------------------------------------------------------
  // Any change is kept as a draft shortly after the last keystroke, so leaving the editor by any route (Discard
  // aside) loses nothing. `kept` says whether the latest change made it into storage yet.

  const dirty = $derived(signature($state.snapshot(form)) !== baseline);
  /** @type {'clean' | 'pending' | 'kept' | 'full'} */
  let keeping = $state('clean');
  /** Set once the editor is closed on purpose (saved or discarded): nothing is kept after that. */
  let finished = false;

  /** Writes the draft now; false when the device has no room. */
  function keepDraft() {
    const ok = drafts.write(editing?.id, $state.snapshot(form), baseline);
    keeping = ok ? 'kept' : 'full';
    return ok;
  }

  $effect(() => {
    if (finished) return;
    if (!dirty) {
      drafts.clear(editing?.id);
      keeping = 'clean';
      return;
    }
    // `dirty` stays true while typing, so the effect follows the form itself.
    $state.snapshot(form);
    keeping = 'pending';
    const timer = setTimeout(() => {
      if (!keepDraft()) showToast(text.editor.toasts.draftNoSpace);
    }, 800);
    return () => clearTimeout(timer);
  });

  // Closing the tab or reloading: the draft is written first; the browser's own warning appears only if it can't be.
  $effect(() => {
    /** @param {BeforeUnloadEvent} event */
    const onUnload = (event) => {
      if (finished || !dirty) return;
      if (!keepDraft()) event.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  });

  // Leaving by a header tab, a link or Back: keep the draft and say so.
  onDestroy(() => {
    if (finished || !dirty) return;
    showToast(keepDraft() ? text.editor.toasts.draftKept : text.editor.toasts.draftNoSpace);
  });

  // ---- Category ------------------------------------------------------------------
  // One field: pick a category the recipe box uses, or type a new one.
  const categoryOptions = $derived(categoryChoices(recipes.map((r) => r.badge.label)).map((c) => ({ value: c, label: c })));

  const chosenCategory = () => normalizeCategory(form.category);

  // ---- Tags ----------------------------------------------------------------------
  let newTag = $state('');
  const tagOptions = $derived(tagChoices([...recipes.flatMap((r) => r.tags), ...form.tags]));
  const tagColor = $derived(tagClasses(tagOptions));

  /** form.tags plus whatever is typed in the new-tag box (commas separate tags). */
  function withNewTag() {
    const typed = newTag.split(',').map(normalizeTag).filter(Boolean);
    return [...new Set([...form.tags, ...typed])];
  }

  function addTag() {
    form.tags = withNewTag();
    newTag = '';
  }

  /** Tags the recipe doesn't have yet, offered as you type. */
  const tagSuggestions = $derived(tagOptions.filter((t) => !form.tags.includes(t)).map((t) => ({ value: t, label: t })));

  /** @param {string} tag */
  function removeTag(tag) {
    const index = form.tags.indexOf(tag);
    form.tags = form.tags.filter((t) => t !== tag);
    // Focus moves to the next chip, else the field to add one.
    tick().then(() => {
      const chips = document.querySelectorAll('#recipe-tags [data-tag]');
      /** @type {HTMLElement | null} */ (chips[Math.min(index, chips.length - 1)] ?? document.getElementById('recipe-new-tag'))?.focus();
    });
  }
  let submitted = $state(false);

  // Lead times offered for the heads-up: up to two days, or further when the sheet already says so.
  const leadOptions = $derived(Array.from({ length: Math.max(MAX_EDITOR_LEAD, form.headsUpDays) + 1 }, (_, n) => n));
  /** Heads-ups the form doesn't show (the sheet can hold more than the editor's one). */
  const moreHeadsUps = Math.max(0, (editing?.headsUps?.length ?? 0) - 1);
  let bulkOpen = $state(false);
  // The paste rules, shown under the paste box on request so they can stay open while typing.
  let pasteHelpOpen = $state(false);
  let bulkText = $state('');
  let photoError = $state('');
  let dragging = $state(false);
  /** @type {HTMLInputElement} */
  let fileInput = $state();

  // ---- Validation ----------------------------------------------------------

  const minutesOk = (m) => m == null || m === '' || (Number.isInteger(m) && m >= 0);
  const allRows = $derived(form.groups.flatMap((g) => g.rows));
  /** Each row's number, counted across groups, for labels that name a row. */
  const rowNumber = $derived(new Map(allRows.map((r, i) => [r.key, i + 1])));
  const filledIngredients = $derived(allRows.filter((r) => r.text.trim()));
  const qtyInvalid = $derived(new Set(allRows.filter((r) => Number.isNaN(parseQty(r.qty))).map((r) => r.key)));
  // A new ingredient nothing in its name places gets no aisle until it's chosen: never a silent Pantry.
  const aisleMissing = $derived(
    new Set(filledIngredients.filter((r) => !r.aisle && !rowIngredient(r) && !(r.id && r.text.trim() === r.id)).map((r) => r.key)),
  );
  const errors = $derived({
    title: form.title.trim() ? '' : text.editor.errors.title,
    serves: Number.isInteger(form.serves) && form.serves >= 1 && form.serves <= 50 ? '' : text.editor.errors.serves,
    // Prep and cook may stay empty: no time is saved as 0, which every screen leaves out.
    prepMinutes: minutesOk(form.prepMinutes) ? '' : text.editor.errors.minutes,
    cookMinutes: minutesOk(form.cookMinutes) ? '' : text.editor.errors.minutes,
    ingredients: filledIngredients.length ? '' : text.editor.errors.ingredients,
    qty: qtyInvalid.size ? text.editor.errors.qty : '',
    aisle: aisleMissing.size ? text.editor.errors.aisle : '',
  });
  const valid = $derived(Object.values(errors).every((e) => !e));

  /** What a failed Save lists, top to bottom: each one finds its field. @type {{ id: string, label: string, find: () => HTMLElement | null | undefined }[]} */
  const problems = $derived.by(() => {
    const list = [];
    const byId = (id) => () => document.getElementById(id);
    for (const key of ['title', 'serves', 'prepMinutes', 'cookMinutes']) {
      if (errors[key]) list.push({ id: key, label: text.editor.problems[key], find: byId(`recipe-${key === 'title' ? 'title' : key}`) });
    }
    const rowField = (key, selector) => () => document.querySelector(`#ingredients [data-row="${key}"] ${selector}`);
    if (errors.ingredients) {
      list.push({ id: 'ingredients', label: text.editor.problems.ingredients, find: () => document.querySelector('#ingredients [data-row]')?.querySelectorAll('[role=combobox]')[1] });
    }
    allRows.forEach((row, i) => {
      if (qtyInvalid.has(row.key)) list.push({ id: `qty-${row.key}`, label: text.editor.problems.qty(i + 1), find: rowField(row.key, 'input[aria-invalid="true"]') });
      if (aisleMissing.has(row.key)) list.push({ id: `aisle-${row.key}`, label: text.editor.problems.aisle(i + 1), find: rowField(row.key, 'select') });
    });
    return list;
  });

  // Focus scrolls keep clear of the sticky save bar (`scroll-padding-bottom` in app.css): its height (it grows when the
  // problems row shows), plus its offset and room for a two-line error under a field. Toasts sit just above it.
  /** @type {HTMLElement | undefined} */
  let saveBar = $state();
  function clearSaveBar() {
    if (!saveBar) return;
    const root = document.documentElement.style;
    root.setProperty('--save-bar-clearance', `${saveBar.offsetHeight + 64}px`);
    root.setProperty('--toast-clearance', `${saveBar.offsetHeight + 8}px`);
  }
  $effect(() => {
    clearSaveBar();
    const observer = new ResizeObserver(clearSaveBar);
    if (saveBar) observer.observe(saveBar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--save-bar-clearance');
      document.documentElement.style.removeProperty('--toast-clearance');
    };
  });

  /**
   * Chrome scrolls a focused textarea only as far as its caret, leaving the rest of a box with text in it under the
   * header or the save bar. Bring in the whole box when it fits between them.
   * @param {FocusEvent} event
   */
  function revealTextarea(event) {
    const node = event.target;
    if (!(node instanceof HTMLTextAreaElement)) return;
    const { scrollPaddingTop, scrollPaddingBottom } = getComputedStyle(document.documentElement);
    if (node.offsetHeight <= innerHeight - parseFloat(scrollPaddingTop) - parseFloat(scrollPaddingBottom)) node.scrollIntoView({ block: 'nearest' });
  }

  /** @param {{ find: () => HTMLElement | null | undefined }} problem */
  function goTo(problem) {
    // Right after a failed Save the observer hasn't seen the problems row yet.
    clearSaveBar();
    const el = problem.find();
    el?.focus();
    el?.scrollIntoView({ block: 'center' });
  }
  const show = (key) => submitted && errors[key];

  // Every ingredient, offered as you type its name (found by its plural too), with its aisle.
  const ingredientSuggestions = $derived(
    ingredients
      .map((i) => ({ value: i.name, label: i.name, hint: aisleLabel(i.aisle), keys: i.plural ? [i.plural] : [] }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  /** The existing ingredient a row names, if any. @param {IngredientRow} row */
  const rowIngredient = (row) =>
    (row.id && ingredientOf(row.id)?.name === row.text.trim() ? ingredientOf(row.id) : undefined) ?? findIngredient(row.text);

  // ---- Ingredients ---------------------------------------------------------

  const groupKeyOf = (rowKey) => form.groups.find((g) => g.rows.some((r) => r.key === rowKey))?.key;
  /** A group's name as menus show it: its title, else "Group 2". @param {IngredientGroup} group */
  const groupName = (group) => group.title.trim() || text.editor.ingredients.untitledGroup(form.groups.indexOf(group) + 1);
  const isBlank = (row) => !row.text.trim() && !row.qty.trim() && !row.unit.trim() && !row.note.trim() && !row.prep.trim();

  /** Focuses a row's quantity (or `selector` in it) once the list has re-rendered. @param {number} key */
  async function focusIngredient(key, selector = 'input') {
    await tick();
    /** @type {HTMLElement | null} */ (document.querySelector(`#ingredients [data-row="${key}"] ${selector}`))?.focus();
  }

  /** @param {string} selector */
  async function focusIn(selector) {
    await tick();
    /** @type {HTMLElement | null} */ (document.querySelector(selector))?.focus();
  }

  /** Puts focus in the first field of the list's `index`th row, once the list has re-rendered. @param {string} list @param {number} index */
  async function focusRow(list, index) {
    await tick();
    document.querySelector(`${list} > :nth-child(${index + 1}) input`)?.focus();
  }

  /** Adds an empty row to a group, after row `at` (else at the end), and puts the cursor in it. @param {IngredientGroup} group @param {number} [at] */
  function addIngredient(group, at = group.rows.length - 1) {
    const row = blankIngredient();
    group.rows.splice(at + 1, 0, row);
    focusIngredient(row.key);
  }

  /** @param {number} key */
  function removeIngredient(key) {
    const group = form.groups.find((g) => g.key === groupKeyOf(key));
    if (!group) return;
    const index = group.rows.findIndex((r) => r.key === key);
    const row = $state.snapshot(group.rows[index]);
    group.rows.splice(index, 1);
    if (!allRows.length) group.rows.push(blankIngredient());
    // Focus: the next row, else the one before, else the group's Add button.
    const next = group.rows[index] ?? group.rows[index - 1];
    if (next) focusIngredient(next.key);
    else focusIn(`#ingredients [data-group="${group.key}"] [data-add-row]`);
    if (isBlank(row)) return;
    showToast(text.editor.toasts.ingredientRemoved(row.text.trim()), {
      label: text.common.undo,
      run: () => {
        const home = form.groups.find((g) => g.key === group.key) ?? form.groups[0];
        const restored = { ...row, key: nextKey() };
        home.rows.splice(Math.min(index, home.rows.length), 0, restored);
        focusIngredient(restored.key);
      },
    });
  }

  /** Moves a row to the end of another group. @param {number} key @param {IngredientGroup} target */
  function moveIngredient(key, target) {
    const from = form.groups.find((g) => g.key === groupKeyOf(key));
    if (!from || from === target) return;
    const [row] = from.rows.splice(from.rows.findIndex((r) => r.key === key), 1);
    target.rows.push(row);
    focusIngredient(key, '[aria-haspopup="menu"]');
    showToast(text.editor.toasts.ingredientMoved(row.text.trim(), groupName(target)));
  }

  /** Opens a row's note / prep / optional fields and puts the cursor in the note. @param {IngredientRow} row */
  function openDetails(row) {
    detailsOpen.add(row.key);
    focusIngredient(row.key, `#details-${row.key} input`);
  }

  /** A row's ⋯ menu. @param {IngredientRow} row @param {IngredientGroup} group */
  const rowActions = (row, group) => [
    detailsOpen.has(row.key)
      ? { id: 'details', label: text.editor.ingredients.hideDetails, icon: 'expand_less', onselect: () => detailsOpen.delete(row.key) }
      : { id: 'details', label: text.editor.ingredients.showDetails, icon: 'tune', onselect: () => openDetails(row) },
    ...form.groups
      .filter((g) => g !== group)
      .map((g) => ({ id: `move-${g.key}`, label: text.editor.ingredients.moveTo(groupName(g)), icon: 'drive_file_move', onselect: () => moveIngredient(row.key, g) })),
    { id: 'remove', label: text.editor.ingredients.remove, icon: 'delete', divider: true, onselect: () => removeIngredient(row.key) },
  ];

  /** A group heading's ⋯ menu. @param {number} index */
  const groupActions = (index) => [
    ...(index > 0 ? [{ id: 'up', label: text.editor.ingredients.moveGroupUp, icon: 'arrow_upward', onselect: () => moveGroup(index, -1) }] : []),
    ...(index < form.groups.length - 1 ? [{ id: 'down', label: text.editor.ingredients.moveGroupDown, icon: 'arrow_downward', onselect: () => moveGroup(index, 1) }] : []),
    {
      id: 'delete',
      label: text.editor.ingredients.deleteGroup,
      note: index === 0 ? text.editor.ingredients.deleteFirstGroupNote : text.editor.ingredients.deleteGroupNote,
      icon: 'delete',
      divider: index > 0 || form.groups.length > 1,
      onselect: () => deleteGroup(index),
    },
  ];

  /** "Add group": a second (or further) section, with the cursor in its name. */
  function addGroup() {
    const group = blankGroup(1);
    form.groups.push(group);
    focusIn(`#ingredients [data-group="${group.key}"] [data-group-title]`);
  }

  /** @param {number} index @param {-1 | 1} delta */
  function moveGroup(index, delta) {
    const groups = [...form.groups];
    [groups[index], groups[index + delta]] = [groups[index + delta], groups[index]];
    form.groups = groups;
    focusIn(`#ingredients [data-group="${groups[index + delta].key}"] [data-group-title]`);
  }

  /** Deletes a group; its ingredients join the group above (the next one for the first). @param {number} index */
  function deleteGroup(index) {
    const group = $state.snapshot(form.groups[index]);
    const target = form.groups[index === 0 ? 1 : index - 1];
    if (!target) return;
    const moved = group.rows.filter((r) => !isBlank(r));
    if (index === 0) target.rows.unshift(...moved);
    else target.rows.push(...moved);
    form.groups.splice(index, 1);
    if (form.groups.length > 1) focusIn(`#ingredients [data-group="${target.key}"] [data-group-title]`);
    else if (moved.length) focusIngredient(moved[0].key);
    else focusIngredient(target.rows[0]?.key ?? 0);
    if (!moved.length && !group.title.trim()) return;
    showToast(text.editor.toasts.groupDeleted(group.title.trim(), moved.length, groupName(target)), {
      label: text.common.undo,
      run: () => {
        const movedKeys = new Set(moved.map((r) => r.key));
        for (const g of form.groups) g.rows = g.rows.filter((r) => !movedKeys.has(r.key));
        if (form.groups.every((g) => !g.rows.length)) form.groups[0]?.rows.push(blankIngredient());
        const restored = { ...group, rows: group.rows.map((r) => ({ ...r })) };
        form.groups.splice(Math.min(index, form.groups.length), 0, restored);
        focusIn(`#ingredients [data-group="${restored.key}"] [data-group-title]`);
      },
    });
  }

  /** "(flank or ribeye), sliced · optional" — the hidden details at a glance. @param {IngredientRow} row */
  const detailsSummary = (row) =>
    [[row.note.trim() && `(${row.note.trim()})`, row.prep.trim()].filter(Boolean).join(', '), row.optional && text.editor.ingredients.optionalWord]
      .filter(Boolean)
      .join(' · ');

  // Rows showing their note / prep / optional fields. All start closed: a row that uses them shows a one-line summary
  // under it, which opens them (as does the row's ⋯ menu).
  const detailsOpen = new SvelteSet();

  /**
   * Uses an existing ingredient for a row whose name looked like a new one ("yellow onion" → onion); the extra
   * words become the note unless it has one.
   * @param {IngredientRow} row @param {{ ingredient: import('../lib/ingredients.js').Ingredient, note: string }} match
   */
  function useExisting(row, { ingredient, note }) {
    row.text = ingredient.name;
    row.aisle = ingredient.aisle;
    if (note && !row.note.trim()) row.note = note;
  }

  /** An existing ingredient brings its aisle; a new one gets a guess until you pick one. @param {IngredientRow} row */
  function onIngredientText(row) {
    const existing = rowIngredient(row);
    if (existing) row.aisle = existing.aisle;
    else if (!row.aisleSet) row.aisle = matchAisle(row.text);
  }

  /** Pasted lines fill the groups: a line under "Sauce:" joins the Sauce group (made if there is none), the rest the last group. */
  function addBulk() {
    const last = form.groups.at(-1);
    const parsed = parseIngredientLines(bulkText, last.title);
    if (!parsed.length) {
      showToast(text.editor.toasts.noIngredientsFound);
      return;
    }
    for (const g of form.groups) g.rows = g.rows.filter((r) => r.text.trim() || r.qty.trim() || r.unit.trim());
    const added = [];
    for (const { group: title, ...parsedRow } of parsed) {
      const existing = findIngredient(parsedRow.text);
      const row = { ...blankIngredient(), ...parsedRow, aisle: existing?.aisle ?? parsedRow.aisle, key: nextKey() };
      let group = title === last.title ? last : form.groups.find((g) => g.title.trim().toLowerCase() === title.trim().toLowerCase());
      if (!group) form.groups.push((group = blankGroup(0, title.trim())));
      group.rows.push(row);
      added.push(row);
    }
    // An untitled group the paste emptied (the blank rows of a new recipe) goes.
    const kept = form.groups.filter((g) => g.rows.length || g.title.trim());
    form.groups = kept.length ? kept : [blankGroup(1)];
    showToast(text.editor.toasts.addedIngredients(parsed.length));
    bulkText = '';
    bulkOpen = false;
  }

  // ---- Steps -----------------------------------------------------------------

  /** A step's ⋯ menu. @param {number} index @param {number} key */
  const stepActions = (index, key) => [
    ...(index > 0 ? [{ id: 'up', label: text.editor.method.moveUp, icon: 'arrow_upward', onselect: () => moveStep(index, -1) }] : []),
    ...(index < form.steps.length - 1 ? [{ id: 'down', label: text.editor.method.moveDown, icon: 'arrow_downward', onselect: () => moveStep(index, 1) }] : []),
    { id: 'remove', label: text.editor.method.remove, icon: 'delete', divider: form.steps.length > 1, onselect: () => removeStep(key) },
  ];

  /**
   * Grows a textarea to fit its text (never below its `rows`), on typing and when the text changes from outside
   * (Undo, a restored draft). Dragging the corner still works until the next change.
   * @param {HTMLTextAreaElement} node @param {string} _value
   */
  function autogrow(node, _value) {
    const fit = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight + node.offsetHeight - node.clientHeight}px`;
    };
    fit();
    node.addEventListener('input', fit);
    // Text wraps differently once the web font loads or the column changes width.
    document.fonts?.ready.then(fit);
    let width = node.clientWidth;
    const resized = new ResizeObserver(() => {
      if (node.clientWidth === width) return;
      width = node.clientWidth;
      fit();
    });
    resized.observe(node);
    return {
      update: fit,
      destroy: () => {
        node.removeEventListener('input', fit);
        resized.disconnect();
      },
    };
  }

  /** @param {number} index @param {-1 | 1} delta */
  function moveStep(index, delta) {
    const steps = [...form.steps];
    [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
    form.steps = steps;
  }

  /** @param {number} key */
  function removeStep(key) {
    const index = form.steps.findIndex((s) => s.key === key);
    const step = $state.snapshot(form.steps[index]);
    form.steps = form.steps.filter((s) => s.key !== key);
    if (!form.steps.length) form.steps.push(blankStep());
    focusRow('#step-rows', Math.min(index, form.steps.length - 1));
    if (!step.title.trim() && !step.text.trim() && !step.minutes.trim()) return;
    showToast(text.editor.toasts.stepRemoved(index + 1), {
      label: text.common.undo,
      run: () => {
        const steps = form.steps.filter((s) => s.title.trim() || s.text.trim() || s.minutes.trim());
        steps.splice(Math.min(index, steps.length), 0, { ...step, key: nextKey() });
        form.steps = steps;
        focusRow('#step-rows', Math.min(index, steps.length - 1));
      },
    });
  }

  // ---- Photo -----------------------------------------------------------------

  /** Downscales an uploaded photo to a JPEG data URL small enough for local storage. */
  async function usePhoto(file) {
    photoError = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) {
      photoError = text.editor.photo.wrongType;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      photoError = text.editor.photo.tooBig;
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
      const canvas = Object.assign(document.createElement('canvas'), {
        width: Math.round(bitmap.width * scale),
        height: Math.round(bitmap.height * scale),
      });
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      form.image = canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      photoError = text.editor.photo.unreadable;
    }
  }

  function onDrop(event) {
    event.preventDefault();
    dragging = false;
    usePhoto(event.dataTransfer?.files?.[0]);
  }

  const uploaded = $derived(form.image.startsWith('data:'));

  // ---- Save / draft ------------------------------------------------------------

  /**
   * The ingredient id for a row: the line's own unknown id while its text wasn't changed, an existing
   * ingredient with that name, or a new ingredient in the row's aisle.
   * @param {IngredientRow} row
   */
  function rowIngredientId(row) {
    if (row.id && !ingredientOf(row.id) && row.text.trim() === row.id) return row.id;
    return (rowIngredient(row) ?? createIngredient({ name: row.text, aisle: row.aisle })).id;
  }

  /** The recipe as saved; ingredients that don't exist yet are added. */
  function toRecipe() {
    // Group categories ("Protein", "Aromatics"…) travel with their section, so a renamed group keeps its own.
    const originalCategory = new Map(editing?.ingredients.map((g) => [g.title.toLowerCase(), g.category]) ?? []);
    const groups = savedGroups(form.groups, {
      fallbackTitle: defaultIngredientGroup,
      category: (g) => originalCategory.get(g.title.toLowerCase()) || groupCategory(g.items.length),
      item: (row) => {
        const qty = parseQty(row.qty);
        const unit = canonicalUnit(row.unit);
        return {
          id: rowIngredientId(row),
          ...(qty !== undefined && { qty }),
          ...(unit && { unit }),
          ...(row.note.trim() && { note: row.note.trim() }),
          ...(row.prep.trim() && { prep: row.prep.trim() }),
          ...(row.optional && { optional: true }),
        };
      },
    });

    const title = form.title.trim();
    const image = form.image.trim();
    const notes = form.notes.trim();

    // Start from the existing recipe so fields the form doesn't show (
    // cook count, sheet row…) are kept; new recipes start blank.
    const { minutes, ...base } = editing
      ? $state.snapshot(editing)
      : { minutes: 0, addedAt: toISO(new Date()), custom: true };
    const recipe = {
      ...base,
      id: editing?.id ?? newRecipeId(title),
      title,
      shortTitle: editing && title === editing.title ? editing.shortTitle : title,
      description: form.description.trim(),
      image: image || undefined,
      prepMinutes: form.prepMinutes || 0,
      cookMinutes: form.cookMinutes || 0,
      serves: form.serves,
      badge: { label: chosenCategory() },
      tags: withNewTag(),
      notes,
      ingredients: groups,
      steps: form.steps
        .filter((s) => s.text.trim())
        .map((s, i) => ({
          title: s.title.trim() || defaultStepTitle(i + 1),
          minutes: Number(s.minutes) || 0,
          text: s.text.trim(),
        })),
      headsUps: savedHeadsUps(base.headsUps),
    };
    if (!recipe.image) delete recipe.image;
    // A sheet cell that didn't parse is replaced once the recipe has a heads-up of its own.
    if (recipe.headsUps.length) delete recipe.headsUpsRaw;
    return recipe;
  }

  /** The form's heads-up as the first one, in place of the one it was opened with; keys it doesn't show are kept. */
  function savedHeadsUps(previous = []) {
    const [first, ...others] = previous;
    const headsUpText = form.headsUp.trim();
    return headsUpText ? [{ ...first, text: headsUpText, daysBefore: form.headsUpDays }, ...others] : others;
  }

  function save() {
    submitted = true;
    if (!valid) {
      // Wait for the error styles to render, then jump to the first problem, centred like its chip does.
      tick().then(() => goTo(problems[0]));
      return;
    }
    const recipe = toRecipe();
    try {
      saveRecipe(recipe);
    } catch (error) {
      showToast(error.message);
      return;
    }
    finished = true;
    drafts.clear(editing?.id);
    showToast(editing ? text.editor.toasts.updated : text.editor.toasts.added(recipe.title));
    navigate(`/recipe/${recipe.id}`);
  }

  function revert() {
    const previous = $state.snapshot(editing);
    revertSample(editing.id);
    navigate(`/recipe/${editing.id}`);
    showToast(text.editor.toasts.reverted, {
      label: text.common.undo,
      run: () => {
        const { minutes, ...recipe } = previous;
        saveRecipe(recipe);
      },
    });
  }

  function discard() {
    const previous = $state.snapshot(form);
    const wasDirty = dirty;
    drafts.clear(editing?.id);
    if (editing) {
      finished = true;
      navigate(`/recipe/${editing.id}`);
      if (!wasDirty) return;
      showToast(text.editor.toasts.changesDiscarded, {
        label: text.common.undo,
        run: () => {
          // The editor reopens on the draft.
          if (drafts.write(editing.id, previous, baseline)) navigate(`/recipe/${editing.id}/edit`);
          else showToast(text.editor.toasts.draftNoSpace);
        },
      });
      return;
    }
    form = blankForm();
    submitted = false;
    showToast(text.editor.toasts.draftDiscarded, {
      label: text.common.undo,
      run: () => {
        form = previous;
      },
    });
  }

  let showMapping = $state(false);
  const columnLetter = (i) => String.fromCharCode(65 + i);

  // On touch every field is 44 px tall with 16 px text (iOS Safari zooms into anything smaller); `fine:` keeps the
  // compact desktop sizes.
  const field =
    'min-h-11 w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-lg text-on-surface placeholder:text-on-surface-variant/80 focus:outline-none focus:ring-2 focus:ring-primary-container fine:min-h-0 fine:text-body-md';
  const border = (bad) => (bad ? 'border-error' : 'border-outline-variant');
  // Placeholders, here and in `field`: lighter than typed text but readable (5.3:1 on white).
  const cellField =
    'min-h-11 min-w-0 rounded-md border bg-surface-container-lowest px-2 py-1.5 text-body-lg text-on-surface placeholder:text-on-surface-variant/80 focus:outline-none focus:ring-2 focus:ring-primary-container fine:min-h-0 fine:text-body-sm';
  // Discard and Revert sit behind ⋯ in the phone save bar.
  const saveMenu = $derived([
    ...(editing?.edited ? [{ id: 'revert', label: text.editor.actions.revert, icon: 'restore', onselect: revert }] : []),
    {
      id: 'discard',
      label: editing ? text.editor.actions.discardChanges : text.editor.actions.discardDraft,
      icon: 'delete_sweep',
      divider: Boolean(editing?.edited),
      onselect: discard,
    },
  ]);
  // The save bar's one status line.
  const status = $derived(
    {
      clean: { icon: 'check', label: text.editor.actions.noChanges },
      pending: { icon: 'edit', label: text.editor.actions.unsaved },
      kept: { icon: 'edit', label: text.editor.actions.unsavedKept },
      full: { icon: 'warning', label: text.editor.actions.unsavedFull },
    }[keeping],
  );
  // Ingredient rows and the labels over them: qty · unit · name · aisle (from md) · ⋯.
  const rowGrid = 'grid grid-cols-[3rem_4.5rem_minmax(0,1fr)_auto] items-center gap-1.5 md:grid-cols-[3.5rem_5rem_minmax(0,1fr)_8rem_auto] md:gap-2';
  // What sits under a row lines up with its name from md (3.5rem + 5rem + two gaps).
  const indent = 'md:pl-[9.5rem]';
</script>

{#snippet fieldLabel(label, forId = undefined, required = false)}
  <label for={forId} class="mb-1.5 block text-label-md text-on-surface">
    {label}{#if required}<span class="text-secondary">&nbsp;*</span>{:else}<span class="text-on-surface-variant">&nbsp;{text.editor.optional}</span>{/if}
  </label>
{/snippet}

{#snippet errorText(id, message)}
  <p id="err-{id}" class="mt-1 flex items-start gap-1 text-body-sm text-error">
    <Icon name="error" class="mt-px shrink-0 text-[16px]" /><span>{message}</span>
  </p>
{/snippet}

{#snippet error(key)}
  {#if show(key)}{@render errorText(key, errors[key])}{/if}
{/snippet}

{#snippet writePreview(preview, set)}
  <div class="inline-flex rounded-lg bg-surface-container-low p-0.5 text-label-sm">
    {#each [[false, text.editor.method.write], [true, text.editor.method.preview]] as [on, label] (label)}
      <button
        type="button"
        aria-pressed={preview === on}
        class="min-h-11 rounded-md px-3 py-1 fine:min-h-0 {preview === on ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
        onclick={() => set(on)}
      >{label}</button>
    {/each}
  </div>
{/snippet}

{#snippet numberField(key, label, icon, unit, required = true)}
  <div>
    <label for="recipe-{key}" class="mb-1.5 flex items-center gap-1 text-label-md text-on-surface">
      {#if icon}<Icon name={icon} class="text-[16px] text-secondary" />{/if}{label}{#if required}<span class="text-secondary">&nbsp;*</span>{:else}<span class="text-on-surface-variant">&nbsp;{text.editor.optional}</span>{/if}
    </label>
    <div class="flex items-center gap-2">
      <input
        id="recipe-{key}"
        type="number"
        min={key === 'serves' ? 1 : 0}
        step="1"
        inputmode="numeric"
        placeholder={required ? undefined : text.editor.essentials.minutesPlaceholder}
        bind:value={form[key]}
        aria-invalid={show(key) ? 'true' : undefined}
        aria-describedby={show(key) ? `err-${key}` : undefined}
        class="{field} {border(show(key))}"
      />
      <span class="shrink-0 text-body-sm text-on-surface-variant">{unit}</span>
    </div>
    {@render error(key)}
  </div>
{/snippet}

{#if missing}
  <div class="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
    <Icon name="edit_off" class="text-[40px] text-outline" />
    <h1 class="font-display text-headline-lg text-on-surface">{text.editor.notFound.title}</h1>
    <p class="text-body-md text-on-surface-variant">{text.editor.notFound.body}</p>
    <div class="mt-2 flex flex-wrap justify-center gap-2">
      <a href={href('/recipe/new')} class="btn-primary py-2"><Icon name="add" class="text-[16px]" /> {text.editor.notFound.addCustom}</a>
      <a href={href('/catalog')} class="btn-outline py-2">{text.editor.notFound.browse}</a>
    </div>
  </div>
{:else}
  <div class="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter py-6 md:px-gutter-desktop">
    <!-- Title -->
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <nav aria-label={text.editor.header.breadcrumbAria} class="flex flex-wrap items-center gap-1 text-label-md text-on-surface-variant">
          <a href={href('/catalog')} class="hover:text-primary">{text.editor.header.catalog}</a>
          <Icon name="chevron_right" class="text-[16px] text-outline" />
          {#if editing}
            <a href={href(`/recipe/${editing.id}`)} class="max-w-[16rem] truncate hover:text-primary">{editing.title}</a>
            <Icon name="chevron_right" class="text-[16px] text-outline" />
            <span class="text-primary" aria-current="page">{text.editor.header.edit}</span>
          {:else}
            <span class="text-primary" aria-current="page">{text.editor.header.createNew}</span>
          {/if}
        </nav>
        <h1 class="mt-2 font-display text-headline-lg-mobile tracking-tight text-primary md:text-headline-xl">
          {editing ? text.editor.header.titleEdit : text.editor.header.titleNew}
        </h1>
      </div>
      {#if savedDraft}
        <span class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-fixed/60 px-3 py-1 text-label-sm text-primary md:self-auto">
          <Icon name="history" class="text-[15px]" /> {text.editor.header.restoredDraft}
        </span>
      {/if}
    </div>

    <form class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12" novalidate onfocusin={revealTextarea} onsubmit={(e) => { e.preventDefault(); save(); }}>
      <!-- Left column -->
      <div class="flex flex-col gap-6 lg:col-span-5">
        <section class="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="restaurant_menu" class="text-[20px] text-primary" /> {text.editor.essentials.title}
            </h2>
            <span class="text-body-sm text-on-surface-variant"><span class="text-secondary">*</span> {text.editor.required}</span>
          </div>

          <div>
            {@render fieldLabel(text.editor.essentials.recipeTitle, 'recipe-title', true)}
            <input
              id="recipe-title"
              type="text"
              bind:value={form.title}
              maxlength="120"
              placeholder={text.editor.essentials.titlePlaceholder}
              aria-invalid={show('title') ? 'true' : undefined}
              aria-describedby={show('title') ? 'err-title' : undefined}
              class="{field} {border(show('title'))}"
            />
            {@render error('title')}
          </div>

          <div>
            {@render fieldLabel(text.editor.essentials.description, 'recipe-description')}
            <textarea
              id="recipe-description"
              rows="2"
              bind:value={form.description}
              maxlength="400"
              placeholder={text.editor.essentials.descriptionPlaceholder}
              use:autogrow={form.description}
              class="{field} {border(false)} resize-y"
            ></textarea>
          </div>

          <div>
            {@render fieldLabel(text.editor.essentials.headsUp, 'recipe-heads-up')}
            <!-- Side by side where the card is wide enough for the sentence; stacked in the narrow column. -->
            <div class="flex flex-wrap gap-2">
              <input
                id="recipe-heads-up"
                type="text"
                bind:value={form.headsUp}
                maxlength={HEADS_UP_MAX_LENGTH}
                placeholder={text.editor.essentials.headsUpPlaceholder}
                aria-describedby="recipe-heads-up-hint"
                class="{field} {border(false)} min-w-[min(100%,20rem)] flex-1"
              />
              <!-- Disabled until there's a heads-up to time. -->
              <select
                aria-label={text.editor.essentials.headsUpWhen}
                bind:value={form.headsUpDays}
                disabled={!form.headsUp.trim()}
                class="{field} {border(false)} disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant !w-auto"
              >
                {#each leadOptions as n (n)}
                  <option value={n}>{text.common.headsUps.lead(n)}</option>
                {/each}
              </select>
            </div>
            <p id="recipe-heads-up-hint" class="mt-1.5 text-body-sm text-on-surface-variant">
              {text.editor.essentials.headsUpHint}{#if moreHeadsUps}
                {' '}{text.editor.essentials.headsUpMore(moreHeadsUps)}{/if}
            </p>
          </div>

          <div>
            {@render fieldLabel(text.editor.photo.label)}
            <!-- svelte-ignore a11y_no_static_element_interactions (drop target; the button inside is the keyboard path) -->
            <!-- Below sm: one row (camera + Add photo, or a thumbnail + Replace / Remove) instead of the 192 px drop zone. -->
            <div
              class="relative overflow-hidden rounded-xl border-2 border-dashed transition-colors sm:h-48 {dragging
                ? 'border-primary bg-primary-fixed/30'
                : 'border-outline-variant bg-surface-container-low'} {form.image ? 'max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:p-1.5' : ''}"
              ondragover={(e) => { e.preventDefault(); dragging = true; }}
              ondragleave={() => (dragging = false)}
              ondrop={onDrop}
            >
              {#if form.image}
                {#key form.image}
                  <RecipeImage src={form.image} alt={text.editor.photo.previewAlt} class="h-full w-full max-sm:h-16 max-sm:w-20 max-sm:shrink-0 max-sm:rounded-lg" />
                {/key}
                <div class="flex gap-1.5 max-sm:ml-auto sm:absolute sm:bottom-2 sm:right-2">
                  <button type="button" class="btn min-h-11 bg-surface-container-lowest/90 text-on-surface shadow-sm backdrop-blur hover:bg-surface-container-lowest fine:min-h-0" onclick={() => fileInput.click()}>
                    <Icon name="photo_camera" class="text-[15px]" /> {text.editor.photo.replace}
                  </button>
                  <button type="button" class="btn min-h-11 bg-surface-container-lowest/90 text-secondary shadow-sm backdrop-blur hover:bg-surface-container-lowest fine:min-h-0" onclick={() => (form.image = '')}>
                    <Icon name="delete" class="text-[15px]" /> {text.editor.photo.remove}
                  </button>
                </div>
              {:else}
                <button
                  type="button"
                  class="flex h-full w-full items-center gap-3 px-3 py-2 text-left text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container sm:flex-col sm:justify-center sm:gap-1.5 sm:p-0 sm:text-center"
                  onclick={() => fileInput.click()}
                >
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-card">
                    <Icon name="photo_camera" class="text-[22px]" />
                  </span>
                  <span class="flex flex-col gap-0.5 sm:items-center sm:gap-1.5">
                    <span class="text-label-md"><span class="sm:hidden">{text.editor.photo.add}</span><span class="max-sm:hidden">{text.editor.photo.drop}</span></span>
                    <span class="text-body-sm text-on-surface-variant">{text.editor.photo.limits}</span>
                  </span>
                </button>
              {/if}
            </div>
            <input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" onchange={(e) => { usePhoto(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
            <div class="mt-2 flex items-center gap-2">
              <Icon name="link" class="text-[18px] text-outline" />
              <input
                type="url"
                aria-label={text.editor.photo.linkAria}
                value={uploaded ? '' : form.image}
                oninput={(e) => (form.image = e.currentTarget.value)}
                placeholder={uploaded ? text.editor.photo.usingUploaded : text.editor.photo.linkPlaceholder}
                class="{cellField} {border(false)} flex-1 py-2"
              />
            </div>
            {#if photoError}
              <p class="mt-1 text-body-sm text-secondary">{photoError}</p>
            {:else if uploaded}
              <p class="mt-1 text-body-sm text-on-surface-variant">{sheets.spreadsheet ? text.editor.photo.uploadedConnected : text.editor.photo.uploadedLocal}</p>
            {/if}
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">{@render numberField('serves', text.editor.essentials.servings, '', text.editor.essentials.servingsUnit)}</div>
            {@render numberField('prepMinutes', text.editor.essentials.prep, 'timer', text.editor.essentials.minutesUnit, false)}
            {@render numberField('cookMinutes', text.editor.essentials.cook, 'skillet', text.editor.essentials.minutesUnit, false)}
          </div>

          <div>
            {@render fieldLabel(text.editor.category.label, 'recipe-category')}
            <div class="flex items-center gap-2">
              <Combobox
                id="recipe-category"
                label={text.editor.category.label}
                placeholder={text.editor.category.placeholder}
                suggestions={categoryOptions}
                limit={categoryOptions.length}
                openOnFocus
                bind:value={form.category}
                onkey={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                class="min-w-0 flex-1"
                inputClass="{field} {border(false)}"
              />
              {#if form.category.trim()}
                <button
                  type="button"
                  aria-label={text.editor.category.clearAria(form.category.trim())}
                  class="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface fine:h-9 fine:w-9"
                  onclick={() => {
                    form.category = '';
                    document.getElementById('recipe-category')?.focus();
                  }}
                >
                  <Icon name="close" class="text-[18px]" />
                </button>
              {/if}
            </div>
            <p class="mt-1 text-body-sm text-on-surface-variant">{text.editor.category.hint}</p>
          </div>

          <div>
            {@render fieldLabel(text.editor.tags.label, 'recipe-new-tag')}
            {#if form.tags.length}
              <ul id="recipe-tags" class="mb-2 flex flex-wrap gap-1.5">
                {#each form.tags as tag (tag)}
                  <li class="inline-flex max-w-full items-center rounded-full pl-3 text-label-sm {tagColor.get(tag)}">
                    <span class="truncate">{tag}</span>
                    <button
                      data-tag
                      type="button"
                      aria-label={text.editor.tags.removeAria(tag)}
                      class="focus-ring relative flex h-7 w-8 shrink-0 items-center justify-center rounded-full before:absolute before:-inset-x-1.5 before:-inset-y-2 before:content-[''] hover:bg-on-surface/10 fine:w-7 fine:before:hidden"
                      onclick={() => removeTag(tag)}
                    >
                      <Icon name="close" class="text-[14px]" />
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
            <Combobox
              id="recipe-new-tag"
              label={text.editor.tags.newAria}
              placeholder={text.editor.tags.placeholder}
              suggestions={tagSuggestions}
              limit={tagSuggestions.length}
              openOnFocus
              bind:value={newTag}
              onpick={addTag}
              onkey={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              inputClass="{field} {border(false)}"
            />
            <p class="mt-1 text-body-sm text-on-surface-variant">{text.editor.tags.hint(TAG_MAX)}</p>
          </div>
        </section>

        <section class="rounded-2xl bg-surface-container-low p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="view_column" class="text-[20px] text-primary" /> {text.editor.mapping.title}
            </h2>
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">
                {text.editor.mapping.tab(sheets.tabs.recipes)}
              </span>
              <button
                type="button"
                aria-expanded={showMapping}
                aria-controls="column-mapping"
                onclick={() => (showMapping = !showMapping)}
                class="inline-flex items-center gap-0.5 text-label-md text-on-surface-variant hover:text-on-surface"
              >
                {showMapping ? text.editor.mapping.hide : text.editor.mapping.show} <Icon name={showMapping ? 'expand_less' : 'expand_more'} class="text-[18px]" />
              </button>
            </div>
          </div>
          {#if showMapping}
            <div id="column-mapping" class="mt-2">
              {#if sheets.spreadsheet}<p class="mb-1 text-body-sm text-on-surface-variant">{text.editor.mapping.savingWrites}</p>{/if}
              <p class="mb-3 text-body-sm text-on-surface-variant">{text.editor.mapping.intro}</p>
              <dl class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {#each SCHEMA.recipes as column, i (column)}
                  <div class="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-3 py-2">
                    <dt class="flex min-w-0 items-center gap-2">
                      <span class="text-label-sm text-on-surface-variant">{columnLetter(i)}</span>
                      <span class="truncate font-mono text-[12px] text-on-surface">{column}</span>
                    </dt>
                    <dd class="shrink-0 text-body-sm text-on-surface-variant">{text.editor.mapping.source[column]}</dd>
                  </div>
                {/each}
              </dl>
              <div class="mt-3 flex flex-wrap gap-2">
                <a href={href('/sheets-sync')} class="btn focus-ring min-h-11 text-on-surface-variant hover:bg-surface-container-high fine:min-h-0">
                  <Icon name="settings" class="text-[16px]" /> {text.editor.mapping.sheetsSettings}
                </a>
                {#if sheets.spreadsheet}
                  <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="btn focus-ring min-h-11 text-on-surface-variant hover:bg-surface-container-high fine:min-h-0">
                    {text.editor.mapping.viewSheet} <Icon name="open_in_new" class="text-[16px]" />
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </section>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-6 lg:col-span-7">
        <!-- Ingredients: one section per group, as the recipe page reads them -->
        <section id="ingredients" aria-labelledby="ingredients-title" class="rounded-2xl bg-surface-container-lowest p-4 shadow-card sm:p-5 md:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="ingredients-title" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="grocery" class="text-[20px] text-primary" /> <span>{text.editor.ingredients.title}<span class="text-secondary">&nbsp;*</span></span>
            </h2>
            <button type="button" class="btn focus-ring min-h-11 text-primary hover:bg-surface-container-low fine:min-h-0" aria-expanded={bulkOpen} onclick={() => (bulkOpen = !bulkOpen)}>
              <Icon name={bulkOpen ? 'close' : 'content_paste'} class="text-[16px]" /> {bulkOpen ? text.editor.ingredients.closePaste : text.editor.ingredients.paste}
            </button>
          </div>

          {#if bulkOpen}
            <div class="mb-4 flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
              <label for="bulk-ingredients" class="text-label-md text-on-surface">{text.editor.paste.label}</label>
              <textarea
                id="bulk-ingredients"
                rows="6"
                bind:value={bulkText}
                placeholder={text.editor.paste.placeholder}
                class="{field} {border(false)} font-mono fine:text-body-sm"
              ></textarea>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label={text.editor.paste.helpAria}
                  aria-expanded={pasteHelpOpen}
                  aria-controls="paste-help"
                  class="inline-flex items-center rounded-md p-1 hover:bg-surface-container-high hover:text-primary {pasteHelpOpen ? 'text-primary' : 'text-on-surface-variant'}"
                  onclick={() => (pasteHelpOpen = !pasteHelpOpen)}
                >
                  <Icon name="help" class="text-[20px]" />
                  <Icon name={pasteHelpOpen ? 'expand_less' : 'expand_more'} class="text-[16px]" />
                </button>
                <button type="button" class="btn-primary py-2" disabled={!bulkText.trim()} onclick={addBulk}>
                  <Icon name="playlist_add" class="text-[16px]" /> {text.editor.paste.add}
                </button>
              </div>
              {#if pasteHelpOpen}
                <ul id="paste-help" class="flex list-disc flex-col gap-1.5 rounded-lg bg-surface-container-lowest py-3 pl-8 pr-3 text-body-sm text-on-surface-variant">
                  {#each text.editor.paste.help as item (item)}<li>{@html item}</li>{/each}
                </ul>
              {/if}
            </div>
          {/if}

          {#each form.groups as group, gi (group.key)}
            {@const grouped = form.groups.length > 1}
            <div data-group={group.key} role={grouped ? 'group' : undefined} aria-label={grouped ? groupName(group) : undefined} class={gi ? 'mt-6' : ''}>
              {#if grouped}
                <div class="mb-2 flex items-center gap-2 border-b border-outline-variant pb-1">
                  <input
                    data-group-title
                    type="text"
                    maxlength="60"
                    aria-label={text.editor.ingredients.groupNameAria(gi + 1)}
                    placeholder={text.editor.ingredients.groupNamePlaceholder}
                    bind:value={group.title}
                    class="min-h-11 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-headline-sm text-on-surface placeholder:font-sans placeholder:text-body-md placeholder:text-on-surface-variant/80 hover:border-outline-variant focus:border-outline-variant focus:bg-surface-container-lowest focus:outline-none fine:min-h-0"
                  />
                  <ActionMenu label={text.editor.ingredients.groupMenuAria(groupName(group))} items={groupActions(gi)} />
                </div>
              {/if}
              {#if gi === 0}
                <div aria-hidden="true" class="{rowGrid} mb-1 text-label-sm text-on-surface-variant">
                  <span class="px-1">{text.editor.ingredients.header.qty}</span>
                  <span class="px-1">{text.editor.ingredients.header.unit}</span>
                  <span class="px-1">{text.editor.ingredients.header.name}</span>
                  <span class="hidden px-1 md:block">{text.editor.ingredients.header.aisle}</span>
                </div>
              {/if}
              <ul class="flex flex-col gap-1.5">
                {#each group.rows as row, ri (row.key)}
                  {@const n = rowNumber.get(row.key) ?? 0}
                  {@const badQty = submitted && qtyInvalid.has(row.key)}
                  {@const badAisle = submitted && aisleMissing.has(row.key)}
                  {@const known = rowIngredient(row)}
                  {@const summary = detailsSummary(row)}
                  {@const isNew = Boolean(row.text.trim()) && !known && !(row.id && row.text.trim() === row.id)}
                  {@const similar = isNew ? similarIngredients(ingredients, row.text) : []}
                  <li data-row={row.key} class="flex flex-col gap-1.5">
                    <div class={rowGrid}>
                      <input type="text" inputmode="decimal" aria-label={text.editor.ingredients.qtyAria(n)} placeholder={text.editor.ingredients.qtyPlaceholder} bind:value={row.qty} aria-invalid={badQty ? 'true' : undefined} aria-describedby={badQty ? `err-qty-${row.key}` : undefined} class="{cellField} {border(badQty)} w-full text-center" />
                      <Combobox
                        label={text.editor.ingredients.unitAria(n)}
                        placeholder={text.editor.ingredients.unitPlaceholder}
                        suggestions={UNIT_SUGGESTIONS}
                        limit={UNIT_SUGGESTIONS.length}
                        openOnFocus
                        bind:value={row.unit}
                        inputClass="{cellField} {border(false)}"
                        listClass="w-44"
                      />
                      <Combobox
                        label={text.editor.ingredients.nameAria(n)}
                        placeholder={n === 1 ? text.editor.ingredients.namePlaceholderFirst : text.editor.ingredients.namePlaceholder}
                        suggestions={ingredientSuggestions}
                        bind:value={row.text}
                        oninput={() => onIngredientText(row)}
                        onpick={() => onIngredientText(row)}
                        onkey={(e) => {
                          // Enter starts the next row of this group, instead of saving the recipe.
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addIngredient(group, ri);
                          }
                        }}
                        invalid={show('ingredients') && n === 1}
                        describedby={show('ingredients') && n === 1 ? 'err-ingredients' : undefined}
                        class="min-w-0"
                        align="right"
                        inputClass="{cellField} {border(show('ingredients') && n === 1)}"
                      />
                      <span class="hidden truncate px-1 text-body-sm text-on-surface-variant md:block" title={known ? aisleLabel(known.aisle) : undefined}>{known ? aisleLabel(known.aisle) : ''}</span>
                      <ActionMenu label={text.editor.ingredients.rowMenuAria(n, row.text.trim())} items={rowActions(row, group)} />
                    </div>
                    {#if badQty}<div class={indent}>{@render errorText(`qty-${row.key}`, text.editor.errors.qty)}</div>{/if}
                    {#if isNew}
                      <div class="{indent} flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span class="rounded bg-tertiary-fixed px-1.5 py-0.5 text-label-sm uppercase text-tertiary" title={text.editor.ingredients.newBadgeTitle(row.text.trim())}>{text.editor.ingredients.newBadge}</span>
                        <span aria-hidden="true" class="text-body-sm text-on-surface-variant">{text.editor.ingredients.aisleLabel}</span>
                        <select
                          aria-label={text.editor.ingredients.aisleAria(n)}
                          bind:value={row.aisle}
                          onchange={() => (row.aisleSet = true)}
                          aria-invalid={badAisle ? 'true' : undefined}
                          aria-describedby={badAisle ? `err-aisle-${row.key}` : undefined}
                          class="{cellField} {border(badAisle)} w-auto"
                        >
                          {#if !row.aisle}<option value="" disabled>{text.editor.ingredients.chooseAisle}</option>{/if}
                          {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
                        </select>
                        {#if similar.length}
                          <span class="text-body-sm text-on-surface-variant">{text.editor.ingredients.didYouMean}</span>
                          {#each similar as match (match.ingredient.id)}
                            <button type="button" class="focus-ring min-h-11 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-0.5 text-label-sm text-primary hover:bg-surface-container-high fine:min-h-0" onclick={() => useExisting(row, match)}>
                              {match.ingredient.name}{#if match.note}<span class="text-on-surface-variant">&nbsp;{text.editor.ingredients.plusNote(match.note)}</span>{/if}
                            </button>
                          {/each}
                        {/if}
                      </div>
                      {#if badAisle}<div class={indent}>{@render errorText(`aisle-${row.key}`, text.editor.errors.aisle)}</div>{/if}
                    {/if}
                    {#if detailsOpen.has(row.key)}
                      <div id="details-{row.key}" class="{indent} flex flex-wrap items-center gap-2">
                        <input type="text" aria-label={text.editor.ingredients.noteAria(n)} placeholder={text.editor.ingredients.notePlaceholder} bind:value={row.note} class="{cellField} {border(false)} min-w-0 flex-1 basis-40" />
                        <input type="text" aria-label={text.editor.ingredients.prepAria(n)} placeholder={text.editor.ingredients.prepPlaceholder} bind:value={row.prep} class="{cellField} {border(false)} min-w-0 flex-1 basis-32" />
                        <label class="inline-flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-body-sm text-on-surface-variant fine:min-h-0">
                          <input type="checkbox" bind:checked={row.optional} class="h-4 w-4 accent-primary" /> {text.editor.ingredients.optionalCheckbox}
                        </label>
                      </div>
                    {:else if summary}
                      <button type="button" class="{indent} focus-ring min-h-11 truncate rounded-md text-left text-body-sm text-on-surface-variant hover:text-primary fine:min-h-0" onclick={() => openDetails(row)}>
                        {summary}
                      </button>
                    {/if}
                  </li>
                {/each}
              </ul>
              <button data-add-row type="button" class="btn focus-ring mt-2 min-h-11 text-body-md text-primary hover:bg-surface-container-low fine:min-h-0" onclick={() => addIngredient(group)}>
                <Icon name="add" class="text-[18px]" /> {grouped ? text.editor.ingredients.addTo(groupName(group)) : text.editor.ingredients.addRow}
              </button>
            </div>
          {/each}
          {@render error('ingredients')}

          <div class="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-4">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button type="button" class="btn focus-ring min-h-11 bg-surface-container-low text-body-md text-on-surface hover:bg-surface-container-high fine:min-h-0" onclick={addGroup}>
                <Icon name="account_tree" class="text-[18px]" /> {text.editor.ingredients.addGroup}
              </button>
              <p class="text-body-sm text-on-surface-variant">{text.editor.ingredients.groupsHint}</p>
            </div>
            <p class="text-body-sm text-on-surface-variant">{text.editor.ingredients.aisleNote}</p>
          </div>
        </section>

        <!-- Method -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="skillet" class="text-[20px] text-primary" /> <span>{text.editor.method.title} <span class="font-sans text-label-md text-on-surface-variant">{text.editor.optional}</span></span>
            </h2>
          </div>
          <p class="mb-3 text-body-sm text-on-surface-variant">
            {text.editor.method.markdown}
            <code class="font-sans">**bold**</code>, <code class="font-sans">*italic*</code>, <code class="font-sans">- lists</code>, <code class="font-sans">## headings</code>, <code class="font-sans">[links](https://…)</code>.
          </p>
          <div class="mb-3 flex items-center justify-between gap-3">
            {@render writePreview(stepPreview, (on) => (stepPreview = on))}
            <span class="text-label-sm uppercase text-on-surface-variant">{text.editor.method.count(form.steps.length)}</span>
          </div>

          <ol id="step-rows" class="flex flex-col gap-3">
            {#each form.steps as step, i (step.key)}
              <li class="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
                <div class="flex items-center gap-2">
                  <span class="font-display text-headline-sm text-primary">{String(i + 1).padStart(2, '0')}.</span>
                  <input
                    type="text"
                    aria-label={text.editor.method.titleAria(i + 1)}
                    placeholder={text.editor.method.titlePlaceholder}
                    bind:value={step.title}
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-headline-sm text-on-surface placeholder:font-sans placeholder:text-body-md placeholder:text-on-surface-variant/80 hover:border-outline-variant focus:border-outline-variant focus:bg-surface-container-lowest focus:outline-none min-h-11 fine:min-h-0"
                  />
                  <ActionMenu label={text.editor.method.menuAria(i + 1)} items={stepActions(i, step.key)} />
                </div>
                {#if stepPreview}
                  <div class="notes-md min-h-[3.5rem] rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    {#if step.text.trim()}
                      {@html renderMarkdown(step.text)}
                    {:else}
                      <p class="text-on-surface-variant">{text.editor.method.nothingToPreview}</p>
                    {/if}
                  </div>
                {:else}
                  <textarea
                    rows="2"
                    aria-label={text.editor.method.directionsAria(i + 1)}
                    placeholder={text.editor.method.directionsPlaceholder}
                    bind:value={step.text}
                    use:autogrow={step.text}
                    class="{field} {border(false)} resize-y"
                  ></textarea>
                {/if}
                <label class="flex items-center gap-2 self-end text-body-sm text-on-surface-variant">
                  <Icon name="schedule" class="text-[16px]" />
                  <input type="number" min="0" step="1" inputmode="numeric" placeholder={text.editor.method.minutesPlaceholder} bind:value={step.minutes} class="{cellField} {border(false)} w-16 text-center" />
                  {text.editor.method.minutes}
                </label>
              </li>
            {/each}
          </ol>

          <button
            type="button"
            class="btn mt-3 w-full bg-surface-container-low py-2.5 text-body-md text-on-surface hover:bg-surface-container-high"
            onclick={() => form.steps.push(blankStep())}
          >
            <Icon name="add_circle" class="text-[18px]" /> {text.editor.method.add(String(form.steps.length + 1).padStart(2, '0'))}
          </button>
        </section>

        <!-- Notes -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label for="recipe-notes" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="stylus_note" class="text-[20px] text-primary" /> <span>{text.editor.notes.title} <span class="font-sans text-label-md text-on-surface-variant">{text.editor.optional}</span></span>
            </label>
          </div>
          <p class="mb-3 text-body-sm text-on-surface-variant">{text.editor.notes.hint} {text.editor.notes.markdown}</p>
          <div class="mb-2">{@render writePreview(notesPreview, (on) => (notesPreview = on))}</div>
          {#if notesPreview}
            <div class="notes-md min-h-[6.5rem] rounded-lg bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
              {#if form.notes.trim()}
                {@html renderMarkdown(form.notes)}
              {:else}
                <p class="text-on-surface-variant">{text.editor.method.nothingToPreview}</p>
              {/if}
            </div>
          {:else}
            <textarea
              id="recipe-notes"
              rows="5"
              bind:value={form.notes}
              placeholder={text.editor.notes.placeholder}
              use:autogrow={form.notes}
              class="{field} {border(false)} resize-y"
            ></textarea>
          {/if}
        </section>
      </div>

      <!-- Action bar -->
      <!-- Sticky on every width; below sm one compact row: status · ⋯ (Revert, Discard) · Save. -->
      <div bind:this={saveBar} class="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-container-lowest/95 px-3 py-2 shadow-lift backdrop-blur sm:bottom-4 sm:justify-between sm:gap-3 sm:px-6 sm:py-3 lg:col-span-12">
        {#if submitted && problems.length}
          <div role="group" aria-labelledby="problems-title" class="order-first flex basis-full items-center gap-x-3 gap-y-2 border-b border-outline-variant pb-2 max-sm:overflow-x-auto sm:flex-wrap sm:pb-3">
            <p id="problems-title" role="status" class="flex shrink-0 items-center gap-1.5 text-body-sm font-semibold text-error">
              <Icon name="error" class="text-[18px]" /> {text.editor.problems.count(problems.length)}
            </p>
            {#each problems as problem (problem.id)}
              <button type="button" class="focus-ring min-h-11 shrink-0 whitespace-nowrap rounded-full border border-error/40 px-3 py-1 text-label-sm text-error hover:bg-error/10 fine:min-h-0" onclick={() => goTo(problem)}>{problem.label}</button>
            {/each}
          </div>
        {/if}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 max-sm:contents">
          <button type="button" class="btn justify-center whitespace-nowrap border border-secondary/50 bg-transparent px-4 py-2 text-body-md text-secondary hover:bg-secondary/10 max-sm:hidden" onclick={discard}>
            <Icon name="delete_sweep" class="text-[18px]" />
            {editing ? text.editor.actions.discardChanges : text.editor.actions.discardDraft}
          </button>
          {#if editing?.edited}
            <button type="button" class="inline-flex items-center justify-center gap-1 text-body-md text-on-surface-variant hover:text-secondary max-sm:hidden" onclick={revert}>
              <Icon name="restore" class="text-[18px]" /> {text.editor.actions.revert}
            </button>
          {/if}
          <span class="flex items-center gap-1.5 text-body-sm text-on-surface-variant max-sm:min-w-0 max-sm:flex-1">
            <Icon name={status.icon} class="shrink-0 text-[16px] {keeping === 'full' ? 'text-tertiary' : ''}" />
            <span class="max-sm:line-clamp-2">{status.label}</span>
          </span>
        </div>
        <div class="flex shrink-0 items-center justify-end gap-2 max-sm:gap-1">
          <ActionMenu label={text.editor.actions.moreAria} items={saveMenu} class="sm:hidden" />
          <button type="submit" class="btn-primary min-h-11 justify-center whitespace-nowrap px-5 py-2 text-body-md fine:min-h-0">
            <Icon name="save" class="text-[18px]" /> {editing ? text.editor.actions.saveChanges : text.editor.actions.saveRecipe}
          </button>
        </div>
      </div>
    </form>
  </div>
{/if}
