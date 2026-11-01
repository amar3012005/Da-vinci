/**
 * Languages whose copy is machine-translated and has no native review sign-off. The language choosers mark them "Beta".
 * `public/locales/machine-translated.json` is the source of truth: a language leaves that file (and this list) only with
 * a native review sign-off, and `src/__tests__/locale-status.test.js` fails when the two differ.
 */
export const MACHINE_TRANSLATED_LOCALES = Object.freeze([
  'hi', 'ja', 'ar', 'bn', 'cs', 'da', 'de', 'el', 'es', 'fa', 'fi', 'fr', 'he', 'hu', 'id', 'it', 'ko', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sv', 'th', 'tr', 'uk', 'vi', 'zh',
]);

const BETA = new Set(MACHINE_TRANSLATED_LOCALES);

/**
 * Whether a language is machine-translated and should carry the Beta tag.
 * @param {string} code - A language code such as `ar` or `pt-BR`; the region is ignored.
 * @returns {boolean} True when the language is listed in machine-translated.json.
 */
export function isBetaLocale(code) {
  return BETA.has(String(code || '').split('-')[0].toLowerCase());
}
