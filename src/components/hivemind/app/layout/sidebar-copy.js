import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Replaces `{{name}}` placeholders in `text` with `vars[name]`.
 * i18next interpolates a loaded catalog entry itself; this covers the English `defaultValue` returned before the catalog loads.
 * @param {string} text - String that may contain `{{name}}` placeholders.
 * @param {Record<string, unknown>} [vars] - Placeholder values.
 * @returns {string} `text` with every known placeholder replaced.
 */
export function fillCopy(text, vars) {
  if (!vars || typeof text !== 'string' || !text.includes('{{')) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/**
 * Sidebar, dock and account copy: one function that reads `dashboard` → `sidebar.<key>` in the chosen language and falls back to the English `defaultValue`.
 * The returned function changes identity with the language, so components re-render on a language switch without a reload.
 * @returns {(key: string, defaultValue: string, vars?: Record<string, unknown>) => string} Copy lookup.
 */
export function useSidebarCopy() {
  const { t } = useTranslation('dashboard');
  return useCallback((key, defaultValue, vars) => fillCopy(t(`sidebar.${key}`, { ...vars, defaultValue }), vars), [t]);
}

/**
 * Copy lookup for any `dashboard` section: reads `<prefix>.<key>` in the chosen language and falls back to the English `defaultValue`.
 * @param {string} prefix - Dictionary path such as `outerApp.usage`.
 * @returns {(key: string, defaultValue: string, vars?: Record<string, unknown>) => string} Copy lookup that changes identity with the language.
 */
export function useCopy(prefix) {
  const { t, i18n } = useTranslation('dashboard');
  const latest = useRef(t);
  latest.current = t;
  // `t` is read through a ref and the function changes identity only with the language: some `t` implementations (no i18next instance, test doubles) are new on every render, which would loop effects that depend on the lookup.
  return useCallback((key, defaultValue, vars) => fillCopy(latest.current(`${prefix}.${key}`, { ...vars, defaultValue }), vars), [i18n?.language, prefix]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Plural-aware copy lookup: `<prefix>.<key>` resolves its `_one`/`_other` (and, in Arabic, `_zero`/`_two`/`_few`/`_many`) forms for `count`.
 * The text writes the number as `{{n}}`, which receives `count` formatted for the language.
 * @param {string} prefix - Dictionary path.
 * @returns {(key: string, one: string, other: string, count: number, vars?: Record<string, unknown>) => string} Plural copy lookup.
 */
export function usePluralCopy(prefix) {
  const { t, i18n } = useTranslation('dashboard');
  const latest = useRef(t);
  latest.current = t;
  return useCallback((key, one, other, count, vars) => {
    const all = { ...vars, n: formatNumber(i18n?.language, count) };
    return fillCopy(latest.current(`${prefix}.${key}`, { ...all, count, defaultValue: count === 1 ? one : other }), all);
  }, [i18n?.language, prefix]); // eslint-disable-line react-hooks/exhaustive-deps
}

const formatters = new Map();
function numberFormat(language, options) {
  const cacheKey = `${language || ''}|${JSON.stringify(options || {})}`;
  if (!formatters.has(cacheKey)) {
    let format;
    try { format = new Intl.NumberFormat(language || undefined, options); } catch { format = new Intl.NumberFormat(undefined, options); }
    formatters.set(cacheKey, format);
  }
  return formatters.get(cacheKey);
}

/**
 * Formats a number with the digits, grouping and separators of `language`.
 * @param {string | undefined} language - BCP 47 tag from i18next.
 * @param {unknown} value - Number or numeric string; anything else formats as 0.
 * @param {Intl.NumberFormatOptions} [options] - Intl options such as `{ style: 'percent' }`.
 * @returns {string} Localized number.
 */
export function formatNumber(language, value, options) {
  const number = Number(value);
  return numberFormat(language, options).format(Number.isFinite(number) ? number : 0);
}

/**
 * Locale-aware number, percent, compact-number and date formatting bound to the active interface language.
 * @returns {{ language: string | undefined, number: (value: unknown) => string, percent: (percent: unknown) => string, compact: (value: unknown) => string, date: (value: unknown, options?: Intl.DateTimeFormatOptions) => string, ago: (isoDate: unknown) => string | null }} Formatters; `ago` returns null for under a minute.
 */
export function useLocaleFormat() {
  const { i18n } = useTranslation('dashboard');
  const language = i18n?.language;
  return useMemo(() => ({
    language,
    number: (value) => formatNumber(language, value),
    unit: (value, unit, digits = 0) => formatNumber(language, value, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: digits, minimumFractionDigits: digits }),
    percent: (percent) => formatNumber(language, Number(percent) / 100, { style: 'percent', maximumFractionDigits: 0 }),
    compact: (value) => {
      const number = Number(value) || 0;
      return formatNumber(language, number, number >= 1000 ? { notation: 'compact', maximumFractionDigits: number >= 10_000 ? 0 : 1 } : { maximumFractionDigits: 0 });
    },
    date: (value, options) => { const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(language || undefined, options); },
    ago: (isoDate) => {
      const delta = Date.now() - Date.parse(isoDate || '');
      if (!Number.isFinite(delta) || delta < 60_000) return null;
      let relative;
      try { relative = new Intl.RelativeTimeFormat(language || undefined, { numeric: 'auto' }); } catch { relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }); }
      if (delta < 3_600_000) return relative.format(-Math.floor(delta / 60_000), 'minute');
      if (delta < 86_400_000) return relative.format(-Math.floor(delta / 3_600_000), 'hour');
      return relative.format(-Math.floor(delta / 86_400_000), 'day');
    },
  }), [language]);
}

/**
 * Turns a plan id such as `enterprise_onboarding` into readable words (`Enterprise Onboarding`).
 * @param {unknown} planId - Plan id or display name.
 * @returns {string} Title-cased words, or an empty string when there is no plan.
 */
export function humanizePlanId(planId) {
  return String(planId || '').replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Plan label in the chosen language: a known plan id reads `sidebar.planLabel.<id>`, any other id reads the generic "{{name}} Plan" pattern with a readable name.
 * @returns {(planId: unknown) => string} Label such as "Enterprise Onboarding Plan"; a missing plan reads as the Free plan.
 */
export function usePlanLabel() {
  const { t, i18n } = useTranslation('dashboard');
  const latest = useRef(t);
  latest.current = t;
  return useCallback((planId) => {
    const id = String(planId || 'free').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const name = humanizePlanId(id);
    const generic = fillCopy(latest.current('sidebar.planLabelGeneric', { name, defaultValue: '{{name}} Plan' }), { name });
    return latest.current(`sidebar.planLabel.${id}`, { defaultValue: generic, name });
  }, [i18n?.language]); // eslint-disable-line react-hooks/exhaustive-deps
}
