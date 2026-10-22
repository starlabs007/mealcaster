// The Recipe Editor's unsaved work, kept on this device. A new recipe's draft is the form itself under `newKey`
// (the same shape as before autosave, so an old draft still opens). Drafts of edited recipes share one map under
// `editsKey`: `{ [recipeId]: { base, form } }`, where `base` is the form's signature as the editor opened it.
// A draft whose `base` no longer matches (the recipe changed meanwhile, say by a sync) is ignored. A form holds its
// ingredients in `groups` (sections); drafts kept before that hold one flat `ingredients` list, which the editor converts.

/**
 * A form's content, without the row keys the editor hands out, to tell whether it changed.
 * @param {object} form
 */
export const signature = (form) => JSON.stringify(form, (key, value) => (key === 'key' ? undefined : value));

/**
 * @param {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} store
 * @param {string} newKey @param {string} editsKey
 */
export function createDraftStore(store, newKey, editsKey) {
  const isForm = (form) => form && Array.isArray(form.groups ?? form.ingredients) && Array.isArray(form.steps);

  function readEdits() {
    try {
      const edits = JSON.parse(store.getItem(editsKey) ?? '{}');
      return edits && typeof edits === 'object' && !Array.isArray(edits) ? edits : {};
    } catch {
      return {};
    }
  }

  return {
    /**
     * The saved form, or null. An edited recipe's draft counts only for the `base` it was started from.
     * @param {string | undefined} id the recipe being edited; none for a new recipe
     * @param {string} [base]
     */
    read(id, base) {
      try {
        if (!id) {
          const raw = store.getItem(newKey);
          const form = raw && JSON.parse(raw);
          return isForm(form) ? form : null;
        }
        const entry = readEdits()[id];
        return isForm(entry?.form) && entry.base === base ? entry.form : null;
      } catch {
        return null;
      }
    },

    /** Whether it fit. @param {string | undefined} id @param {object} form @param {string} [base] */
    write(id, form, base) {
      try {
        if (!id) {
          store.setItem(newKey, JSON.stringify(form));
        } else {
          store.setItem(editsKey, JSON.stringify({ ...readEdits(), [id]: { base, form } }));
        }
        return true;
      } catch {
        return false;
      }
    },

    /** @param {string | undefined} id */
    clear(id) {
      try {
        if (!id) {
          store.removeItem(newKey);
          return;
        }
        const { [id]: dropped, ...rest } = readEdits();
        if (!dropped) return;
        if (Object.keys(rest).length) store.setItem(editsKey, JSON.stringify(rest));
        else store.removeItem(editsKey);
      } catch {
        // Nothing saved.
      }
    },
  };
}

/**
 * A form as drafts kept it before groups became sections: one flat `ingredients` list whose rows each name their
 * group, keys in the same order, so `signature` of it matches the `base` such a draft was kept with.
 * @param {{ groups: { title: string, rows: object[] }[], steps: object[], notes: string }} form
 */
export function flatForm({ groups, steps, notes, ...head }) {
  return {
    ...head,
    ingredients: groups.flatMap((g) =>
      g.rows.map(({ key, qty, unit, text, id, note, prep, optional, aisle, aisleSet }) => ({ key, qty, unit, text, id, note, prep, optional, group: g.title, aisle, aisleSet })),
    ),
    steps,
    notes,
  };
}

/**
 * A flat draft's rows back in sections, in the order their groups first appear (names compared without case).
 * @param {{ group?: string }[]} rows @param {(title: string) => string} [categoryOf] a group's category by its name
 * @returns {{ title: string, category: string, rows: object[] }[]}
 */
export function sectionsOf(rows, categoryOf = () => '') {
  /** @type {{ title: string, category: string, rows: object[] }[]} */
  const sections = [];
  for (const { group = '', ...row } of rows) {
    const title = String(group).trim();
    let section = sections.find((s) => s.title.toLowerCase() === title.toLowerCase());
    if (!section) sections.push((section = { title, category: categoryOf(title) ?? '', rows: [] }));
    section.rows.push(row);
  }
  return sections;
}

/**
 * The recipe's ingredient groups from the editor's sections: rows without a name are left out, and so are sections
 * left empty; an untitled section takes `fallbackTitle`, and sections with one name save as one group. A section
 * keeps its category whatever it's called; one without gets `category(group)`.
 * @template Item
 * @param {{ title: string, category?: string, rows: { text: string }[] }[]} sections
 * @param {{ fallbackTitle: string, item: (row: any) => Item, category: (group: { title: string, items: Item[] }) => string }} how
 */
export function savedGroups(sections, { fallbackTitle, item, category }) {
  /** @type {{ title: string, category: string, items: Item[] }[]} */
  const groups = [];
  for (const section of sections) {
    const rows = section.rows.filter((r) => r.text.trim());
    if (!rows.length) continue;
    const title = section.title.trim() || fallbackTitle;
    let group = groups.find((g) => g.title.toLowerCase() === title.toLowerCase());
    if (!group) groups.push((group = { title, category: section.category ?? '', items: [] }));
    for (const row of rows) group.items.push(item(row));
  }
  for (const g of groups) g.category = g.category || category(g);
  return groups;
}
