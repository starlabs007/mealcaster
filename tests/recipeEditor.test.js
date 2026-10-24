// The Recipe Editor's rules (recipeEditor.js): validation and its problem order, the recipe a form saves as, kept drafts,
// edits to groups / rows / steps, pasted ingredients, and the photo limits.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addBulkRows,
  blankForm,
  blankGroup,
  blankIngredient,
  blankStep,
  checkForm,
  deleteGroup,
  detailsSummary,
  formFromRecipe,
  formToRecipe,
  isBlank,
  loadDraft,
  minutesOk,
  moveItem,
  moveRow,
  photoProblem,
  photoSize,
  problemList,
  removeRow,
  removeStep,
  rowIngredient,
  rowIngredientId,
  savedHeadsUps,
} from '../src/lib/recipeEditor.js';
import { createDraftStore, flatForm, signature } from '../src/lib/recipeDraft.js';
import { parseIngredientLines } from '../src/lib/ingredientText.js';
import { aisleFor } from '../src/lib/ingredients.js';
import { recipe } from './fakes.js';

const row = (text, extra = {}) => ({ ...blankIngredient(), text, aisle: 'Produce', ...extra });
const group = (title, ...texts) => ({ ...blankGroup(0, title), rows: texts.map((t) => row(t)) });
const known = { rice: { id: 'rice', name: 'Rice', aisle: 'Pantry' } };
const lookup = {
  ingredientOf: (id) => known[id],
  findIngredient: (name) => Object.values(known).find((i) => i.name.toLowerCase() === name.trim().toLowerCase()),
  createIngredient: ({ name, aisle }) => ({ id: `new-${name}`, name, aisle }),
};
const valid = () => {
  const form = blankForm();
  form.title = 'Pho';
  form.groups = [group('', 'rice')];
  return form;
};
const check = (form) => checkForm(form, (r) => rowIngredient(r, lookup));

describe('validation', () => {
  it('accepts a complete form, with prep and cook left empty', () => {
    assert.equal(check(valid()).valid, true);
  });

  it('needs a title, 1–50 whole servings, and whole minutes of 0 or more', () => {
    const wrong = (patch) => check({ ...valid(), ...patch });
    assert.equal(wrong({ title: '   ' }).title, true);
    for (const serves of [0, 51, 2.5, NaN]) assert.equal(wrong({ serves }).serves, true, String(serves));
    for (const serves of [1, 50]) assert.equal(wrong({ serves }).serves, false, String(serves));
    for (const m of [-1, 1.5, NaN]) assert.equal(minutesOk(m), false, String(m));
    for (const m of ['', 0, 15, null, undefined]) assert.equal(minutesOk(m), true, String(m));
    assert.equal(wrong({ prepMinutes: -1 }).prepMinutes, true);
    assert.equal(wrong({ cookMinutes: 2.5 }).cookMinutes, true);
  });

  it('needs at least one ingredient with a name', () => {
    const form = valid();
    form.groups = [{ ...blankGroup(0), rows: [row('  ', { qty: '2' })] }];
    assert.equal(check(form).ingredients, true);
  });

  it('flags a quantity that does not read, by row', () => {
    const form = valid();
    form.groups = [group('', 'rice', 'oil')];
    form.groups[0].rows[1].qty = 'lots';
    const c = check(form);
    assert.equal(c.qty, true);
    assert.deepEqual([...c.qtyRows], [form.groups[0].rows[1].key]);
    form.groups[0].rows[1].qty = '1 1/2';
    assert.equal(check(form).qty, false);
  });

  it('flags a new ingredient with no aisle, but not an existing one or an untouched unknown id', () => {
    const form = valid();
    form.groups = [{ ...blankGroup(0), rows: [row('Rice', { aisle: '' }), row('Basil', { aisle: '' }), row('ghost', { aisle: '', id: 'ghost' }), row('Mint', { aisle: 'Produce' })] }];
    const c = check(form);
    assert.deepEqual([...c.aisleRows], [form.groups[0].rows[1].key]);
    form.groups[0].rows[2].text = 'ghost town';
    assert.equal(check(form).aisleRows.size, 2);
  });

  it('lists problems top to bottom: fields, no ingredient, then each row with its number', () => {
    const form = { ...valid(), title: '', serves: 0 };
    form.groups = [group('A', 'rice'), group('B', 'oil', 'basil')];
    form.groups[0].rows[0].qty = 'x';
    form.groups[1].rows[1].aisle = '';
    form.groups[1].rows[0].qty = 'y';
    const rows = form.groups.flatMap((g) => g.rows);
    const list = problemList(check(form), rows);
    assert.deepEqual(list.map((p) => p.id), ['title', 'serves', `qty-${rows[0].key}`, `qty-${rows[1].key}`, `aisle-${rows[2].key}`]);
    assert.deepEqual(list.slice(2).map((p) => p.number), [1, 2, 3]);
    assert.equal(problemList(check({ ...blankForm(), title: 'x' }), []).at(-1).id, 'ingredients');
  });

  it('finds the ingredient a row names: its own while the name is unchanged, else by name', () => {
    assert.equal(rowIngredient(row('Rice', { id: 'rice' }), lookup), known.rice);
    assert.equal(rowIngredient(row('rice'), lookup), known.rice);
    assert.equal(rowIngredient(row('Noodles', { id: 'rice' }), lookup), undefined);
  });

  it('picks the ingredient id for a row: untouched unknown id, existing by name, else a new one', () => {
    assert.equal(rowIngredientId(row('ghost', { id: 'ghost' }), lookup), 'ghost');
    assert.equal(rowIngredientId(row('Rice'), lookup), 'rice');
    assert.equal(rowIngredientId(row('Basil', { aisle: 'Produce' }), lookup), 'new-Basil');
    assert.equal(rowIngredientId(row('ghost 2', { id: 'ghost' }), lookup), 'new-ghost 2');
  });
});

