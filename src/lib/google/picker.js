// Google Picker: the person chooses the spreadsheet MealCaster may use. With
// the drive.file scope, picking it here is what grants access to that file.

import { googleConfig } from './config.js';
import { loadScript } from './auth.svelte.js';

let loaded;

/** Loads the Picker ahead of a click. */
export function preparePicker() {
  loaded ??= loadScript('https://apis.google.com/js/api.js')
    .then(() => new Promise((resolve) => /** @type {any} */ (window).gapi.load('picker', { callback: resolve })))
    .catch((error) => {
      loaded = undefined;
      throw error;
    });
  return loaded;
}

/**
 * @param {string} token OAuth access token
 * @returns {Promise<{ id: string, name: string } | null>} null if cancelled
 */
export async function pickSpreadsheet(token) {
  await preparePicker();
  const { picker } = /** @type {any} */ (window).google;
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS).setMode(picker.DocsViewMode.LIST);
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(googleConfig.apiKey)
      .setAppId(googleConfig.appId)
      .setOrigin(window.location.origin)
      .setTitle('Choose your MealCaster spreadsheet')
      .setCallback((data) => {
        const action = data[picker.Response.ACTION];
        if (action === picker.Action.PICKED) {
          const doc = data[picker.Response.DOCUMENTS][0];
          resolve({ id: doc[picker.Document.ID], name: doc[picker.Document.NAME] });
        } else if (action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
