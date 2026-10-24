// Plain-language messages for a failed sync pass.

/**
 * @param {unknown} error a GoogleApiError (it has a numeric `status`, 0 for network failures) or anything else thrown
 * @param {{ sessionEnded: string, noAccess: string, notFound: string, busy: string, offline: string, googleSaid: (message: string) => string, syncFailed: string }} messages
 */
export function errorMessage(error, messages) {
  const status = /** @type {{ status?: unknown } | null} */ (error)?.status;
  if (error instanceof Error && typeof status === 'number') {
    if (status === 401) return messages.sessionEnded;
    if (status === 403) return messages.noAccess;
    if (status === 404) return messages.notFound;
    if (status === 429 || status >= 500) return messages.busy;
    if (status === 0) return messages.offline;
    return messages.googleSaid(error.message);
  }
  return error instanceof Error ? error.message : messages.syncFailed;
}

/**
 * Why a spreadsheet in another layout isn't synced.
 * @param {number} sheetVersion 0 when it has no version row @param {number} current this build's version
 * @param {{ newerVersion: string, olderVersion: string }} messages
 */
export const versionMessage = (sheetVersion, current, messages) => (sheetVersion > current ? messages.newerVersion : messages.olderVersion);
