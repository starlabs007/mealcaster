/**
 * How long ago a sync was, in words: "just now" under a minute, minutes under an hour, hours under a day, then the date.
 * @param {string} iso when it happened @param {number} now ms
 * @param {{ justNow: string, minutesAgo: (n: number) => string, hoursAgo: (n: number) => string }} say
 */
export function ago(iso, now, say) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return say.justNow;
  if (minutes < 60) return say.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? say.hoursAgo(hours) : new Date(iso).toLocaleDateString();
}
