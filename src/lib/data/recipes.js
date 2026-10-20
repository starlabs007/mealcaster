// Recipe types, mirroring the Google Sheets [Recipes] tab, and formatMinutes. The live list (dev samples +
// the user's own recipes) is in ../recipes.svelte.js; the samples come from dev/samples/ (see ../env.js).

/**
 * @typedef {import('../ingredients.js').RecipeLine} Ingredient a recipe line; the ingredient it points at is in the ingredients store
 * @typedef {{ title: string, category: string, items: Ingredient[] }} IngredientGroup
 * @typedef {{ title: string, minutes: number, text: string, critical?: boolean }} Step
 * @typedef {{
 *   id: string,
 *   title: string,
 *   shortTitle: string,
 *   description: string,
 *   image?: string,
 *   prepMinutes: number,
 *   cookMinutes: number,
 *   minutes: number,
 *   serves: number,
 *   badge: { label: string }, // category; '' = none
 *   addedAt: string,
 *   tags: string[],
 *   notes: string,
 *   ingredients: IngredientGroup[],
 *   steps: Step[],
 *   custom?: boolean,
 *   edited?: boolean,
 * }} Recipe
 */

/** "25 min", "1 hr", "3.5 hrs" */
export function formatMinutes(min) {
  if (min < 60) return `${min} min`;
  const hrs = Math.round((min / 60) * 10) / 10;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}
