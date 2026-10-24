---
name: MealCaster
description: Bright, graphic kitchen tool for planning the week's dinners, cooking from a recipe and shopping from one list.
colors:
  canvas: "#f4f4ef"
  surface-dim: "#d0d2cb"
  card: "#ffffff"
  surface-container-low: "#e9eae4"
  surface-container: "#e4e6ec"
  surface-container-high: "#e1e2dc"
  surface-container-highest: "#d9dbd4"
  ink: "#11151f"
  ink-muted: "#3d4452"
  outline: "#6b7280"
  outline-variant: "#b9bcc4"
  cobalt: "#1d3fc4"
  cobalt-bright: "#2f55e4"
  cobalt-tint: "#dbe3ff"
  on-primary: "#ffffff"
  tomato: "#c42f18"
  tomato-hover: "#a92812"
  tomato-blush: "#ffe3dc"
  on-tomato: "#ffffff"
  error-red: "#b3261e"
  mustard: "#7a5200"
  mustard-cream: "#ffe8a3"
  inverse-surface: "#11151f"
  tag-mustard-bg: "#fff1c7"
  tag-mustard-text: "#7a5200"
  tag-green-bg: "#dff3e6"
  tag-green-text: "#17573a"
  tag-tomato-bg: "#ffe3dc"
  tag-cobalt-bg: "#dce6ff"
  tag-cobalt-text: "#1a36a8"
  tag-violet-bg: "#f0e2f7"
  tag-violet-text: "#6a2a87"
# Dark theme (data-theme="dark"): the same names, lights off. Values live in src/theme.css.
colors-dark:
  canvas: "#11141c"
  surface-dim: "#38425c"
  card: "#1b2030"
  surface-container-low: "#161a25"
  surface-container: "#232a3b"
  surface-container-high: "#283044"
  surface-container-highest: "#2f3850"
  ink: "#f1f3f8"
  ink-muted: "#b4bccd"
  outline: "#8a93a8"
  outline-variant: "#465068"
  cobalt: "#7d97ff"
  cobalt-bright: "#a2b4ff"
  cobalt-tint: "#1f2a55"
  on-primary: "#0a1238"
  tomato: "#ff6b52"
  tomato-hover: "#ff8570"
  tomato-blush: "#240703"
  on-tomato: "#240703"
  error-red: "#ffb4ab"
  mustard: "#ffcc66"
  mustard-cream: "#3a2e12"
  inverse-surface: "#000000"
  tag-mustard-bg: "#3a2f14"
  tag-mustard-text: "#ffd27a"
  tag-green-bg: "#1d3326"
  tag-green-text: "#9fe0b0"
  tag-tomato-bg: "#3d1f1a"
  tag-cobalt-bg: "#1c2747"
  tag-cobalt-text: "#a9bcff"
  tag-violet-bg: "#33213a"
  tag-violet-text: "#e2b0f0"
typography:
  headline-xl:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "48px"
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  headline-sm:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
  body-xl:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "28px"
  body-lg:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-md:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-sm:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label-md:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.01em"
  label-sm:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "14px"
    letterSpacing: "0.04em"
  label-caps:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: "12px"
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  gutter: "8px"
  gutter-desktop: "24px"
  header-height: "80px"
  container-max: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-bright}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-outline-hover:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.ink}"
  button-grocery:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.on-tomato}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-grocery-hover:
    backgroundColor: "{colors.tomato-hover}"
  button-card-cta:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  nav-tab:
    textColor: "{colors.ink-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  nav-tab-active:
    backgroundColor: "{colors.cobalt-bright}"
    textColor: "{colors.on-primary}"
  input-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chip-tag:
    backgroundColor: "{colors.tag-green-bg}"
    textColor: "{colors.tag-green-text}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-status:
    backgroundColor: "{colors.cobalt-tint}"
    textColor: "{colors.cobalt}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  card-recipe:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  card-day:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-day-open:
    backgroundColor: "{colors.surface-container-low}"
    rounded: "{rounded.xl}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.2xl}"
    padding: "20px"
    width: "448px"
  toast:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.on-tomato}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: MealCaster

