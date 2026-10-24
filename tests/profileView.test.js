import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listWords, mergeTarget, sizeText, storageShare, tagUsage } from '../src/lib/profileView.js';

const tagged = (...tags) => ({ tags });

describe('tagUsage', () => {
  it('counts recipes per tag in the order of the choices', () => {
    const rows = tagUsage(['Soup', 'Quick', 'Vegetarian'], [tagged('Quick', 'Soup'), tagged('Soup'), tagged('Soup', 'Vegetarian')]);
    assert.deepEqual(rows, [{ tag: 'Soup', count: 3 }, { tag: 'Quick', count: 1 }, { tag: 'Vegetarian', count: 1 }]);
  });

  it('leaves out choices no recipe has (built-in suggestions)', () => {
    assert.deepEqual(tagUsage(['Soup', 'Quick'], [tagged('Quick')]), [{ tag: 'Quick', count: 1 }]);
  });

  it('no recipes means no rows', () => {
    assert.deepEqual(tagUsage(['Soup'], []), []);
  });

  it('a recipe with no tags counts for none', () => {
    assert.deepEqual(tagUsage(['Soup'], [tagged(), tagged('Soup')]), [{ tag: 'Soup', count: 1 }]);
  });
});

describe('mergeTarget', () => {
  const rows = [{ tag: 'Soup', count: 2 }, { tag: 'Broth', count: 1 }];

  it('finds the other tag the typed name tidies to', () => {
    assert.equal(mergeTarget(rows, 'Broth', 'soup').tag, 'Soup');
  });

  it('renaming a tag to itself, or to a new name, merges nothing', () => {
    assert.equal(mergeTarget(rows, 'Soup', 'soup'), undefined);
    assert.equal(mergeTarget(rows, 'Soup', 'Stew'), undefined);
  });
});

describe('listWords', () => {
  it('turns the last comma into "and"', () => {
    assert.equal(listWords(['a', 'b', 'c'], ' and '), 'a, b and c');
  });

  it('two items and one item', () => {
    assert.equal(listWords(['a', 'b'], ' and '), 'a and b');
    assert.equal(listWords(['a'], ' and '), 'a');
    assert.equal(listWords([], ' and '), '');
  });
});

describe('sizeText', () => {
  it('shows KB under a million characters, never less than 1 KB', () => {
    assert.equal(sizeText(0), '1 KB');
    assert.equal(sizeText(499), '1 KB');
    assert.equal(sizeText(12_400), '12 KB');
    assert.equal(sizeText(999_499), '999 KB');
  });

  it('shows MB with one decimal from a million', () => {
    assert.equal(sizeText(1_000_000), '1.0 MB');
    assert.equal(sizeText(1_460_000), '1.5 MB');
  });
});

describe('storageShare', () => {
  it('is the used share of the budget', () => {
    assert.deepEqual(storageShare(2_500_000, 5_000_000), { over: false, share: 0.5 });
  });

  it('exactly at the budget is full but not over', () => {
    assert.deepEqual(storageShare(5_000_000, 5_000_000), { over: false, share: 1 });
  });

  it('past the budget the share stops at 1 and over is set', () => {
    assert.deepEqual(storageShare(7_000_000, 5_000_000), { over: true, share: 1 });
  });
});