describe('the recipe a form saves as', () => {
  const how = (extra = {}) => ({ tags: ['Soup'], category: 'Dinner', ingredientId: (r) => `id-${r.text}`, newId: (t) => `custom-${t}`, today: '2026-10-23', ...extra });

  it('makes a new recipe: trimmed text, empty minutes as 0, steps without text dropped, default step titles', () => {
    const form = valid();
    form.title = '  Pho ';
    form.description = ' broth ';
    form.groups = [group('', 'rice')];
    form.groups[0].rows[0] = row('rice', { qty: '1 1/2', unit: 'Cups', note: ' fine ', prep: ' rinsed ', optional: true });
    form.steps = [{ ...blankStep(), text: ' Boil ' }, { ...blankStep(), title: 'Skip', text: '  ' }, { ...blankStep(), title: ' Eat ', text: 'Serve', minutes: '5' }];
    form.image = ' ';
    const r = formToRecipe(form, how());
    assert.equal(r.id, 'custom-Pho');
    assert.equal(r.title, 'Pho');
    assert.equal(r.shortTitle, 'Pho');
    assert.equal(r.prepMinutes, 0);
    assert.equal(r.cookMinutes, 0);
    assert.equal('image' in r, false);
    assert.equal(r.addedAt, '2026-10-23');
    assert.equal(r.custom, true);
    assert.deepEqual(r.badge, { label: 'Dinner' });
    assert.deepEqual(r.steps, [
      { title: 'Step 1', minutes: 0, text: 'Boil' },
      { title: 'Eat', minutes: 5, text: 'Serve' },
    ]);
    assert.deepEqual(r.ingredients, [
      { title: 'Main', category: '1 item', items: [{ id: 'id-rice', qty: 1.5, unit: 'cup', note: 'fine', prep: 'rinsed', optional: true }] },
    ]);
  });

  it('keeps the short title unless the title changed, and fields the form does not show', () => {
    const editing = recipe('pho', 'Pho', { shortTitle: 'Phở', sheetRow: 7, headsUpsRaw: 'bad' });
    const form = formFromRecipe(editing, lookup.ingredientOf);
    assert.equal(formToRecipe(form, how({ editing })).shortTitle, 'Phở');
    assert.equal(formToRecipe(form, how({ editing })).sheetRow, 7);
    assert.equal(formToRecipe({ ...form, title: 'Pho 2' }, how({ editing })).shortTitle, 'Pho 2');
    assert.equal(formToRecipe(form, how({ editing })).id, 'pho');
  });

  it('keeps a renamed group its own category, else counts its items', () => {
    const editing = recipe('pho', 'Pho', { ingredients: [{ title: 'Broth', category: 'Protein', items: [{ id: 'rice', qty: 1 }] }] });
    const form = formFromRecipe(editing, lookup.ingredientOf);
    assert.equal(formToRecipe(form, how({ editing })).ingredients[0].category, 'Protein');
    form.groups[0].category = '';
    assert.equal(formToRecipe(form, how({ editing })).ingredients[0].category, 'Protein');
    form.groups[0].title = 'Stock';
    form.groups[0].category = '';
    assert.equal(formToRecipe(form, how({ editing })).ingredients[0].category, '1 item');
  });

  it('replaces the first heads-up, keeps the others, and clearing leaves the rest', () => {
    const previous = [{ text: 'old', daysBefore: 1, extra: 'x' }, { text: 'two', daysBefore: 2 }];
    assert.deepEqual(savedHeadsUps(previous, { headsUp: ' thaw ', headsUpDays: 2 }), [{ text: 'thaw', daysBefore: 2, extra: 'x' }, { text: 'two', daysBefore: 2 }]);
    assert.deepEqual(savedHeadsUps(previous, { headsUp: '', headsUpDays: 0 }), [{ text: 'two', daysBefore: 2 }]);
    assert.deepEqual(savedHeadsUps(undefined, { headsUp: 'soak', headsUpDays: 1 }), [{ text: 'soak', daysBefore: 1 }]);
    assert.deepEqual(savedHeadsUps(undefined, { headsUp: '', headsUpDays: 0 }), []);
  });

  it('drops an unparsed heads-up cell once the recipe has its own heads-up', () => {
    const editing = recipe('pho', 'Pho', { headsUpsRaw: 'garbled' });
    const form = formFromRecipe(editing, lookup.ingredientOf);
    assert.equal(formToRecipe(form, how({ editing })).headsUpsRaw, 'garbled');
    assert.equal('headsUpsRaw' in formToRecipe({ ...form, headsUp: 'soak' }, how({ editing })), false);
  });

  it('reads back as the same recipe it was made from (keys aside)', () => {
    const editing = recipe('pho', 'Pho', {
      description: 'd',
      notes: 'n',
      image: 'https://x/y.jpg',
      tags: ['Soup'],
      headsUps: [{ text: 'soak', daysBefore: 1 }],
      ingredients: [
        { title: 'Broth', category: 'Protein', items: [{ id: 'rice', qty: 1.5, unit: 'cup', note: 'fine', prep: 'rinsed', optional: true }] },
        { title: 'Main', category: '1 item', items: [{ id: 'rice' }] },
      ],
      steps: [{ title: 'Boil', minutes: 10, text: 'Boil it.' }],
    });
    const { minutes, ...stored } = editing;
    const form = formFromRecipe(editing, lookup.ingredientOf);
    const again = formToRecipe(form, how({ editing, tags: form.tags, category: form.category, ingredientId: (r) => lookup.findIngredient(r.text).id }));
    assert.deepEqual(again, stored);
  });
});

