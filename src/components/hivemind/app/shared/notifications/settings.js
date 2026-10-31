import { mirrorFeedbackSettings } from '../platform-haptics';

/**
 * Notification settings of one person in one company, kept in localStorage until the server copy exists (P2).
 */
export const DEFAULT_SETTINGS = Object.freeze({
  categories: { needs_you: true, results: true, briefs: true },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  haptics: true,
  sound: true,
  askedBrowserPermission: false,
});

export const settingsKey = (companyId, userId) => `hm.notify.v1:${companyId}:${userId}`;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Merge stored values over the defaults, ignoring malformed fields. */
export function normalizeSettings(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const flag = (entry, fallback) => (typeof entry === 'boolean' ? entry : fallback);
  const quiet = value.quietHours && typeof value.quietHours === 'object' ? value.quietHours : {};
  return {
    categories: Object.fromEntries(Object.keys(DEFAULT_SETTINGS.categories).map(name => [name, flag(value.categories?.[name], true)])),
    quietHours: { enabled: flag(quiet.enabled, false), start: HHMM.test(quiet.start) ? quiet.start : '22:00', end: HHMM.test(quiet.end) ? quiet.end : '07:00' },
    haptics: flag(value.haptics, true),
    sound: flag(value.sound, true),
    askedBrowserPermission: flag(value.askedBrowserPermission, false),
  };
}

export function loadSettings(companyId, userId, storage = typeof window === 'undefined' ? null : window.localStorage) {
  if (!companyId || !userId || !storage) return normalizeSettings(null);
  try { return normalizeSettings(JSON.parse(storage.getItem(settingsKey(companyId, userId)) || 'null')); }
  catch { return normalizeSettings(null); /* Blocked storage or bad JSON: defaults. */ }
}

/** Save and mirror the device-level feedback flags; announces the change to the open banner host. */
export function saveSettings(companyId, userId, settings, storage = typeof window === 'undefined' ? null : window.localStorage) {
  const next = normalizeSettings(settings);
  if (!companyId || !userId || !storage) return next;
  try { storage.setItem(settingsKey(companyId, userId), JSON.stringify(next)); }
  catch { /* Blocked storage: the choice lasts until the page closes. */ }
  mirrorFeedbackSettings(next, storage);
  try { window.dispatchEvent(new CustomEvent('hivemind:notification-settings', { detail: { companyId, userId } })); }
  catch { /* No window in this environment. */ }
  return next;
}
