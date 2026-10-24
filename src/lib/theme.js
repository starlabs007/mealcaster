// Light / Dark / System: which colour theme the app shows (the two sets of tokens in src/theme.css). The choice belongs
// to this device (Profile › This Device › Appearance) and is saved by devicePrefs.svelte.js; the inline script in
// index.html reads the same key to set the theme before the first paint, so a dark device never flashes light.

/** @typedef {'light' | 'dark' | 'system'} ThemeChoice */

/** The choices, in the order the Appearance control shows them. @type {readonly ThemeChoice[]} */
export const THEME_CHOICES = ['light', 'dark', 'system'];

/** A saved value, or System when there is none (or it is not one of the choices). @param {unknown} value @returns {ThemeChoice} */
export const themeChoice = (value) => (THEME_CHOICES.includes(/** @type {ThemeChoice} */ (value)) ? /** @type {ThemeChoice} */ (value) : 'system');

/**
 * The theme to show: the choice itself, or the system setting while the choice is System.
 * @param {ThemeChoice} choice
 * @param {boolean} systemDark
 * @returns {'light' | 'dark'}
 */
export const resolveTheme = (choice, systemDark) => (choice === 'system' ? (systemDark ? 'dark' : 'light') : choice);

/** The browser and Home Screen chrome colour for each theme: its background token. */
export const THEME_COLOR = { light: '#f4f4ef', dark: '#11141c' };
