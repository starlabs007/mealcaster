---
name: MealCaster
description: Warm, editorial kitchen workbench for planning the week's dinners, cooking from a recipe and shopping from one list.
colors:
  canvas: "#fcf9f3"
  surface-dim: "#dcdad4"
  card-white: "#ffffff"
  surface-container-low: "#f6f3ed"
  surface-container: "#f0eee8"
  surface-container-high: "#ebe8e2"
  surface-container-highest: "#e5e2dc"
  ink: "#1c1c18"
  ink-muted: "#424843"
  outline: "#727973"
  outline-variant: "#c2c8c1"
  garden-sage: "#32533f"
  garden-sage-soft: "#4a6b56"
  sage-tint: "#c6ebd1"
  on-primary: "#ffffff"
  roasted-paprika: "#a23e18"
  roasted-paprika-hover: "#b34728"
  paprika-blush: "#ffdbcf"
  error-red: "#ba1a1a"
  toasted-saffron: "#674600"
  saffron-cream: "#ffdead"
  inverse-surface: "#31312d"
  tag-saffron-bg: "#faf3e5"
  tag-saffron-text: "#8c6517"
  tag-sage-bg: "#eaf0ec"
  tag-sage-text: "#2c4635"
  tag-paprika-bg: "#faece8"
  tag-slate-bg: "#e8eef3"
  tag-slate-text: "#2f4a5e"
  tag-plum-bg: "#f3ebf2"
  tag-plum-text: "#62385e"
typography:
  headline-xl:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "48px"
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
  headline-sm:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
  body-xl:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "28px"
  body-lg:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-md:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-sm:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label-md:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.01em"
  label-sm:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "14px"
    letterSpacing: "0.04em"
  label-caps:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
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
    backgroundColor: "{colors.garden-sage}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.garden-sage-soft}"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-outline-hover:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.ink}"
  button-grocery:
    backgroundColor: "{colors.roasted-paprika}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-grocery-hover:
    backgroundColor: "{colors.roasted-paprika-hover}"
  button-card-cta:
    backgroundColor: "{colors.garden-sage}"
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
    backgroundColor: "{colors.garden-sage-soft}"
    textColor: "{colors.on-primary}"
  input-text:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chip-tag:
    backgroundColor: "{colors.tag-sage-bg}"
    textColor: "{colors.tag-sage-text}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-status:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.garden-sage}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  card-recipe:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  card-day:
    backgroundColor: "{colors.card-white}"
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
    backgroundColor: "{colors.roasted-paprika}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: MealCaster

## Overview

**Creative North Star: "The Kitchen Workbench"**