## Overview

**Creative North Star: "Enamelware"**

MealCaster is a bright, graphic kitchen tool, closer to enamel cookware and diner signage than to a food magazine. The page is enamel white (night in dark mode); the work sits on it as white cards, sunken grey slots and soft tonal panels. Cobalt does the work and Tomato marks the moments that matter (the grocery run, tonight, a fresh toast). Bricolage Grotesque names every recipe and page with a confident, slightly quirky grotesk; everything else (dates, quantities, actions, settings) is set in Instrument Sans and stays quiet so the plan reads at a glance.

Density follows the device. On the computer the workbench is roomy and planning-deep; on the phone, in the kitchen or the store, the same tokens stack into single-column, thumb-sized controls and dialogs become bottom sheets. Interaction feels soft and tactile: rounded corners from 8px to 16px, cool shadows that stay faint at rest and grow when something is lifted, and short transitions rather than choreography.

There are two themes, Light and Dark, and a third choice, System, that follows the device. People pick one in Profile › This Device › Appearance. Dark is the same system with the lights off, not a different palette.

This document captures the system as it ships in this repo: colour and shadow values in `src/theme.css` (both themes), the Tailwind names in `tailwind.config.js`, component classes in `src/app.css`, and the theme choice in `src/lib/theme.js` and `src/lib/devicePrefs.svelte.js`. The MealCaster design system artifact holds the same tokens. PRODUCT.md records that the look is evidence, not a commitment; treat this file as the baseline to extend or deliberately replace.

**Key Characteristics:**
- Enamel white canvas (`canvas`) with white cards and tonal containers instead of borders everywhere; night canvas and raised cards in dark.
- One action colour (Cobalt); Tomato as the warm second voice; Mustard only for sync caution.
- A grotesk display face for names and titles, a crisp sans for everything operational, tracked micro caps for metadata.
- Cool, low-opacity shadows tinted with ink (`rgba(17, 21, 31, …)`), deeper in dark.
- Material Symbols Outlined icons, outline at rest and filled for an "on" state.

## Colors

An enamel palette: white and grey neutrals, one cobalt, one tomato, mustard held in reserve. Every colour has a light and a dark value (`colors` and `colors-dark` above; `src/theme.css` in code). Components use the Tailwind names, never a hex, so both themes follow.

### Primary
- **Cobalt** (`cobalt`, Tailwind `primary`): the action colour. Primary buttons, the "Select for {day}" card CTA, active links, today's left rail and Tonight pill, the logo and wordmark, recipe titles on Recipe Detail and the editor. White on it reaches 8.2:1; in dark it brightens to periwinkle with deep-navy text.
- **Cobalt Bright** (`cobalt-bright`, `primary-container`): hover for primary buttons, the active nav tab, Mark Done, step numbers and focus rings (`ring-primary-container`).
- **Cobalt Tint** (`cobalt-tint`, `primary-fixed`): soft selection: "Planned" / "Completed" chips (usually at 50%), the "Planned for {day}" state on recipe cards, the profile avatar ground. Text on it is `primary`.

### Secondary
- **Tomato** (`tomato`, `secondary`): the warm voice. The Grocery List button in the header, toasts, today's weekday label, drag-and-drop drop labels and target rings, favourite hearts, the delete confirm, hover colour for quiet text actions on the day card. Hover deepens to `tomato-hover` (`secondary-hover`). Text on it is `on-secondary` (white in light, deep ink in dark).
- **Tomato Blush** (`tomato-blush`, `secondary-fixed`): the action link inside a toast (Undo) and, at 60%, the ground of tomato badges.
- **Error Red** (`error`, `error-red`): validation messages and the border of the field they belong to, always with an error icon. It sits close to Tomato in hue, so the icon and message carry the meaning; an error is never `secondary`.

