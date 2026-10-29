/** Enamelware design tokens (see DESIGN.md; values live in src/theme.css). */

/** A colour from src/theme.css, with Tailwind's opacity modifier. @param {string} name */
const color = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  // dark: variants follow the theme the app applies (lib/theme.js), not only the system setting.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: { relative: true, files: ['./index.html', './src/**/*.{svelte,js}'] },
  theme: {
    extend: {
      // Every colour is a CSS variable from src/theme.css (light by default, dark under data-theme="dark").
      colors: {
        'background': color('background'),
        'surface': color('surface'),
        'surface-container-lowest': color('surface-container-lowest'),
        'surface-container-low': color('surface-container-low'),
        'surface-container': color('surface-container'),
        'surface-container-high': color('surface-container-high'),
        'surface-container-highest': color('surface-container-highest'),
        'surface-variant': color('surface-variant'),
        'surface-dim': color('surface-dim'),
        'on-surface': color('on-surface'),
        'on-surface-variant': color('on-surface-variant'),
        'outline': color('outline'),
        'outline-variant': color('outline-variant'),
        'primary': color('primary'),
        'on-primary': color('on-primary'),
        'primary-container': color('primary-container'),
        'primary-fixed': color('primary-fixed'),
        'secondary': color('secondary'),
        'on-secondary': color('on-secondary'),
        'secondary-hover': color('secondary-hover'),
        'secondary-container': color('secondary-container'),
        'secondary-fixed': color('secondary-fixed'),
        // Errors only (a message and its field's border): persimmon stays the brand and danger-action colour.
        'error': color('error'),
        'tertiary': color('tertiary'),
        'tertiary-fixed': color('tertiary-fixed'),
        // Soft pill colours: recipe tags (lib/tagColors.svelte.js) and the dinner chips on a grocery line. The names are
        // kept from the earlier palette (saffron = mustard, sage = green, paprika = persimmon, slate = cobalt, plum = violet).
        'tone-saffron': color('tone-saffron'),
        'on-tone-saffron': color('on-tone-saffron'),
        'tone-sage': color('tone-sage'),
        'on-tone-sage': color('on-tone-sage'),
        'tone-paprika': color('tone-paprika'),
        'tone-slate': color('tone-slate'),
        'on-tone-slate': color('on-tone-slate'),
        'tone-plum': color('tone-plum'),
        'on-tone-plum': color('on-tone-plum'),
        'inverse-surface': color('inverse-surface'),
        'inverse-on-surface': color('inverse-on-surface'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-xl-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        // Cook view's ingredient lines and steps, read from across the counter.
        'body-xl': ['18px', { lineHeight: '28px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        'label-md': ['13px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
        'label-caps': ['10px', { lineHeight: '12px', letterSpacing: '0.08em', fontWeight: '700' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      spacing: {
        // Page side margins (phones / from md), shared by the header, footer and every screen.
        gutter: '0.5rem',
        'gutter-desktop': '1.5rem',
      },
      maxWidth: {
        // Widest a page's content grows (`max-w-page`); wider windows centre it.
        page: '1440px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        header: 'var(--shadow-header)',
        recipe: 'var(--shadow-recipe-rest)',
        'recipe-hover': 'var(--shadow-recipe-hover)',
        grocery: 'var(--shadow-grocery-glow)',
        dialog: 'var(--shadow-dialog)',
      },
    },
  },
  // `hover:` (and `group-hover:`, `peer-hover:`) apply only where the primary input can hover: iOS Safari and some Android
  // browsers keep `:hover` on an element after a tap until the next tap elsewhere. Same rule as `fine:` (mouse, trackpad).
  future: { hoverOnlyWhenSupported: true },
  plugins: [
    // The display face (Bricolage Grotesque) carries the names of things at 700 unless a weight or a headline size says
    // otherwise: set in the base layer, so font-semibold and the text-headline-* sizes still win.
    ({ addBase }) => addBase({ '.font-display': { fontWeight: '700' } }),
    // `fine:` = a mouse or trackpad. Compact controls key off it (`md:fine:min-h-0`), so touch screens of any width
    // (an iPad held upright is 768 px) keep 44 px targets.
    ({ addVariant }) => addVariant('fine', '@media (pointer: fine)'),
  ],
};
