// The Recipe Editor's rules on plain data (the screen, routes/RecipeEditor.svelte, holds the form state, focus and
// toasts): blank and loaded forms, what makes a form valid and in which order problems are listed, the recipe a form
// saves as, restoring a kept draft, edits to the ingredient groups and steps, and the photo limits.
// Everything that needs the ingredient list is handed in, so none of this reads a store.

import { normalizeTags } from './tags.js';
import { normalizeMeals } from './meals.js';
import { defaultAisle, defaultIngredientGroup, defaultStepTitle } from './sheetText.js';
import { formatQty } from './format.js';
import { parseQty } from './ingredientText.js';
import { canonicalUnit } from './ingredients.js';
import { flatForm, savedGroups, sectionsOf, signature } from './recipeDraft.js';
import { text } from './text.js';

/**
 * An ingredient row's `text` is the ingredient's name: saving picks the ingredient with that name (or plural), or
 * creates one in `aisle`. `id` keeps the ingredient of a line whose name wasn't touched (so an unknown id survives).
 * A group is a section of rows.
 * @typedef {{ key: number, qty: string, unit: string, text: string, id?: string, note: string, prep: string, optional: boolean, aisle: string, aisleSet: boolean }} IngredientRow
 * @typedef {{ key: number, title: string, rows: IngredientRow[] }} IngredientGroup
 * @typedef {{ key: number, title: string, text: string, minutes: string }} StepRow
 * @typedef {{
 *   title: string, description: string, image: string, meals: string[],
 *   serves: number, prepMinutes: number | '', cookMinutes: number | '', tags: string[],
 *   groups: IngredientGroup[], steps: StepRow[], notes: string, headsUp: string, headsUpDays: number,
 * }} Form   `headsUp` / `headsUpDays` edit the recipe's first heads-up; others (from the sheet) are kept as they are
 */

// ---- Blank and loaded forms ---------------------------------------------------

let lastKey = 0;
/** Row keys only have to differ within a form; one counter for the whole app does. */
export const nextKey = () => ++lastKey;

/** @returns {IngredientRow} */
export const blankIngredient = () => ({ key: nextKey(), qty: '', unit: '', text: '', note: '', prep: '', optional: false, aisle: '', aisleSet: false });
/** @returns {IngredientGroup} */
export const blankGroup = (rows = 1, title = '') => ({ key: nextKey(), title, rows: Array.from({ length: rows }, blankIngredient) });
/** @returns {StepRow} */
export const blankStep = () => ({ key: nextKey(), title: '', text: '', minutes: '' });

