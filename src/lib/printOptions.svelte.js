// Recipe print options, remembered on this device (a preference, not recipe data).

import { storageKey } from './env.js';
import { DEFAULT_IMAGE_SCALE, IMAGE_SCALE, clampScale } from './printScale.js';

const STORAGE_KEY = storageKey('printOptions.v1');

/** @typedef {'small' | 'regular' | 'large'} TextSize */
/** @typedef {{ image: boolean, imageScale: number, simple: boolean, textSize: TextSize }} PrintOptions */

/** @type {PrintOptions} */
const DEFAULTS = { image: true, imageScale: DEFAULT_IMAGE_SCALE, simple: false, textSize: 'regular' };

export { IMAGE_SCALE, clampScale };

/** Points added to every font size: small is one size down, large three up. */
export const TEXT_DELTA = { small: -1, regular: 0, large: 3 };

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