describe('forms', () => {
  it('opens a saved recipe with an unknown ingredient showing its id, and a recipe without groups as one blank group', () => {
    const r = recipe('pho', 'Pho', { ingredients: [{ title: 'Main', category: '', items: [{ id: 'ghost', qty: 2 }] }] });
    const f = formFromRecipe(r, lookup.ingredientOf);
    assert.equal(f.groups[0].rows[0].text, 'ghost');
    assert.equal(f.groups[0].rows[0].aisle, 'Pantry');
    assert.equal(f.groups[0].rows[0].qty, '2');
    assert.equal(formFromRecipe(recipe('x', 'X', { ingredients: [] }), lookup.ingredientOf).groups.length, 1);
  });

  it('gives every new row its own key', () => {
    const keys = [...blankForm().groups.flatMap((g) => [g.key, ...g.rows.map((r) => r.key)]), ...blankForm().steps.map((s) => s.key)];
    assert.equal(new Set(keys).size, keys.length);
  });

  it('shows the row details at a glance', () => {
    assert.equal(detailsSummary(row('x', { note: 'flank or ribeye', prep: 'sliced', optional: true })), '(flank or ribeye), sliced · optional');
    assert.equal(detailsSummary(row('x', { prep: 'diced' })), 'diced');
    assert.equal(detailsSummary(row('x')), '');
  });

  it('counts a row as blank when none of its text fields are filled (the options do not count)', () => {
    assert.equal(isBlank(blankIngredient()), true);
    assert.equal(isBlank({ ...blankIngredient(), optional: true, aisle: 'Pantry' }), true);
    assert.equal(isBlank({ ...blankIngredient(), prep: 'x' }), false);
  });
});

