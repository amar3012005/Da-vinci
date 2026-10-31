import { BUG_REPORT_MAX_BYTES, buildBugReport, sendBugReport, validateBugReport } from '../bug-report';

jest.mock('../native-app', () => ({ isNativeApp: () => false }));

const base = { text: '  Room never opens  ', route: '/hivemind/app/overview', orgId: 'org-1', userId: 'u-1', build: 'abc', appVersion: '1.0.0', platform: 'web', userAgent: 'UA' };

describe('bug report payload', () => {
  test('carries ids, route, platform and build but no token or email', () => {
    const report = buildBugReport({ ...base, token: 'secret', email: 'a@b.c' });
    expect(report).toEqual({ text: 'Room never opens', route: '/hivemind/app/overview', platform: 'web', appVersion: '1.0.0', build: 'abc', orgId: 'org-1', userId: 'u-1', userAgent: 'UA' });
  });
  test('rejects empty and oversize reports', () => {
    expect(validateBugReport(buildBugReport({ ...base, text: ' ' }))).toBe('text_required');
    expect(validateBugReport({ ...buildBugReport(base), route: 'x'.repeat(BUG_REPORT_MAX_BYTES) })).toBe('report_too_large');
    expect(validateBugReport(buildBugReport(base))).toBeNull();
  });
});

describe('sending', () => {
  const report = buildBugReport(base);
  test('posts JSON with the session cookie and returns the id', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'r-1' }) });
    await expect(sendBugReport(report, { fetchImpl })).resolves.toEqual({ id: 'r-1' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/hivemind/bug-report', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });
  test('maps signed-out and failures to codes', async () => {
    await expect(sendBugReport(report, { fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 401 }) })).rejects.toMatchObject({ code: 'sign_in_required' });
    await expect(sendBugReport(report, { fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 503 }) })).rejects.toMatchObject({ code: 'unavailable' });
    await expect(sendBugReport(report, { fetchImpl: jest.fn().mockRejectedValue(new Error('offline')) })).rejects.toMatchObject({ code: 'unavailable' });
    await expect(sendBugReport({ ...report, text: '' }, { fetchImpl: jest.fn() })).rejects.toMatchObject({ code: 'text_required' });
  });
  test('the iOS app needs the native plugin method and says so otherwise', async () => {
    const ios = { ...report, platform: 'ios' };
    await expect(sendBugReport(ios, { plugin: {} })).rejects.toMatchObject({ code: 'unavailable' });
    const plugin = { bugReport: jest.fn().mockResolvedValue({ status: 201, id: 'r-2' }) };
    await expect(sendBugReport(ios, { plugin })).resolves.toEqual({ id: 'r-2' });
  });
});
