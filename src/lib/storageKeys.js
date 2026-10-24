// The localStorage keys MealCaster owns, by name (see storageKey in env.js for the prefix). A store that adds a key
// puts it in DEVICE_DATA or KEPT: tests/storageKeys.test.js fails when a key in the source is in neither.

// Saved device data, cleared when switching dev modes. The sync base must go with the data: kept on its own, the next
// sync would read the empty device as "everything was deleted here" and delete the rows from the sheet. Without it,
// the next sync is a first sync and simply brings the sheet's data back.
export const DEVICE_DATA = [
  'ingredients.v1',
  'recipeBox.v2',
  'weeklyPlan.v2',
  'favorites.v2',
  'grocery.v4',
  'groceryEvery.v1',
  'settings.v2',
  'recipeDraft.v2',
  'recipeEditDrafts.v1',
  'recipePrep.v1',
  'recipeServings.v1',
  'syncBase.v2',
];

// Kept when switching dev modes: the connection to the spreadsheet (linked spreadsheet, tab names, column mapping),
// this device's own preferences, and the flags that record what the build did.
export const KEPT = [
  'sheetsSettings.v1',
  'printOptions.v1',
  'catalogHideRecent.v1',
  'catalogHidePlanned.v1',
  'groceryHintSeen.v1',
  'theme.v1',
  'devDataMode',
  'wiped',
];

// Data saved before schema version 2 (ingredients in their own tab). Nothing reads it any more, so it's removed on
// load: it would only use up the origin's shared storage. A device starts empty and takes the converted spreadsheet on
// its next first sync (the old sync base goes too, so its rows are never mistaken for deletions).
export const OLD_DATA = [
  'recipeBox.v1',
  'customRecipes.v1',
  'weeklyPlan.v1',
  'favorites.v1',
  'grocery.v2',
  'groceryExtras.v1',
  'groceryGlobal.v1',
  // Per-recipe-line grocery lists of the first v2 builds (before lines merged by ingredient).
  'grocery.v3',
  'groceryGlobal.v2',
  'settings.v1',
  'tagColors.v1',
  'recipeDraft.v1',
  'syncBase.v1',
];
