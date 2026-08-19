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
  { code: 'sk', label: 'Slovak',     native: 'Slovenčina' },
  { code: 'cs', label: 'Czech',      native: 'Čeština' },
  { code: 'ro', label: 'Romanian',   native: 'Română' },
  { code: 'uk', label: 'Ukrainian',  native: 'Українська' },
  { code: 'hu', label: 'Hungarian',  native: 'Magyar' },
  { code: 'sv', label: 'Swedish',    native: 'Svenska' },
  { code: 'da', label: 'Danish',     native: 'Dansk' },
  { code: 'fi', label: 'Finnish',    native: 'Suomi' },
  { code: 'no', label: 'Norwegian',  native: 'Norsk' },
  { code: 'el', label: 'Greek',      native: 'Ελληνικά' },
  { code: 'tr', label: 'Turkish',    native: 'Türkçe' },
  { code: 'ru', label: 'Russian',    native: 'Русский' },
  { code: 'ar', label: 'Arabic',     native: 'العربية', rtl: true },
  { code: 'he', label: 'Hebrew',     native: 'עברית',  rtl: true },
  { code: 'fa', label: 'Persian',    native: 'فارسی',  rtl: true },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali',    native: 'বাংলা' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'th', label: 'Thai',       native: 'ไทย' },
  { code: 'zh', label: 'Chinese',    native: '中文' },
  { code: 'ja', label: 'Japanese',   native: '日本語' },
  { code: 'ko', label: 'Korean',     native: '한국어' },
];

export const RTL_LANGUAGES = new Set(
  SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);

// ── Runtime auto-translate post-processor ──────────────────────────────────
// When i18next can't resolve a key (missing key OR English literal used as
// a "key"), this post-processor fetches translation from /api/translate
// asynchronously, caches in memoryCache + localStorage, and triggers a
// re-render once the response lands. The first paint shows the English
// source; subsequent renders show the translation.
//
// This lets pages keep their hardcoded English JSX strings AND still get
// translated, as long as they call t('...') with the literal as the key.

const RUNTIME_CACHE_KEY = 'hivemind:i18n:runtime';
const runtimeCache = (() => {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(RUNTIME_CACHE_KEY) || '{}')));
  } catch {
    return new Map();
  }
})();
function persistRuntimeCache() {
  try {
    const obj = {};
    for (const [k, v] of runtimeCache) obj[k] = v;
    localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

const pendingTexts = new Map(); // text → Set<lang>
let flushTimer = null;

function getApiBase() {
  return (
    (typeof process !== 'undefined' && process.env?.REACT_APP_CORE_API_URL) ||
    'https://core.singulancelabs.com'
  );
}

async function flushPending() {
  flushTimer = null;
  const buckets = new Map(); // lang → string[]
  for (const [text, langs] of pendingTexts.entries()) {
    for (const lang of langs) {
      if (!buckets.has(lang)) buckets.set(lang, []);
      buckets.get(lang).push(text);
    }
  }
  pendingTexts.clear();

  for (const [lang, texts] of buckets) {
    try {
      const resp = await fetch(`${getApiBase()}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: texts.slice(0, 200), target_lang: lang }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const translations = Array.isArray(data.translations) ? data.translations : texts;
      let touched = false;
      for (let i = 0; i < texts.length && i < translations.length; i++) {
        const t = texts[i];
        const tr = translations[i];
        if (typeof tr === 'string' && tr && tr !== t) {
          runtimeCache.set(`${lang}:${t}`, tr);
          touched = true;
        }
      }
      if (touched) {
        persistRuntimeCache();
        // Trigger re-render of every i18n-aware component.
        i18n.emit('languageChanged', i18n.language);
      }
    } catch {
      /* ignore — fallback to English */
    }
  }
}

function queueRuntimeTranslate(text, lang) {
  if (!pendingTexts.has(text)) pendingTexts.set(text, new Set());
  pendingTexts.get(text).add(lang);
  if (flushTimer) return;
  flushTimer = setTimeout(flushPending, 150);
}

const runtimeAutoTranslate = {
  type: 'postProcessor',
  name: 'runtimeAutoTranslate',
  process(value, key, options, translator) {
    // No-op for English or empty.
    const lang = (translator?.language || i18n.language || 'en').split('-')[0];
    if (!lang || lang === 'en') return value;

    // If i18next resolved a real translation from a JSON bundle, value !== key.
    // In that case we trust the bundle and return early.
    const looksLikeMiss =
      typeof value === 'string' &&
      typeof key === 'string' &&
      value === key;
    if (!looksLikeMiss) return value;

    // Only treat the key as an English source if it has spaces or punctuation
    // (i.e. looks like a sentence, not a dotted key like "sidebar.overview").
    const seemsEnglishLiteral = /[\s.,!?:'"-]/.test(value) && /[a-zA-Z]/.test(value) && !value.includes('{{') && value.length < 240;
    if (!seemsEnglishLiteral) return value;

    const cached = runtimeCache.get(`${lang}:${value}`);
    if (cached) return cached;
    queueRuntimeTranslate(value, lang);
    return value;
  },
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(runtimeAutoTranslate)
  .init({
    postProcess: ['runtimeAutoTranslate'],
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
