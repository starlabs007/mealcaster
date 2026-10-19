// Grocery store departments the Quick Grocery List is grouped by.

// The labels and short names live in sheetText.js, as the short name is written to the sheet.

import { departmentText } from '../sheetText.js';

/** @typedef {'produce' | 'meat' | 'dairy' | 'pantry' | 'other'} Dept */

export const departments = [
  { id: 'produce', ...departmentText.produce, icon: 'eco', color: '#4a6b56' },
  { id: 'meat', ...departmentText.meat, icon: 'set_meal', color: '#a23e18' },
  { id: 'dairy', ...departmentText.dairy, icon: 'egg_alt', color: '#865c00' },
  { id: 'pantry', ...departmentText.pantry, icon: 'shelves', color: '#727973' },
  { id: 'other', ...departmentText.other, icon: 'category', color: '#8a7f72' },
];
