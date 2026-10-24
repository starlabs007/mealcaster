// The printed photo's size, as a percentage of the page width.

export const IMAGE_SCALE = { min: 10, max: 100, step: 5 };

/** Used when the value isn't a number (or rounds to 0). */
export const DEFAULT_IMAGE_SCALE = 75;

/** A whole percentage within the allowed range. @param {unknown} value */
export const clampScale = (value) => Math.min(IMAGE_SCALE.max, Math.max(IMAGE_SCALE.min, Math.round(Number(value)) || DEFAULT_IMAGE_SCALE));
