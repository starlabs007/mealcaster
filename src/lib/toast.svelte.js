/** @typedef {{ label: string, run: () => void }} ToastAction */

export const toast = $state({
  id: 0,
  message: '',
  /** @type {ToastAction | null} */
  action: null,
});

let timer;

/** @param {string} message @param {ToastAction} [action] @param {number} [duration] ms; defaults to 6 s with an action, 3.5 s without */
export function showToast(message, action, duration) {
  clearTimeout(timer);
  toast.id += 1;
  toast.message = message;
  toast.action = action ?? null;
  timer = setTimeout(dismissToast, duration ?? (action ? 6000 : 3500));
}

export function dismissToast() {
  clearTimeout(timer);
  toast.message = '';
  toast.action = null;
}
