// Tag pill colours. They belong to the household and sync with the other settings (the
// [Settings] tab's "Tag Colour" rows); a tag gets the least-used colour the first time it
// appears in the recipe list (see assignTones), and colours of tags no recipe uses are dropped.
// Also renaming, recolouring and deleting the person's own tags.

import { untrack } from 'svelte';
import { recipes, retagRecipes, restoreTagged } from './recipes.svelte.js';
import { settings } from './settings.svelte.js';
import { TONES, assignTones, isSuggestedTag, normalizeTag, tagChoices } from './tags.js';

/** @type {Record<string, string>} */
const toneClass = {
  saffron: 'bg-[#faf3e5] text-[#8c6517]',
  sage: 'bg-[#eaf0ec] text-[#2c4635]',
  paprika: 'bg-[#faece8] text-secondary',
  slate: 'bg-[#e8eef3] text-[#2f4a5e]',
  plum: 'bg-[#f3ebf2] text-[#62385e]',
};
const NEUTRAL = 'bg-surface-container-high text-on-surface-variant';

/** Tags in use, suggestions first (so a fresh household starts the same way). */
const tagsInUse = () => tagChoices(recipes.flatMap((r) => r.tags));

/** Gives every tag in use a colour and forgets the colours of tags no longer in use. */
function tidyColors() {
  const inUse = tagsInUse();
  const tones = Object.fromEntries(Object.entries(settings.tagColors).filter(([tag]) => inUse.includes(tag)));
  const added = assignTones(tones, inUse);
  if (added || Object.keys(tones).length !== Object.keys(settings.tagColors).length) settings.tagColors = tones;
}

$effect.root(() => {
  $effect(() => {
    tagsInUse();
    Object.keys(settings.tagColors);
    untrack(tidyColors);
  });
});

/** Colour classes for a tag pill. @param {string} tag */
export const tagClass = (tag) => toneClass[settings.tagColors[tag]] ?? NEUTRAL;

/** Colour classes for a tone (a swatch). @param {string} tone */
export const toneClassOf = (tone) => toneClass[tone] ?? NEUTRAL;

export { TONES };

/**
 * Colour classes for a list of tags, where tags without a colour yet (typed in the editor,
 * not saved) preview the colour they'd get next — without using up a slot.
 * @param {string[]} tags in the order they'd be assigned (see tagChoices)
 * @returns {Map<string, string>}
 */
export function tagClasses(tags) {
  const preview = { ...settings.tagColors };
  assignTones(preview, tags);
  return new Map(tags.map((tag) => [tag, toneClass[preview[tag]] ?? NEUTRAL]));
}

/** Forgets every tag's colour; they're handed out again from the first tag in use. */
export function resetTagColors() {
  settings.tagColors = {};
  tidyColors();
}

/** @param {string} tag @param {string} tone one of TONES */
export function setTagTone(tag, tone) {
  if (isSuggestedTag(tag) || !TONES.includes(tone)) return;
  settings.tagColors = { ...settings.tagColors, [tag]: tone };
}

/**
 * Renames one of the person's own tags on every recipe. Renaming to a tag that's already in use
 * merges the two (keeping that tag's colour); otherwise the colour moves to the new name.
 * @param {string} from @param {string} text the new name, tidied like any tag
 * @returns {(() => void) | undefined} undo, or undefined if nothing changed
 */
export function renameTag(from, text) {
  const to = normalizeTag(text);
  if (isSuggestedTag(from) || !to || to === from) return undefined;
  const tone = settings.tagColors[from];
  const colors = { ...settings.tagColors };
  if (!Object.hasOwn(colors, to) && tone) colors[to] = tone;
  delete colors[from];
  const before = retagRecipes(from, to);
  settings.tagColors = colors;
  return undoer(before, from, tone);
}

/**
 * Removes one of the person's own tags from every recipe.
 * @param {string} tag
 * @returns {(() => void) | undefined} undo
 */
export function deleteTag(tag) {
  if (isSuggestedTag(tag)) return undefined;
  const { [tag]: tone, ...colors } = settings.tagColors;
  const before = retagRecipes(tag, '');
  settings.tagColors = colors;
  return undoer(before, tag, tone);
}

/**
 * Undo: puts the recipes back and gives the old tag its colour again (a renamed tag's new name
 * loses its colour once no recipe uses it).
 * @param {import('./recipes.svelte.js').Recipe[]} before @param {string} tag @param {string | undefined} tone
 */
const undoer = (before, tag, tone) => () => {
  restoreTagged(before);
  if (tone) settings.tagColors = { ...settings.tagColors, [tag]: tone };
};
