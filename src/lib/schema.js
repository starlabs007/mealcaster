// Column headers each Google Sheets tab is expected to have (PRD §4.6).
// Plain module (no runes) so the sync logic can be tested outside Svelte.

export const SCHEMA = {
  // One row per ingredient; recipe lines point at Ingredient_ID. Aisle is written as its label.
  ingredients: ['Ingredient_ID', 'Name', 'Plural', 'Aisle', 'On_Hand'],
  weeklyPlan: ['Date_ISO', 'Day_Of_Week', 'Recipe_ID_Assigned', 'Completed_Flag', 'Custom_Notes'],
  // PRD columns first; Category → Notes were added so custom recipes round-trip.
  recipes: [
    'Recipe_ID', 'Title', 'Description', 'Ingredients_JSON', 'Method_Steps', 'Image_URL', 'Tags', 'Favorite_Flag',
    'Category', 'Servings', 'Prep_Minutes', 'Cook_Minutes', 'Notes',
  ],
  // Line_Key ties a row back to its grocery line so edits round-trip.
  provisions: ['Week_Of', 'Item', 'Detail', 'Department', 'Status', 'Source', 'Line_Key'],
  // One row per setting: Section groups them ("Preference", "Tag Colour"…), Name identifies the row within it.
  settings: ['Section', 'Name', 'Value'],
};

/**
 * Version of the sheet layout and stored data, written to the [Settings] tab (`Schema | Version`).
 * Bump it when a change needs existing sheets or device data migrated.
 * 2: ingredients moved to their own tab; recipe lines point at them by id (no Have / Aisle settings).
 */
export const SCHEMA_VERSION = 2;

/** @typedef {keyof typeof SCHEMA} TabKey */
