jest.mock('../harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('../native-app', () => ({ isNativeApp: jest.fn(() => false) }));
jest.mock('../../pages/HarnessSurface', () => ({ establishHarnessSession: jest.fn() }));
jest.mock('../native-auth', () => ({ nativePlugin: { request: jest.fn() } }));
const { fetchHarness } = require('../harness-fetch');
const { establishHarnessSession } = require('../../pages/HarnessSurface');
const { isNativeApp } = require('../native-app');
const { nativePlugin } = require('../native-auth');
const { fetchWithRuntimeAdmission, resetRuntimeAdmissionForTests } = require('../runtime-admission');

const response = status => ({ status, ok: status < 400 });
beforeEach(() => {
  fetchHarness.mockReset(); establishHarnessSession.mockReset(); isNativeApp.mockReturnValue(false);
  nativePlugin.request.mockReset(); resetRuntimeAdmissionForTests();
  window.history.replaceState(null, '', '/');
});

test('admits once and retries when a Runtime read is unauthenticated on runtime-runner', async () => {
  delete window.location;
  window.location = new URL('https://runtime-runner.singulancelabs.com/hivemind/app/employee/dots');
  fetchHarness.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
  establishHarnessSession.mockResolvedValue({ mode: 'harness' });
  const result = await fetchWithRuntimeAdmission('/api/hivemind/employees', { credentials: 'same-origin' });
  expect(establishHarnessSession).toHaveBeenCalledTimes(1);
  expect(fetchHarness).toHaveBeenCalledTimes(2);
  expect(result.status).toBe(200);
});

test('returns the original 401 when admission fails, and never admits for other statuses', async () => {
  delete window.location;
  window.location = new URL('https://runtime-runner.singulancelabs.com/hivemind/app/employee/dots');
  fetchHarness.mockResolvedValueOnce(response(401));
  establishHarnessSession.mockRejectedValue(new Error('denied'));
  expect((await fetchWithRuntimeAdmission('/api/x')).status).toBe(401);
  fetchHarness.mockResolvedValueOnce(response(503));
  expect((await fetchWithRuntimeAdmission('/api/x')).status).toBe(503);
  expect(establishHarnessSession).toHaveBeenCalledTimes(1);
});

test('the packaged app reads the Runtime host through the native transport without a Brain admission', async () => {
  delete window.location;
  window.location = new URL('capacitor://localhost/hivemind/m/chat');
  isNativeApp.mockReturnValue(true);
  nativePlugin.request.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json' }, encoding: 'base64', data: btoa('{"profiles":[]}') });
  const result = await fetchWithRuntimeAdmission('/api/hivemind/workspace-shell?resource=roster');
  expect(nativePlugin.request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://runtime-runner.singulancelabs.com/api/hivemind/workspace-shell?resource=roster', method: 'GET', authorize: false }));
  expect(await result.json()).toEqual({ profiles: [] });
  expect(fetchHarness).not.toHaveBeenCalled();
  expect(establishHarnessSession).not.toHaveBeenCalled();
});

test('an older shell without Runtime-host requests falls back to one admission, then stops admitting while it does not help', async () => {
  delete window.location;
  window.location = new URL('capacitor://localhost/hivemind/m/chat');
  isNativeApp.mockReturnValue(true);
  nativePlugin.request.mockRejectedValue(new Error('Native request is not allowed.'));
  fetchHarness.mockResolvedValue(response(401));
  establishHarnessSession.mockResolvedValue({ mode: 'harness' });
  let clock = 1000;
  expect((await fetchWithRuntimeAdmission('/api/x', undefined, () => clock)).status).toBe(401);
  clock += 1000;
  expect((await fetchWithRuntimeAdmission('/api/x', undefined, () => clock)).status).toBe(401);
  expect(establishHarnessSession).toHaveBeenCalledTimes(1);
  expect(nativePlugin.request).toHaveBeenCalledTimes(1);
});

test('a web browser outside the Runtime host still never admits', async () => {
  delete window.location;
  window.location = new URL('https://next.singulancelabs.com/hivemind/app');
  fetchHarness.mockResolvedValueOnce(response(401));
  expect((await fetchWithRuntimeAdmission('/api/x')).status).toBe(401);
  expect(establishHarnessSession).not.toHaveBeenCalled();
});
