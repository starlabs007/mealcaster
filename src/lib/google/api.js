// Minimal Google Sheets + Drive REST client (fetch, no gapi client library).

import { currentToken, expire } from './auth.svelte.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class GoogleApiError extends Error {
  /** @param {string} message @param {number} status 0 for network failures */
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {string} url
 * @param {{ method?: string, json?: unknown, body?: BodyInit, headers?: Record<string, string> }} [options]
 */
async function call(url, { method = 'GET', json, body, headers = {} } = {}) {
  const token = currentToken();
  if (!token) throw new GoogleApiError('Not signed in to Google.', 401);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(json !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch {
    throw new GoogleApiError('Couldn’t reach Google.', 0);
  }
  if (response.status === 401) expire();
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new GoogleApiError(detail?.error?.message ?? response.statusText, response.status);
  }
  return response.status === 204 ? null : response.json();
}

/** 'Tab name' quoted for A1 notation. */
const quote = (tab) => `'${tab.replace(/'/g, "''")}'`;

// ---- Sheets -----------------------------------------------------------------

/** @type {import('../sync/run.js').SheetsApi} */
export const sheetsApi = {
  async getMeta(id) {
    const fields = 'properties.title,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))';
    const data = await call(`${SHEETS}/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`);
    return {
      title: data.properties.title,
      tabs: (data.sheets ?? []).map(({ properties: p }) => ({
        title: p.title,
        sheetId: p.sheetId,
        rowCount: p.gridProperties?.rowCount ?? 0,
        columnCount: p.gridProperties?.columnCount ?? 0,
      })),
    };
  },

  // Unformatted values: numbers stay numbers, checkboxes booleans, and real
  // date cells come back as serial numbers (codec.isoDate converts them).
  async getValues(id, tabs) {
    const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' });
    for (const tab of tabs) params.append('ranges', quote(tab));
    const data = await call(`${SHEETS}/${encodeURIComponent(id)}/values:batchGet?${params}`);
    return (data.valueRanges ?? []).map((r) => r.values ?? []);
  },

  batchUpdate: (id, requests) => call(`${SHEETS}/${encodeURIComponent(id)}:batchUpdate`, { method: 'POST', json: { requests } }),

  // RAW: text is stored exactly as written (no formulas, no date guessing).
  writeValues: (id, data) =>
    call(`${SHEETS}/${encodeURIComponent(id)}/values:batchUpdate`, { method: 'POST', json: { valueInputOption: 'RAW', data } }),
};

/** First rows of each tab, for the Column Conflicts screen. @param {string} id @param {string[]} tabs */
export async function readTopRows(id, tabs, count = 3) {
  const meta = await sheetsApi.getMeta(id);
  const present = tabs.filter((t) => meta.tabs.some((m) => m.title === t));
  const params = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' });
  for (const tab of present) params.append('ranges', `${quote(tab)}!1:${count}`);
  const data = present.length ? await call(`${SHEETS}/${encodeURIComponent(id)}/values:batchGet?${params}`) : { valueRanges: [] };
  return Object.fromEntries(tabs.map((t) => [t, present.includes(t) ? (data.valueRanges[present.indexOf(t)]?.values ?? []) : null]));
}

/** Replaces row 1 of a tab. @param {string} id @param {string} tab @param {string[]} headers */
export const writeHeaderRow = (id, tab, headers) =>
  sheetsApi.writeValues(id, [{ range: `${quote(tab)}!A1`, values: [headers] }]);

/** New spreadsheet with MealCaster's tabs (sync fills in the headers). */
export async function createSpreadsheet(title, tabs) {
  const data = await call(SHEETS, {
    method: 'POST',
    json: {
      properties: { title },
      sheets: tabs.map((t) => ({ properties: { title: t, gridProperties: { frozenRowCount: 1 } } })),
    },
  });
  return { id: data.spreadsheetId, name: data.properties.title };
}

// ---- Drive ------------------------------------------------------------------

/** @returns {Promise<{ name: string, email: string, photo: string }>} */
export async function getAccount() {
  const data = await call(`${DRIVE}/about?fields=user(displayName,emailAddress,photoLink)`);
  return { name: data.user?.displayName ?? '', email: data.user?.emailAddress ?? '', photo: data.user?.photoLink ?? '' };
}

/** Name of a spreadsheet the app can open (or throws). @param {string} id */
export async function getFileName(id) {
  const data = await call(`${DRIVE}/files/${encodeURIComponent(id)}?fields=name,trashed`);
  if (data.trashed) throw new GoogleApiError('That spreadsheet is in the trash.', 404);
  return data.name;
}

const FOLDER = 'application/vnd.google-apps.folder';

/** The "MealCaster Photos" Drive folder, created on first use. @param {string} [knownId] */
export async function ensurePhotoFolder(knownId) {
  if (knownId) {
    try {
      const folder = await call(`${DRIVE}/files/${encodeURIComponent(knownId)}?fields=id,trashed`);
      if (!folder.trashed) return knownId;
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status !== 404) throw error;
    }
  }
  const folder = await call(`${DRIVE}/files?fields=id`, { method: 'POST', json: { name: 'MealCaster Photos', mimeType: FOLDER } });
  return folder.id;
}

/** A photo from the recipe editor that's waiting to be uploaded. */
export const isPhotoDataUrl = (url) => /^data:image\/(jpeg|png|webp)[;,]/.test(url ?? '');

/**
 * Uploads a recipe photo and shares it as "anyone with the link can view", so
 * it shows on every device and to anyone the sheet is shared with.
 * @param {string} dataUrl JPEG data URL from the recipe editor
 * @param {string} name
 * @param {string} folderId
 * @returns {Promise<string>} image URL for the Image_URL column
 */
export async function uploadPhoto(dataUrl, name, folderId) {
  if (!isPhotoDataUrl(dataUrl)) throw new Error('Only JPG, PNG or WebP photos can be uploaded.');
  const image = await (await fetch(dataUrl)).blob();
  const boundary = `mealcaster${Math.random().toString(36).slice(2)}`;
  const metadata = { name, parents: [folderId], mimeType: image.type || 'image/jpeg' };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
    image,
    `\r\n--${boundary}--`,
  ]);
  const file = await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
  });
  await call(`${DRIVE}/files/${file.id}/permissions?fields=id`, { method: 'POST', json: { type: 'anyone', role: 'reader' } });
  return `https://lh3.googleusercontent.com/d/${file.id}`;
}