### Tertiary
- **Mustard** (`mustard`, `tertiary`) on **Mustard Cream** (`mustard-cream`, `tertiary-fixed`): sync busy and warning states (Sheets button, Sync Status badge), warning icons in the Sheets connection flow, and "New" ingredient markers. Nothing decorative.

### Neutral
- **Canvas** (`canvas`, `background` / `surface`): page background, header glass (at 90%), dialog surface, the browser `theme-color` (`#f4f4ef` light, `#11141c` dark).
- **Card** (`card`, `surface-container-lowest`): resting cards, inputs, outline buttons; the brightest layer in light, the raised layer in dark.
- **Surface Container Low** (`surface-container-low`): sunken panels: nav pill track, week switcher, open-day slots (at 70%), footer, secondary icon buttons.
- **Surface Container High** (`surface-container-high`): hover fill for quiet controls, hairline borders and list dividers inside cards, tonal buttons, neutral tag pills.
- **Surface Container / Highest** (`surface-container`, `surface-container-highest`) and **Surface Dim** (`surface-dim`): placeholder tiles, empty-day icon wells, hover for already-tinted buttons.
- **Ink** (`ink`, `on-surface`): headlines and primary body text.
- **Ink Muted** (`ink-muted`, `on-surface-variant`): descriptions, meta lines, secondary labels.
- **Outline** (`outline`): placeholders, inactive icons, footer small print. Icons and large or bold text only, never small body copy.
- **Outline Variant** (`outline-variant`): input and outline-button borders, dashed open-day borders, blockquote rules. About 2:1 on cards in both themes, under the 3:1 guideline for control boundaries, so fields also rely on their card fill and a visible label.
- **Inverse Surface** (`inverse-surface`): dialog scrim at 40% (60% in dark) with a medium backdrop blur.

### Tag tones
Household tags take one of five pastel tones, assigned least-used-first and synced to the sheet's Settings tab (`src/lib/tagColors.svelte.js`): mustard, green, tomato, cobalt and violet. Each is a pale ground with a dark same-hue text in light, and a deep ground with a light text in dark (Tailwind `tone-*` / `on-tone-*`; tomato uses `secondary` for its text). The Tailwind and sheet names are kept from the earlier palette (`saffron` = mustard, `sage` = green, `tomato` = tomato, `slate` = cobalt, `plum` = violet) so saved tag colours carry over. Untoned tags fall back to `surface-container-high` with `on-surface-variant`. Grocery department icons use the same set (`src/lib/data/departments.js`).

### Named Rules
**The One Action Rule.** Cobalt is the only fill for "do this" buttons. Tomato fills are reserved for the grocery run, toasts, drag feedback and the delete confirm; a second tomato button on a screen dilutes the one that matters.

**The Mustard Means Sync Rule.** Mustard signals the sheet connection needs attention. Don't borrow it for ratings, highlights or decoration.

**The Token Rule.** Colour comes from a token, never a hex or `white`/`black`, so dark mode follows. The exceptions are photo overlays (black glass with white text) which sit on photographs in both themes.

## Typography

**Display Font:** Bricolage Grotesque (with system-ui, sans-serif), 700
**Body Font:** Instrument Sans (with system-ui, sans-serif)
**Icons:** Material Symbols Outlined (weight 400, optical size 20)

**Character:** A confident, slightly quirky grotesk for the names of things (recipes, pages, days, dialogs) over a crisp, neutral sans that handles every number, label and instruction. `font-display` defaults to 700 (a base style in `tailwind.config.js`); the headline sizes and explicit weight classes still set their own.