describe('kept drafts', () => {
  const memory = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  };
  const open = (editing) => {
    const opened = editing ? formFromRecipe(editing, lookup.ingredientOf) : blankForm();
    return { opened, baseline: signature(opened) };
  };

  it('has nothing to restore without a draft', () => {
    const drafts = createDraftStore(memory(), 'new', 'edits');
    const { opened, baseline } = open(undefined);
    assert.equal(loadDraft(drafts, undefined, opened, baseline), null);
  });

  it('restores a draft with fresh row keys and tidied tags and category', () => {
    const drafts = createDraftStore(memory(), 'new', 'edits');
    const { opened, baseline } = open(undefined);
    const kept = { ...opened, title: 'Half done', tags: ['soup', 'Soup'], category: '  dinner ' };
    drafts.write(undefined, kept, baseline);
    const draft = loadDraft(drafts, undefined, opened, baseline);
    assert.equal(draft.title, 'Half done');
    assert.deepEqual(draft.tags, ['Soup']);
    assert.equal(draft.category, 'Dinner');
    assert.notEqual(draft.groups[0].key, kept.groups[0].key);
    assert.notEqual(draft.groups[0].rows[0].key, kept.groups[0].rows[0].key);
    assert.equal(signature(draft.groups), signature(kept.groups));
  });

  it('ignores the draft of an edit when the recipe changed meanwhile', () => {
    const drafts = createDraftStore(memory(), 'new', 'edits');
    const editing = recipe('pho', 'Pho');
    const { opened, baseline } = open(editing);
    drafts.write('pho', { ...opened, title: 'Mine' }, baseline);
    assert.equal(loadDraft(drafts, editing, opened, baseline).title, 'Mine');
    const changed = open(recipe('pho', 'Pho', { description: 'new text' }));
    assert.equal(loadDraft(drafts, editing, changed.opened, changed.baseline), null);
  });

  it('opens an edit draft kept before heads-ups, and one kept as a flat list before groups', () => {
    const editing = recipe('pho', 'Pho', { headsUps: [{ text: 'soak', daysBefore: 1 }], ingredients: [{ title: 'Broth', category: 'Protein', items: [{ id: 'rice', qty: 1 }] }] });
    const { opened } = open(editing);
    const { headsUp, headsUpDays, ...old } = opened;

    const before = createDraftStore(memory(), 'new', 'edits');
    before.write('pho', { ...old, title: 'Old draft' }, signature(old));
    const a = loadDraft(before, editing, opened, signature(opened));
    assert.equal(a.title, 'Old draft');
    assert.equal(a.headsUp, 'soak');
    assert.equal(a.headsUpDays, 1);

    const flat = {
      title: 'Flat draft',
      ingredients: [
        { key: 1, text: 'rice', qty: '1', group: 'broth' },
        { key: 2, text: 'oil', qty: '', group: 'Sauce' },
      ],
      steps: [{ key: 3, title: '', text: 'x', minutes: '' }],
      notes: '',
    };
    const store = memory();
    const drafts = createDraftStore(store, 'new', 'edits');
    drafts.write('pho', flat, signature(flatForm(old)));
    const b = loadDraft(drafts, editing, opened, signature(opened));
    assert.deepEqual(b.groups.map((g) => [g.title, g.category, g.rows.length]), [['broth', 'Protein', 1], ['Sauce', '', 1]]);
  });
});

