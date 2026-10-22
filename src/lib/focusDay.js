// After an action changes a day card (a meal becomes a night off, a night off opens up again), the control that
// was focused may be gone, and focus would fall to <body>. This moves it to the card's new main control: the one
// marked `data-day-focus` (Choose a Meal / View Recipe), or the card itself for a night off.

import { tick } from 'svelte';

/** @param {string} iso */
export async function focusDay(iso) {
  await tick();
  const card = document.getElementById(`day-${iso}`);
  const target = card?.querySelector('[data-day-focus]') ?? card;
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
}
