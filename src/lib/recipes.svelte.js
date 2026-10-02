// Live recipe list: the sample pool (sample dev build only) plus the user's own
// recipes. Every recipe is editable: edits to a sample are saved under the
// sample's id and deleted samples are remembered. This is the on-device cache;
// when a Google Sheet is connected, sync replaces it with the sheet's recipes.

import { SvelteMap } from 'svelte/reactivity';
import { sampleRecipes } from './data/recipes.js';
import { migrateNotes } from './markdown.js';
import { normalizeCategory, normalizeTags } from './tags.js';
import { cellText, recipeToRow } from './sync/codec.js';
import { sampleData, storageKey } from './env.js';

export { formatMinutes } from './data/recipes.js';
export { suggestedTags, tagIcon, normalizeTag, normalizeTags, tagChoices, TAG_MAX, normalizeCategory, categoryChoices } from './tags.js';

/** @typedef {import('./data/recipes.js').Recipe} Recipe */
/** @typedef {Omit<Recipe, 'minutes'> & { edited?: boolean }} SavedRecipe */

const STORAGE_KEY = storageKey('recipeBox.v1');
const LEGACY_KEY = storageKey('customRecipes.v1');

// Sample recipes are development data only (`npm run dev`) — production starts empty.
const builtIn = sampleData ? sampleRecipes : [];
const sampleById = new Map(builtIn.map((r) => [r.id, r]));
export const isSample = (id) => sampleById.has(id);

/** @param {SavedRecipe} r @returns {Recipe} */
const withMinutes = (r) => ({ ...r, minutes: r.prepMinutes + r.cookMinutes });

/** Brings a recipe saved by an earlier build up to date. @param {SavedRecipe} r */
const migrate = (r) => {
  // Mock-only sample fields, since removed (cook counts now come from the plan).
  const { highlight, prep, stat, rating, ratings, cookCount, ...rest } = migrateNotes(r);
  return { ...rest, badge: { label: normalizeCategory(rest.badge?.label ?? 'Dinner') }, tags: normalizeTags(r.tags) };
};

/** @returns {{ saved: SavedRecipe[], deleted: string[] }} */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const box = JSON.parse(raw);
      return { ...box, saved: box.saved.map(migrate) };
    }
    // Earlier builds stored only custom recipes, as a plain array.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { saved: JSON.parse(legacy).map(migrate), deleted: [] };
  } catch {
    // Start from the samples.
  }
  return { saved: [], deleted: [] };
}

const box = load();
const savedById = new Map(box.saved.map((r) => [r.id, r]));
/** Sample ids the user deleted. */
const deleted = new Set(box.deleted);

/** @type {Recipe[]} */
export const recipes = $state([
  ...builtIn.filter((r) => !deleted.has(r.id)).map((r) => (savedById.has(r.id) ? withMinutes(savedById.get(r.id)) : r)),
  ...box.saved.filter((r) => !isSample(r.id)).map(withMinutes),
]);

/** @type {Map<string, Recipe>} */
export const recipeById = new SvelteMap(recipes.map((r) => [r.id, r]));

export const customRecipeCount = () => recipes.filter((r) => r.custom).length;

function persist() {
  const saved = recipes.filter((r) => r.custom || r.edited).map(({ minutes, ...r }) => r);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ saved, deleted: [...deleted] }));
    localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    // Most likely the quota — large uploaded photos are the usual culprit.
    throw new Error('This device ran out of space for saved recipes. Try a smaller photo or an image link.', { cause: error });
  }
}

/**
 * Adds or replaces a recipe. Saving over a sample marks it `edited`.
 * @param {SavedRecipe} recipe
 */
export function saveRecipe(recipe) {
  const next = withMinutes(isSample(recipe.id) ? { ...recipe, edited: true } : recipe);
  const index = recipes.findIndex((r) => r.id === recipe.id);
  const previous = index >= 0 ? recipes[index] : undefined;
  if (index >= 0) recipes[index] = next;
  else recipes.push(next);
  const at = index >= 0 ? index : recipes.length - 1;
  try {
    persist();
  } catch (error) {
    // Roll back so memory matches what's stored.
    if (previous) recipes[at] = previous;
    else recipes.splice(at, 1);
    throw error;
  }
  recipeById.set(recipe.id, recipes[at]);
}

