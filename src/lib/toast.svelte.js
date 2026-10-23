/** @typedef {{ label: string, run: () => void }} ToastAction */

export const toast = $state({
  id: 0,
  message: '',
  /** @type {ToastAction | null} */
  action: null,
  /** Set by a screen that shows the toast in its own bar (grocery store mode); the floating one then only announces it. */
  docked: false,
});

/** Where focus was before it went into the toast, so Undo can hand it back. */
export const toastFocus = { /** @type {EventTarget | null} */ cameFrom: null };

let timer;
let hideAt = 0;
/** ms left while paused (hover or focus), else null */
let pausedLeft = null;

/**
 * @param {string} message @param {ToastAction} [action] @param {number} [duration] ms; defaults to 6 s with an action, 3.5 s without
 * @returns {number} the toast's id
 */
export function showToast(message, action, duration) {
  toast.id += 1;
  toast.message = message;
  toast.action = action ?? null;
  pausedLeft = null;
  hideIn(duration ?? (action ? 6000 : 3500));
  return toast.id;
}

/** @param {number} ms */
function hideIn(ms) {
  clearTimeout(timer);
  hideAt = Date.now() + ms;
  timer = setTimeout(dismissToast, ms);
}

/** The timer stops while the toast is hovered or focused (WCAG 2.2.1). */
export function pauseToast() {
  if (!toast.message || pausedLeft !== null) return;
  clearTimeout(timer);
  pausedLeft = hideAt - Date.now();
}

/** Restarts the timer, with at least 2 s left to read. */
export function resumeToast() {
  if (pausedLeft === null) return;
  hideIn(Math.max(pausedLeft, 2000));
  pausedLeft = null;
}

export function dismissToast() {
  clearTimeout(timer);
  pausedLeft = null;
  toast.message = '';
  toast.action = null;
}
