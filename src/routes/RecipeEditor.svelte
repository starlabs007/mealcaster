<script module>
  import { storageKey } from '../lib/env.js';

  const DRAFT_KEY = storageKey('recipeDraft.v2');
</script>

<script>
  import { tick } from 'svelte';
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
    guessAisle,
    parseIngredientLines,
    saveRecipe,
    revertSample,
    newRecipeId,
    customRecipeCount,
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
  import SyncStatus from '../lib/components/SyncStatus.svelte';
  import Combobox from '../lib/components/Combobox.svelte';

  /** @type {{ id?: string }} */
  let { id } = $props();

  // App.svelte keys this component by route, so reading the id once is intentional.
  // svelte-ignore state_referenced_locally
  const editing = id ? recipeById.get(id) : undefined;
  // svelte-ignore state_referenced_locally
  const missing = !!id && !editing;

  /**
   * Rows carry `critical` through untouched so editing a sample doesn't lose them.
   * An ingredient row's `text` is the ingredient's name: saving picks the ingredient with that name (or plural), or
   * creates one in `aisle`. `id` keeps the ingredient of a line whose name wasn't touched (so an unknown id survives).
   * @typedef {{ key: number, qty: string, unit: string, text: string, id?: string, note: string, prep: string, optional: boolean, group: string, aisle: string, aisleSet: boolean }} IngredientRow
   * @typedef {{ key: number, title: string, text: string, minutes: string, critical?: boolean }} StepRow
   * @typedef {{
   *   title: string, description: string, image: string, category: string,
   *   serves: number, prepMinutes: number, cookMinutes: number, tags: string[],
   *   ingredients: IngredientRow[], steps: StepRow[], notes: string,
   * }} Form
   */

  let lastKey = 0;
  const nextKey = () => ++lastKey;
  /** @returns {IngredientRow} */
  const blankIngredient = (group = '') => ({ key: nextKey(), qty: '', unit: '', text: '', note: '', prep: '', optional: false, group, aisle: defaultAisle, aisleSet: false });
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
      prepMinutes: 15,
      cookMinutes: 30,
      tags: [],
      ingredients: [blankIngredient(), blankIngredient(), blankIngredient()],
      steps: [blankStep()],
      notes: '',
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
      ingredients: r.ingredients.flatMap((g) =>
        g.items.map((item) => {
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
            group: g.title,
            aisle: ingredient?.aisle ?? defaultAisle,
            aisleSet: true,
          };
        }),
      ),
      steps: r.steps.map((s) => ({
        key: nextKey(),
        title: s.title,
        text: s.text,
        minutes: s.minutes ? String(s.minutes) : '',
        critical: s.critical,
      })),
      notes: r.notes ?? '',
    };
  }

  /** @returns {Form | null} */
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      // Fresh keys so they can't collide with rows added from here on.
      draft.ingredients = draft.ingredients.map((row) => ({ ...blankIngredient(), ...row, key: nextKey() }));
      draft.steps = draft.steps.map((step) => ({ ...step, key: nextKey() }));
      draft.tags = normalizeTags(draft.tags);
      draft.category = normalizeCategory(draft.category);
      return draft;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Nothing saved.
    }
  }

  const savedDraft = editing ? null : loadDraft();
  let notesPreview = $state(false);
  let stepPreview = $state(false);
  let form = $state(editing ? formFrom(editing) : (savedDraft ?? blankForm()));

  // ---- Category ------------------------------------------------------------------
  let newCategory = $state('');
  const categoryOptions = $derived(categoryChoices([...recipes.map((r) => r.badge.label), form.category]));

  /** The typed category, if any, else the picked one. */
  const chosenCategory = () => normalizeCategory(newCategory) || form.category;

  function addCategory() {
    form.category = chosenCategory();
    newCategory = '';
  }

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
  let submitted = $state(false);
  let bulkOpen = $state(false);
  // The paste rules, shown under the paste box on request so they can stay open while typing.
  let pasteHelpOpen = $state(false);
  let bulkText = $state('');
  let photoError = $state('');
  let dragging = $state(false);
  /** @type {HTMLInputElement} */
  let fileInput = $state();

  // ---- Validation ----------------------------------------------------------

  const filledIngredients = $derived(form.ingredients.filter((r) => r.text.trim()));
  const qtyInvalid = $derived(new Set(form.ingredients.filter((r) => Number.isNaN(parseQty(r.qty))).map((r) => r.key)));
  const errors = $derived({
    title: form.title.trim() ? '' : text.editor.errors.title,
    serves: Number.isInteger(form.serves) && form.serves >= 1 && form.serves <= 50 ? '' : text.editor.errors.serves,
    prepMinutes: Number.isInteger(form.prepMinutes) && form.prepMinutes >= 0 ? '' : text.editor.errors.minutes,
    cookMinutes: Number.isInteger(form.cookMinutes) && form.cookMinutes >= 0 ? '' : text.editor.errors.minutes,
    ingredients: filledIngredients.length ? '' : text.editor.errors.ingredients,
    qty: qtyInvalid.size ? text.editor.errors.qty : '',
  });
  const valid = $derived(Object.values(errors).every((e) => !e));
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

  const groupNames = $derived([...new Set(form.ingredients.map((r) => r.group.trim()).filter(Boolean))]);

  // ---- Ingredients ---------------------------------------------------------

  function addIngredient() {
    const last = form.ingredients.at(-1);
    form.ingredients.push(blankIngredient(last?.group ?? ''));
  }

  /** @param {number} key */
  function removeIngredient(key) {
    form.ingredients = form.ingredients.filter((r) => r.key !== key);
    if (!form.ingredients.length) form.ingredients.push(blankIngredient());
  }

  /** "(flank or ribeye), sliced · optional" — the hidden details at a glance. @param {IngredientRow} row */
  const detailsSummary = (row) =>
    [[row.note.trim() && `(${row.note.trim()})`, row.prep.trim()].filter(Boolean).join(', '), row.optional && text.editor.ingredients.optionalWord]
      .filter(Boolean)
      .join(' · ');

  // Rows showing their note / prep / optional fields: open from the start on rows that use them, closed (taking no
  // space) on the rest, which is most of them.
  // svelte-ignore state_referenced_locally
  const detailsOpen = new SvelteSet(form.ingredients.filter((row) => detailsSummary(row)).map((row) => row.key));

  /**
   * Uses an existing ingredient for a row whose name looked like a new one ("yellow onion" → onion); the extra
   * words become the note unless it has one.
   * @param {IngredientRow} row @param {{ ingredient: import('../lib/ingredients.js').Ingredient, note: string }} match
   */
  function useExisting(row, { ingredient, note }) {
    row.text = ingredient.name;
    row.aisle = ingredient.aisle;
    if (note && !row.note.trim()) {
      row.note = note;
      detailsOpen.add(row.key);
    }
  }

  /** An existing ingredient brings its aisle; a new one gets a guess until you pick one. @param {IngredientRow} row */
  function onIngredientText(row) {
    const existing = rowIngredient(row);
    if (existing) row.aisle = existing.aisle;
    else if (!row.aisleSet) row.aisle = guessAisle(row.text);
  }

  function addBulk() {
    const lastGroup = form.ingredients.findLast((r) => r.text.trim())?.group ?? '';
    const parsed = parseIngredientLines(bulkText, lastGroup);
    if (!parsed.length) {
      showToast(text.editor.toasts.noIngredientsFound);
      return;
    }
    const added = parsed.map((row) => {
      const existing = findIngredient(row.text);
      return { ...blankIngredient(row.group), ...row, aisle: existing?.aisle ?? row.aisle, key: nextKey() };
    });
    form.ingredients = [...form.ingredients.filter((r) => r.text.trim() || r.qty.trim() || r.unit.trim()), ...added];
    for (const row of added) if (detailsSummary(row)) detailsOpen.add(row.key);
    showToast(text.editor.toasts.addedIngredients(parsed.length));
    bulkText = '';
    bulkOpen = false;
  }

  // ---- Steps -----------------------------------------------------------------

  /** @param {number} index @param {-1 | 1} delta */
  function moveStep(index, delta) {
    const steps = [...form.steps];
    [steps[index], steps[index + delta]] = [steps[index + delta], steps[index]];
    form.steps = steps;
  }

  /** @param {number} key */
  function removeStep(key) {
    form.steps = form.steps.filter((s) => s.key !== key);
    if (!form.steps.length) form.steps.push(blankStep());
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
    // Group categories ("Protein", "Aromatics"…) survive when the group name does.
    const originalCategory = new Map(editing?.ingredients.map((g) => [g.title.toLowerCase(), g.category]) ?? []);
    /** @type {import('../lib/data/recipes.js').IngredientGroup[]} */
    const groups = [];
    for (const row of filledIngredients) {
      const title = row.group.trim() || defaultIngredientGroup;
      let group = groups.find((g) => g.title.toLowerCase() === title.toLowerCase());
      if (!group) groups.push((group = { title, category: '', items: [] }));
      const qty = parseQty(row.qty);
      const unit = canonicalUnit(row.unit);
      group.items.push({
        id: rowIngredientId(row),
        ...(qty !== undefined && { qty }),
        ...(unit && { unit }),
        ...(row.note.trim() && { note: row.note.trim() }),
        ...(row.prep.trim() && { prep: row.prep.trim() }),
        ...(row.optional && { optional: true }),
      });
    }
    for (const g of groups) {
      g.category = originalCategory.get(g.title.toLowerCase()) || groupCategory(g.items.length);
    }

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
      prepMinutes: form.prepMinutes,
      cookMinutes: form.cookMinutes,
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
          ...(s.critical && { critical: true }),
        })),
    };
    if (!recipe.image) delete recipe.image;
    return recipe;
  }

  function save() {
    submitted = true;
    if (!valid) {
      // Wait for the error styles to render, then jump to the first problem.
      tick().then(() => /** @type {HTMLElement | null} */ (document.querySelector('[aria-invalid="true"]'))?.focus());
      return;
    }
    const recipe = toRecipe();
    try {
      saveRecipe(recipe);
    } catch (error) {
      showToast(error.message);
      return;
    }
    if (!editing) clearDraft();
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

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify($state.snapshot(form)));
      showToast(text.editor.toasts.draftSaved);
    } catch {
      showToast(text.editor.toasts.draftNoSpace);
    }
  }

  function discard() {
    if (editing) {
      navigate(`/recipe/${editing.id}`);
      return;
    }
    const previous = $state.snapshot(form);
    let hadDraft = false;
    try {
      hadDraft = localStorage.getItem(DRAFT_KEY) != null;
    } catch {
      // Treat as no draft.
    }
    clearDraft();
    form = blankForm();
    submitted = false;
    showToast(text.editor.toasts.draftDiscarded, {
      label: text.common.undo,
      run: () => {
        form = previous;
        if (hadDraft) saveDraft();
      },
    });
  }

  let showMapping = $state(false);
  const columnLetter = (i) => String.fromCharCode(65 + i);

  const field =
    'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
  const border = (bad) => (bad ? 'border-secondary' : 'border-outline-variant');
  const cellField =
    'min-w-0 rounded-md border bg-surface-container-lowest px-2 py-1.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
