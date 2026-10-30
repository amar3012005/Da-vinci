import { useCallback } from 'react';
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