### Hierarchy
- **Headline XL** (700, 40px / 48px, -0.02em; 30px / 38px on mobile): the recipe title on Recipe Detail and the editor, in Cobalt.
- **Headline LG** (700, 32px / 40px, -0.015em; 24px / 32px on mobile): page titles (Recipe Catalog, Grocery List, Profile) with `tracking-tight`.
- **Headline MD** (700, 22px / 28px): recipe card titles, Recipe Detail section heads.
- **Headline SM** (700, 18px / 24px): the wordmark, dialog titles, card section heads.
- **Body XL** (400, 18px / 28px): cook view only, the ingredient lines and method steps read from across the counter.
- **Body LG / MD / SM** (400; 16/24, 14/20, 13/18): Body SM is the workhorse (descriptions, list rows, toasts); Body MD for inputs and longer lines; Body LG for method steps and notes.
- **Label MD** (600, 13px / 16px, 0.01em): nav tabs, card CTAs, the Grocery button, the week range. (`.btn` buttons use 12px semibold.)
- **Label SM** (700, 11px / 14px, 0.04em): status pills, "serves" and "Your recipe" overlays, last-made notes.
- **Label Caps** (700, 10px / 12px, 0.08em, uppercase): tags, time badges, "Planned" / "Open" / "Night off" chips, counters. Instrument Sans tops out at 700.

Print has its own scale: on the recipe print view each size shifts by `--print-delta` for the Small / Large text option (`src/app.css`). Print always uses the light theme (`src/theme.css`).

### Named Rules
**The Display Names Things Rule.** Bricolage Grotesque is for names and titles only: recipes, pages, dialogs, day dates, the wordmark. Quantities, dates in controls, buttons and labels stay in Instrument Sans.

**The Named Scale Rule.** Size type with the named tokens (`text-headline-*`, `text-body-*`, `text-label-*`). Some older day-card and dialog markup still uses raw Tailwind sizes (`text-xs`, `text-sm`, `text-lg`); new work shouldn't add more.

## Layout

- **Frame:** a fixed glass header 80px tall (`header-height`), plus a second scrollable row for the nav tabs below 1280px (xl), so content starts at 136px on smaller screens and 80px at xl and up. Page content centres in a container up to 1440px (`container-max`, Tailwind `max-w-page`).
- **Gutters:** `gutter` (8px) side padding on phones, `gutter-desktop` (24px) from md (Tailwind `px-gutter md:px-gutter-desktop`), the same in the header, footer and every page. Gaps inside cards run 12-16px (`gap-3`/`gap-4`), card padding 16-20px.
- **Breakpoints:** Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536). Day cards switch from stacked to a label column + content row at sm; the header search appears at lg, hides at xl (where tabs join the row) and returns at 2xl.
- **Grids:** the recipe catalog runs 1 / 2 / 3 columns (md / lg) with 24px gaps; editors and the grocery table use explicit fractional column templates (`sm:grid-cols-[2fr_2fr_1.3fr_auto]` and similar) rather than equal columns; Recipe Detail, the Recipe Editor and the Grocery List split into a 12-column grid at lg.
- **Planner:** a vertical stack of day cards (one per evening of the week), with a "minimal" density variant that collapses each to weekday, thumbnail, title and tags.
- **Dialogs:** bottom sheets on phones (`rounded-t-2xl`, max 90dvh), centred cards from sm (max 448px wide, 80dvh).

## Elevation & Depth

Depth is layered: tonal layers do most of the work, and cool, ink-tinted shadows stay faint at rest and grow only when something is lifted, dragged or floats above the page. In dark the same shadows go deeper and the header's becomes a hairline. Values are CSS variables in `src/theme.css`, used through Tailwind's `shadow-*` names.

