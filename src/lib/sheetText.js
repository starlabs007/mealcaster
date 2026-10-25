// Text that is stored in the household's Google Sheet and the .xlsx export, and parsed back by sync/codec.js.
//
// These strings are DATA, not just wording. Once a sync has run they live in the sheet, and the codec matches them
// when it reads the sheet back. Renaming one here is therefore not like editing a button label:
//
//   - Rows already in the sheet stop matching. A [Settings] row with the old name is ignored (and a new row is
//     written next to it), a grocery Status the codec no longer recognises reads back as "To buy", an aisle or
//     department it no longer recognises falls back to the default.
//   - Other devices still running an older build keep writing, and expecting, the old word. Two devices on the same
//     sheet would undo each other's values on every sync.
//
// To change one safely:
//   - keep the old word as an accepted alias when reading (parseStatus already accepts "In pantry" this way; parseAisle
//     and parseDept accept the tag, the label or the id), so old rows and old devices still read; or
//   - bump SCHEMA_VERSION (schema.js, schemaCheck.js) and write a migration that rewrites the existing rows;
//   - and either way add or adjust a codec test (tests/codec-engine.test.js, tests/settings.test.js).
//     tests/sheetText.test.js pins every value in this file and fails when one changes.
//
// Wording that only appears on screen (labels, buttons, toasts, help text) belongs in text.js instead.
//
// Plain module (no runes) so the sync codec, the data files and the tests can import it.

// ---- Grocery Status ([Provisions] tab, Status column) -------------------------------------------------------------

/** The Status values written to the sheet. */
export const status = {
  onHand: 'On hand',
  bought: 'Bought',
  toBuy: 'To buy',
  skipped: 'Skipped',
};

/**
 * How parseStatus reads a Status cell (lower-cased, trimmed). Keep these next to `status` and edit them together:
 * a word that isn't matched by `bought`, `skipped` or `owned` reads back as "need" (an older build reads "Skipped" so too).
 * `bought` and `skipped` are anchored at the start of the cell; `owned` matches anywhere in it.
 */
export const statusPatterns = {
  bought: /^(bought|done|got|checked|true|x|✓)/,
  skipped: /^skip/,
  owned: /on hand|pantry|owned|have|stock/,
};

// ---- [Settings] tab -------------------------------------------------------------------------------------------------

/** [Settings] row for "go back to the planner after choosing a meal". */
export const returnToPlannerRow = { Section: 'Preference', Name: 'Return to planner after choosing a meal' };

/** [Settings] row holding the schema version the sheet was written with. */
export const schemaVersionRow = { Section: 'Schema', Name: 'Version' };

/** [Settings] row for the weekday the planner's weeks start on. */
export const weekStartsOnRow = { Section: 'Preference', Name: 'Week starts on' };

/** [Settings] section for tag colours: one row per tag, Value = the colour's name ("Saffron"). */
export const tagColourSection = 'Tag Colour';

/** Weekday names written as the "Week starts on" value, Sunday first. parseWeekday matches their first 3+ letters. */
export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Tag colour names written as [Settings] values. The keys are the tone ids in tags.js (TONES). */
export const tagColourNames = {
  saffron: 'Saffron',
  sage: 'Sage',
  paprika: 'Paprika',
  slate: 'Slate',
  plum: 'Plum',
};

/** The name written for a tone id (a tone with no entry above is capitalised). @param {string} tone */
export const tagColourName = (tone) => tagColourNames[tone] ?? tone[0].toUpperCase() + tone.slice(1);

// ---- Aisles and departments ---------------------------------------------------------------------------------------

/**
 * Ingredient aisles. `label` is written to the Ingredients tab's Aisle column and shown in the UI dropdowns;
 * parseAisle reads either the `tag` or the `label` back.
 */
export const aisleText = [
  { tag: 'Produce', label: 'Produce' },
  { tag: 'Herbs', label: 'Herbs' },
  { tag: 'Fresh', label: 'Meat & Seafood' },
  { tag: 'Dairy', label: 'Dairy & Eggs' },
  { tag: 'Refrigerated', label: 'Refrigerated' },
  { tag: 'Pantry', label: 'Pantry' },
  { tag: 'Noodles', label: 'Noodles & Rice' },
  { tag: 'Sauces', label: 'Sauces & Condiments' },
  { tag: 'Spices', label: 'Spices' },
  { tag: 'Bakery', label: 'Bakery' },
  { tag: 'Frozen', label: 'Frozen' },
  { tag: 'Other', label: 'Other' },
];

/**
 * Grocery departments. `short` is written to the Provisions tab's Department column; parseDept reads the department
 * id, the `short` or the `label` back. `label` is the long name shown on the grocery list.
 */
export const departmentText = {
  produce: { label: 'Fresh Produce & Herbs', short: 'Produce' },
  meat: { label: 'Meat & Fresh Seafood', short: 'Seafood & Meat' },
  dairy: { label: 'Dairy & Refrigerated', short: 'Dairy' },
  pantry: { label: 'Pantry, Grains & Spices', short: 'Pantry' },
  other: { label: 'Other Items', short: 'Other' },
};

// ---- Defaults that become stored data once synced ------------------------------------------------------------------

/** Title of the single ingredient group a flat ingredient list is wrapped in, and of a group with no title. */
export const defaultGroupTitle = 'Ingredients';

/** Category text of an ingredient group: "1 item", "5 items". */
export const groupCategory = (n) => `${n} ${n === 1 ? 'item' : 'items'}`;

/** Category text of a wrapped flat list. Always plural, as it has always been written ("1 items"). */
export const flatGroupCategory = (n) => `${n} items`;

/** Title given to a recipe whose Title cell is empty. */
export const untitledRecipe = 'Untitled recipe';

/** Custom_Notes text written for a dining-out evening that has no notes of its own. */
export const diningOutNote = 'Dining out';

/** Title of the ingredient group for a line with no group name. */
export const defaultIngredientGroup = 'Main';

/** Title given to a method step with no title: "Step 1". @param {number} n 1-based */
export const defaultStepTitle = (n) => `Step ${n}`;

// ---- Written for reading only: the Provisions tab's Source and Detail columns ---------------------------------------
// The codec writes these but never parses them back (Line_Key and Added carry the data), so changing one cannot lose
// data; rows already in the sheet just keep the old words until the next sync rewrites them. The grocery screen
// shows the same labels on its meal pills.

/** Source label of a line the person added by hand for one week. */
export const sourceAddedByYou = 'Added by you';

/** Source label of a standing "every week" line. */
export const sourceEveryWeek = 'Every week';

/** Source label of a planned dinner: "Mon: Pasta". @param {string} weekday3 first three letters @param {string} title */
export const sourceDinner = (weekday3, title) => `${weekday3}: ${title}`;

/** Detail-column marker for an optional ingredient. */
export const detailOptional = 'optional';

/** Aisle tag of a new ingredient, and of an ingredient the sheet doesn't give one for. */
export const defaultAisle = 'Pantry';

/** Department short name written for a line whose department isn't known. */
export const defaultDepartmentShort = 'Pantry';

// ---- Heads-ups ([Recipes] tab, Heads_Up_JSON column) ---------------------------------------------------------------

/**
 * Keys of one heads-up in the Heads_Up_JSON cell: `[{"text": "Soak the chickpeas overnight.", "daysBefore": 1}]`.
 * Keys the codec doesn't know are kept and written back, so a later build can add some.
 */
export const headsUpKeys = { text: 'text', daysBefore: 'daysBefore' };
