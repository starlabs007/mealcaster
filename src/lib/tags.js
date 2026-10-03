// Recipe tags are free text. A tag is stored as it's shown ("Gluten-Free"), so the
// sheet's Tags column reads naturally. Plain JS (no runes) so sync can use it under Node.

/** Longest tag, in characters. */
export const TAG_MAX = 100;

// Ingredient aisles earlier sample recipes used that the editor doesn't offer.
const LEGACY_AISLES = { Citrus: 'Produce', Garnish: 'Produce', Broth: 'Other' };

/** Maps a retired ingredient aisle tag to the one that replaced it. @param {string} tag */
export const normalizeAisle = (tag) => LEGACY_AISLES[tag] ?? tag;

/** Offered in the editor and listed first among the catalog filters. */
export const suggestedTags = ['Quick (<30m)', 'Vegetarian', 'Poultry & Meat', 'Gluten-Free'];

/** Tag colours, in the order they're handed out (see assignTones). */
export const TONES = ['saffron', 'sage', 'paprika', 'slate', 'plum'];

/** True for the built-in suggestions, which can't be renamed, recoloured or deleted. @param {string} tag */
export const isSuggestedTag = (tag) => suggestedTags.includes(tag);

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
 * Gives each tag without a colour the least-used one (ties go to the earliest in TONES), so a
 * fresh list gets them round-robin and colours stay evenly spread after tags are deleted. A tag
 * keeps its colour once it has one. Mutates `tones` (tag → tone); true if any were added.
 * @param {Record<string, string>} tones
 * @param {Iterable<string>} tags
 */
export function assignTones(tones, tags) {
  const used = new Map(TONES.map((t) => [t, 0]));
  for (const tone of Object.values(tones)) if (used.has(tone)) used.set(tone, used.get(tone) + 1);
  let added = false;
  for (const tag of tags) {
    if (Object.hasOwn(tones, tag)) continue;
    const tone = TONES.reduce((best, t) => (used.get(t) < used.get(best) ? t : best));
    tones[tag] = tone;
    used.set(tone, used.get(tone) + 1);
    added = true;
  }
  return added;
}

/**
 * A recipe's tags with one renamed (merging into the new name if the recipe already has it),
 * or removed when `to` is ''.
 * @param {string[]} tags @param {string} from @param {string} to
 */
export const retag = (tags, from, to) => normalizeTags(tags.flatMap((t) => (t === from ? (to ? [to] : []) : [t])));

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