### Shadow Vocabulary
- **Card** (`shadow-card`; light `0 2px 8px -2px rgba(17, 21, 31, 0.05), 0 1px 3px 0 rgba(17, 21, 31, 0.03)`): resting inputs and cards.
- **Recipe rest** (`shadow-recipe`; light `0 2px 10px rgba(17, 21, 31, 0.05)`): catalog recipe cards at rest.
- **Recipe hover** (`shadow-recipe-hover`; light `0 16px 32px -6px rgba(17, 21, 31, 0.12)`): catalog cards on hover, paired with a 4px rise.
- **Lift** (`shadow-lift`; light `0 12px 24px -6px rgba(17, 21, 31, 0.1), 0 4px 10px -2px rgba(17, 21, 31, 0.05)`): toasts, dialogs, drop labels, the spotlighted day card.
- **Header** (`shadow-header`; light `0 1px 8px rgba(17, 21, 31, 0.06)`, dark a 1px light hairline): the fixed header over a `backdrop-blur-xl` glass of canvas at 90%.
- **Grocery glow** (`shadow-grocery`; light `0 2px 8px -2px rgba(196, 47, 24, 0.35)`): the tomato Grocery List button only.
- **Dialog** (`shadow-dialog`; light `0 24px 60px -12px rgba(17, 21, 31, 0.25)`): the large Sheets connection and column dialogs.
- **Small** (Tailwind `shadow-sm`): primary buttons, today's day card, the logo mark, overlay pills on photos.

### Named Rules
**The Cool Shadow Rule.** Every shadow is ink-tinted (`rgba(17, 21, 31, …)` in light, black in dark) and stays under 0.12 opacity in light, except the tomato glow and the large dialogs.

**The Sunken Slot Rule.** Empty things recede instead of rising: open evenings are dashed `outline-variant` borders on a 70% `surface-container-low` ground, with no shadow.

## Shapes

Soft, hand-held corners that grow with the size of the object: 4px (`rounded-sm`) on small status chips and photo overlays, 6px (`rounded-md`) on small icon buttons and inline card actions, 8px (`rounded-lg`) on buttons, inputs, nav tabs and thumbnails, 12px (`rounded-xl`) on day cards, list panels, card CTAs and toasts, 16px (`rounded-2xl`) on recipe cards and dialogs. Tags, counters, avatars and favourite buttons are full pills (`rounded-full`). Today's day card adds a 6px Cobalt rail on its left edge, clipped by the card's corners. Recipe photos are cropped to their container (`object-cover`) and missing ones show a neutral placeholder tile.

## Components

### Buttons
Soft and tactile: compact, rounded, quick colour change on hover.
- **Shape:** gently rounded (8px); card CTAs 12px.
- **Primary** (`.btn-primary`): Cobalt fill, white 12px semibold text, 6px 12px padding (8px tall in day cards), small shadow, hover to Cobalt Bright. Icon (15-17px) leads the label with a 6px gap.
- **Outline** (`.btn-outline`): Card with a 1px Outline Variant border, Ink Muted text, hover to Surface Container High with Ink text.
- **Grocery:** Tomato fill with the tomato glow, a white pill counter in tomato Label Caps; when on the Grocery page it carries a 2px tomato ring with offset.
- **Quiet text actions:** on the day card, Choose a Different Meal / Surprise Me / Night Off / Move to Another Day are icon + 12px semibold text in Ink Muted that turn tomato on hover.
- **Focus / Disabled:** 2px Cobalt Bright ring with 1px offset on `:focus-visible`; disabled drops to 50% opacity with a not-allowed cursor.

### Chips
- **Tags:** full pills, Label Caps, 2px 8px, coloured by the household's tag tones; truncate with a tooltip when long.
- **Status:** "Planned" is a 4px-corner Label Caps chip on 50% Cobalt Tint; "Open" / "Night off" / "Not logged" use Surface Container High and Ink Muted text; "Today" is a filled Cobalt pill; "Completed" a Cobalt Tint pill with a check icon.
- **Photo overlays:** time and badge pills in 90% Card with backdrop blur on the image; "Serves" and "Your recipe" in 30% black glass with white Label SM.