MealCaster is a warm, ordered surface where the week gets laid out like mise en place. The canvas is cream linen paper, not digital white; the work sits on it as bright white cards, sunken oat-toned slots and soft tonal panels. Appetite comes from the editorial side: Playfair Display carries every recipe name and page title the way a food magazine would, recipe photography leads the catalog cards, and Roasted Paprika warms the moments that matter (the grocery run, today's weekday, a fresh toast). Everything else (dates, quantities, actions, settings) is set in Plus Jakarta Sans and stays quiet so the plan reads at a glance.

Density follows the device. On the computer the workbench is roomy and planning-deep; on the phone, in the kitchen or the store, the same tokens stack into single-column, thumb-sized controls and dialogs become bottom sheets. Interaction feels soft and tactile: rounded corners from 8px to 16px, warm-tinted shadows that stay faint at rest and grow when something is lifted, and short transitions rather than choreography.

This document captures the system as it ships today in `repo/` (Tailwind tokens in `repo/tailwind.config.js`, component classes in `repo/src/app.css`). PRODUCT.md records that the look is evidence, not a commitment; treat this file as the incumbent baseline to extend or deliberately replace.

**Key Characteristics:**
- Cream linen canvas (`canvas`) with white cards and tonal containers instead of borders everywhere.
- One action color (Garden Sage); Roasted Paprika as the warm second voice; Toasted Saffron only for sync caution.
- Editorial serif for names and titles, humanist sans for everything operational, tracked micro caps for metadata.
- Warm, low-opacity shadows tinted brown (`rgba(50, 40, 30, …)`), never neutral grey.
- Material Symbols Outlined icons, outline at rest and filled for an "on" state.

## Colors

A kitchen palette: linen and oat neutrals, one deep herb green, one roasted paprika, with saffron held in reserve.

### Primary
- **Garden Sage** (`garden-sage`): the action color. Primary buttons, the "Select for {day}" card CTA, active links, today's left rail on the day card, the app name in the header and footer, recipe titles on Recipe Detail and the editor, focus rings. White on it reaches 8.6:1.
- **Garden Sage Soft** (`garden-sage-soft`): hover for primary buttons and the fill for the active nav tab and focus rings (`ring-primary-container`). Lighter, so the active tab reads as "selected" rather than "pressed".
- **Sage Tint** (`sage-tint`): soft success and selection: "Planned" / "Completed" status chips (usually at 50% over white), "Planned for {day}" state on recipe cards, the profile avatar ground.

### Secondary
- **Roasted Paprika** (`roasted-paprika`): the warm voice. The Grocery List button in the header, toasts, today's weekday label, drag-and-drop drop labels and target rings, favourite hearts, hover color for quiet text actions on the day card (Choose a Different Meal, Surprise Me, Night Off). Hover deepens to `roasted-paprika-hover`.
- **Paprika Blush** (`paprika-blush`): the action link inside a paprika toast (Undo).
- **Error Red** (`error`, `error-red`): validation messages and the border of the field they belong to, always with an error icon (6.5:1 on white). Paprika stays the brand voice and the required `*` marks; an error is never paprika.

### Tertiary
- **Toasted Saffron** (`toasted-saffron`) on **Saffron Cream** (`saffron-cream`): sync busy and warning states (Sheets button, Sync Status badge), warning icons in the Sheets connection flow, and "New" ingredient markers. Nothing decorative.

### Neutral
- **Canvas** (`canvas`): page background, header glass (at 90%), dialog surface, `theme-color` for the Home Screen app.
- **Card White** (`card-white`): resting cards, inputs, outline buttons; the brightest layer.
- **Surface Container Low** (`surface-container-low`): sunken panels: nav pill track, week switcher, open-day slots (at 70%), footer, secondary icon buttons.
- **Surface Container High** (`surface-container-high`): hover fill for quiet controls, hairline borders and list dividers inside cards, neutral tag pills.
- **Surface Container / Highest** (`surface-container`, `surface-container-highest`) and **Surface Dim** (`surface-dim`): placeholder tiles, empty-day icon wells, hover for already-tinted buttons.
- **Ink** (`ink`): headlines and primary body text.
- **Ink Muted** (`ink-muted`): descriptions, meta lines, secondary labels (8.9:1 on canvas).
- **Outline** (`outline`): placeholders, inactive icons, footer small print. 4.25:1 on canvas: below AA for small body text, so planner text (weekday labels, chips, "(All set)") uses Ink Muted instead.
- **Outline Variant** (`outline-variant`): input and outline-button borders, dashed open-day borders, blockquote rules.
- **Inverse Surface** (`inverse-surface`): dialog scrim at 40% with a medium backdrop blur.

### Tag tones
Household tags take one of five pastel tones (saffron, sage, paprika, slate, plum), assigned least-used-first and synced to the sheet's Settings tab (`repo/src/lib/tagColors.svelte.js`). Each tone is a pale ground with a dark same-hue text (`tag-*-bg` / `tag-*-text`; paprika uses `roasted-paprika` for its text). Untoned tags fall back to `surface-container-high` with `ink-muted`.

### Named Rules
**The One Action Rule.** Garden Sage is the only fill for "do this" buttons. Paprika fills are reserved for the grocery run, toasts and drag feedback; a second paprika button on a screen dilutes the one that matters.

**The Saffron Means Sync Rule.** Toasted Saffron signals the sheet connection needs attention. Don't borrow it for ratings, highlights or decoration.

## Typography

**Display Font:** Playfair Display (with Georgia, serif)
**Body Font:** Plus Jakarta Sans (with system-ui, sans-serif)
**Icons:** Material Symbols Outlined (weight 400, optical size 20)

**Character:** A food-magazine serif for the names of things (recipes, pages, days, dialogs) over a friendly, open humanist sans that handles every number, label and instruction. The contrast is the editorial/operational split of the product itself.

### Hierarchy
- **Headline XL** (600, 40px / 48px, -0.02em; 30px / 38px on mobile): the recipe title on Recipe Detail and the editor, in Garden Sage.
- **Headline LG** (600, 32px / 40px, -0.015em; 24px / 32px on mobile): page titles (Recipe Catalog, Grocery List, Profile) with `tracking-tight`.
- **Headline MD** (600, 22px / 28px): recipe card titles, Recipe Detail section heads.
- **Headline SM** (600, 18px / 24px): the wordmark, dialog titles, card section heads.
- **Body XL** (400, 18px / 28px): cook view only, the ingredient lines and method steps read from across the counter.
- **Body LG / MD / SM** (400; 16/24, 14/20, 13/18): Body SM is the workhorse (descriptions, list rows, toasts); Body MD for inputs and longer lines; Body LG for method steps and notes.
- **Label MD** (600, 13px / 16px, 0.01em): nav tabs, card CTAs, the Grocery button, the week range. (`.btn` buttons use 12px semibold.)
- **Label SM** (700, 11px / 14px, 0.04em): status pills, "serves" and "Your recipe" overlays, last-made notes.
- **Label Caps** (800, 10px / 12px, 0.08em, uppercase): tags, time badges, "Planned" / "Open" / "Night off" chips, counters.

Print has its own scale: on the recipe print view each size shifts by `--print-delta` for the Small / Large text option (`repo/src/app.css`).

### Named Rules
**The Serif Names Things Rule.** Playfair Display is for names and titles only: recipes, pages, dialogs, day dates, the wordmark. Quantities, dates in controls, buttons and labels stay in Plus Jakarta Sans.

**The Named Scale Rule.** Size type with the named tokens (`text-headline-*`, `text-body-*`, `text-label-*`). Some older day-card and dialog markup still uses raw Tailwind sizes (`text-xs`, `text-sm`, `text-lg`); new work shouldn't add more.

## Layout

- **Frame:** a fixed glass header 80px tall (`header-height`), plus a second scrollable row for the nav tabs below 1280px (xl), so content starts at 136px on smaller screens and 80px at xl and up. Page content centres in a container up to 1440px (`container-max`, Tailwind `max-w-page`).
- **Gutters:** `gutter` (8px) side padding on phones, `gutter-desktop` (24px) from md (Tailwind `px-gutter md:px-gutter-desktop`), the same in the header, footer and every page. Gaps inside cards run 12-16px (`gap-3`/`gap-4`), card padding 16-20px.
- **Breakpoints:** Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536). Day cards switch from stacked to a label column + content row at sm; the header search appears at lg, hides at xl (where tabs join the row) and returns at 2xl.
- **Grids:** the recipe catalog runs 1 / 2 / 3 columns (md / lg) with 24px gaps; editors and the grocery table use explicit fractional column templates (`sm:grid-cols-[2fr_2fr_1.3fr_auto]` and similar) rather than equal columns; Recipe Detail, the Recipe Editor and the Grocery List split into a 12-column grid at lg.
- **Planner:** a vertical stack of day cards (one per evening of the week), with a "minimal" density variant that collapses each to weekday, thumbnail, title and tags.
- **Dialogs:** bottom sheets on phones (`rounded-t-2xl`, max 90dvh), centred cards from sm (max 448px wide, 80dvh).

