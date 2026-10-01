// Recipe print options, remembered on this device (a preference, not recipe data).

import { storageKey } from './env.js';

const STORAGE_KEY = storageKey('printOptions.v1');

/** @typedef {'small' | 'regular' | 'large'} TextSize */
/** @typedef {{ image: boolean, imageScale: number, simple: boolean, textSize: TextSize }} PrintOptions */

/** @type {PrintOptions} */
const DEFAULTS = { image: true, imageScale: 75, simple: false, textSize: 'regular' };

export const IMAGE_SCALE = { min: 10, max: 100, step: 5 };

/** Points added to every font size: small is one size down, large three up. */
export const TEXT_DELTA = { small: -1, regular: 0, large: 3 };

/** @param {unknown} value */
export const clampScale = (value) =>
  Math.min(IMAGE_SCALE.max, Math.max(IMAGE_SCALE.min, Math.round(Number(value)) || DEFAULTS.imageScale));

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved) return { ...DEFAULTS, ...saved, imageScale: clampScale(saved.imageScale) };
  } catch {
    // Fall back to the defaults.
  }
  return { ...DEFAULTS };
}

export const printOptions = $state(load());

/** @param {PrintOptions} options */
export function setPrintOptions(options) {
  Object.assign(printOptions, options, { imageScale: clampScale(options.imageScale) });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(printOptions));
  } catch {
    // In-memory only.
  }
}
