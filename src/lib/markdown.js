// Tiny dependency-free Markdown → HTML for recipe notes. All text is HTML-escaped
// first, so the output is safe for {@html}; links are limited to http(s)/mailto.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${c}</code>`) - 1}\u0000`);
  s = s
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\*)|(^|[^_\w])_(?!\s)(.+?)_(?![_\w])/g, (m, p1, a, p2, b) =>
      a !== undefined ? `${p1}<em>${a}</em>` : `${p2}<em>${b}</em>`,
    )
    .replace(/~~(.+?)~~/g, '<del>$1</del>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

/** @param {string} src @returns {string} */
export function renderMarkdown(src) {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6); // keep below the section's own <h2>
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push('<hr>');
      i++;
    } else if (/^\s*>/.test(line)) {
      const block = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) block.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(block.join('\n'))}</blockquote>`);
    } else if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i++].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''))}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else {
      const para = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{1,6}\s|\s*>|\s*(?:[-*+]|\d+[.)])\s+)/.test(lines[i])
      ) {
        para.push(lines[i++]);
      }
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    }
  }
  return out.join('');
}

/** Recipes saved before notes became one Markdown field kept `secret` and `pairing` apart. */
export function migrateNotes(r) {
  if (!r || (r.secret === undefined && r.pairing === undefined)) return r;
  const { secret, pairing, ...rest } = r;
  const notes = rest.notes ?? [secret, pairing && `**Pairing:** ${pairing}`].filter(Boolean).join('\n\n');
  return { ...rest, notes };
}
