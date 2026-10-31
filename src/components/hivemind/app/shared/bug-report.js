import { detectPlatform } from './app-update';

/** Largest report body the Worker accepts; the text itself is limited so the whole JSON stays under it. */
export const BUG_REPORT_MAX_BYTES = 8 * 1024;
export const BUG_REPORT_MAX_TEXT = 4000;
export const BUG_REPORT_ENDPOINT = '/api/hivemind/bug-report';
const RUNTIME_HOST_ORIGIN = 'https://runtime-runner.singulancelabs.com';

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
 * native plugin's `request`, which signs Runtime-host calls with Control's session cookie.
 * @param {object} report - result of `buildBugReport`.
 * @param {{ fetchImpl?: Function, plugin?: object, native?: boolean }} [options] - test seams.
 * @returns {Promise<{id: string}>} stored report id.
 * @throws {Error} with `.code` of `text_required`, `report_too_large`, `sign_in_required`, `unavailable`.
 */
export async function sendBugReport(report, { fetchImpl = typeof fetch === 'undefined' ? null : fetch, plugin, native = report.platform === 'ios' } = {}) {
  const invalid = validateBugReport(report);
  if (invalid) throw Object.assign(new Error(invalid), { code: invalid });
  if (native) {
    // The plugin attaches Control's session cookie and the Runtime host's Origin to requests for this host.
    if (typeof plugin?.request !== 'function') throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
    let result;
    try {
      result = await plugin.request({ url: RUNTIME_HOST_ORIGIN + BUG_REPORT_ENDPOINT, method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(report), responseType: 'text' });
    } catch { throw Object.assign(new Error('unavailable'), { code: 'unavailable' }); }
    if (result?.status === 401) throw Object.assign(new Error('sign_in_required'), { code: 'sign_in_required' });
    let data = {};
    try { data = JSON.parse(result?.data || '{}'); } catch { /* Non-JSON body: treated as failure below. */ }
    if (result?.status !== 201 || !data.id) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
    return { id: String(data.id) };
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
