// The app header, as other screens see it. A screen turns on `scrollsAway` (the grocery store mode) and the header
// then scrolls with the page instead of staying fixed: it moves off as soon as you scroll down, and is back in place
// exactly when you reach the top (never halfway down the list, and never with a header's height left to scroll).

export const headerChrome = $state({
  /** Set by a screen while it wants the header to scroll with the page. */
  scrollsAway: false,
});
