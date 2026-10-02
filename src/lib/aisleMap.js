// The person's own ingredient → aisle mappings (Profile → Aisle mappings, synced in the
// Settings tab). They're checked before the built-in word lists when guessing an aisle.
// Plain JS (no runes) so the sync codec and tests can use it.

/** @typedef {{ name: string, tag: string }} AisleMapping */

/** Name as compared: lower case, single spaces. @param {string} name */
export const mappingKey = (name) => String(name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Tidy name as stored: trimmed, single spaces, case kept. @param {string} name */
export const tidyName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The aisle for an ingredient description, if a mapping's name appears in it as whole words
 * (a plural "s"/"es" is fine). The longest matching name wins, so "coconut milk" beats "milk".
 * @param {AisleMapping[]} mappings @param {string} text
 * @returns {string | undefined} an ingredient aisle tag
 */
export function findAisleMapping(mappings, text) {
  const t = mappingKey(text);
  if (!t) return undefined;
  let best;
  for (const m of mappings) {
    const key = mappingKey(m.name);
    if (!key || (best && key.length <= mappingKey(best.name).length)) continue;
    if (new RegExp(`(^|[^a-z0-9])${escape(key)}(e?s)?($|[^a-z0-9])`, 'i').test(t)) best = m;
  }
  return best?.tag;
}

/** Adds or replaces a mapping (same name, any case). @param {AisleMapping[]} mappings @returns {AisleMapping[]} */
export function withMapping(mappings, name, tag) {
  const clean = tidyName(name);
  if (!clean) return mappings;
  return [...mappings.filter((m) => mappingKey(m.name) !== mappingKey(clean)), { name: clean, tag }];
}
