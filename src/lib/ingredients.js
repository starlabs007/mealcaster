// Ingredients: one entry per thing you buy (synced as the [Ingredients] tab). Recipe lines point at
// them by id and add their own amount, note, prep and optional flag. Plain JS (no runes) so the sync
// codec and tests can use it; the store is ingredients.svelte.js.

import { formatQty } from './format.js';

/**
 * @typedef {{ id: string, name: string, plural: string, aisle: string, onHand: boolean }} Ingredient
 *   `name` / `plural` lowercase; `plural` '' = no plural form; `aisle` an aisle tag (data/aisles.js);
 *   `onHand` = in stock at home, kept off the grocery list until unticked.
 */

// ---- Comparing text ----------------------------------------------------------

/**
 * Text as compared everywhere (search, matching, duplicates): lower case, accents dropped, single
 * spaces. "Rau Răm" → "rau ram", "Đúc" → "duc" (đ doesn't decompose, so it's mapped by hand).
 * @param {unknown} text
 */
export const foldKey = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/** An ingredient name as compared: folded, without a plural "s"/"es" ("Green Onions" = "green onion"). @param {unknown} name */
export const nameKey = (name) =>
  foldKey(name)
    .replace(/(?<=(?:ss|ch|sh|x|z|o))es$/, '')
    .replace(/(?<=[a-z]{2}[^s])s$/, '');

/** Tidy name as stored: single spaces, trimmed, lowercase (the person's choice, for consistency). @param {unknown} name */
export const tidyIngredientName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// ---- Ids ---------------------------------------------------------------------

