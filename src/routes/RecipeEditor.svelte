<script module>
  import { storageKey } from '../lib/env.js';

  const DRAFT_KEY = storageKey('recipeDraft.v1');

  const categories = [
    'Family Classic',
    'Pasta & Grains',
    'Stews & Soups',
    'Quick Skillet',
    'Sheet Pan & Roasts',
    'Seafood',
    'Plant-Based',
    'Artisan Bakes',
  ];

  /** Which form field fills each [Recipes] column. */
  const COLUMN_SOURCE = {
    Recipe_ID: 'Generated',
    Title: 'Recipe Title',
    Description: 'Description',
    Ingredients_JSON: 'Ingredients',
    Method_Steps: 'Method',
    Image_URL: 'Photo link',
    Tags: 'Tags',
    Favorite_Flag: '♥ on card',
    Category: 'Category',
    Servings: 'Servings',
    Prep_Minutes: 'Prep Time',
    Cook_Minutes: 'Cook Time',
    Notes: 'Cook’s Secrets',
  };
</script>

<script>
  import { tick } from 'svelte';
  import Icon from '../lib/components/Icon.svelte';
  import RecipeImage from '../lib/components/RecipeImage.svelte';
  import {
    recipes,
    recipeById,
    tagChoices,
    normalizeTag,
    TAG_MAX,
    aisles,
    parseQty,
    guessAisle,
    parseIngredientLines,
    saveRecipe,
    revertSample,
    newRecipeId,
    customRecipeCount,
  } from '../lib/recipes.svelte.js';
  import { SCHEMA, sheets, spreadsheetUrl } from '../lib/sheets.svelte.js';
  import { href, navigate } from '../lib/router.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import { formatQty } from '../lib/format.js';
  import { renderMarkdown } from '../lib/markdown.js';
  import { toISO } from '../lib/dates.js';
  import { normalizeTags } from '../lib/tags.js';
  import { tagClasses } from '../lib/tagColors.svelte.js';
  import SyncStatus from '../lib/components/SyncStatus.svelte';

  /** @type {{ id?: string }} */
  let { id } = $props();

  // App.svelte keys this component by route, so reading the id once is intentional.
  // svelte-ignore state_referenced_locally
  const editing = id ? recipeById.get(id) : undefined;
  // svelte-ignore state_referenced_locally
  const missing = !!id && !editing;

  /**
   * Rows carry `staple` / `critical` through untouched so editing a sample doesn't lose them.
   * @typedef {{ key: number, qty: string, unit: string, text: string, group: string, aisle: string, aisleSet: boolean, staple?: boolean }} IngredientRow
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
  const blankIngredient = (group = '') => ({ key: nextKey(), qty: '', unit: '', text: '', group, aisle: 'Pantry', aisleSet: false });
  /** @returns {StepRow} */
  const blankStep = () => ({ key: nextKey(), title: '', text: '', minutes: '' });

  /** @returns {Form} */
  function blankForm() {
    return {
      title: '',
      description: '',
      image: '',
      category: categories[0],
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
        g.items.map((item) => ({
          key: nextKey(),
          qty: item.qty == null ? '' : formatQty(item.qty),
          unit: item.unit ?? '',
          text: item.text,
          group: g.title,
          aisle: item.tag,
          aisleSet: true,
          staple: item.staple,
        })),
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
      draft.ingredients = draft.ingredients.map((row) => ({ ...row, key: nextKey() }));
      draft.steps = draft.steps.map((step) => ({ ...step, key: nextKey() }));
      draft.tags = normalizeTags(draft.tags);
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
  let bulkText = $state('');
  let photoError = $state('');
  let dragging = $state(false);
  /** @type {HTMLInputElement} */
  let fileInput = $state();

  // ---- Validation ----------------------------------------------------------

  const filledIngredients = $derived(form.ingredients.filter((r) => r.text.trim()));
  const qtyInvalid = $derived(new Set(form.ingredients.filter((r) => Number.isNaN(parseQty(r.qty))).map((r) => r.key)));
  const errors = $derived({
    title: form.title.trim() ? '' : 'Give the recipe a title.',
    serves: Number.isInteger(form.serves) && form.serves >= 1 && form.serves <= 50 ? '' : 'Servings must be 1–50.',
    prepMinutes: Number.isInteger(form.prepMinutes) && form.prepMinutes >= 0 ? '' : 'Enter whole minutes.',
    cookMinutes: Number.isInteger(form.cookMinutes) && form.cookMinutes >= 0 ? '' : 'Enter whole minutes.',
    ingredients: filledIngredients.length ? '' : 'Add at least one ingredient.',
    qty: qtyInvalid.size ? 'Use amounts like 2, 1.5, 1/2 or 1 1/2 — or leave blank for “to taste”.' : '',
    steps: form.steps.some((s) => s.text.trim()) ? '' : 'Describe at least one step.',
  });
  const valid = $derived(Object.values(errors).every((e) => !e));
  const show = (key) => submitted && errors[key];

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

  /** @param {IngredientRow} row */
  function onIngredientText(row) {
    if (!row.aisleSet) row.aisle = guessAisle(row.text);
  }

  function addBulk() {
    const lastGroup = form.ingredients.findLast((r) => r.text.trim())?.group ?? '';
    const parsed = parseIngredientLines(bulkText, lastGroup);
    if (!parsed.length) {
      showToast('No ingredients found — put one per line, e.g. “1 lb rigatoni”.');
      return;
    }
    form.ingredients = [
      ...form.ingredients.filter((r) => r.text.trim() || r.qty.trim() || r.unit.trim()),
      ...parsed.map((row) => ({ ...row, key: nextKey(), aisleSet: false })),
    ];
    showToast(`Added ${parsed.length} ${parsed.length === 1 ? 'ingredient' : 'ingredients'} — check the amounts and aisles.`);
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
      photoError = 'Choose a JPG, PNG or WebP image.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      photoError = 'That photo is over 10 MB.';
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
      photoError = 'Couldn’t read that image.';
    }
  }

  function onDrop(event) {
    event.preventDefault();
    dragging = false;
    usePhoto(event.dataTransfer?.files?.[0]);
  }

  const uploaded = $derived(form.image.startsWith('data:'));

  // ---- Save / draft ------------------------------------------------------------

  function toRecipe() {
    // Group categories ("Protein", "Aromatics"…) survive when the group name does.
    const originalCategory = new Map(editing?.ingredients.map((g) => [g.title.toLowerCase(), g.category]) ?? []);
    /** @type {import('../lib/data/recipes.js').IngredientGroup[]} */
    const groups = [];
    for (const row of filledIngredients) {
      const title = row.group.trim() || 'Main';
      let group = groups.find((g) => g.title.toLowerCase() === title.toLowerCase());
      if (!group) groups.push((group = { title, category: '', items: [] }));
      const qty = parseQty(row.qty);
      group.items.push({
        ...(qty !== undefined && { qty }),
        ...(row.unit.trim() && { unit: row.unit.trim() }),
        text: row.text.trim(),
        tag: row.aisle,
        ...(row.staple && { staple: true }),
      });
    }
    for (const g of groups) {
      g.category = originalCategory.get(g.title.toLowerCase()) || `${g.items.length} ${g.items.length === 1 ? 'item' : 'items'}`;
    }

    const title = form.title.trim();
    const image = form.image.trim();
    const notes = form.notes.trim();

    // Start from the existing recipe so fields the form doesn't show (ratings,
    // cook count, sheet row, prep tip…) are kept; new recipes start blank.
    const { minutes, hero, ...base } = editing
      ? $state.snapshot(editing)
      : { minutes: 0, hero: undefined, rating: 0, ratings: 0, cookCount: 0, addedAt: toISO(new Date()), custom: true };
    const recipe = {
      ...base,
      // The hero shot belongs to the original photo.
      ...(hero && image === (editing?.image ?? '') && { hero }),
      id: editing?.id ?? newRecipeId(title),
      title,
      shortTitle: editing && title === editing.title ? editing.shortTitle : title,
      description: form.description.trim(),
      image: image || undefined,
      prepMinutes: form.prepMinutes,
      cookMinutes: form.cookMinutes,
      serves: form.serves,
      badge: { ...base.badge, label: form.category },
      stat: base.custom || !base.stat ? `Serves ${form.serves}` : base.stat,
      tags: withNewTag(),
      notes,
      ingredients: groups,
      steps: form.steps
        .filter((s) => s.text.trim())
        .map((s, i) => ({
          title: s.title.trim() || `Step ${i + 1}`,
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
    showToast(editing ? 'Recipe updated.' : `${recipe.title} added to your recipe box.`);
    navigate(`/recipe/${recipe.id}`);
  }

  function revert() {
    const previous = $state.snapshot(editing);
    revertSample(editing.id);
    navigate(`/recipe/${editing.id}`);
    showToast('Recipe reverted to the original.', {
      label: 'Undo',
      run: () => {
        const { minutes, ...recipe } = previous;
        saveRecipe(recipe);
      },
    });
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify($state.snapshot(form)));
      showToast('Draft saved on this device.');
    } catch {
      showToast('This device ran out of space for the draft. Try a smaller photo or an image link.');
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
    showToast('Draft discarded.', {
      label: 'Undo',
      run: () => {
        form = previous;
        if (hadDraft) saveDraft();
      },
    });
  }

  const columnLetter = (i) => String.fromCharCode(65 + i);

  const field =
    'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
  const border = (bad) => (bad ? 'border-secondary' : 'border-outline-variant');
  const cellField =
    'min-w-0 rounded-md border bg-surface-container-lowest px-2 py-1.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container';
</script>

{#snippet fieldLabel(text, column, forId = undefined, required = false)}
  <label for={forId} class="mb-1.5 flex items-baseline justify-between gap-2">
    <span class="text-label-md text-on-surface">{text}{#if required}<span class="text-secondary"> *</span>{/if}</span>
    {#if column}<span class="text-body-sm text-outline">Column: {column}</span>{/if}
  </label>
{/snippet}

{#snippet error(key)}
  {#if show(key)}<p class="mt-1 text-body-sm text-secondary">{errors[key]}</p>{/if}
{/snippet}

{#snippet numberField(key, label, icon, unit)}
  <div>
    <label for="recipe-{key}" class="mb-1.5 flex items-center gap-1 text-label-md text-on-surface">
      {#if icon}<Icon name={icon} class="text-[16px] text-secondary" />{/if}{label}
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
    <h1 class="font-display text-headline-lg text-on-surface">Recipe not found</h1>
    <p class="text-body-md text-on-surface-variant">It may have been removed from the household recipe box.</p>
    <div class="mt-2 flex flex-wrap justify-center gap-2">
      <a href={href('/recipe/new')} class="btn-primary py-2"><Icon name="add" class="text-[16px]" /> Add a Custom Recipe</a>
      <a href={href('/catalog')} class="btn-outline py-2">Browse the Recipe Catalog</a>
    </div>
  </div>
{:else}
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-gutter-desktop">
    <!-- Sheet status banner -->
    <div class="flex flex-col gap-3 rounded-xl bg-surface-container-low px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-md text-on-surface shadow-card">
          <Icon name="table_chart" class="text-[16px] text-primary" /> [{sheets.tabs.recipes}] tab
        </span>
        <SyncStatus />
        {#if sheets.spreadsheet}
          <span class="hidden items-center gap-1.5 text-body-sm text-on-surface-variant lg:inline-flex">
            <Icon name="sync_alt" class="text-[16px]" /> Saving writes this recipe’s row in your sheet
          </span>
        {/if}
      </div>
      <div class="flex flex-wrap gap-2">
        <a href={href('/sheets-sync')} class="btn text-on-surface-variant hover:bg-surface-container-high">
          <Icon name="settings" class="text-[16px]" /> Sheets Settings
        </a>
        {#if sheets.spreadsheet}
          <a href={spreadsheetUrl(sheets.spreadsheet)} target="_blank" rel="noopener noreferrer" class="btn text-on-surface-variant hover:bg-surface-container-high">
            View Google Sheet <Icon name="open_in_new" class="text-[16px]" />
          </a>
        {/if}
      </div>
    </div>

    <!-- Title -->
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-1 text-label-md text-on-surface-variant">
          <a href={href('/catalog')} class="hover:text-primary">Recipe Catalog</a>
          <Icon name="chevron_right" class="text-[16px] text-outline" />
          {#if editing}
            <a href={href(`/recipe/${editing.id}`)} class="max-w-[16rem] truncate hover:text-primary">{editing.title}</a>
            <Icon name="chevron_right" class="text-[16px] text-outline" />
            <span class="text-primary" aria-current="page">Edit</span>
          {:else}
            <span class="text-primary" aria-current="page">Create New Recipe</span>
          {/if}
        </nav>
        <h1 class="mt-2 font-display text-headline-lg-mobile tracking-tight text-primary md:text-headline-xl">
          {editing ? 'Edit Recipe' : 'Add a Custom Family Recipe'}
        </h1>
        <p class="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          Document signature dinners, treasured family heirlooms, or handpicked online finds — laid out to match the
          columns of your <code class="rounded bg-surface-container-high px-1 text-[12px]">[{sheets.tabs.recipes}]</code> sheet.
        </p>
      </div>
      {#if savedDraft}
        <span class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary-fixed/60 px-3 py-1 text-label-sm text-primary md:self-auto">
          <Icon name="history" class="text-[15px]" /> Restored your saved draft
        </span>
      {/if}
    </div>

    <form class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12" novalidate onsubmit={(e) => { e.preventDefault(); save(); }}>
      <!-- Left column -->
      <div class="flex flex-col gap-6 lg:col-span-5">
        <section class="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="restaurant_menu" class="text-[20px] text-primary" /> Recipe Essentials
            </h2>
          </div>

          <div>
            {@render fieldLabel('Recipe Title', 'Title', 'recipe-title', true)}
            <input
              id="recipe-title"
              type="text"
              bind:value={form.title}
              maxlength="120"
              placeholder="e.g., Mom’s Lemon Basil Ricotta Rigatoni"
              aria-invalid={show('title') ? 'true' : undefined}
              class="{field} {border(show('title'))}"
            />
            {@render error('title')}
          </div>

          <div>
            {@render fieldLabel('Description', 'Description', 'recipe-description')}
            <textarea
              id="recipe-description"
              rows="2"
              bind:value={form.description}
              maxlength="400"
              placeholder="One or two lines that make you want to cook it tonight."
              class="{field} {border(false)} resize-y"
            ></textarea>
          </div>

          <div>
            {@render fieldLabel('Culinary Photo', 'Image_URL')}
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
                  <RecipeImage src={form.image} alt="Recipe photo preview" class="h-full w-full" />
                {/key}
                <div class="absolute bottom-2 right-2 flex gap-1.5">
                  <button type="button" class="btn bg-surface-container-lowest/90 text-on-surface shadow-sm backdrop-blur hover:bg-surface-container-lowest" onclick={() => fileInput.click()}>
                    <Icon name="photo_camera" class="text-[15px]" /> Replace
                  </button>
                  <button type="button" class="btn bg-surface-container-lowest/90 text-secondary shadow-sm backdrop-blur hover:bg-surface-container-lowest" onclick={() => (form.image = '')}>
                    <Icon name="delete" class="text-[15px]" /> Remove
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
                  <span class="text-label-md">Drop a kitchen snapshot or click to upload</span>
                  <span class="text-body-sm text-outline">JPG, WebP or PNG up to 10 MB</span>
                </button>
              {/if}
            </div>
            <input bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" onchange={(e) => { usePhoto(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
            <div class="mt-2 flex items-center gap-2">
              <Icon name="link" class="text-[18px] text-outline" />
              <input
                type="url"
                aria-label="Image link"
                value={uploaded ? '' : form.image}
                oninput={(e) => (form.image = e.currentTarget.value)}
                placeholder={uploaded ? 'Using the uploaded photo' : 'Or paste a public image link (Drive, Unsplash…)'}
                class="{cellField} {border(false)} flex-1 py-2"
              />
            </div>
            {#if photoError}
              <p class="mt-1 text-body-sm text-secondary">{photoError}</p>
            {:else if uploaded}
              <p class="mt-1 text-body-sm text-outline">{sheets.spreadsheet ? 'Uploaded photos go to a “MealCaster Photos” folder in your Google Drive, viewable by anyone with the link.' : 'Uploaded photos stay on this device until you connect a Google Sheet.'}</p>
            {/if}
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="recipe-category" class="mb-1.5 block text-label-md text-on-surface">Category</label>
              <select id="recipe-category" bind:value={form.category} class="{field} {border(false)}">
                {#each categories as c (c)}<option value={c}>{c}</option>{/each}
                {#if !categories.includes(form.category)}<option value={form.category}>{form.category}</option>{/if}
              </select>
            </div>
            {@render numberField('serves', 'Yield / Servings', '', 'servings')}
            {@render numberField('prepMinutes', 'Prep Time', 'timer', 'min')}
            {@render numberField('cookMinutes', 'Cook Time', 'skillet', 'min')}
          </div>

          <fieldset>
            <legend class="mb-2 flex w-full items-baseline justify-between gap-2">
              <span class="text-label-md text-on-surface">Pantry &amp; Dietary Tags</span>
              <span class="text-body-sm text-outline">Column: Tags</span>
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
                aria-label="New tag"
                                bind:value={newTag}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add your own tag, e.g. Date Night"
                class="{field} {border(false)} flex-1 py-2"
              />
              <button
                type="button"
                disabled={!newTag.split(',').some((t) => normalizeTag(t))}
                onclick={addTag}
                class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-container px-3 text-label-md text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                <Icon name="add" class="text-[16px]" /> Add
              </button>
            </div>
            <p class="mt-1 text-body-sm text-outline">Press Enter to add. Words are capitalized for you; up to {TAG_MAX} characters per tag, commas separate tags.</p>
          </fieldset>
        </section>

        <section class="rounded-2xl bg-surface-container-low p-5">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="view_column" class="text-[20px] text-primary" /> Sheet Column Mapping
            </h2>
            <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-on-surface-variant">
              [{sheets.tabs.recipes}]
            </span>
          </div>
          <p class="mb-3 text-body-sm text-on-surface-variant">Each field fills one column of your recipes tab:</p>
          <dl class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {#each SCHEMA.recipes as column, i (column)}
              <div class="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-3 py-2">
                <dt class="flex min-w-0 items-center gap-2">
                  <span class="text-label-sm text-outline">{columnLetter(i)}</span>
                  <span class="truncate font-mono text-[12px] text-on-surface">{column}</span>
                </dt>
                <dd class="shrink-0 text-body-sm text-on-surface-variant">{COLUMN_SOURCE[column]}</dd>
              </div>
            {/each}
          </dl>
        </section>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-6 lg:col-span-7">
        <!-- Ingredients -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
                <Icon name="grocery" class="text-[20px] text-primary" /> Ingredients &amp; Mise en Place
              </h2>
              <p class="text-body-sm text-on-surface-variant">Qty · Unit · Item · Component group · Store aisle (for the grocery list)</p>
            </div>
            <button type="button" class="btn text-primary hover:bg-surface-container-low" aria-expanded={bulkOpen} onclick={() => (bulkOpen = !bulkOpen)}>
              <Icon name={bulkOpen ? 'close' : 'content_paste'} class="text-[16px]" /> {bulkOpen ? 'Close' : 'Paste bulk text'}
            </button>
          </div>

          {#if bulkOpen}
            <div class="mb-4 flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
              <label for="bulk-ingredients" class="text-label-md text-on-surface">Paste an ingredient list — one per line</label>
              <textarea
                id="bulk-ingredients"
                rows="6"
                bind:value={bulkText}
                placeholder={'Pasta:\n1 lb rigatoni\n\nLemon ricotta cream:\n1 1/2 cups whole-milk ricotta\n2 lemons, zested and juiced\nSalt and black pepper'}
                class="{field} {border(false)} font-mono text-body-sm"
              ></textarea>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-body-sm text-outline">A line ending in “:” starts a new component group.</span>
                <button type="button" class="btn-primary py-2" disabled={!bulkText.trim()} onclick={addBulk}>
                  <Icon name="playlist_add" class="text-[16px]" /> Add Ingredients
                </button>
              </div>
            </div>
          {/if}

          <datalist id="ingredient-groups">
            {#each groupNames as g (g)}<option value={g}></option>{/each}
          </datalist>

          <ul class="flex flex-col gap-2">
            {#each form.ingredients as row, i (row.key)}
              {@const badQty = submitted && qtyInvalid.has(row.key)}
              <li class="flex flex-col gap-2 rounded-lg bg-surface-container-low p-2 md:flex-row md:items-center">
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <input type="text" aria-label="Quantity, row {i + 1}" placeholder="Qty" bind:value={row.qty} aria-invalid={badQty ? 'true' : undefined} class="{cellField} {border(badQty)} w-14 shrink-0 text-center" />
                  <input type="text" aria-label="Unit, row {i + 1}" placeholder="Unit" bind:value={row.unit} class="{cellField} {border(false)} w-20 shrink-0" />
                  <input
                    type="text"
                    aria-label="Ingredient, row {i + 1}"
                    placeholder="Ingredient description"
                    bind:value={row.text}
                    oninput={() => onIngredientText(row)}
                    aria-invalid={show('ingredients') && i === 0 ? 'true' : undefined}
                    class="{cellField} {border(show('ingredients') && i === 0)} flex-1"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <input type="text" aria-label="Component group, row {i + 1}" placeholder="Group (e.g. Sauce)" list="ingredient-groups" bind:value={row.group} class="{cellField} {border(false)} flex-1 md:w-36 md:flex-none" />
                  <select aria-label="Store aisle, row {i + 1}" bind:value={row.aisle} onchange={() => (row.aisleSet = true)} class="{cellField} {border(false)} flex-1 md:w-32 md:flex-none">
                    {#each aisles as a (a.tag)}<option value={a.tag}>{a.label}</option>{/each}
                  </select>
                  <button type="button" aria-label="Remove ingredient row {i + 1}" class="shrink-0 rounded-md p-1.5 text-outline hover:bg-surface-container-high hover:text-secondary" onclick={() => removeIngredient(row.key)}>
                    <Icon name="close" class="text-[18px]" />
                  </button>
                </div>
              </li>
            {/each}
          </ul>
          {@render error('ingredients')}
          {@render error('qty')}

          <button type="button" class="btn mt-3 w-full bg-surface-container-low py-2.5 text-body-md text-on-surface hover:bg-surface-container-high" onclick={addIngredient}>
            <Icon name="add" class="text-[18px]" /> Add Ingredient Row
          </button>
          <p class="mt-3 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            <Icon name="account_tree" class="text-[16px]" /> Component groups become the numbered Mise en Place sections in the recipe view.
          </p>
        </section>

        <!-- Method -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="skillet" class="text-[20px] text-primary" /> Preparation &amp; Method
            </h2>
            <span class="text-label-caps uppercase text-outline">Column: Method_Steps</span>
          </div>
          <p class="text-body-sm text-on-surface-variant">Ordered steps</p>
          <p class="mb-3 text-body-sm text-on-surface-variant">
            Supports Markdown:
            <code class="font-sans">**bold**</code>, <code class="font-sans">*italic*</code>, <code class="font-sans">- lists</code>, <code class="font-sans">## headings</code>, <code class="font-sans">[links](https://…)</code>.
          </p>
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="inline-flex rounded-lg bg-surface-container-low p-0.5 text-label-sm">
              {#each [[false, 'Write'], [true, 'Preview']] as [on, label] (label)}
                <button
                  type="button"
                  class="rounded-md px-3 py-1 {stepPreview === on ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}"
                  onclick={() => (stepPreview = on)}
                >{label}</button>
              {/each}
            </div>
            <span class="text-label-caps uppercase text-outline">{form.steps.length} {form.steps.length === 1 ? 'step' : 'steps'}</span>
          </div>

          <ol class="flex flex-col gap-3">
            {#each form.steps as step, i (step.key)}
              {@const badStep = show('steps') && i === 0}
              <li class="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
                <div class="flex items-center gap-2">
                  <span class="font-display text-headline-sm text-primary">{String(i + 1).padStart(2, '0')}.</span>
                  <input
                    type="text"
                    aria-label="Step {i + 1} title"
                    placeholder="Step title (e.g. Boil pasta & reserve liquid)"
                    bind:value={step.title}
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-headline-sm text-on-surface placeholder:font-sans placeholder:text-body-md placeholder:text-outline hover:border-outline-variant focus:border-outline-variant focus:bg-surface-container-lowest focus:outline-none"
                  />
                  <div class="flex shrink-0 items-center">
                    <button type="button" aria-label="Move step {i + 1} up" disabled={i === 0} class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30" onclick={() => moveStep(i, -1)}>
                      <Icon name="arrow_upward" class="text-[18px]" />
                    </button>
                    <button type="button" aria-label="Move step {i + 1} down" disabled={i === form.steps.length - 1} class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30" onclick={() => moveStep(i, 1)}>
                      <Icon name="arrow_downward" class="text-[18px]" />
                    </button>
                    <button type="button" aria-label="Remove step {i + 1}" class="rounded-md p-1 text-outline hover:bg-surface-container-high hover:text-secondary" onclick={() => removeStep(step.key)}>
                      <Icon name="delete" class="text-[18px]" />
                    </button>
                  </div>
                </div>
                {#if stepPreview}
                  <div class="notes-md min-h-[3.5rem] rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    {#if step.text.trim()}
                      {@html renderMarkdown(step.text)}
                    {:else}
                      <p class="text-outline">Nothing to preview yet.</p>
                    {/if}
                  </div>
                {:else}
                  <textarea
                    rows="2"
                    aria-label="Step {i + 1} directions"
                    placeholder="Describe the technique, temperatures and timing… (Markdown supported)"
                    bind:value={step.text}
                    aria-invalid={badStep ? 'true' : undefined}
                    class="{field} {border(badStep)} resize-y"
                  ></textarea>
                {/if}
                <label class="flex items-center gap-2 self-end text-body-sm text-outline">
                  <Icon name="schedule" class="text-[16px]" />
                  <input type="number" min="0" step="1" inputmode="numeric" placeholder="—" bind:value={step.minutes} class="{cellField} {border(false)} w-16 text-center" />
                  min
                </label>
              </li>
            {/each}
          </ol>
          {@render error('steps')}

          <button
            type="button"
            class="btn mt-3 w-full bg-surface-container-low py-2.5 text-body-md text-on-surface hover:bg-surface-container-high"
            onclick={() => form.steps.push(blankStep())}
          >
            <Icon name="add_circle" class="text-[18px]" /> Add Step {String(form.steps.length + 1).padStart(2, '0')}
          </button>
        </section>

        <!-- Notes -->
        <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-6">
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label for="recipe-notes" class="flex items-center gap-2 font-display text-headline-sm text-on-surface">
              <Icon name="stylus_note" class="text-[20px] text-primary" /> Cook’s Secrets
            </label>
            <span class="text-label-caps uppercase text-outline">Optional · Column: Notes</span>
          </div>
          <p class="mb-1 text-body-sm text-on-surface-variant">Family adjustments, the best brand of ricotta, or a side dish that always works.</p>
          <p class="mb-3 text-body-sm text-on-surface-variant">
            Supports Markdown:
            <code class="font-sans">**bold**</code>, <code class="font-sans">*italic*</code>, <code class="font-sans">- lists</code>, <code class="font-sans">## headings</code>, <code class="font-sans">[links](https://…)</code>.
          </p>
          <div class="mb-2 inline-flex rounded-lg bg-surface-container-low p-0.5 text-label-sm">
            {#each [[false, 'Write'], [true, 'Preview']] as [on, label] (label)}
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
                <p class="text-outline">Nothing to preview yet.</p>
              {/if}
            </div>
          {:else}
            <textarea
              id="recipe-notes"
              rows="5"
              bind:value={form.notes}
              placeholder="e.g., Serve with a crisp chilled **Vermentino**. Don’t boil the ricotta directly or it may curdle."
              class="{field} {border(false)} resize-y"
            ></textarea>
          {/if}
        </section>
      </div>

      <!-- Action bar -->
      <div class="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl bg-surface-container-lowest/95 px-4 py-3 shadow-lift backdrop-blur lg:col-span-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" class="text-body-md text-on-surface-variant hover:text-secondary" onclick={discard}>
            {editing ? 'Discard Changes' : 'Discard Draft'}
          </button>
          {#if editing?.edited}
            <button type="button" class="inline-flex items-center gap-1 text-body-md text-on-surface-variant hover:text-secondary" onclick={revert}>
              <Icon name="restore" class="text-[18px]" /> Revert to Original
            </button>
          {/if}
          <span class="flex items-center gap-1.5 text-body-sm text-outline">
            <Icon name="cloud_off" class="text-[16px]" />
            {#if editing}
              Changes are saved on this device
            {:else}
              {customRecipeCount()} custom {customRecipeCount() === 1 ? 'recipe' : 'recipes'} saved on this device
            {/if}
          </span>
        </div>
        <div class="flex items-center justify-end gap-2">
          {#if !editing}
            <button type="button" class="btn whitespace-nowrap bg-surface-container-high px-4 py-2 text-body-md text-on-surface hover:bg-surface-dim" onclick={saveDraft}>
              Save Draft
            </button>
          {/if}
          <button type="submit" class="btn-primary whitespace-nowrap px-5 py-2 text-body-md">
            <Icon name="save" class="text-[18px]" /> {editing ? 'Save Changes' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </form>
  </div>
{/if}
