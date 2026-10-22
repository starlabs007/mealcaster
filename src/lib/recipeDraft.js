// The Recipe Editor's unsaved work, kept on this device. A new recipe's draft is the form itself under `newKey`
// (the same shape as before autosave, so an old draft still opens). Drafts of edited recipes share one map under
// `editsKey`: `{ [recipeId]: { base, form } }`, where `base` is the form's signature as the editor opened it.
// A draft whose `base` no longer matches (the recipe changed meanwhile, say by a sync) is ignored.

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
  const isForm = (form) => form && Array.isArray(form.ingredients) && Array.isArray(form.steps);

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