## Elevation & Depth

Depth is layered: tonal paper layers do most of the work, and warm, brown-tinted shadows stay faint at rest and grow only when something is lifted, dragged or floats above the page.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 2px 8px -2px rgba(50, 40, 30, 0.04), 0 1px 3px 0 rgba(50, 40, 30, 0.02)`): resting inputs and cards on the canvas.
- **Recipe rest** (`box-shadow: 0 2px 10px rgba(50, 40, 30, 0.04)`): catalog recipe cards at rest.
- **Recipe hover** (`box-shadow: 0 16px 32px -6px rgba(45, 38, 30, 0.12)`): catalog cards on hover, paired with a 4px rise.
- **Lift** (`box-shadow: 0 12px 24px -6px rgba(45, 38, 30, 0.08), 0 4px 10px -2px rgba(45, 38, 30, 0.04)`): toasts, dialogs, drop labels, the spotlighted day card.
- **Header** (`box-shadow: 0 1px 8px rgba(50, 40, 30, 0.05)`): the fixed header over a `backdrop-blur-xl` glass of canvas at 90%.
- **Grocery glow** (`box-shadow: 0 2px 8px -2px rgba(162, 62, 24, 0.3)`): the paprika Grocery List button only.
- **Small** (Tailwind `shadow-sm`): primary buttons, today's day card, the logo mark, overlay pills on photos.

### Named Rules
**The Warm Shadow Rule.** Every shadow is tinted brown (`rgba(45-50, 38-40, 30, …)`) and stays under 0.12 opacity, except the paprika glow. Neutral black or grey shadows break the linen.

**The Sunken Slot Rule.** Empty things recede instead of rising: open evenings are dashed `outline-variant` borders on a 70% `surface-container-low` ground, with no shadow.

## Shapes

Soft, hand-held corners that grow with the size of the object: 4px (`rounded-sm`) on small status chips and photo overlays, 6px (`rounded-md`) on small icon buttons and inline card actions, 8px (`rounded-lg`) on buttons, inputs, nav tabs and thumbnails, 12px (`rounded-xl`) on day cards, list panels, card CTAs and toasts, 16px (`rounded-2xl`) on recipe cards and dialogs. Tags, counters, avatars and favourite buttons are full pills (`rounded-full`). Today's day card adds a 6px Garden Sage rail on its left edge, clipped by the card's corners. Recipe photos are cropped to their container (`object-cover`) and missing ones show a neutral placeholder tile.

## Components

### Buttons
Soft and tactile: compact, rounded, quick colour change on hover.
- **Shape:** gently rounded (8px); card CTAs 12px.
- **Primary** (`.btn-primary`): Garden Sage fill, white 12px semibold text, 6px 12px padding (8px tall in day cards), small shadow, hover to Garden Sage Soft. Icon (15-17px) leads the label with a 6px gap.
- **Outline** (`.btn-outline`): Card White with a 1px Outline Variant border, Ink Muted text, hover to Surface Container High with Ink text.
- **Grocery:** Roasted Paprika fill with the paprika glow, a white pill counter in paprika Label Caps; when on the Grocery page it carries a 2px paprika ring with offset.
- **Quiet text actions:** on the day card, Choose a Different Meal / Surprise Me / Night Off / Move to Another Day are icon + 12px semibold text in Ink Muted that turn paprika on hover.
- **Focus / Disabled:** 2px Garden Sage Soft ring with 1px offset on `:focus-visible`; disabled drops to 50% opacity with a not-allowed cursor.

### Chips
- **Tags:** full pills, Label Caps, 2px 8px, coloured by the household's tag tones; truncate with a tooltip when long.
- **Status:** "Planned" is a 4px-corner Label Caps chip on 50% Sage Tint; "Open" / "Night off" / "Not logged" use Surface Container High and Ink Muted text; "Today" is a filled Garden Sage pill; "Completed" a Sage Tint pill with a check icon.
- **Photo overlays:** time and badge pills in 90% Card White with backdrop blur on the image; "Serves" and "Your recipe" in 30% black glass with white Label SM.

### Cards / Containers
- **Recipe card:** 16px corners, Card White, photo on top with a bottom-up black gradient, overlay pills and a round favourite button; body has tags, a Headline MD serif title that turns Garden Sage on hover, a two-line description and "last made". Hover rises 4px and the photo scales to 105% over 500ms.
- **Day card:** 12px corners, 16px padding (20px from md). Planned: Card White, Surface Container High hairline, small shadow. Today: 2px border in 30% Garden Sage plus the left rail. Completed: Surface Container Low ground with a desaturated photo; missed: a darker Surface Container dashed slot. Neither uses opacity, so text keeps its contrast. Open: the sunken dashed slot.
- **Panels and lists:** 12px corners, Surface Container High border and dividers, rows highlight to Surface Container High on hover/focus.

### Inputs / Fields
- **Style:** Card White, 1px Outline Variant border (60% in the header search), 8px corners, Ink Body MD/SM text, Outline placeholder, leading 18px icon for search.
- **Focus:** native outline removed and replaced by a 2px Garden Sage Soft ring.
- **Disabled:** 60% opacity. Checkboxes use `accent-color` Garden Sage.

### Navigation
- **Header:** logo mark (32px, 8px corners) and the Playfair wordmark in Garden Sage, then a nav pill track (Surface Container Low, 12px corners, 4px padding) holding Weekly Menu, Recipe Catalog and the Sheets status button. Active tab: Garden Sage Soft fill, white text, small shadow; inactive: Ink Muted, hover to Surface Container High. Right side: week switcher (chevrons around the range), Grocery List button, profile avatar.
- **Mobile:** the wordmark hides below sm, the tabs move to their own horizontally scrolling row under the header, and the week range compacts.

### Toast
Paprika card, 12px corners, Lift shadow, Body SM white text, an optional Paprika Blush action (Undo) and a close button. From `md` it sits at the top centre and flies in 16px from above; on phones it sits at the bottom, within thumb reach, and flies in from below (200ms); it sits above dialogs. In the grocery store mode it docks over the sticky store bar instead, so it never covers a line; the floating region then only announces it.

### Dialogs
Scrim of Inverse Surface at 40% with a medium blur; Canvas surface with Lift shadow; Headline SM serif title with a Garden Sage icon; close button top right. Bottom sheet on phones, centred card from sm.

## Do's and Don'ts

### Do:
- **Do** set the page on Canvas and put work on Card White; reach for a tonal container (`surface-container-low` / `-high`) before adding a border.
- **Do** use Garden Sage for the one primary action in a region, and Roasted Paprika only for the grocery run, toasts, today and drag feedback.
- **Do** name recipes, pages and dialogs in Playfair Display; keep every control, number and label in Plus Jakarta Sans on the named scale.
- **Do** tint shadows warm brown and keep them faint at rest (Card, Recipe rest); grow to Lift or Recipe hover only for lifted, dragged or floating things.
- **Do** keep corners on the 4 / 6 / 8 / 12 / 16px ladder, pills for tags and counters.
- **Do** keep a visible 2px Garden Sage Soft focus ring on every interactive element.
- **Do** keep small body text in Ink or Ink Muted; Outline is for placeholders, icons and large or bold metadata.

### Don't:
- **Don't** use pure grey or black shadows, or any shadow above 0.12 opacity outside the paprika glow.
- **Don't** add a second filled paprika button to a screen, or use Toasted Saffron for anything but sync caution.
- **Don't** set prices, quantities, buttons or form labels in the serif.
- **Don't** add new raw Tailwind font sizes (`text-xs`, `text-sm`, `text-lg`) or one-off hex colours where a token exists.
- **Don't** set small body copy in Outline (`#727973`): at 4.25:1 on Canvas it misses WCAG AA.
- **Don't** raise empty slots: open evenings stay sunken and dashed.
