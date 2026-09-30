/** @typedef {{ label: string, run: () => void }} ToastAction */

export const toast = $state({
  id: 0,
  message: '',
  /** @type {ToastAction | null} */
  action: null,
});

let timer;

/** @param {string} message @param {ToastAction} [action] */
export function showToast(message, action) {
  clearTimeout(timer);
  toast.id += 1;
  toast.message = message;
  toast.action = action ?? null;
  timer = setTimeout(dismissToast, action ? 6000 : 3500);
}

export function dismissToast() {
  clearTimeout(timer);
  toast.message = '';
  toast.action = null;
}

/** Placeholder for screens that are not built yet. */
export const comingSoon = (screen) => showToast(`${screen} is coming soon.`);
