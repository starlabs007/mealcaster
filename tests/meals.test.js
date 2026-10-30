import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEALS, parseMeals, normalizeMeals, formatMeals, isDinner, hasAnyMeal, mealFilters } from '../src/lib/meals.js';

test('the list is fixed and in display order', () => {
  assert.deepEqual(MEALS, ['Breakfast', 'Lunch', 'Dinner', 'Side', 'Snack', 'Dessert', 'Other']);
});

test('parseMeals reads lists and sheet cells, in list order without duplicates', () => {
  assert.deepEqual(parseMeals('dinner,  Lunch, DINNER').meals, ['Lunch', 'Dinner']);
  assert.deepEqual(parseMeals(['Dessert', 'breakfast']).meals, ['Breakfast', 'Dessert']);
  assert.deepEqual(parseMeals('Dessert'), { meals: ['Dessert'], extra: [] }, 'an older single value');
  for (const empty of ['', '  ', undefined, null, []]) assert.deepEqual(parseMeals(empty), { meals: [], extra: [] });
});

test('parseMeals hands back words outside the list, tidied like tags', () => {
  assert.deepEqual(parseMeals('  sunday   brunch , Lunch, sunday brunch, Starter'), { meals: ['Lunch'], extra: ['Sunday Brunch', 'Starter'] });
  assert.deepEqual(normalizeMeals(['Snack', 'Brunch']), ['Snack']);
});

test('Other is a meal, last in the list, read in any case', () => {
  assert.deepEqual(parseMeals('other, Dessert'), { meals: ['Dessert', 'Other'], extra: [] }, 'no longer moved into Tags');
  assert.deepEqual(parseMeals(['Other', 'Breakfast', 'OTHER']).meals, ['Breakfast', 'Other']);
  assert.equal(formatMeals(parseMeals(' other ').meals), 'Other');
});

test('formatMeals writes the sheet cell', () => {
  assert.equal(formatMeals(['Lunch', 'Dinner']), 'Lunch, Dinner');
  assert.equal(formatMeals([]), '');
});

test('isDinner: Dinner among the meals, or none at all', () => {
  assert.equal(isDinner(['Lunch', 'Dinner']), true);
  assert.equal(isDinner([]), true);
  assert.equal(isDinner(undefined), true);
  assert.equal(isDinner(['Lunch']), false);
  assert.equal(isDinner(['Other']), false, 'a sauce is never a dinner');
});

test('hasAnyMeal matches any chosen meal; no choice matches everything', () => {
  assert.equal(hasAnyMeal(['Lunch'], []), true);
  assert.equal(hasAnyMeal([], []), true);
  assert.equal(hasAnyMeal(['Lunch', 'Dinner'], ['Dessert', 'Dinner']), true);
  assert.equal(hasAnyMeal(['Lunch'], ['Dinner']), false);
  assert.equal(hasAnyMeal([], ['Dinner']), false);
});

test('mealFilters lists meals in use in list order, keeping an active one', () => {
  assert.deepEqual(mealFilters([['Dinner'], ['Lunch', 'Dinner'], []], []), ['Lunch', 'Dinner']);
  assert.deepEqual(mealFilters([['Dinner']], ['Dessert']), ['Dinner', 'Dessert']);
  assert.deepEqual(mealFilters([['Other'], ['Breakfast']], []), ['Breakfast', 'Other']);
});
