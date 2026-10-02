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

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/**
 * Nests list items by indentation: an item indented further than the one
 * above it starts a sub-list inside that item.
 * @param {{ indent: number, ordered: boolean, text: string }[]} items
 */
function renderList(items) {
  let i = 0;
  const list = () => {
    const { indent, ordered } = items[i];
    const entries = [];
    while (i < items.length && items[i].indent >= indent) {
      if (items[i].indent > indent) entries[entries.length - 1] += list();
      else if (items[i].ordered !== ordered) break; // switching between - and 1. starts a new list
      else entries.push(inline(items[i++].text));
    }
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag}>${entries.map((e) => `<li>${e}</li>`).join('')}</${tag}>`;
  };
  let html = '';
  while (i < items.length) html += list();
  return html;
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
    } else if (LIST_ITEM.test(line)) {
      const items = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        const [, indent, marker, text] = /** @type {RegExpExecArray} */ (LIST_ITEM.exec(lines[i++]));
        items.push({ indent: indent.replace(/\t/g, '    ').length, ordered: /\d/.test(marker), text });
      }
      out.push(renderList(items));
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