/** Puts an edited sample back to its built-in version. @param {string} id */
export function revertSample(id) {
  const index = recipes.findIndex((r) => r.id === id);
  if (index < 0 || !isSample(id)) return;
  recipes[index] = sampleById.get(id);
  recipeById.set(id, recipes[index]);
  persist();
}

/**
 * @param {string} id
 * @returns {{ recipe: Recipe, index: number } | undefined} what was removed, for `restoreRecipe`
 */
export function deleteRecipe(id) {
  const index = recipes.findIndex((r) => r.id === id);
  if (index < 0) return undefined;
  const [removed] = recipes.splice(index, 1);
  recipeById.delete(id);
  if (isSample(id)) deleted.add(id);
  persist();
  return { recipe: $state.snapshot(removed), index };
}

/** Undo for `deleteRecipe`. @param {{ recipe: Recipe, index: number }} removed */
export function restoreRecipe({ recipe, index }) {
  deleted.delete(recipe.id);
  const at = Math.min(index, recipes.length);
  recipes.splice(at, 0, recipe);
  recipeById.set(recipe.id, recipes[at]);
  persist();
}

/** Same content as far as the Google Sheet can tell (favorites aside). */
function sameInSheet(a, b) {
  const none = new Set();
  const [ra, rb] = [recipeToRow(a, none), recipeToRow(b, none)];
  return Object.keys(ra).every((col) => cellText(ra[col]) === cellText(rb[col]));
}

/**
 * Replaces the whole recipe list with the synced one. Sample recipes that match
 * the built-in version are stored as plain samples; changed ones as edits.
 * @param {Recipe[]} list
 */
export function replaceRecipes(list) {
  const ids = new Set(list.map((r) => r.id));
  deleted.clear();
  for (const sample of builtIn) if (!ids.has(sample.id)) deleted.add(sample.id);
  const next = list.map((r) => {
    const sample = sampleById.get(r.id);
    if (!sample) return { ...r, custom: true };
    if (sameInSheet(r, sample)) return sample;
    const { custom, ...rest } = r;
    return { ...rest, edited: true };
  });
  recipes.splice(0, recipes.length, ...next);
  recipeById.clear();
  for (const r of recipes) recipeById.set(r.id, r);
  persist();
}

/** @param {string} title */
export function newRecipeId(title) {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  let id;
  do id = `custom-${slug || 'recipe'}-${Math.random().toString(36).slice(2, 6)}`;
  while (recipeById.has(id));
  return id;
}

// ---- Ingredient text helpers -------------------------------------------------

const UNICODE_FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

/**
 * "1", "1.5", "1/2", "1 1/2", "½", "1½" → number; "" → undefined; junk → NaN.
 * @param {string} text
 */
export function parseQty(text) {
  const value = text.trim().replace(/([\d])([½¼¾⅓⅔⅛])/, '$1 $2');
  if (!value) return undefined;
  const parts = value.split(/\s+/);
  if (parts.length > 2) return NaN;
  let total = 0;
  for (const part of parts) {
    if (part in UNICODE_FRACTIONS) total += UNICODE_FRACTIONS[part];
    else if (/^\d+\/\d+$/.test(part)) {
      const [n, d] = part.split('/').map(Number);
      if (!d) return NaN;
      total += n / d;
    } else if (/^\d*\.?\d+$/.test(part)) total += Number(part);
    else return NaN;
  }
  return total > 0 ? total : NaN;
}

/** Store aisle options; values are the ingredient tags the grocery list maps to departments. */
export const aisles = [
  { tag: 'Produce', label: 'Produce' },
  { tag: 'Herbs', label: 'Herbs' },
  { tag: 'Fresh', label: 'Meat & Seafood' },
  { tag: 'Dairy', label: 'Dairy & Eggs' },
  { tag: 'Pantry', label: 'Pantry' },
  { tag: 'Spices', label: 'Spices' },
  { tag: 'Bakery', label: 'Bakery' },
  { tag: 'Frozen', label: 'Frozen' },
  { tag: 'Other', label: 'Other' },
];

