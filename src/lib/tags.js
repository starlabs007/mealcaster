// Recipe tags are free text. A tag is stored as it's shown ("Gluten-Free"), so the
// sheet's Tags column reads naturally. Plain JS (no runes) so sync can use it under Node.

/** Longest tag, in characters. */
export const TAG_MAX = 100;

/** Offered in the editor and listed first among the catalog filters. */
export const suggestedTags = ['Quick (<30m)', 'Vegetarian', 'Poultry & Meat', 'Gluten-Free'];

/** Tag colours, handed out in this order (see assignTones). */
export const TONES = ['saffron', 'sage', 'paprika', 'slate', 'plum'];

/** @param {string} tag */
export const tagIcon = (tag) => (tag === 'Quick (<30m)' ? 'timer' : undefined);

// Earlier builds stored fixed tag ids; null = a tag that was dropped from the list.
const LEGACY = {
  quick: 'Quick (<30m)',
  'poultry-meat': 'Poultry & Meat',
  'kid-friendly': null,
  pescatarian: null,
  'one-pot': null,
  'sheet-pan': null,
  'batch-slow': null,
  comfort: null,
  'light-fresh': null,
};

/**
 * "  kid   friendly " → "Kid Friendly", "gluten-free" → "Gluten-Free". Commas are
 * dropped (the sheet column is comma-separated) and the result is at most TAG_MAX characters.
 * @param {string} text
 */
export function normalizeTag(text) {
  const clean = String(text ?? '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  return [...clean]
    .slice(0, TAG_MAX)
    .join('')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/(&+])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Normalizes a stored tag list: maps old tag ids, drops empties and duplicates.
 * @param {unknown} list
 * @returns {string[]}
 */
export function normalizeTags(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const key = String(raw ?? '').trim();
    const tag = Object.hasOwn(LEGACY, key) ? LEGACY[key] : normalizeTag(key);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * Tags to offer: the suggestions first, then every other tag in use, alphabetically.
 * @param {Iterable<string>} inUse
 */
export function tagChoices(inUse) {
  const extra = [...new Set(inUse)].filter((t) => !suggestedTags.includes(t));
  return [...suggestedTags, ...extra.sort((a, b) => a.localeCompare(b))];
}

/**
 * Round-robin colours: each tag not seen before takes the next colour in TONES and keeps
 * it, so colours never shift and stay evenly spread. Mutates `colors`; true if any were added.
 * @param {{ next: number, tones: Record<string, string> }} colors
 * @param {Iterable<string>} tags
 */
export function assignTones(colors, tags) {
  let added = false;
  for (const tag of tags) {
    if (Object.hasOwn(colors.tones, tag)) continue;
    colors.tones[tag] = TONES[colors.next % TONES.length];
    colors.next += 1;
    added = true;
  }
  return added;
}

// ---- Categories ------------------------------------------------------------------
// One optional category per recipe (stored as `badge.label`, '' = none). Free text like
// tags, tidied the same way, so it round-trips through the sheet's Category column.

/** Offered in the editor and listed first among the catalog's category filters. */
export const suggestedCategories = ['Dinner', 'Lunch', 'Dessert'];

/** @param {unknown} text */
export const normalizeCategory = (text) => normalizeTag(String(text ?? ''));

/**
 * Categories to offer: the suggestions first, then every other category in use, alphabetically.
 * @param {Iterable<string>} inUse
 */
export function categoryChoices(inUse) {
  const extra = [...new Set(inUse)].filter((c) => c && !suggestedCategories.includes(c));
  return [...suggestedCategories, ...extra.sort((a, b) => a.localeCompare(b))];
}
