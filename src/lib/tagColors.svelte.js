// Tag pill colours, remembered on this device (a preference, not recipe data). Tags get
// colours round-robin the first time they appear in the recipe list; see assignTones.

import { untrack } from 'svelte';
import { storageKey } from './env.js';
import { recipes } from './recipes.svelte.js';
import { TONES, assignTones, tagChoices } from './tags.js';

const STORAGE_KEY = storageKey('tagColors.v1');

/** @type {Record<string, string>} */
const toneClass = {
  saffron: 'bg-[#faf3e5] text-[#8c6517]',
  sage: 'bg-[#eaf0ec] text-[#2c4635]',
  paprika: 'bg-[#faece8] text-secondary',
  slate: 'bg-[#e8eef3] text-[#2f4a5e]',
  plum: 'bg-[#f3ebf2] text-[#62385e]',
};
const NEUTRAL = 'bg-surface-container-high text-on-surface-variant';

/** @returns {{ next: number, tones: Record<string, string> }} */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Number.isInteger(saved.next) && saved.tones && typeof saved.tones === 'object') {
      const tones = Object.fromEntries(Object.entries(saved.tones).filter(([, tone]) => TONES.includes(tone)));
      return { next: saved.next, tones };
    }
  } catch {
    // Start over.
  }
  return { next: 0, tones: {} };
}

const colors = $state(load());

/** Gives every tag in use a colour (suggested tags first, so a fresh device starts the same way). */
function assignInUse() {
  if (!assignTones(colors, tagChoices(recipes.flatMap((r) => r.tags)))) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // In-memory only.
  }
}

assignInUse();
$effect.root(() => {
  $effect(() => {
    recipes.flatMap((r) => r.tags);
    untrack(assignInUse);
  });
});

/** Colour classes for a tag pill. @param {string} tag */
export const tagClass = (tag) => toneClass[colors.tones[tag]] ?? NEUTRAL;

/**
 * Colour classes for a list of tags, where tags without a colour yet (typed in the editor,
 * not saved) preview the colour they'd get next — without using up a slot.
 * @param {string[]} tags in the order they'd be assigned (see tagChoices)
 * @returns {Map<string, string>}
 */
export function tagClasses(tags) {
  const preview = { next: colors.next, tones: { ...colors.tones } };
  assignTones(preview, tags);
  return new Map(tags.map((tag) => [tag, toneClass[preview.tones[tag]] ?? NEUTRAL]));
}

/** Forgets every tag's colour; they're handed out again, round-robin, from the first tag in use. */
export function resetTagColors() {
  colors.next = 0;
  colors.tones = {};
  assignInUse();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // In-memory only.
  }
}
