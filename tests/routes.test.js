import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { editRouteId, hrefFor, parseHash, recipeRouteId } from '../src/lib/routes.js';

describe('parseHash', () => {
  it('an empty hash, or "#/", is the planner', () => {
    assert.deepEqual(parseHash(''), { path: '/', query: {} });
    assert.deepEqual(parseHash('#'), { path: '/', query: {} });
    assert.deepEqual(parseHash('#/'), { path: '/', query: {} });
  });

  it('a path and its query', () => {
    assert.deepEqual(parseHash('#/catalog?day=2026-10-24&q=bun%20cha'), { path: '/catalog', query: { day: '2026-10-24', q: 'bun cha' } });
    assert.deepEqual(parseHash('#/recipe/abc'), { path: '/recipe/abc', query: {} });
  });

  it('a query with no value, or a bare "?", is read without failing', () => {
    assert.deepEqual(parseHash('#/catalog?filter'), { path: '/catalog', query: { filter: '' } });
    assert.deepEqual(parseHash('#/grocery?'), { path: '/grocery', query: {} });
  });
});

describe('hrefFor', () => {
  it('a path alone, and a path with a query', () => {
    assert.equal(hrefFor('/grocery'), '#/grocery');
    assert.equal(hrefFor('/catalog', { day: '2026-10-24' }), '#/catalog?day=2026-10-24');
  });

  it('leaves out query values that are missing or empty', () => {
    assert.equal(hrefFor('/catalog', { day: undefined, q: '', filter: null }), '#/catalog');
    assert.equal(hrefFor('/catalog', { day: undefined, q: 'soup' }), '#/catalog?q=soup');
  });

  it('what is written reads back the same', () => {
    const { path, query } = parseHash(hrefFor('/catalog', { q: 'bun cha & more', day: '2026-10-24' }));
    assert.deepEqual([path, query], ['/catalog', { q: 'bun cha & more', day: '2026-10-24' }]);
  });
});

describe('recipe routes', () => {
  it('a recipe page gives its id; the edit page is not a recipe page', () => {
    assert.equal(recipeRouteId('/recipe/pho-1'), 'pho-1');
    assert.equal(recipeRouteId('/recipe/pho-1/edit'), undefined);
    assert.equal(recipeRouteId('/recipe'), undefined);
    assert.equal(recipeRouteId('/catalog'), undefined);
  });

  it('the edit page gives its id', () => {
    assert.equal(editRouteId('/recipe/pho-1/edit'), 'pho-1');
    assert.equal(editRouteId('/recipe/pho-1'), undefined);
  });

  it('"/recipe/new" looks like an id here, so callers check it first', () => {
    assert.equal(recipeRouteId('/recipe/new'), 'new');
  });
});
