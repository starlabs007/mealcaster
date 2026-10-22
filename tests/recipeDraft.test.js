// The Recipe Editor's draft storage: a new recipe's draft, edited recipes' drafts, and telling a changed form apart.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, signature } from '../src/lib/recipeDraft.js';

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