/** @returns {Form} */
export function blankForm() {
  return {
    title: '',
    description: '',
    image: '',
    meals: [],
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

/**
 * The form for a saved recipe.
 * @param {import('./data/recipes.js').Recipe} r
 * @param {(id: string) => { name: string, aisle: string } | undefined} ingredientOf
 * @returns {Form}
 */
export function formFromRecipe(r, ingredientOf) {
  return {
    title: r.title,
    description: r.description,
    image: r.image ?? '',
    meals: [...r.meals],
    serves: r.serves,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    tags: [...r.tags],
    groups: r.ingredients.length
      ? r.ingredients.map((g) => ({
          key: nextKey(),
          title: g.title,
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

/**
 * The kept draft for the recipe being edited (or the new-recipe one), as a form with fresh row keys so they can't
 * collide with rows added from here on; null when there is none.
 * @param {ReturnType<typeof import('./recipeDraft.js').createDraftStore>} drafts
 * @param {import('./data/recipes.js').Recipe | undefined} editing
 * @param {Form} opened the form as the editor opened it
 * @param {string} baseline its signature
 * @returns {Form | null}
 */
export function loadDraft(drafts, editing, opened, baseline) {
  // Edit drafts kept before heads-ups (#209) were signed without the two heads-up fields (they come last).
  const { headsUp, headsUpDays, ...beforeHeadsUps } = opened;
  let draft =
    drafts.read(editing?.id, baseline) ??
    (editing ? drafts.read(editing.id, signature(beforeHeadsUps)) ?? drafts.read(editing.id, signature(flatForm(beforeHeadsUps))) : null);
  if (!draft) return null;
  draft = { headsUp, headsUpDays, ...draft };
  if (!Array.isArray(draft.groups)) {
    const { ingredients: rows = [], steps, notes, ...head } = draft;
    const groups = sectionsOf(rows);
    draft = { ...head, groups: groups.length ? groups : [blankGroup(1)], steps, notes };
  }
  // Drafts kept before #271 have a `category` on each group; it's dropped.
  draft.groups = draft.groups.map(({ category, ...g }) => ({
    ...blankGroup(0),
    ...g,
    key: nextKey(),
    rows: (g.rows ?? []).map((row) => ({ ...blankIngredient(), ...row, key: nextKey() })),
  }));
  draft.steps = draft.steps.map((step) => ({ ...step, key: nextKey() }));
  draft.tags = normalizeTags(draft.tags);
  draft.meals = normalizeMeals(draft.meals);
  return draft;
}

// ---- Rows ------------------------------------------------------------------

/** No text in any of the row's fields (the options don't count). @param {IngredientRow} row */
export const isBlank = (row) => !row.text.trim() && !row.qty.trim() && !row.unit.trim() && !row.note.trim() && !row.prep.trim();

/** "(flank or ribeye), sliced · optional" — the hidden details at a glance. @param {IngredientRow} row */
export const detailsSummary = (row) =>
  [[row.note.trim() && `(${row.note.trim()})`, row.prep.trim()].filter(Boolean).join(', '), row.optional && text.editor.ingredients.optionalWord]
    .filter(Boolean)
    .join(' · ');

/**
 * The existing ingredient a row names, if any: the line's own ingredient while its name is unchanged, else one found
 * by the name.
 * @param {IngredientRow} row
 * @param {{ ingredientOf: (id: string) => any, findIngredient: (name: string) => any }} lookup
 */
export const rowIngredient = (row, { ingredientOf, findIngredient }) =>
  (row.id && ingredientOf(row.id)?.name === row.text.trim() ? ingredientOf(row.id) : undefined) ?? findIngredient(row.text);

/**
 * The ingredient id for a row: the line's own unknown id while its text wasn't changed, an existing ingredient with
 * that name, or a new ingredient in the row's aisle.
 * @param {IngredientRow} row
 * @param {{ ingredientOf: (id: string) => any, findIngredient: (name: string) => any, createIngredient: (i: { name: string, aisle: string }) => { id: string } }} lookup
 */
export function rowIngredientId(row, lookup) {
  if (row.id && !lookup.ingredientOf(row.id) && row.text.trim() === row.id) return row.id;
  return (rowIngredient(row, lookup) ?? lookup.createIngredient({ name: row.text, aisle: row.aisle })).id;
}

// ---- Validation ---------------------------------------------------------------

/** Empty, or a whole number of minutes. */
export const minutesOk = (m) => m == null || m === '' || (Number.isInteger(m) && m >= 0);

/**
 * What is wrong with a form. Fields are true when wrong; `qty` and `aisle` hold the keys of the rows at fault.
 * An ingredient with no aisle (nothing in its name placed it) is wrong unless it is an existing ingredient or a line
 * whose unknown id was left untouched: never a silent Pantry.
 * @param {Form} form @param {(row: IngredientRow) => unknown} existing the existing ingredient a row names
 */
export function checkForm(form, existing) {
  const rows = form.groups.flatMap((g) => g.rows);
  const filled = rows.filter((r) => r.text.trim());
  const qty = new Set(rows.filter((r) => Number.isNaN(parseQty(r.qty))).map((r) => r.key));
  const aisle = new Set(filled.filter((r) => !r.aisle && !existing(r) && !(r.id && r.text.trim() === r.id)).map((r) => r.key));
  const wrong = {
    title: !form.title.trim(),
    serves: !(Number.isInteger(form.serves) && form.serves >= 1 && form.serves <= 50),
    // Prep and cook may stay empty: no time is saved as 0, which every screen leaves out.
    prepMinutes: !minutesOk(form.prepMinutes),
    cookMinutes: !minutesOk(form.cookMinutes),
    ingredients: !filled.length,
    qty: qty.size > 0,
    aisle: aisle.size > 0,
  };
  return { ...wrong, qtyRows: qty, aisleRows: aisle, valid: !Object.values(wrong).some(Boolean) };
}

/**
 * What a failed Save lists, top to bottom: the fields, the missing ingredient, then each row's quantity and aisle
 * (`number` is the row's place counted across groups).
 * @param {ReturnType<typeof checkForm>} check @param {IngredientRow[]} rows
 * @returns {{ id: string, field: 'title' | 'serves' | 'prepMinutes' | 'cookMinutes' | 'ingredients' | 'qty' | 'aisle', key?: number, number?: number }[]}
 */
export function problemList(check, rows) {
  const list = [];
  for (const field of /** @type {const} */ (['title', 'serves', 'prepMinutes', 'cookMinutes'])) if (check[field]) list.push({ id: field, field });
  if (check.ingredients) list.push({ id: 'ingredients', field: 'ingredients' });
  rows.forEach((row, i) => {
    if (check.qtyRows.has(row.key)) list.push({ id: `qty-${row.key}`, field: 'qty', key: row.key, number: i + 1 });
    if (check.aisleRows.has(row.key)) list.push({ id: `aisle-${row.key}`, field: 'aisle', key: row.key, number: i + 1 });
  });
  return list;
}

// ---- Saving ---------------------------------------------------------------------

/**
 * The form's heads-up as the first one, in place of the one it was opened with; others the form doesn't show are kept.
 * Clearing it leaves the rest.
 * @param {{ text: string, daysBefore: number }[]} [previous] @param {Pick<Form, 'headsUp' | 'headsUpDays'>} form
 */
export function savedHeadsUps(previous = [], form) {
  const [first, ...others] = previous;
  const headsUpText = form.headsUp.trim();
  return headsUpText ? [{ ...first, text: headsUpText, daysBefore: form.headsUpDays }, ...others] : others;
}

/**
 * The recipe a form saves as. Fields the form doesn't show (sheet row, cook count…) come from the recipe being edited;
 * a new recipe starts blank.
 * @param {Form} form
 * @param {{
 *   editing?: import('./data/recipes.js').Recipe,
 *   tags: string[],
 *   ingredientId: (row: IngredientRow) => string,
 *   newId: (title: string) => string,
 *   today: string,
 * }} how `tags` is the form's with what is typed in its box; `editing` is a plain copy
 */
export function formToRecipe(form, { editing, tags, ingredientId, newId, today }) {
  const groups = savedGroups(form.groups, {
    fallbackTitle: defaultIngredientGroup,
    item: (row) => {
      const qty = parseQty(row.qty);
      const unit = canonicalUnit(row.unit);
      return {
        id: ingredientId(row),
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

  const { minutes, ...base } = editing ? editing : { minutes: 0, addedAt: today, custom: true };
  const recipe = {
    ...base,
    id: editing?.id ?? newId(title),
    title,
    description: form.description.trim(),
    image: image || undefined,
    prepMinutes: form.prepMinutes || 0,
    cookMinutes: form.cookMinutes || 0,
    serves: form.serves,
    meals: normalizeMeals(form.meals),
    tags,
    notes: form.notes.trim(),
    ingredients: groups,
    steps: form.steps
      .filter((s) => s.text.trim())
      .map((s, i) => ({
        title: s.title.trim() || defaultStepTitle(i + 1),
        minutes: Number(s.minutes) || 0,
        text: s.text.trim(),
      })),
    headsUps: savedHeadsUps(base.headsUps, form),
  };
  if (!recipe.image) delete recipe.image;
  // A sheet cell that didn't parse is replaced once the recipe has a heads-up of its own.
  if (recipe.headsUps.length) delete recipe.headsUpsRaw;
  return recipe;
}

// ---- Editing groups, rows and steps -----------------------------------------------

/**
 * The list with the items at `index` and `index + delta` swapped (unchanged when there is no such item).
 * @template T @param {T[]} list @param {number} index @param {-1 | 1} delta
 */
export function moveItem(list, index, delta) {
  const other = index + delta;
  if (index < 0 || index >= list.length || other < 0 || other >= list.length) return list;
  const next = [...list];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

/**
 * Removes a row; the form keeps at least one row, so the last one is replaced by a blank.
 * @param {IngredientGroup[]} groups @param {number} key
 * @returns {{ groups: IngredientGroup[], group: IngredientGroup, index: number, row: IngredientRow, next?: IngredientRow } | null}
 *   `group` is the group as it is now, `next` the row to put the cursor in (the one after, else before)
 */
export function removeRow(groups, key) {
  const from = groups.find((g) => g.rows.some((r) => r.key === key));
  if (!from) return null;
  const index = from.rows.findIndex((r) => r.key === key);
  const row = from.rows[index];
  let rows = from.rows.filter((r) => r.key !== key);
  if (!groups.some((g) => g !== from && g.rows.length) && !rows.length) rows = [blankIngredient()];
  const group = { ...from, rows };
  return { groups: groups.map((g) => (g === from ? group : g)), group, index, row, next: rows[index] ?? rows[index - 1] };
}

/**
 * Moves a row to the end of another group.
 * @param {IngredientGroup[]} groups @param {number} key @param {number} targetKey
 * @returns {{ groups: IngredientGroup[], row: IngredientRow, target: IngredientGroup } | null}
 */
export function moveRow(groups, key, targetKey) {
  const from = groups.find((g) => g.rows.some((r) => r.key === key));
  const to = groups.find((g) => g.key === targetKey);
  if (!from || !to || from === to) return null;
  const row = from.rows.find((r) => r.key === key);
  const target = { ...to, rows: [...to.rows, row] };
  return { groups: groups.map((g) => (g === from ? { ...g, rows: g.rows.filter((r) => r.key !== key) } : g === to ? target : g)), row, target };
}

/**
 * Deletes a group; its ingredients (blank rows dropped) join the group above, or the next one for the first group
 * (at its top).
 * @param {IngredientGroup[]} groups @param {number} index
 * @returns {{ groups: IngredientGroup[], group: IngredientGroup, target: IngredientGroup, moved: IngredientRow[] } | null} null when it is the only group
 */
export function deleteGroup(groups, index) {
  const group = groups[index];
  const found = groups[index === 0 ? 1 : index - 1];
  if (!group || !found) return null;
  const moved = group.rows.filter((r) => !isBlank(r));
  const target = { ...found, rows: index === 0 ? [...moved, ...found.rows] : [...found.rows, ...moved] };
  return { groups: groups.filter((g) => g !== group).map((g) => (g === found ? target : g)), group, target, moved };
}

/** Removes a step; the form keeps at least one, so the last is replaced by a blank. @param {StepRow[]} steps @param {number} key */
export function removeStep(steps, key) {
  const next = steps.filter((s) => s.key !== key);
  return next.length ? next : [blankStep()];
}

/**
 * Pasted lines placed in the groups: a line under "Sauce:" joins the Sauce group (matched without case, made if there
 * is none), the rest the last group. Blank rows are pruned first, and an untitled group the paste emptied goes.
 * @param {IngredientGroup[]} groups
 * @param {(ReturnType<typeof import('./ingredientText.js').parseIngredientLines>[number])[]} parsed
 * @param {(name: string) => { aisle: string } | undefined} findIngredient an existing ingredient brings its aisle
 * @returns {IngredientGroup[]}
 */
export function addBulkRows(groups, parsed, findIngredient) {
  const lastTitle = groups.at(-1).title;
  const work = groups.map((g) => ({ ...g, rows: g.rows.filter((r) => r.text.trim() || r.qty.trim() || r.unit.trim()) }));
  const last = work.at(-1);
  for (const { group: title, ...parsedRow } of parsed) {
    const row = { ...blankIngredient(), ...parsedRow, aisle: findIngredient(parsedRow.text)?.aisle ?? parsedRow.aisle };
    let group = title === lastTitle ? last : work.find((g) => g.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (!group) work.push((group = blankGroup(0, title.trim())));
    group.rows.push(row);
  }
  const kept = work.filter((g) => g.rows.length || g.title.trim());
  return kept.length ? kept : [blankGroup(1)];
}

// ---- Photo ------------------------------------------------------------------------

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 900;

/** Whether an uploaded file can be used as the photo. @param {{ type: string, size: number }} file @returns {'wrongType' | 'tooBig' | null} */
export function photoProblem(file) {
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) return 'wrongType';
  if (file.size > PHOTO_MAX_BYTES) return 'tooBig';
  return null;
}

/** The size a photo is scaled down to (never up): its longest side at most `PHOTO_MAX_SIDE`. @param {number} width @param {number} height */
export function photoSize(width, height) {
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
