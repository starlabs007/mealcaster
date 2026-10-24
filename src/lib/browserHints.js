// Browsers that block the Google Picker frame's sign-in cookies. Pages can't tell directly, so the sign-in step
// shows a hint for these.

/** Firefox's Enhanced Tracking Protection. @param {string} userAgent */
export const isFirefox = (userAgent) => /firefox/i.test(userAgent);

/**
 * Safari's tracking prevention (#79), worst in the Home Screen app, which has its own cookies. Covers Safari on
 * Mac/iPad, every iPhone browser (all WebKit) and the Home Screen app.
 * @param {string} userAgent @param {boolean} [standalone] navigator.standalone
 */
export const isSafari = (userAgent, standalone = false) =>
  (/safari/i.test(userAgent) && !/chrome|chromium|android|firefox/i.test(userAgent)) || /iphone|ipod/i.test(userAgent) || standalone === true;
