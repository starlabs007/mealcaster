// Recipe titles inside toast messages. text.js wraps each title in Unicode isolate marks (U+2068 … U+2069: invisible,
// meant for embedding user text), so a toast that runs past three lines can shorten the titles and keep the rest of
// the sentence whole: what happened matters more than the whole title.
//
// Plain module (no runes) so text.js and the toast components can both import it.

const START = '⁨';
const END = '⁩';
const MARKED = /⁨([^⁩]*)⁩/g;

/** Marks a title for the toast; an already marked one ("Surprise! <title>") stays as it is. @param {string} title */
export const toastTitle = (title) => (title.includes(START) ? title : `${START}${title}${END}`);

/** The message without the marks, for screen readers and the tooltip. @param {string} message */
export const toastPlain = (message) => message.replace(/[⁨⁩]/g, '');

/** Length of the longest marked title (0 = none, nothing to shorten). @param {string} message */
export const longestTitle = (message) => Math.max(0, ...[...message.matchAll(MARKED)].map((m) => m[1].length));

/**
 * A title cut to at most `max` characters at a word, with "…"; always keeps the whole first word, even past `max`
 * (one letter and "…" says nothing). Trailing punctuation and joining words ("&", "and", "with") go before the "…".
 * @param {string} title @param {number} max
 */
export function shortenTitle(title, max) {
  if (title.length <= max || !/\s/.test(title.trim())) return title;
  const words = title.split(/\s+/);
  let cut = words[0];
  for (const word of words.slice(1)) {
    if (cut.length + 1 + word.length > max) break;
    cut += ` ${word}`;
  }
  cut = cut.replace(/(\s+(&|and|with|or|in|of|the|a))+$/i, '').replace(/[\s,;:&\-–—]+$/, '');
  return `${cut}…`;
}

/** The plain message with every title shortened to `max` characters. @param {string} message @param {number} max */
export const fitTitles = (message, max) => toastPlain(message.replace(MARKED, (_, title) => shortenTitle(title, max)));

/**
 * The text to show: the whole message if it fits, else the message with the longest titles that still let it fit
 * (binary search on the title length), else the titles at their shortest.
 * @param {string} message @param {(text: string) => boolean} fits e.g. "stays within three lines"
 */
export function fitToast(message, fits) {
  const whole = toastPlain(message);
  const longest = longestTitle(message);
  if (!longest || fits(whole)) return whole;
  let lo = 1;
  let hi = longest - 1;
  let best = 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (fits(fitTitles(message, mid))) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return fitTitles(message, best);
}
