// Reading ingredient text people type or paste: amounts ("1 1/2", "½"), pasted lines split into amount, unit,
// name, note, prep and optional, and a best guess at a new ingredient's aisle. Plain JS (no runes) so tests can
// load it; recipes.svelte.js re-exports what the editor uses.

import { canonicalUnit, tidyIngredientName } from './ingredients.js';

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

// ---- Aisle guess ---------------------------------------------------------------

// First match wins: bottled things and powders first, so "fish sauce", "tomato paste" and "garlic powder" aren't
// fish or produce.
const AISLE_WORDS = [
  ['Pantry', /\b(sauce|paste|vinegar|oil|seasoning|bouillon)\b/],
  ['Spices', /\bpowder\b/],
  ['Herbs', /\b(basil|parsley|cilantro|coriander leaves|thyme|rosemary|dill|mint|sage|chives|tarragon|oregano leaves)\b/],
  ['Spices', /\b(salt|peppercorns?|black pepper|cumin|paprika|turmeric|cinnamon|chili flakes|chilli flakes|red pepper flakes|nutmeg|spice|garam masala|curry powder|oregano|bay lea(f|ves))\b/],
  ['Fresh', /\b(chicken|beef|pork|lamb|turkey|sausage|bacon|pancetta|prosciutto|salmon|cod|tuna|shrimp|prawns?|fish|scallops?|mussels|clams|steak|mince|ground (beef|pork|turkey)|short ribs?|thighs?|fillets?)\b/],
  ['Dairy', /\b(milk|cheese|butter|cream|yogh?urt|eggs?|ricotta|mozzarella|parmesan|feta|cheddar|mascarpone|crème fraîche|creme fraiche|ghee)\b/],
  ['Bakery', /\b(bread|baguette|buns?|tortillas?|pita|naan|sourdough|rolls?)\b/],
  ['Frozen', /\bfrozen\b/],
  ['Produce', /\b(onions?|shallots?|garlic|lemons?|limes?|oranges?|tomato(es)?|potato(es)?|carrots?|celery|peppers?|zucchini|courgettes?|squash|spinach|kale|lettuce|arugula|rocket|cabbage|broccoli|cauliflower|mushrooms?|eggplant|aubergine|asparagus|peas|beans|corn|avocados?|ginger|leeks?|fennel|cucumbers?|apples?|pears?|berries|chil(e|i|li)s?|jalapeños?|scallions?|green onions?)\b/],
];

/** Best-guess aisle for a new ingredient's name. @param {string} text */
export function guessAisle(text) {
  const t = text.toLowerCase();
  return AISLE_WORDS.find(([, re]) => re.test(t))?.[0] ?? 'Pantry';
}

// ---- Pasted lines --------------------------------------------------------------

const UNIT_WORDS =
  'cups?|c\\.|tbsp\\.?|tbs|tablespoons?|tsp\\.?|teaspoons?|lbs?\\.?|pounds?|oz\\.?|ounces?|g|grams?|kg|kilograms?|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|cloves?|bunch(?:es)?|cans?|tins?|jars?|bags?|bottles?|whole|pinch(?:es)?|dash(?:es)?|slices?|sprigs?|heads?|stalks?|packages?|pkgs?|packs?|handfuls?|sticks?|pieces?|pcs?|fillets?|balls?|leaf|leaves|rolls?|large|medium|small';
const LINE = new RegExp(
  `^((?:\\d+\\s+)?\\d+\\/\\d+|\\d*\\.?\\d+\\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])\\s*(?:(${UNIT_WORDS})(?=\\s|$))?\\s*(.*)$`,
  'i',
);

/** Containers bought as a unit: "can of tomato paste", "6 oz can tomato paste". */
const CONTAINER = /^(cans?|tins?|jars?|bags?|bottles?|packages?|packs?|pkgs?|boxe?s?|heads?|bunch(?:es)?)\s+(of\s+)?(.+)$/i;
/** Units that size a container ("6 oz can"), rather than measure the ingredient. */
const SIZE_UNITS = new Set(['oz', 'lb', 'g', 'kg', 'ml', 'l']);

/** Kitchen words: they go to prep, not the note ("sliced", "finely minced", "at room temperature"). */
const PREP =
  /^(?:\w+ly\s+)?(?:sliced|diced|minced|chopped|shredded|grated|julienned|cubed|crumbled|mashed|crushed|peeled|halved|quartered|rinsed|drained|melted|softened|beaten|toasted|torn|hand-torn|zested|juiced|trimmed|cut|seeded|deseeded|stemmed|cored|pitted|husked|cooked|thawed|divided|separated|scaled|at room temperature|to taste|for\b)/i;
/** Prep words that can come before the name: "sliced cabbage", "shredded chicken". */
const LEADING_PREP = /^(sliced|diced|minced|chopped|shredded|grated|julienned|cubed|crumbled|mashed)\s+(.+)$/i;

/**
 * One pasted line → its parts. "1 lb beef (flank or ribeye, sliced)" → qty "1", unit "lb", name "beef", note "flank or
 * ribeye", prep "sliced"; "6 oz can of tomato paste" → 1 can, note "6 oz"; "tendon (optional)" → optional.
 * @param {string} line
 * @returns {{ qty: string, unit: string, text: string, note: string, prep: string, optional: boolean }}
 */
export function parseIngredientLine(line) {
  const match = line.match(LINE);
  let qty = match ? match[1].trim() : '';
  let unit = match ? canonicalUnit(match[2] ?? '') : '';
  let text = (match ? match[3] : line).trim();
  if (unit === 'whole') unit = '';
  const notes = [];
  const preps = [];
  let optional = false;

  // "(optional)", "…, optional", and "optional" inside other brackets.
  text = text.replace(/\s*,?\s*\(\s*optional\s*\)|,\s*optional\s*$/gi, () => {
    optional = true;
    return '';
  });

  // Brackets: store notes, unless the words are kitchen prep.
  text = text.replace(/\s*\(([^()]*)\)/g, (_, inside) => {
    for (const part of inside.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
      if (/^optional$/i.test(part)) optional = true;
      else (PREP.test(part) ? preps : notes).push(part);
    }
    return '';
  });

  // After the first comma: prep ("shallot, finely minced", "lime, cut into wedges").
  const comma = text.indexOf(',');
  if (comma > 0) {
    const rest = text.slice(comma + 1).trim();
    text = text.slice(0, comma);
    if (rest) preps.unshift(rest);
  }

  text = text.trim().replace(/^of\s+/i, '');
  const container = text.match(CONTAINER);
  if (container && (container[2] || SIZE_UNITS.has(unit))) {
    // "6 oz can of tomato paste": the size becomes the note, the container the unit.
    if (unit && SIZE_UNITS.has(unit)) {
      notes.unshift(`${qty} ${unit}`.trim());
      qty = '1';
    }
    if (!unit || SIZE_UNITS.has(unit)) unit = canonicalUnit(container[1]);
    text = container[3];
  }
  const leading = text.match(LEADING_PREP);
  if (leading) {
    preps.unshift(leading[1].toLowerCase());
    text = leading[2];
  }
  return { qty, unit, text: tidyIngredientName(text), note: notes.join(', '), prep: preps.join(', '), optional };
}

/**
 * Parses pasted ingredient lines ("1 lb rigatoni", "Sauce:" starts a group).
 * @param {string} text @param {string} [group]
 * @returns {(ReturnType<typeof parseIngredientLine> & { group: string, aisle: string })[]}
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
    const row = parseIngredientLine(line);
    if (!row.text) continue;
    rows.push({ ...row, group: current, aisle: guessAisle(row.text) });
  }
  return rows;
}