/** Display name for an ingredient tag; tags outside the aisle list show as-is. @param {string} tag */
export const aisleLabel = (tag) => aisles.find((a) => a.tag === tag)?.label ?? tag;

const AISLE_WORDS = [
  ['Herbs', /\b(basil|parsley|cilantro|coriander leaves|thyme|rosemary|dill|mint|sage|chives|tarragon|oregano leaves)\b/],
  ['Spices', /\b(salt|peppercorns?|black pepper|cumin|paprika|turmeric|cinnamon|chili flakes|chilli flakes|red pepper flakes|nutmeg|spice|garam masala|curry powder|oregano|bay lea(f|ves))\b/],
  ['Fresh', /\b(chicken|beef|pork|lamb|turkey|sausage|bacon|pancetta|prosciutto|salmon|cod|tuna|shrimp|prawns?|fish|scallops?|mussels|clams|steak|mince|ground (beef|pork|turkey)|short ribs?|thighs?|fillets?)\b/],
  ['Dairy', /\b(milk|cheese|butter|cream|yogh?urt|eggs?|ricotta|mozzarella|parmesan|feta|cheddar|mascarpone|crème fraîche|creme fraiche|ghee)\b/],
  ['Bakery', /\b(bread|baguette|buns?|tortillas?|pita|naan|sourdough|rolls?)\b/],
  ['Frozen', /\bfrozen\b/],
  ['Produce', /\b(onions?|shallots?|garlic|lemons?|limes?|oranges?|tomato(es)?|potato(es)?|carrots?|celery|peppers?|zucchini|courgettes?|squash|spinach|kale|lettuce|arugula|rocket|cabbage|broccoli|cauliflower|mushrooms?|eggplant|aubergine|asparagus|peas|beans|corn|avocados?|ginger|leeks?|fennel|cucumbers?|apples?|pears?|berries|chil(e|i|li)s?|jalapeños?|scallions?|green onions?)\b/],
];

/** Best-guess aisle for an ingredient description. @param {string} text */
export function guessAisle(text) {
  const t = text.toLowerCase();
  return AISLE_WORDS.find(([, re]) => re.test(t))?.[0] ?? 'Pantry';
}

const UNITS =
  'cups?|c\\.|tbsp\\.?|tablespoons?|tsp\\.?|teaspoons?|lbs?\\.?|pounds?|oz\\.?|ounces?|g|grams?|kg|kilograms?|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|cloves?|bunch(?:es)?|cans?|tins?|jars?|whole|pinch(?:es)?|dash(?:es)?|slices?|sprigs?|heads?|stalks?|packages?|pkgs?|handfuls?|sticks?|pieces?|fillets?|large|medium|small';
const LINE = new RegExp(
  `^((?:\\d+\\s+)?\\d+\\/\\d+|\\d*\\.?\\d+\\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])\\s*(?:(${UNITS})(?=\\s|$))?\\s*(.*)$`,
  'i',
);

/**
 * Parses pasted ingredient lines ("1 lb rigatoni", "Sauce:" starts a group).
 * @param {string} text @param {string} [group]
 * @returns {{ qty: string, unit: string, text: string, group: string, aisle: string }[]}
 */
export function parseIngredientLines(text, group = '') {
  const rows = [];
  let current = group;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•▢☐]|\d+[.)](?=\s))\s*/, '').trim();
    if (!line) continue;
    if (line.endsWith(':')) {
      current = line.slice(0, -1).trim();
      continue;
    }
    const match = line.match(LINE);
    const row = match
      ? { qty: match[1].trim(), unit: (match[2] ?? '').trim(), text: match[3].trim() }
      : { qty: '', unit: '', text: line };
    if (!row.text) continue;
    rows.push({ ...row, group: current, aisle: guessAisle(row.text) });
  }
  return rows;
}
