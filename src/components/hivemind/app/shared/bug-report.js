import { detectPlatform } from './app-update';

/** Largest report body the Worker accepts; the text itself is limited so the whole JSON stays under it. */
export const BUG_REPORT_MAX_BYTES = 8 * 1024;
export const BUG_REPORT_MAX_TEXT = 4000;
export const BUG_REPORT_ENDPOINT = '/api/hivemind/bug-report';
const NATIVE_ORIGIN = 'https://next.singulancelabs.com';

/**
 * Builds the report body. Carries no tokens or emails: only ids the Worker can check, the route and client details.
 * @param {object} input - `text`, `route`, `orgId`, `userId`, `build`, `appVersion`, `platform`, `userAgent`.
 * @returns {object} JSON body for the Worker.
 */
export function buildBugReport({ text, route, orgId, userId, build, appVersion, platform, userAgent }) {
  return {
    text: String(text || '').trim().slice(0, BUG_REPORT_MAX_TEXT),
    route: String(route || '').slice(0, 300),
    platform: platform || detectPlatform(),
    appVersion: String(appVersion || '').slice(0, 40),
    build: String(build || process.env.REACT_APP_BUILD_SHA || '').slice(0, 80),
    orgId: orgId ? String(orgId).slice(0, 80) : '',
    userId: userId ? String(userId).slice(0, 80) : '',
    userAgent: String(userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)).slice(0, 300),
  };
}

/** Client-side validation matching the Worker: returns an error code or `null`. */
export function validateBugReport(report) {
  if (!report.text || report.text.length < 3) return 'text_required';
  if (new Blob([JSON.stringify(report)]).size > BUG_REPORT_MAX_BYTES) return 'report_too_large';
  return null;
}

/**
 * Sends a report. Browsers and the macOS app post to the Worker with the session cookie; the packaged iOS app needs the
 * native plugin's `bugReport` method (its session is a bearer held by the plugin, not a cookie).
 * @param {object} report - result of `buildBugReport`.
 * @param {{ fetchImpl?: Function, plugin?: object, native?: boolean }} [options] - test seams.
 * @returns {Promise<{id: string}>} stored report id.
 * @throws {Error} with `.code` of `text_required`, `report_too_large`, `sign_in_required`, `unavailable`.
 */
export async function sendBugReport(report, { fetchImpl = typeof fetch === 'undefined' ? null : fetch, plugin, native = report.platform === 'ios' } = {}) {
  const invalid = validateBugReport(report);
  if (invalid) throw Object.assign(new Error(invalid), { code: invalid });
  if (native) {
    if (typeof plugin?.bugReport !== 'function') throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
    const result = await plugin.bugReport({ url: NATIVE_ORIGIN + BUG_REPORT_ENDPOINT, body: JSON.stringify(report) });
    if (result?.status === 401) throw Object.assign(new Error('sign_in_required'), { code: 'sign_in_required' });
    if (result?.status !== 201 && result?.status !== 200) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
    return { id: String(result.id || '') };
  }
  let response;
  try {
    response = await fetchImpl(BUG_REPORT_ENDPOINT, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report),
    });
  } catch { throw Object.assign(new Error('unavailable'), { code: 'unavailable' }); }
  if (response.status === 401) throw Object.assign(new Error('sign_in_required'), { code: 'sign_in_required' });
  if (!response.ok) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  const data = await response.json().catch(() => ({}));
  if (!data.id) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  return { id: String(data.id) };
}
