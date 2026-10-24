// Light / Dark / System: the saved choice and the theme it shows.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_CHOICES, THEME_COLOR, resolveTheme, themeChoice } from '../src/lib/theme.js';

describe('theme', () => {
  it('shows a fixed choice whatever the system says', () => {
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
  });

  it('follows the system setting while the choice is System', () => {
    assert.equal(resolveTheme('system', true), 'dark');
    assert.equal(resolveTheme('system', false), 'light');
  });

  it('reads a missing or unknown saved value as System', () => {
    assert.equal(themeChoice(null), 'system');
    assert.equal(themeChoice('sepia'), 'system');
    for (const choice of THEME_CHOICES) assert.equal(themeChoice(choice), choice);
  });

  it('index.html sets the theme before the first paint from the same key and colours', () => {
    const html = readFileSync('index.html', 'utf8');
    assert.match(html, /localStorage\.getItem\('mealcaster\.theme\.v1'\)/);
    assert.ok(html.includes(`content="${THEME_COLOR.light}"`), 'light theme-color');
    assert.ok(html.includes(`'${THEME_COLOR.dark}'`), 'dark theme-color');
    const source = readFileSync('src/lib/devicePrefs.svelte.js', 'utf8');
    assert.match(source, /storageKey\('theme\.v1'\)/);
  });

  it('theme.css defines every colour in both themes, matching the background theme-colours', () => {
    const css = readFileSync('src/theme.css', 'utf8');
    const [light, dark] = css.split(":root[data-theme='dark']");
    const names = (block) => [...block.matchAll(/--c-([a-z-]+):/g)].map((m) => m[1]);
    assert.deepEqual(names(dark.split('@media print')[0]), names(light));
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
    assert.ok(light.includes(`--c-background: ${rgb(THEME_COLOR.light)};`));
    assert.ok(dark.includes(`--c-background: ${rgb(THEME_COLOR.dark)};`));
  });
});
