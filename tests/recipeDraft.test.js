// The Recipe Editor's draft storage: a new recipe's draft, edited recipes' drafts, telling a changed form apart, and
// its ingredient sections (old flat drafts, and the groups a save writes).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, flatForm, savedGroups, sectionsOf, signature } from '../src/lib/recipeDraft.js';

const memory = (/** @type {{ full?: boolean }} */ { full = false } = {}) => {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (full) throw new DOMException('full', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k) => data.delete(k),
  };
};
const form = (title, key = 1) => ({ title, ingredients: [{ key, text: 'rice' }], steps: [{ key: key + 1, text: '' }] });

describe('signature', () => {
  it('ignores row keys, sees every other change', () => {
    assert.equal(signature(form('Pho', 1)), signature(form('Pho', 7)));
    assert.notEqual(signature(form('Pho')), signature(form('Phở')));
  });
});

describe('draft store', () => {
  it('keeps a new recipe under its own key and reads it back', () => {
    const store = memory();
    const drafts = createDraftStore(store, 'new', 'edits');
    assert.equal(drafts.read(undefined), null);
    assert.equal(drafts.write(undefined, form('Pho')), true);
    assert.equal(drafts.read(undefined).title, 'Pho');
    drafts.clear(undefined);
    assert.equal(drafts.read(undefined), null);
    assert.equal(store.data.size, 0);
  });

  it('keeps one draft per edited recipe, for the base it started from', () => {
    const store = memory();
    const drafts = createDraftStore(store, 'new', 'edits');
    drafts.write('a', form('A!'), 'base-a');
    drafts.write('b', form('B!'), 'base-b');
    assert.equal(drafts.read('a', 'base-a').title, 'A!');
    assert.equal(drafts.read('b', 'base-b').title, 'B!');
    assert.equal(drafts.read('a', 'other'), null, 'the recipe changed since');
    drafts.clear('a');
    assert.equal(drafts.read('a', 'base-a'), null);
    assert.equal(drafts.read('b', 'base-b').title, 'B!');
    drafts.clear('b');
    assert.equal(store.data.size, 0, 'the map goes with its last draft');
  });

  it('does not touch the new-recipe draft when an edit draft changes', () => {
    const drafts = createDraftStore(memory(), 'new', 'edits');
    drafts.write(undefined, form('New'));
    drafts.write('a', form('Edit'), 'x');
    drafts.clear('a');
    assert.equal(drafts.read(undefined).title, 'New');
  });

  it('reports a full device instead of throwing, and keeps what was saved', () => {
    const store = memory();
    const drafts = createDraftStore(store, 'new', 'edits');
    drafts.write('a', form('A'), 'x');
    store.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    assert.equal(drafts.write('a', form('A2'), 'x'), false);
    assert.equal(drafts.write(undefined, form('N')), false);
    assert.equal(drafts.read('a', 'x').title, 'A');
  });

  it('ignores damaged storage', () => {
    const store = memory();
    store.data.set('new', '{oops');
    store.data.set('edits', '[1]');
    const drafts = createDraftStore(store, 'new', 'edits');
    assert.equal(drafts.read(undefined), null);
    assert.equal(drafts.read('a', 'x'), null);
    assert.equal(drafts.write('a', form('A'), 'x'), true);
    assert.equal(drafts.read('a', 'x').title, 'A');
    store.data.set('new', JSON.stringify({ title: 'no rows' }));
    assert.equal(drafts.read(undefined), null);
  });
});

const row = (key, text, extra = {}) => ({ key, qty: '1', unit: '', text, id: text, note: '', prep: '', optional: false, aisle: 'pantry', aisleSet: true, ...extra });

describe('grouped drafts', () => {
  it('a grouped form is a draft too', () => {
    const drafts = createDraftStore(memory(), 'new', 'edits');
    drafts.write(undefined, { title: 'Pho', groups: [{ key: 1, title: '', rows: [] }], steps: [] });
    assert.equal(drafts.read(undefined).title, 'Pho');
  });

  it('flatForm rebuilds the old flat shape, key for key, so an old draft still matches its recipe', () => {
    const grouped = {
      title: 'Burgers',
      tags: [],
      groups: [
        { key: 1, title: 'Patties', rows: [row(2, 'lamb')] },
        { key: 3, title: 'Build', rows: [row(4, 'bun')] },
      ],
      steps: [],
      notes: '',
    };
    const old = {
      title: 'Burgers',
      tags: [],
      ingredients: [
        { key: 9, qty: '1', unit: '', text: 'lamb', id: 'lamb', note: '', prep: '', optional: false, group: 'Patties', aisle: 'pantry', aisleSet: true },
        { key: 8, qty: '1', unit: '', text: 'bun', id: 'bun', note: '', prep: '', optional: false, group: 'Build', aisle: 'pantry', aisleSet: true },
      ],
      steps: [],
      notes: '',
    };
    assert.equal(signature(flatForm(grouped)), signature(old));
  });

  it('sectionsOf puts flat rows back in their groups, in first-seen order, ignoring case', () => {
    const rows = [{ text: 'lamb', group: 'Patties' }, { text: 'bun', group: 'Build' }, { text: 'salt', group: 'patties ' }, { text: 'ice' }];
    const sections = sectionsOf(rows);
    assert.deepEqual(
      sections.map((s) => [s.title, s.rows.map((r) => r.text)]),
      [['Patties', ['lamb', 'salt']], ['Build', ['bun']], ['', ['ice']]],
    );
    assert.equal('group' in sections[0].rows[0], false);
  });
});

describe('savedGroups', () => {
  const how = { fallbackTitle: 'Main', item: (r) => ({ id: r.text }) };

  it('saves sections in order, skipping empty rows and sections; untitled ones become Main', () => {
    const groups = savedGroups(
      [
        { title: '', rows: [row(1, 'rice'), row(2, '  ')] },
        { title: 'Sauce', rows: [row(3, '')] },
        { title: 'Top', rows: [row(4, 'scallion')] },
      ],
      how,
    );
    assert.deepEqual(groups, [
      { title: 'Main', items: [{ id: 'rice' }] },
      { title: 'Top', items: [{ id: 'scallion' }] },
    ]);
  });

  it('merges sections that share a name', () => {
    const groups = savedGroups(
      [
        { title: 'Lamb Patties', rows: [row(1, 'lamb')] },
        { title: '', rows: [row(2, 'bun')] },
        { title: 'main', rows: [row(3, 'lettuce')] },
      ],
      how,
    );
    assert.deepEqual(
      groups.map((g) => [g.title, g.items.map((i) => i.id)]),
      [['Lamb Patties', ['lamb']], ['Main', ['bun', 'lettuce']]],
    );
  });
});
