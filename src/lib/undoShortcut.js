// Cmd/Ctrl+Z on the planner takes back the last planner change. Not while typing (fields have their own undo),
// not inside a dialog (the change would happen behind it), and not Shift+Cmd+Z (redo).

/** Input types that hold no text, so Cmd+Z there is not a text undo. */
const NO_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']);

/**
 * The parts of an element the rule reads. A real element has all of them.
 * @typedef {{
 *   localName?: string, type?: string, isContentEditable?: boolean,
 *   getAttribute?: (name: string) => string | null, parentElement?: ElementLike | null,
 * }} ElementLike
 */

/** Whether the element, or one around it, is a text field or a dialog. @param {ElementLike | null | undefined} target */
function keepsOwnUndo(target) {
  if (target?.isContentEditable) return true;
  for (let el = target; el; el = el.parentElement) {
    const tag = el.localName;
    if (tag === 'textarea' || tag === 'select' || tag === 'dialog') return true;
    if (tag === 'input' && !NO_TEXT.has((el.type ?? 'text').toLowerCase())) return true;
    if (el.getAttribute?.('role') === 'dialog') return true;
  }
  return false;
}

/**
 * @param {Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'> & { target: unknown }} event
 */
export function isUndoShortcut(event) {
  if (event.defaultPrevented || event.shiftKey || event.altKey || !(event.metaKey || event.ctrlKey)) return false;
  if (event.key.toLowerCase() !== 'z') return false;
  return !keepsOwnUndo(/** @type {ElementLike | null | undefined} */ (event.target));
}

/** Key combination for the hint beside Undo: "⌘Z" on Apple platforms, "Ctrl+Z" elsewhere. @param {string} [platform] navigator.platform */
export const undoShortcutHint = (platform = '') => (/mac|iphone|ipad/i.test(platform) ? '⌘Z' : 'Ctrl+Z');
