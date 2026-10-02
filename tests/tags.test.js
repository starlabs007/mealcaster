import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTag, normalizeTags, tagChoices, assignTones, TONES, TAG_MAX, categoryChoices, normalizeCategory, normalizeAisle } from '../src/lib/tags.js';

test('normalizeTag capitalizes each word and tidies spacing', () => {
  assert.equal(normalizeTag('  date   night '), 'Date Night');
  assert.equal(normalizeTag('GLUTEN-free'), 'Gluten-Free');
  assert.equal(normalizeTag('poultry & meat'), 'Poultry & Meat');
  assert.equal(normalizeTag("mom's (sunday) favorite"), "Mom's (Sunday) Favorite");
  assert.equal(normalizeTag('quick (<30m)'), 'Quick (<30m)');
  assert.equal(normalizeTag('a, b'), 'A B');
  assert.equal(normalizeTag('   '), '');
});

test('normalizeTag caps the length', () => {
  assert.equal(normalizeTag('x'.repeat(150)).length, TAG_MAX);
  assert.equal([...normalizeTag('é'.repeat(150))].length, TAG_MAX);
});

test('normalizeTags maps old tag ids, drops removed ones and duplicates', () => {
  assert.deepEqual(normalizeTags(['quick', 'poultry-meat', 'gluten-free', 'vegetarian']), ['Quick (<30m)', 'Poultry & Meat', 'Gluten-Free', 'Vegetarian']);
  assert.deepEqual(normalizeTags(['comfort', 'one-pot', 'pescatarian', 'kid-friendly', 'Date Night', 'date night', '']), ['Date Night']);
  assert.deepEqual(normalizeTags(undefined), []);
});

test('tagChoices lists suggestions first, then other tags alphabetically', () => {
  assert.deepEqual(tagChoices(['Zesty', 'Vegetarian', 'Date Night', 'Zesty']), ['Quick (<30m)', 'Vegetarian', 'Poultry & Meat', 'Gluten-Free', 'Date Night', 'Zesty']);
});

test('assignTones hands out colours round-robin and keeps them', () => {
  const colors = { next: 0, tones: {} };
  assert.equal(assignTones(colors, ['A', 'B', 'C', 'D', 'E', 'F']), true);
  assert.deepEqual(Object.values(colors.tones), [...TONES, TONES[0]]);
  assert.equal(assignTones(colors, ['F', 'A']), false);
  assignTones(colors, ['Aa']); // sorts before the others but doesn't reshuffle them
  assert.equal(colors.tones.Aa, TONES[1]);
  assert.equal(colors.tones.B, TONES[1]);
  assert.equal(colors.next, 7);
});

test('categoryChoices lists Dinner, Lunch, Dessert first, then others alphabetically, skipping blanks', () => {
  assert.deepEqual(categoryChoices(['Snack', '', 'Dinner', 'Breakfast', 'Snack']), ['Dinner', 'Lunch', 'Dessert', 'Breakfast', 'Snack']);
  assert.equal(normalizeCategory('  sunday   brunch '), 'Sunday Brunch');
  assert.equal(normalizeCategory(undefined), '');
});

test('normalizeAisle maps retired aisles and keeps the rest', () => {
  assert.equal(normalizeAisle('Citrus'), 'Produce');
  assert.equal(normalizeAisle('Garnish'), 'Produce');
  assert.equal(normalizeAisle('Broth'), 'Other');
  assert.equal(normalizeAisle('Fresh'), 'Fresh');
  assert.equal(normalizeAisle(''), '');
});