describe('editing lists', () => {
  it('swaps neighbours and leaves the list alone at the ends', () => {
    assert.deepEqual(moveItem([1, 2, 3], 0, 1), [2, 1, 3]);
    assert.deepEqual(moveItem([1, 2, 3], 2, -1), [1, 3, 2]);
    const list = [1, 2];
    assert.equal(moveItem(list, 0, -1), list);
    assert.equal(moveItem(list, 1, 1), list);
  });

  it('removes a row; the form keeps one blank row when the last goes', () => {
    const groups = [group('A', 'rice', 'oil'), group('B', 'salt')];
    const [rice, oil] = groups[0].rows;
    const removed = removeRow(groups, rice.key);
    assert.deepEqual(removed.groups[0].rows.map((r) => r.text), ['oil']);
    assert.equal(removed.next.key, oil.key);
    assert.equal(removed.index, 0);
    assert.equal(groups[0].rows.length, 2);

    const last = removeRow(removed.groups, oil.key);
    assert.deepEqual(last.groups[0].rows, []);
    assert.equal(last.next, undefined);
    assert.equal(removeRow(groups, 99999), null);

    const single = [group('A', 'rice')];
    const emptied = removeRow(single, single[0].rows[0].key);
    assert.equal(emptied.groups[0].rows.length, 1);
    assert.equal(isBlank(emptied.groups[0].rows[0]), true);
    assert.equal(emptied.next.key, emptied.groups[0].rows[0].key);
  });

  it('puts the cursor on the row before when the last row of a group goes', () => {
    const groups = [group('A', 'rice', 'oil')];
    const removed = removeRow(groups, groups[0].rows[1].key);
    assert.equal(removed.next.text, 'rice');
  });

  it('moves a row to the end of another group', () => {
    const groups = [group('A', 'rice', 'oil'), group('B', 'salt')];
    const moved = moveRow(groups, groups[0].rows[0].key, groups[1].key);
    assert.deepEqual(moved.groups.map((g) => g.rows.map((r) => r.text)), [['oil'], ['salt', 'rice']]);
    assert.equal(moved.target.key, groups[1].key);
    assert.equal(moveRow(groups, groups[0].rows[0].key, groups[0].key), null);
    assert.equal(moveRow(groups, 99999, groups[1].key), null);
  });

  it('deletes a group: its rows join the group above, or sit at the top of the next for the first; blank rows are dropped', () => {
    const middle = { ...group('B', 'oil'), rows: [row('oil'), blankIngredient()] };
    const groups = [group('A', 'rice'), middle, group('C', 'salt')];
    const second = deleteGroup(groups, 1);
    assert.deepEqual(second.groups.map((g) => g.rows.map((r) => r.text)), [['rice', 'oil'], ['salt']]);
    assert.equal(second.moved.length, 1);
    assert.equal(second.target.title, 'A');

    const first = deleteGroup(groups, 0);
    assert.deepEqual(first.groups.map((g) => g.rows.map((r) => r.text)), [['rice', 'oil', ''], ['salt']]);
    assert.equal(first.target.title, 'B');
  });

  it('puts the first group\'s rows at the top of the next group', () => {
    const groups = [group('A', 'rice'), group('B', 'oil')];
    const first = deleteGroup(groups, 0);
    assert.deepEqual(first.groups.map((g) => [g.title, g.rows.map((r) => r.text)]), [['B', ['rice', 'oil']]]);
  });

  it('cannot delete the only group', () => {
    assert.equal(deleteGroup([group('A', 'rice')], 0), null);
  });

  it('removes a step; the form keeps one blank step', () => {
    const steps = [{ ...blankStep(), text: 'a' }, { ...blankStep(), text: 'b' }];
    assert.deepEqual(removeStep(steps, steps[0].key).map((s) => s.text), ['b']);
    const only = removeStep([steps[0]], steps[0].key);
    assert.equal(only.length, 1);
    assert.equal(only[0].text, '');
  });
});

