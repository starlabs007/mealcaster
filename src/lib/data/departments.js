// Grocery store departments the Grocery List is grouped by.

// The labels and short names live in sheetText.js, as the short name is written to the sheet.

import { departmentText } from '../sheetText.js';

/** @typedef {'produce' | 'meat' | 'dairy' | 'pantry' | 'other'} Dept */

export const departments = [
  { id: 'produce', ...departmentText.produce, icon: 'eco', color: 'rgb(var(--c-on-tone-sage))' },
  { id: 'meat', ...departmentText.meat, icon: 'set_meal', color: 'rgb(var(--c-secondary))' },
  { id: 'dairy', ...departmentText.dairy, icon: 'egg_alt', color: 'rgb(var(--c-tertiary))' },
  { id: 'pantry', ...departmentText.pantry, icon: 'shelves', color: 'rgb(var(--c-outline))' },
  { id: 'other', ...departmentText.other, icon: 'category', color: 'rgb(var(--c-on-surface-variant))' },
];
