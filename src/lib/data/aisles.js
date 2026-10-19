// Store aisle options for ingredients; values are the ingredient tags the grocery list maps to departments.
// The names themselves (tag, label) live in sheetText.js, as they are written to the sheet.
// Plain module (no runes) so the sync codec can use it.

import { aisleText } from '../sheetText.js';

export const aisles = aisleText;
