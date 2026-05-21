/**
 * HIVEMIND i18n bootstrap.
 *
 *   • react-i18next + http-backend lazy-loads /locales/<lng>/<ns>.json
 *   • language detector orders: localStorage → navigator → fallback en
 *   • supportedLngs gates anything else to fallback
 *
 * Namespaces:
 *   common     — buttons, labels, generic UI shared everywhere
 *   dashboard  — HIVEMIND app pages (sidebar, overview, memories, …)
 *   landing    — public marketing pages (homepage, pricing, …)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    native: 'English' },
  { code: 'de', label: 'German',     native: 'Deutsch' },
  { code: 'fr', label: 'French',     native: 'Français' },
  { code: 'es', label: 'Spanish',    native: 'Español' },
  { code: 'it', label: 'Italian',    native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'nl', label: 'Dutch',      native: 'Nederlands' },
  { code: 'pl', label: 'Polish',     native: 'Polski' },
  { code: 'tr', label: 'Turkish',    native: 'Türkçe' },
  { code: 'ru', label: 'Russian',    native: 'Русский' },
  { code: 'ar', label: 'Arabic',     native: 'العربية', rtl: true },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी' },
  { code: 'zh', label: 'Chinese',    native: '中文' },
  { code: 'ja', label: 'Japanese',   native: '日本語' },
  { code: 'ko', label: 'Korean',     native: '한국어' },
];

export const RTL_LANGUAGES = new Set(
  SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    ns: ['common', 'dashboard', 'landing'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'hivemind:lang',
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// Sync <html dir> with current language so Tailwind rtl: variants apply.
function applyDirection(lng) {
  const dir = RTL_LANGUAGES.has((lng || '').split('-')[0]) ? 'rtl' : 'ltr';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lng);
  }
}
i18n.on('languageChanged', applyDirection);
applyDirection(i18n.language);

export default i18n;
