// Cmd/Ctrl+Z on the planner takes back the last planner change. Not while typing (fields have their own undo),
// not inside a dialog (the change would happen behind it), and not Shift+Cmd+Z (redo).

const KEEPS_OWN_UNDO = [
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  'input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="color"], [type="file"])',
  'dialog',
  '[role="dialog"]',
].join(', ');

/**
 * @param {Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'> & { target: unknown }} event
 */
export function isUndoShortcut(event) {
  if (event.defaultPrevented || event.shiftKey || event.altKey || !(event.metaKey || event.ctrlKey)) return false;
  if (event.key.toLowerCase() !== 'z') return false;
  const target = /** @type {{ closest?: (selector: string) => unknown }} */ (event.target);
  return !target?.closest?.(KEEPS_OWN_UNDO);
}

/** Key combination for the hint beside Undo: "⌘Z" on Apple platforms, "Ctrl+Z" elsewhere. @param {string} [platform] navigator.platform */
export const undoShortcutHint = (platform = '') => (/mac|iphone|ipad/i.test(platform) ? '⌘Z' : 'Ctrl+Z');
