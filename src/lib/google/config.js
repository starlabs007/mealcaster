/* global __GOOGLE_CONFIG__ */
// Google Cloud credentials baked in at build time (see vite.config.js and .env.example).
// All three are public by design in a browser app; the API key is restricted by origin.

/** @type {{ clientId: string, apiKey: string, appId: string }} */
export const googleConfig = __GOOGLE_CONFIG__;

/** Whether this build can talk to Google at all. */
export const googleConfigured = Boolean(googleConfig.clientId && googleConfig.apiKey && googleConfig.appId);

/** Only files the user picks in the Picker or that MealCaster creates. */
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';
