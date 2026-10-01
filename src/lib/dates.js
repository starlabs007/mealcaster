// Local-time date helpers. Plans are keyed by ISO date (YYYY-MM-DD), matching
// the Date_ISO column of the Google Sheets [WeeklyPlan] tab.

const pad = (n) => String(n).padStart(2, '0');

/** @param {Date} d */
export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** @param {string} iso */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** @param {string} iso @param {number} days */
export function addDays(iso, days) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole days from `from` to `to` (both ISO dates); negative if `to` is earlier. */
export function daysBetween(from, to) {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000);
}

/**
 * "Last made today", "… yesterday", "… 5 days ago", "… 3 weeks ago", "… 2 months ago",
 * "… over a year ago"; "Not made yet" without a date.
 * @param {string | undefined} iso @param {string} today
 */
export function formatLastMade(iso, today) {
  if (!iso) return 'Not made yet';
  const days = daysBetween(iso, today);
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (days <= 0) return 'Last made today';
  if (days === 1) return 'Last made yesterday';
  if (days < 14) return `Last made ${plural(days, 'day')}`;
  if (days < 60) return `Last made ${plural(Math.floor(days / 7), 'week')}`;
  if (days < 365) return `Last made ${plural(Math.floor(days / 30), 'month')}`;
  return 'Last made over a year ago';
}

/** Monday of the week containing `date`. */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
}

/** Seven ISO dates, Monday through Sunday. */
export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const fmt = (opts) => new Intl.DateTimeFormat('en-US', opts);
const shortFmt = fmt({ month: 'short', day: 'numeric' });
const longFmt = fmt({ weekday: 'long', month: 'short', day: 'numeric' });
const weekdayFmt = fmt({ weekday: 'long' });

export const formatShort = (iso) => shortFmt.format(fromISO(iso));
export const formatLong = (iso) => longFmt.format(fromISO(iso));
export const formatWeekday = (iso) => weekdayFmt.format(fromISO(iso));

/** "Oct 21 – Oct 27" */
export function formatRange(weekStart) {
  return `${formatShort(weekStart)} – ${formatShort(addDays(weekStart, 6))}`;
}

/** "Oct 21–27" (compact, same month) or "Sep 29–Oct 5" */
export function formatRangeCompact(weekStart) {
  const end = addDays(weekStart, 6);
  const sameMonth = fromISO(weekStart).getMonth() === fromISO(end).getMonth();
  return `${formatShort(weekStart)}–${sameMonth ? fromISO(end).getDate() : formatShort(end)}`;
}

/** ISO-8601 week number of the week containing `iso`. */
export function isoWeek(iso) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of this week
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
