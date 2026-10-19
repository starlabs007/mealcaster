import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plural, text } from '../src/lib/text.js';

describe('plural', () => {
  it('uses the singular for exactly one', () => {
    assert.equal(plural(1, 'slot'), 'slot');
  });
  it('adds an s otherwise, including zero', () => {
    assert.equal(plural(0, 'slot'), 'slots');
    assert.equal(plural(2, 'slot'), 'slots');
    assert.equal(plural(11, 'day'), 'days');
  });
  it('takes an irregular plural', () => {
    assert.equal(plural(1, 'leaf', 'leaves'), 'leaf');
    assert.equal(plural(3, 'leaf', 'leaves'), 'leaves');
  });
});

describe('text', () => {
  it('builds last-made wording with plurals', () => {
    assert.equal(text.lastMade.ago(1, 'week'), 'Last made 1 week ago');
    assert.equal(text.lastMade.ago(3, 'month'), 'Last made 3 months ago');
  });
});