/** "Bún chả" → "bun-cha": folded, a–z 0–9 and hyphens, at most 40 characters. @param {unknown} text */
export const slugify = (text) =>
  foldKey(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');

/**
 * Id for a new recipe: `custom-<slug>-<4 random>`.
 * @param {string} title @param {(id: string) => boolean} taken
 */
export function recipeIdFor(title, taken) {
  const slug = slugify(title) || 'recipe';
  let id;
  do id = `custom-${slug}-${Math.random().toString(36).slice(2, 6)}`;
  while (taken(id));
  return id;
}

/**
 * Id for a new ingredient: its slug, then `-2`, `-3`… if taken. Fixed for good once made.
 * @param {string} name @param {(id: string) => boolean} taken
 */
export function ingredientIdFor(name, taken) {
  const slug = slugify(name) || 'ingredient';
  let id = slug;
  for (let n = 2; taken(id); n++) id = `${slug}-${n}`;
  return id;
}

// ---- Units -------------------------------------------------------------------

/** Canonical units. Words take their plural above 1; abbreviations and sizes never change. */
export const UNITS = [
  ['tsp'], ['tbsp'], ['cup', 'cups'], ['oz'], ['lb'], ['g'], ['kg'], ['ml'], ['l'],
  ['clove', 'cloves'], ['bunch', 'bunches'], ['can', 'cans'], ['jar', 'jars'], ['bag', 'bags'],
  ['package', 'packages'], ['head', 'heads'], ['stalk', 'stalks'], ['slice', 'slices'], ['piece', 'pieces'],
  ['pinch', 'pinches'], ['dash', 'dashes'], ['sprig', 'sprigs'], ['stick', 'sticks'], ['fillet', 'fillets'],
  ['handful', 'handfuls'], ['bottle', 'bottles'], ['ball', 'balls'], ['leaf', 'leaves'], ['roll', 'rolls'],
  ['small'], ['medium'], ['large'],
];

const UNIT_PLURAL = new Map(UNITS.map(([u, p]) => [u, p ?? u]));

/** Size units: "1 large onion" is still one onion. */
const SIZES = new Set(['small', 'medium', 'large']);

/** Other spellings of the canonical units (plurals, long forms). */
const UNIT_ALIASES = new Map([
  ...UNITS.filter(([, p]) => p).map(([u, p]) => [p, u]),
  ...Object.entries({
    teaspoon: 'tsp', teaspoons: 'tsp', 'tsp.': 'tsp',
    tablespoon: 'tbsp', tablespoons: 'tbsp', 'tbsp.': 'tbsp', tbs: 'tbsp',
    'c.': 'cup', ounce: 'oz', ounces: 'oz', 'oz.': 'oz',
    lbs: 'lb', 'lb.': 'lb', 'lbs.': 'lb', pound: 'lb', pounds: 'lb',
    gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg',
    milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
    liter: 'l', liters: 'l', litre: 'l', litres: 'l',
    tin: 'can', tins: 'can', pkg: 'package', pkgs: 'package', pack: 'package', packs: 'package',
    pc: 'piece', pcs: 'piece', filet: 'fillet', filets: 'fillet',
  }),
]);

/** A unit in its canonical form ("Cups" → "cup"); unknown units are kept, trimmed. @param {unknown} unit */
export function canonicalUnit(unit) {
  const text = String(unit ?? '').replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  if (UNIT_PLURAL.has(lower)) return lower;
  return UNIT_ALIASES.get(lower) ?? text;
}

/** Unit as shown next to an amount: "2 cups", "2 lb", "1 cup". @param {string} unit @param {number | undefined} qty */
export const unitLabel = (unit, qty) => (qty != null && qty > 1 ? (UNIT_PLURAL.get(unit) ?? unit) : unit);

// ---- Display -----------------------------------------------------------------

/** What a recipe line shows when its ingredient is missing. */
export const UNKNOWN_INGREDIENT = 'unknown ingredient';

/**
 * The ingredient's name for an amount: the plural unless it's a single item — qty ≤ 1 with no unit
 * or a size unit ("1 onion", "½ onion", "1 large onion", but "2 onions", "1 lb carrots", "green
 * onions" to taste). Use the qty after scaling.
 * @param {Ingredient | undefined} ingredient @param {number | undefined} qty @param {string} [unit]
 */
export function ingredientName(ingredient, qty, unit = '') {
  if (!ingredient) return UNKNOWN_INGREDIENT;
  const single = qty != null && qty <= 1 && (!unit || SIZES.has(unit));
  return ingredient.plural && !single ? ingredient.plural : ingredient.name;
}

/** Name for a list of things to buy (grocery list): the plural when there is one. @param {Ingredient | undefined} ingredient */
export const shoppingName = (ingredient) => (ingredient ? ingredient.plural || ingredient.name : UNKNOWN_INGREDIENT);

/**
 * @typedef {{ id: string, qty?: number, unit?: string, note?: string, prep?: string, optional?: boolean }} RecipeLine
 *   A recipe's ingredient line (an item of `Ingredients_JSON`).
 */

/**
 * A recipe line in parts, for display: `{amount} {name} ({note}), {prep}` + optional.
 * @param {RecipeLine} line @param {Ingredient | undefined} ingredient @param {number} [scale] servings factor
 * @returns {{ amount: string, name: string, note: string, prep: string, optional: boolean }}
 */
export function lineParts(line, ingredient, scale = 1) {
  const qty = line.qty == null ? undefined : line.qty * scale;
  const unit = line.unit ?? '';
  const amount = [qty == null ? '' : formatQty(qty), unit && unitLabel(unit, qty)].filter(Boolean).join(' ');
  return {
    amount,
    name: ingredientName(ingredient, qty, unit),
    note: line.note ?? '',
    prep: line.prep ?? '',
    optional: Boolean(line.optional),
  };
}

/** A recipe line as one string: "1 lb beef (flank or ribeye), sliced (optional)". @param {RecipeLine} line @param {Ingredient | undefined} ingredient @param {number} [scale] */
export function formatLine(line, ingredient, scale = 1) {
  const p = lineParts(line, ingredient, scale);
  return `${[p.amount, p.name].filter(Boolean).join(' ')}${p.note ? ` (${p.note})` : ''}${p.prep ? `, ${p.prep}` : ''}${p.optional ? ' (optional)' : ''}`;
}

// ---- Lookup ------------------------------------------------------------------

/**
 * The ingredient a typed name means: same name or plural, ignoring case, accents and a plural ending.
 * @param {Iterable<Ingredient>} list @param {string} name
 */
export function findByName(list, name) {
  const key = nameKey(name);
  if (!key) return undefined;
  for (const i of list) if (nameKey(i.name) === key || (i.plural && nameKey(i.plural) === key)) return i;
  return undefined;
}