### Cards / Containers
- **Recipe card:** 16px corners, Card, photo on top with a bottom-up black gradient, overlay pills and a round favourite button; body has tags, a Headline MD display title that turns Cobalt on hover, a two-line description and "last made". Hover rises 4px and the photo scales to 105% over 500ms.
- **Day card:** 12px corners, 16px padding (20px from md). Planned: Card, Surface Container High hairline, small shadow. Today: 2px border in 30% Cobalt plus the left rail. Completed: Surface Container Low ground with a desaturated photo; missed: a darker Surface Container dashed slot. Neither uses opacity, so text keeps its contrast. Open: the sunken dashed slot.
- **Panels and lists:** 12px corners, Surface Container High border and dividers, rows highlight to Surface Container High on hover/focus.

### Inputs / Fields
- **Style:** Card, 1px Outline Variant border (60% in the header search), 8px corners, Ink Body MD/SM text, Outline placeholder, leading 18px icon for search.
- **Focus:** native outline removed and replaced by a 2px Cobalt Bright ring.
- **Disabled:** 60% opacity. Checkboxes use `accent-color` Cobalt.

### Navigation
- **Header:** logo mark (32px, 8px corners) and the Bricolage wordmark in Cobalt, then a nav pill track (Surface Container Low, 12px corners, 4px padding) holding Weekly Menu, Recipe Catalog and the Sheets status button. Active tab: Cobalt Bright fill, white text, small shadow; inactive: Ink Muted, hover to Surface Container High. Right side: week switcher (chevrons around the range), Grocery List button, profile avatar.
- **Mobile:** the wordmark hides below sm, the tabs move to their own horizontally scrolling row under the header, and the week range compacts.

### Toast
Tomato card, 12px corners, Lift shadow, Body SM `on-secondary` text, an optional Tomato Blush action (Undo) and a close button. From `md` it sits at the top centre and flies in 16px from above; on phones it sits at the bottom, within thumb reach, and flies in from below (200ms); it sits above dialogs. In the grocery store mode it docks over the sticky store bar instead, so it never covers a line; the floating region then only announces it.

### Dialogs
Scrim of Inverse Surface at 40% with a medium blur; Canvas surface with Lift shadow; Headline SM display title with a Cobalt icon; close button top right. Bottom sheet on phones, centred card from sm.

## Do's and Don'ts

### Do:
- **Do** set the page on Canvas and put work on Card; reach for a tonal container (`surface-container-low` / `-high`) before adding a border.
- **Do** use Cobalt for the one primary action in a region, and Tomato only for the grocery run, toasts, today, drag feedback and the delete confirm.
- **Do** name recipes, pages and dialogs in Bricolage Grotesque; keep every control, number and label in Instrument Sans on the named scale.
- **Do** use the shadow tokens and keep them faint at rest (Card, Recipe rest); grow to Lift or Recipe hover only for lifted, dragged or floating things.
- **Do** keep corners on the 4 / 6 / 8 / 12 / 16px ladder, pills for tags and counters.
- **Do** keep a visible 2px Cobalt Bright focus ring on every interactive element.
- **Do** keep small body text in Ink or Ink Muted; Outline is for placeholders, icons and large or bold metadata.
- **Do** check new screens in both themes (Profile › This Device › Appearance).

### Don't:
- **Don't** write a hex, `white` or `black` in a component where a token exists: it won't change with the theme. Photo overlays are the one exception.
- **Don't** use a shadow above 0.12 opacity in light outside the tomato glow and the large dialogs.
- **Don't** add a second filled tomato button to a screen, or use Mustard for anything but sync caution.
- **Don't** set prices, quantities, buttons or form labels in the display face.
- **Don't** add new raw Tailwind font sizes (`text-xs`, `text-sm`, `text-lg`) or one-off hex colours where a token exists.
- **Don't** set small body copy in Outline.
- **Don't** raise empty slots: open evenings stay sunken and dashed.
