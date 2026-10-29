// The recipe box rules (recipeBox.js): reading old saves, what is kept on the device, bulk
// tag / ingredient edits, and how a synced list is classified against the samples.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  migrate,
  parseBox,
  startingRecipes,
  recipesToSave,
  recipeToStore,
  retagChanges,
  relinkChanges,
  classifySynced,
} from '../src/lib/recipeBox.js';
import { recipe } from './fakes.js';

const sample = (id, extra = {}) => recipe(id, id, { custom: undefined, ...extra });
const samples = [sample('pho'), sample('bun')];
const isSample = (id) => samples.some((s) => s.id === id);

describe('reading a saved recipe box', () => {
  it('drops mock-only fields and group categories, turns the category into meals, fixes the tags, and keeps only lines with an ingredient', () => {
    const old = {
      ...recipe('old', 'Old', { tags: ['Quick (<30m)', 'Quick (<30m)'], badge: { label: '  dinner ' } }),
      highlight: 'x',
      rating: 5,
      cookCount: 3,
      hero: 'h.jpg',
      shortTitle: 'O',
      ingredients: [{ title: 'Main', category: 'Protein', items: [{ id: 'pasta', qty: 1 }, { qty: 2 }, null] }],
    };
    const r = migrate(old);
    for (const gone of ['highlight', 'rating', 'cookCount', 'hero', 'shortTitle']) assert.equal(gone in r, false);
    assert.deepEqual(r.tags, ['Quick (<30m)']);
    assert.deepEqual(r.meals, ['Dinner']);
    assert.equal('badge' in r, false);
    assert.deepEqual(r.ingredients, [{ title: 'Main', items: [{ id: 'pasta', qty: 1 }] }]);
    assert.deepEqual(r.headsUps, []);
  });

  it('starts empty when nothing is stored or it cannot be read', () => {
    for (const raw of [null, '', 'not json', '{"deleted":[]}']) assert.deepEqual(parseBox(raw), { saved: [], deleted: [] });
  });

  it('migrates every saved recipe and keeps the deleted list', () => {
    const box = parseBox(JSON.stringify({ saved: [recipe('mine', 'Mine')], deleted: ['bun'] }));
    assert.equal(box.saved[0].id, 'mine');
    assert.deepEqual(box.saved[0].headsUps, []);
    assert.deepEqual(box.deleted, ['bun']);
  });
});

describe('the recipes a device starts with', () => {
  it('shows the samples, minus deleted ones, with edited samples replaced and own recipes after', () => {
    const edited = { ...sample('pho', { title: 'My pho', prepMinutes: 5, cookMinutes: 5 }), edited: true };
    const list = startingRecipes(samples, { saved: [edited, recipe('mine', 'Mine')], deleted: ['bun'] });
    assert.deepEqual(list.map((r) => r.id), ['pho', 'mine']);
    assert.equal(list[0].title, 'My pho');
    assert.equal(list[0].minutes, 10);
    assert.equal(list[1].minutes, 30);
  });

  it('shows untouched samples as built in', () => {
    const list = startingRecipes(samples, { saved: [], deleted: [] });
    assert.equal(list[0], samples[0]);
    assert.equal(list.length, 2);
  });
});

describe('what is kept on the device', () => {
  it('keeps own and edited recipes only, without minutes', () => {
    const list = [samples[0], { ...samples[1], edited: true }, recipe('mine', 'Mine')];
    const saved = recipesToSave(list);
    assert.deepEqual(saved.map((r) => r.id), ['bun', 'mine']);
    assert.equal(saved.some((r) => 'minutes' in r), false);
  });

  it('marks a sample edited when it is saved over, and not an own recipe', () => {
    const edited = recipeToStore(samples[0], true);
    assert.equal(edited.edited, true);
    assert.equal(edited.minutes, 30);
    assert.equal('edited' in recipeToStore(recipe('mine', 'Mine'), false), false);
  });
});

describe('renaming or removing a tag', () => {
  const list = [
    sample('pho', { tags: ['Soup', 'Vegetarian'] }),
    recipe('mine', 'Mine', { tags: ['Soup'] }),
    recipe('plain', 'Plain', { tags: ['Vegetarian'] }),
  ];

  it('changes only recipes with the tag and marks touched samples edited', () => {
    const changes = retagChanges(list, 'Soup', 'Broth', isSample);
    assert.deepEqual(changes.map((c) => c.index), [0, 1]);
    assert.deepEqual(changes[0].recipe.tags, ['Broth', 'Vegetarian']);
    assert.equal(changes[0].recipe.edited, true);
    assert.equal('edited' in changes[1].recipe, false);
    assert.deepEqual(list[0].tags, ['Soup', 'Vegetarian']);
  });

  it('removes the tag when the new name is empty, and merges into an existing tag', () => {
    assert.deepEqual(retagChanges(list, 'Soup', '', isSample)[1].recipe.tags, []);
    assert.deepEqual(retagChanges(list, 'Soup', 'Vegetarian', isSample)[0].recipe.tags, ['Vegetarian']);
  });

  it('changes nothing when no recipe has the tag', () => {
    assert.deepEqual(retagChanges(list, 'nope', 'x', isSample), []);
  });
});

describe('merging two ingredients in recipes', () => {
  const line = (id) => ({ id, qty: 1, unit: 'cup' });
  const withLines = (id, ...ids) => ({ ...recipe(id, id), ingredients: [{ title: 'A', items: ids.map(line) }, { title: 'B', items: [line('salt')] }] });

  it('points every line at the new ingredient and leaves the rest', () => {
    const list = [withLines('r1', 'pasta', 'basil'), withLines('r2', 'rice')];
    const [change, ...others] = relinkChanges(list, 'pasta', 'noodles', isSample);
    assert.equal(others.length, 0);
    assert.equal(change.index, 0);
    assert.deepEqual(change.recipe.ingredients[0].items.map((i) => i.id), ['noodles', 'basil']);
    assert.deepEqual(change.recipe.ingredients[1].items.map((i) => i.id), ['salt']);
    assert.equal(change.recipe.ingredients[0].items[0].qty, 1);
    assert.equal(list[0].ingredients[0].items[0].id, 'pasta');
  });

  it('marks touched samples edited', () => {
    const list = [{ ...withLines('pho', 'pasta'), custom: undefined }];
    assert.equal(relinkChanges(list, 'pasta', 'noodles', isSample)[0].recipe.edited, true);
  });
});

describe('classifying a synced list against the samples', () => {
  it('keeps untouched samples as built in, marks changed ones edited, and own recipes custom', () => {
    const synced = [
      { ...samples[0], custom: true },
      { ...samples[1], title: 'Changed', custom: true },
      recipe('mine', 'Mine', { custom: undefined }),
    ];
    const { recipes, deleted } = classifySynced(synced, samples);
    assert.equal(recipes[0], samples[0]);
    assert.equal(recipes[1].edited, true);
    assert.equal('custom' in recipes[1], false);
    assert.equal(recipes[2].custom, true);
    assert.deepEqual(deleted, []);
  });

  it('counts samples missing from the sheet as deleted', () => {
    const { recipes, deleted } = classifySynced([samples[1]], samples);
    assert.deepEqual(recipes.map((r) => r.id), ['bun']);
    assert.deepEqual(deleted, ['pho']);
  });

  it('treats a favourite flag or the minutes total as no change', () => {
    const { recipes } = classifySynced([{ ...samples[0], minutes: 99 }], samples);
    assert.equal(recipes[0], samples[0]);
  });
});