describe('pasted ingredients', () => {
  const paste = (groups, text) => addBulkRows(groups, parseIngredientLines(text, groups.at(-1).title), lookup.findIngredient);
  const texts = (groups) => groups.map((g) => [g.title, g.rows.map((r) => r.text)]);

  it('fills the blank rows of a new recipe and drops the emptied untitled group', () => {
    const groups = paste([blankGroup(1)], '1 cup rice\n2 tbsp oil');
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].rows.map((r) => r.text), ['rice', 'oil']);
  });

  it('adds to the last group, and joins an existing group by name without case under a heading', () => {
    const groups = [group('Sauce', 'soy'), group('Main', 'rice')];
    const out = paste(groups, '1 tbsp oil\nSAUCE:\n2 tbsp vinegar');
    assert.deepEqual(texts(out), [['Sauce', ['soy', 'vinegar']], ['Main', ['rice', 'oil']]]);
  });

  it('makes a group for a heading nothing matches', () => {
    const out = paste([group('Main', 'rice')], 'Topping:\n1 tbsp sesame');
    assert.deepEqual(texts(out), [['Main', ['rice']], ['Topping', ['sesame']]]);
  });

  it('prunes blank rows but keeps rows with a quantity or unit, and does not change the input', () => {
    const groups = [{ ...blankGroup(0, 'Main'), rows: [blankIngredient(), { ...blankIngredient(), qty: '2' }, row('rice')] }];
    const out = paste(groups, '1 tbsp oil');
    assert.equal(out[0].rows.length, 3);
    assert.equal(groups[0].rows.length, 3);
    assert.deepEqual(out[0].rows.map((r) => r.text), ['', 'rice', 'oil']);
  });

  it('takes the aisle of an existing ingredient over the guess', () => {
    const out = paste([blankGroup(1)], '1 cup rice');
    assert.equal(out[0].rows[0].aisle, 'Pantry');
  });
});

describe('the aisle a name field shows', () => {
  it('uses the existing ingredient\'s, else the one picked, else the guess', () => {
    assert.equal(aisleFor({ existing: { aisle: 'Dairy' }, picked: true, current: 'Produce', guess: 'Pantry' }), 'Dairy');
    assert.equal(aisleFor({ picked: true, current: 'Produce', guess: 'Pantry' }), 'Produce');
    assert.equal(aisleFor({ picked: false, current: 'Produce', guess: 'Pantry' }), 'Pantry');
  });
});

describe('photos', () => {
  it('takes the common image types up to 10 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) assert.equal(photoProblem({ type, size: 1 }), null, type);
    assert.equal(photoProblem({ type: 'image/jpeg', size: 10 * 1024 * 1024 }), null);
  });

  it('refuses other types and larger files', () => {
    for (const type of ['image/svg+xml', 'application/pdf', '', 'image/jpeg2']) assert.equal(photoProblem({ type, size: 1 }), 'wrongType', type);
    assert.equal(photoProblem({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), 'tooBig');
  });

  it('scales the longest side down to 900 and never scales up', () => {
    assert.deepEqual(photoSize(1800, 900), { width: 900, height: 450 });
    assert.deepEqual(photoSize(600, 1800), { width: 300, height: 900 });
    assert.deepEqual(photoSize(900, 900), { width: 900, height: 900 });
    assert.deepEqual(photoSize(400, 300), { width: 400, height: 300 });
  });
});
