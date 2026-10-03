// Column headers each Google Sheets tab is expected to have (PRD §4.6).
// Plain module (no runes) so the sync logic can be tested outside Svelte.

export const SCHEMA = {
  weeklyPlan: ['Date_ISO', 'Day_Of_Week', 'Recipe_ID_Assigned', 'Completed_Flag', 'Custom_Notes'],
  // PRD columns first; Category → Notes were added so custom recipes round-trip.
  recipes: [
    'Recipe_ID', 'Title', 'Description', 'Ingredients_JSON', 'Method_Steps', 'Image_URL', 'Tags', 'Favorite_Flag',
    'Category', 'Servings', 'Prep_Minutes', 'Cook_Minutes', 'Notes',
  ],
  // Line_Key ties a row back to its grocery line so edits round-trip.
  provisions: ['Week_Of', 'Item', 'Detail', 'Department', 'Status', 'Source', 'Line_Key'],
  // One row per setting: Section groups them ("Aisle" today), Name identifies the row within it.
  settings: ['Section', 'Name', 'Value'],
};

/**
 * Version of the sheet layout and stored data, written to the [Settings] tab (`Schema | Version`).
 * Bump it when a change needs existing sheets or device data migrated.
 */
export const SCHEMA_VERSION = 1;

/** @typedef {keyof typeof SCHEMA} TabKey */
