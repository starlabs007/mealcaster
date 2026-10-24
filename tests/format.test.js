import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatQty } from '../src/lib/format.js';
import { formatMinutes } from '../src/lib/data/recipes.js';

describe('formatQty', () => {
  it('writes the common fractions as fractions', () => {
    assert.equal(formatQty(0.25), '1/4');
    assert.equal(formatQty(1 / 3), '1/3');
    assert.equal(formatQty(0.5), '1/2');
    assert.equal(formatQty(2 / 3), '2/3');
    assert.equal(formatQty(0.75), '3/4');
  });

  it('puts whole numbers in front of a fraction', () => {
    assert.equal(formatQty(3.5), '3 1/2');
    assert.equal(formatQty(1.25), '1 1/4');
  });

  it('whole numbers and zero', () => {
    assert.equal(formatQty(2), '2');
    assert.equal(formatQty(0), '0');
  });

  it('a value just under the next whole number rounds up to it', () => {
    assert.equal(formatQty(0.98), '1');
    assert.equal(formatQty(2.97), '3');
  });

  it('a decimal that is no fraction keeps one decimal place', () => {
    assert.equal(formatQty(2.4), '2.4');
    assert.equal(formatQty(0.1), '0.1');
  });

  it('a value within 0.04 of a fraction is read as that fraction (0.52 is a half)', () => {
    assert.equal(formatQty(0.52), '1/2');
    assert.equal(formatQty(0.7), '2/3');
  });
});

describe('formatMinutes', () => {
  it('minutes under an hour', () => {
    assert.equal(formatMinutes(0), '0 min');
    assert.equal(formatMinutes(25), '25 min');
    assert.equal(formatMinutes(59), '59 min');
  });

  it('an hour is "1 hr", and more are hrs with one decimal at most', () => {
    assert.equal(formatMinutes(60), '1 hr');
    assert.equal(formatMinutes(90), '1.5 hrs');
    assert.equal(formatMinutes(120), '2 hrs');
    assert.equal(formatMinutes(210), '3.5 hrs');
  });

  it('just over an hour rounds to the hour', () => {
    assert.equal(formatMinutes(61), '1 hr');
  });
});