</script>

{#snippet fieldLabel(label, column, forId = undefined, required = false)}
  <label for={forId} class="mb-1.5 flex items-baseline justify-between gap-2">
    <span class="text-label-md text-on-surface">{label}{#if required}<span class="text-secondary">&nbsp;*</span>{:else}<span class="text-outline">&nbsp;{text.editor.optional}</span>{/if}</span>
    {#if column}<span class="text-body-sm text-outline">{text.editor.column(column)}</span>{/if}
  </label>
{/snippet}

{#snippet error(key)}
  {#if show(key)}<p class="mt-1 text-body-sm text-secondary">{errors[key]}</p>{/if}
{/snippet}

{#snippet numberField(key, label, icon, unit)}
  <div>
    <label for="recipe-{key}" class="mb-1.5 flex items-center gap-1 text-label-md text-on-surface">
      {#if icon}<Icon name={icon} class="text-[16px] text-secondary" />{/if}{label}<span class="text-secondary">&nbsp;*</span>
    </label>
    <div class="flex items-center gap-2">
      <input
        id="recipe-{key}"
        type="number"
        min={key === 'serves' ? 1 : 0}
        step="1"
        inputmode="numeric"
        bind:value={form[key]}
        aria-invalid={show(key) ? 'true' : undefined}
        class="{field} {border(show(key))}"
      />
      <span class="shrink-0 text-body-sm text-outline">{unit}</span>
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
    <!-- Sheet status banner -->
    <div class="flex flex-col gap-3 rounded-xl bg-surface-container-low px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-md text-on-surface shadow-card">
          <Icon name="table_chart" class="text-[16px] text-primary" /> {text.editor.banner.tab(sheets.tabs.recipes)}
        </span>
        <SyncStatus />
        {#if sheets.spreadsheet}
          <span class="hidden items-center gap-1.5 text-body-sm text-on-surface-variant lg:inline-flex">
            <Icon name="sync_alt" class="text-[16px]" /> {text.editor.banner.savingWrites}
          </span>
        {/if}
      </div>
      <div class="flex flex-wrap gap-2">
        <a href={href('/sheets-sync')} class="btn text-on-surface-variant hover:bg-surface-container-high">
          <Icon name="settings" class="text-[16px]" /> {text.editor.banner.sheetsSettings}
        </a>
        {#if sheets.spreadsheet}
          <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="btn text-on-surface-variant hover:bg-surface-container-high">
            {text.editor.banner.viewSheet} <Icon name="open_in_new" class="text-[16px]" />
          </a>
        {/if}
      </div>
    </div>

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
        <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          {text.editor.header.introBefore}
          <code class="rounded bg-surface-container-high px-1 text-[12px]">[{sheets.tabs.recipes}]</code>{text.editor.header.introAfter}
        </p>
      </div>
      {#if savedDraft}
        <span class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-fixed/60 px-3 py-1 text-label-sm text-primary md:self-auto">
          <Icon name="history" class="text-[15px]" /> {text.editor.header.restoredDraft}
        </span>
      {/if}
    </div>

    <form class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12" novalidate onsubmit={(e) => { e.preventDefault(); save(); }}>
      <!-- Left column -->
      <div class="flex flex-col gap-6 lg:col-span-5">
        <section class="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="restaurant_menu" class="text-[20px] text-primary" /> {text.editor.essentials.title}
            </h2>
            <span class="text-body-sm text-outline"><span class="text-secondary">*</span> {text.editor.required}</span>
          </div>

          <div>
            {@render fieldLabel(text.editor.essentials.recipeTitle, 'Title', 'recipe-title', true)}
            <input
              id="recipe-title"
              type="text"
              bind:value={form.title}
              maxlength="120"
              placeholder={text.editor.essentials.titlePlaceholder}
              aria-invalid={show('title') ? 'true' : undefined}
              class="{field} {border(show('title'))}"
            />
            {@render error('title')}
          </div>

          <div>
            {@render fieldLabel(text.editor.essentials.description, 'Description', 'recipe-description')}
            <textarea
              id="recipe-description"
              rows="2"
              bind:value={form.description}
              maxlength="400"
              placeholder={text.editor.essentials.descriptionPlaceholder}
              class="{field} {border(false)} resize-y"
            ></textarea>
          </div>

          <div>
            {@render fieldLabel(text.editor.photo.label, 'Image_URL')}
            <!-- svelte-ignore a11y_no_static_element_interactions (drop target; the button inside is the keyboard path) -->
            <div
              class="relative h-48 overflow-hidden rounded-xl border-2 border-dashed transition-colors {dragging
                ? 'border-primary bg-primary-fixed/30'
                : 'border-outline-variant bg-surface-container-low'}"
              ondragover={(e) => { e.preventDefault(); dragging = true; }}
              ondragleave={() => (dragging = false)}
              ondrop={onDrop}
            >
              {#if form.image}
                {#key form.image}
                  <RecipeImage src={form.image} alt={text.editor.photo.previewAlt} class="h-full w-full" />
                {/key}
                <div class="absolute bottom-2 right-2 flex gap-1.5">
                  <button type="button" class="btn bg-surface-container-lowest/90 text-on-surface shadow-sm backdrop-blur hover:bg-surface-container-lowest" onclick={() => fileInput.click()}>
                    <Icon name="photo_camera" class="text-[15px]" /> {text.editor.photo.replace}
                  </button>
                  <button type="button" class="btn bg-surface-container-lowest/90 text-secondary shadow-sm backdrop-blur hover:bg-surface-container-lowest" onclick={() => (form.image = '')}>
                    <Icon name="delete" class="text-[15px]" /> {text.editor.photo.remove}
                  </button>
                </div>
              {:else}
                <button
                  type="button"
                  class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container"
                  onclick={() => fileInput.click()}
                >
                  <span class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest shadow-card">
                    <Icon name="photo_camera" class="text-[22px]" />
                  </span>
                  <span class="text-label-md">{text.editor.photo.drop}</span>
                  <span class="text-body-sm text-outline">{text.editor.photo.limits}</span>
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
              <p class="mt-1 text-body-sm text-outline">{sheets.spreadsheet ? text.editor.photo.uploadedConnected : text.editor.photo.uploadedLocal}</p>
            {/if}
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">{@render numberField('serves', text.editor.essentials.servings, '', text.editor.essentials.servingsUnit)}</div>
            {@render numberField('prepMinutes', text.editor.essentials.prep, 'timer', text.editor.essentials.minutesUnit)}
            {@render numberField('cookMinutes', text.editor.essentials.cook, 'skillet', text.editor.essentials.minutesUnit)}
          </div>

          <fieldset>
            <legend class="mb-2 flex w-full items-baseline justify-between gap-2">
              <span class="text-label-md text-on-surface">{text.editor.category.label} <span class="text-outline">{text.editor.optional}</span></span>
              <span class="text-body-sm text-outline">{text.editor.column('Category')}</span>
            </legend>
            <div class="flex flex-wrap gap-1.5">
              {#each categoryOptions as category (category)}
                {@const on = form.category === category}
                <button
                  type="button"
                  aria-pressed={on}
                  title={category}
                  onclick={() => (form.category = on ? '' : category)}
                  class="inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-label-caps transition-all {on
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-dim'}"
                >
                  {#if on}<Icon name="check" class="text-[13px]" />{/if}
                  <span class="truncate">{category}</span>
                </button>
              {/each}
            </div>
            <div class="mt-2 flex gap-2">
              <input
                type="text"
                aria-label={text.editor.category.newAria}
                bind:value={newCategory}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder={text.editor.category.placeholder}
                class="{field} {border(false)} flex-1 py-2"
              />
              <button
                type="button"
                disabled={!normalizeCategory(newCategory)}
                onclick={addCategory}
                class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-container px-3 text-label-md text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                <Icon name="add" class="text-[16px]" /> {text.editor.category.add}
              </button>
            </div>
            <p class="mt-1 text-body-sm text-outline">{text.editor.category.hint}</p>
          </fieldset>

          <fieldset>
            <legend class="mb-2 flex w-full items-baseline justify-between gap-2">
              <span class="text-label-md text-on-surface">{text.editor.tags.label} <span class="text-outline">{text.editor.optional}</span></span>
              <span class="text-body-sm text-outline">{text.editor.column('Tags')}</span>
            </legend>
            <div class="flex flex-wrap gap-1.5">
              {#each tagOptions as tag (tag)}
                {@const on = form.tags.includes(tag)}
                <button
                  type="button"
                  aria-pressed={on}
                  title={tag}
                  onclick={() => (form.tags = on ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])}
                  class="inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-label-caps transition-all {tagColor.get(tag)} {on
                    ? 'shadow-sm ring-[1.5px] ring-inset ring-current'
                    : 'opacity-75 hover:opacity-100'}"
                >
                  {#if on}<Icon name="check" class="text-[13px]" />{:else}+{/if}
                  <span class="truncate">{tag}</span>
                </button>
              {/each}
            </div>
            <div class="mt-2 flex gap-2">
              <input
                type="text"
                aria-label={text.editor.tags.newAria}
                                bind:value={newTag}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={text.editor.tags.placeholder}
                class="{field} {border(false)} flex-1 py-2"
              />
              <button
                type="button"
                disabled={!newTag.split(',').some((t) => normalizeTag(t))}
                onclick={addTag}
                class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-container px-3 text-label-md text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                <Icon name="add" class="text-[16px]" /> {text.editor.tags.add}
              </button>
            </div>
            <p class="mt-1 text-body-sm text-outline">{text.editor.tags.hint(TAG_MAX)}</p>
          </fieldset>
        </section>

        <section class="rounded-2xl bg-surface-container-low p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="view_column" class="text-[20px] text-primary" /> {text.editor.mapping.title}
            </h2>
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">
                [{sheets.tabs.recipes}]
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
              <p class="mb-3 text-body-sm text-on-surface-variant">{text.editor.mapping.intro}</p>
              <dl class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {#each SCHEMA.recipes as column, i (column)}
                  <div class="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-3 py-2">
                    <dt class="flex min-w-0 items-center gap-2">
                      <span class="text-label-sm text-outline">{columnLetter(i)}</span>
                      <span class="truncate font-mono text-[12px] text-on-surface">{column}</span>
                    </dt>
                    <dd class="shrink-0 text-body-sm text-on-surface-variant">{text.editor.mapping.source[column]}</dd>
                  </div>
                {/each}
              </dl>
            </div>
          {/if}
        </section>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-6 lg:col-span-7">
        <!-- Ingredients -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
                <Icon name="grocery" class="text-[20px] text-primary" /> <span>{text.editor.ingredients.title}<span class="text-secondary">&nbsp;*</span></span>
              </h2>
              <p class="text-body-sm text-on-surface-variant">{text.editor.ingredients.columns}</p>
            </div>
            <button type="button" class="btn text-primary hover:bg-surface-container-low" aria-expanded={bulkOpen} onclick={() => (bulkOpen = !bulkOpen)}>
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
                class="{field} {border(false)} font-mono text-body-sm"
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

          <datalist id="ingredient-groups">
            {#each groupNames as g (g)}<option value={g}></option>{/each}
          </datalist>

          <ul class="flex flex-col gap-2">
            {#each form.ingredients as row, i (row.key)}
              {@const badQty = submitted && qtyInvalid.has(row.key)}
              {@const known = rowIngredient(row)}
              {@const summary = detailsSummary(row)}
              {@const isNew = Boolean(row.text.trim()) && !known && !(row.id && row.text.trim() === row.id)}
              {@const similar = isNew ? similarIngredients(ingredients, row.text) : []}
              <li class="flex flex-col gap-2 rounded-lg bg-surface-container-low p-2">
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <input type="text" aria-label={text.editor.ingredients.qtyAria(i + 1)} placeholder={text.editor.ingredients.qtyPlaceholder} bind:value={row.qty} aria-invalid={badQty ? 'true' : undefined} class="{cellField} {border(badQty)} w-14 shrink-0 text-center" />
                  <Combobox
                    label={text.editor.ingredients.unitAria(i + 1)}
                    placeholder={text.editor.ingredients.unitPlaceholder}
                    suggestions={UNIT_SUGGESTIONS}
                    limit={UNIT_SUGGESTIONS.length}
                    openOnFocus
                    bind:value={row.unit}
                    class="w-20 shrink-0"
                    inputClass="{cellField} {border(false)}"
                    listClass="w-44"
                  />
                  <Combobox
                    label={text.editor.ingredients.nameAria(i + 1)}
                    placeholder={text.editor.ingredients.namePlaceholder}
                    suggestions={ingredientSuggestions}
                    bind:value={row.text}
                    oninput={() => onIngredientText(row)}
                    onpick={() => onIngredientText(row)}
                    invalid={show('ingredients') && i === 0}
                    class="min-w-0 flex-1"
                    align="right"
                    inputClass="{cellField} {border(show('ingredients') && i === 0)}"
                  />
                </div>
                {#if similar.length}
                  <p class="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-body-sm text-on-surface-variant">
                    <Icon name="info" class="text-[16px] text-tertiary" /> {text.editor.ingredients.newIngredientDidYouMean}
                    {#each similar as match (match.ingredient.id)}
                      <button type="button" class="rounded-full border border-outline-variant bg-surface-container-lowest px-2 py-0.5 text-label-sm text-primary hover:bg-surface-container-high" onclick={() => useExisting(row, match)}>
                        {match.ingredient.name}{#if match.note}<span class="text-on-surface-variant">&nbsp;{text.editor.ingredients.plusNote(match.note)}</span>{/if}
                      </button>
                    {/each}
                  </p>
                {/if}
                {#if detailsOpen.has(row.key)}
                <div id="details-{row.key}" class="flex flex-wrap items-center gap-2">
                  <input type="text" aria-label={text.editor.ingredients.noteAria(i + 1)} placeholder={text.editor.ingredients.notePlaceholder} bind:value={row.note} class="{cellField} {border(false)} min-w-0 flex-1 basis-40" />
                  <input type="text" aria-label={text.editor.ingredients.prepAria(i + 1)} placeholder={text.editor.ingredients.prepPlaceholder} bind:value={row.prep} class="{cellField} {border(false)} min-w-0 flex-1 basis-32" />
                  <label class="inline-flex shrink-0 items-center gap-1.5 px-1 text-body-sm text-on-surface-variant">
                    <input type="checkbox" bind:checked={row.optional} class="accent-primary" /> {text.editor.ingredients.optionalCheckbox}
                  </label>
                </div>
                {:else if summary}
                  <button type="button" class="truncate px-1 text-left text-body-sm text-on-surface-variant hover:text-primary" onclick={() => detailsOpen.add(row.key)}>
                    {summary}
                  </button>
                {/if}
                <div class="flex items-center gap-2">
                  <input type="text" aria-label={text.editor.ingredients.groupAria(i + 1)} placeholder={text.editor.ingredients.groupPlaceholder} list="ingredient-groups" bind:value={row.group} class="{cellField} {border(false)} flex-1 md:w-36 md:flex-none" />
                  {#if isNew}
                    <span class="shrink-0 rounded bg-[#ffdead] px-1.5 py-0.5 text-label-caps uppercase text-tertiary" title={text.editor.ingredients.newBadgeTitle(row.text.trim())}>{text.editor.ingredients.newBadge}</span>
                  {/if}
                  <select
                    aria-label={text.editor.ingredients.aisleAria(i + 1)}
                    title={known ? text.editor.ingredients.aisleKnownTitle(known.name) : text.editor.ingredients.aisleNewTitle}
                    disabled={Boolean(known)}
                    bind:value={row.aisle}
                    onchange={() => (row.aisleSet = true)}
                    class="{cellField} {border(false)} flex-1 disabled:opacity-60 md:w-32 md:flex-none"
                  >
                    {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
                  </select>
                  <button
                    type="button"
                    aria-expanded={detailsOpen.has(row.key)}
                    aria-controls="details-{row.key}"
                    aria-label={text.editor.ingredients.detailsAria(i + 1)}
                    title={text.editor.ingredients.detailsTitle}
                    class="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-label-sm hover:bg-surface-container-high {detailsOpen.has(row.key) || summary ? 'text-primary' : 'text-outline'}"
                    onclick={() => (detailsOpen.has(row.key) ? detailsOpen.delete(row.key) : detailsOpen.add(row.key))}
                  >
                    <Icon name={detailsOpen.has(row.key) ? 'expand_less' : 'tune'} class="text-[18px]" /><span class="hidden sm:inline">{text.editor.ingredients.details}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={text.editor.ingredients.removeAria(i + 1)}
                    title={text.editor.ingredients.removeTitle}
                    class="ml-auto shrink-0 rounded-md p-1.5 text-outline hover:bg-surface-container-high hover:text-secondary"
                    onclick={() => removeIngredient(row.key)}
                  >
                    <Icon name="delete" class="text-[18px]" />
                  </button>
                </div>
              </li>
            {/each}
          </ul>
          {@render error('ingredients')}
          {@render error('qty')}

          <button type="button" class="btn mt-3 w-full bg-surface-container-low py-2.5 text-body-md text-on-surface hover:bg-surface-container-high" onclick={addIngredient}>
            <Icon name="add" class="text-[18px]" /> {text.editor.ingredients.addRow}
          </button>
          <p class="mt-3 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            <Icon name="account_tree" class="text-[16px]" /> {text.editor.ingredients.groupsHint}
          </p>
        </section>

        <!-- Method -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="skillet" class="text-[20px] text-primary" /> <span>{text.editor.method.title} <span class="font-sans text-label-md text-outline">{text.editor.optional}</span></span>
            </h2>
            <span class="text-label-caps uppercase text-outline">{text.editor.column(text.editor.method.column)}</span>
          </div>
          <p class="text-body-sm text-on-surface-variant">{text.editor.method.ordered}</p>
          <p class="mb-3 text-body-sm text-on-surface-variant">
            {text.editor.method.markdown}
            <code class="font-sans">**bold**</code>, <code class="font-sans">*italic*</code>, <code class="font-sans">- lists</code>, <code class="font-sans">## headings</code>, <code class="font-sans">[links](https://…)</code>.
          </p>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="inline-flex rounded-lg bg-surface-container-low p-0.5 text-label-sm">
              {#each [[false, text.editor.method.write], [true, text.editor.method.preview]] as [on, label] (label)}
                <button
                  type="button"
                  class="rounded-md px-3 py-1 {stepPreview === on ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}"
                  onclick={() => (stepPreview = on)}
                >{label}</button>
              {/each}
            </div>
            <span class="text-label-caps uppercase text-outline">{text.editor.method.count(form.steps.length)}</span>
          </div>

          <ol class="flex flex-col gap-3">
            {#each form.steps as step, i (step.key)}
              <li class="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
                <div class="flex items-center gap-2">
                  <span class="font-display text-headline-sm text-primary">{String(i + 1).padStart(2, '0')}.</span>
                  <input
                    type="text"
                    aria-label={text.editor.method.titleAria(i + 1)}
                    placeholder={text.editor.method.titlePlaceholder}
                    bind:value={step.title}
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-headline-sm text-on-surface placeholder:font-sans placeholder:text-body-md placeholder:text-outline hover:border-outline-variant focus:border-outline-variant focus:bg-surface-container-lowest focus:outline-none"
                  />
                  <div class="flex shrink-0 items-center">
                    <button type="button" aria-label={text.editor.method.moveUp(i + 1)} disabled={i === 0} class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30" onclick={() => moveStep(i, -1)}>
                      <Icon name="arrow_upward" class="text-[18px]" />
                    </button>
                    <button type="button" aria-label={text.editor.method.moveDown(i + 1)} disabled={i === form.steps.length - 1} class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30" onclick={() => moveStep(i, 1)}>
                      <Icon name="arrow_downward" class="text-[18px]" />
                    </button>
                    <button type="button" aria-label={text.editor.method.remove(i + 1)} class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-secondary" onclick={() => removeStep(step.key)}>
                      <Icon name="delete" class="text-[18px]" />
                    </button>
                  </div>
                </div>
                {#if stepPreview}
                  <div class="notes-md min-h-[3.5rem] rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    {#if step.text.trim()}
                      {@html renderMarkdown(step.text)}
                    {:else}
                      <p class="text-outline">{text.editor.method.nothingToPreview}</p>
                    {/if}
                  </div>
                {:else}
                  <textarea
                    rows="2"
                    aria-label={text.editor.method.directionsAria(i + 1)}
                    placeholder={text.editor.method.directionsPlaceholder}
                    bind:value={step.text}
                    class="{field} {border(false)} resize-y"
                  ></textarea>
                {/if}
                <label class="flex items-center gap-2 self-end text-body-sm text-outline">
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
              <Icon name="stylus_note" class="text-[20px] text-primary" /> <span>{text.editor.notes.title} <span class="font-sans text-label-md text-outline">{text.editor.optional}</span></span>
            </label>
            <span class="text-label-caps uppercase text-outline">{text.editor.column(text.editor.notes.column)}</span>
          </div>
          <p class="mb-1 text-body-sm text-on-surface-variant">{text.editor.notes.hint}</p>
          <p class="mb-3 text-body-sm text-on-surface-variant">
            {text.editor.method.markdown}
            <code class="font-sans">**bold**</code>, <code class="font-sans">*italic*</code>, <code class="font-sans">- lists</code>, <code class="font-sans">## headings</code>, <code class="font-sans">[links](https://…)</code>.
          </p>
          <div class="mb-2 inline-flex rounded-lg bg-surface-container-low p-0.5 text-label-sm">
            {#each [[false, text.editor.method.write], [true, text.editor.method.preview]] as [on, label] (label)}
              <button
                type="button"
                class="rounded-md px-3 py-1 {notesPreview === on ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}"
                onclick={() => (notesPreview = on)}
              >{label}</button>
            {/each}
          </div>
          {#if notesPreview}
            <div class="notes-md min-h-[6.5rem] rounded-lg bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
              {#if form.notes.trim()}
                {@html renderMarkdown(form.notes)}
              {:else}
                <p class="text-outline">{text.editor.method.nothingToPreview}</p>
              {/if}
            </div>
          {:else}
            <textarea
              id="recipe-notes"
              rows="5"
              bind:value={form.notes}
              placeholder={text.editor.notes.placeholder}
              class="{field} {border(false)} resize-y"
            ></textarea>
          {/if}
        </section>
      </div>

      <!-- Action bar -->
      <div class="z-10 grid grid-cols-2 gap-3 sm:sticky sm:bottom-4 sm:flex sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-surface-container-lowest/95 px-4 py-3 shadow-lift backdrop-blur lg:col-span-12 sm:px-6">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 max-sm:contents">
          <button type="button" class="btn justify-center whitespace-nowrap max-sm:order-2 {editing?.edited ? '' : 'max-sm:col-span-2'} border border-secondary/50 bg-transparent px-4 py-2 text-body-md text-secondary hover:bg-secondary/10" onclick={discard}>
            <Icon name="delete_sweep" class="text-[18px]" />
            {editing ? text.editor.actions.discardChanges : text.editor.actions.discardDraft}
          </button>
          {#if editing?.edited}
            <button type="button" class="inline-flex items-center justify-center gap-1 text-body-md text-on-surface-variant hover:text-secondary max-sm:order-2 max-sm:rounded-full max-sm:border max-sm:border-outline-variant max-sm:px-4 max-sm:py-2" onclick={revert}>
              <Icon name="restore" class="text-[18px]" /> {text.editor.actions.revert}
            </button>
          {/if}
          <span class="flex items-center gap-1.5 text-body-sm text-outline max-sm:order-3 max-sm:col-span-2 max-sm:justify-center">
            <Icon name="cloud_off" class="text-[16px]" />
            {#if editing}
              {text.editor.actions.savedOnDevice}
            {:else}
              {text.editor.actions.customSaved(customRecipeCount())}
            {/if}
          </span>
        </div>
        <div class="flex items-center justify-end gap-2 max-sm:order-1 max-sm:col-span-2">
          {#if !editing}
            <button type="button" class="btn justify-center whitespace-nowrap max-sm:flex-1 bg-surface-container-high px-4 py-2 text-body-md text-on-surface hover:bg-surface-dim" onclick={saveDraft}>
              {text.editor.actions.saveDraft}
            </button>
          {/if}
          <button type="submit" class="btn-primary justify-center whitespace-nowrap max-sm:flex-1 px-5 py-2 text-body-md">
            <Icon name="save" class="text-[18px]" /> {editing ? text.editor.actions.saveChanges : text.editor.actions.saveRecipe}
          </button>
        </div>
      </div>
    </form>
  </div>
{/if}
