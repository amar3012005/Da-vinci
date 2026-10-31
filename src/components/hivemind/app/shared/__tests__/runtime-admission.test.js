jest.mock('../harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('../native-app', () => ({ isNativeApp: jest.fn(() => false) }));
jest.mock('../../pages/HarnessSurface', () => ({ establishHarnessSession: jest.fn() }));
jest.mock('../native-auth', () => ({ nativePlugin: { request: jest.fn() } }));
jest.mock('../api-client', () => ({ __esModule: true, default: { controlPlane: { post: jest.fn() } } }));
const { fetchHarness } = require('../harness-fetch');
const { establishHarnessSession } = require('../../pages/HarnessSurface');
const { isNativeApp } = require('../native-app');
const { nativePlugin } = require('../native-auth');
const apiClient = require('../api-client').default;
const { fetchWithRuntimeAdmission, resetRuntimeAdmissionForTests } = require('../runtime-admission');

const response = status => ({ status, ok: status < 400 });
if (!globalThis.TextEncoder) globalThis.TextEncoder = require('util').TextEncoder;
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.randomUUID) globalThis.crypto.randomUUID = () => 'request-id';
beforeEach(() => {
  fetchHarness.mockReset(); establishHarnessSession.mockReset(); isNativeApp.mockReturnValue(false);
  nativePlugin.request.mockReset(); apiClient.controlPlane.post.mockReset(); resetRuntimeAdmissionForTests();
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

test('the packaged app admits a Runtime session on the Runtime host once when a Runtime read is refused', async () => {
  delete window.location;
  window.location = new URL('capacitor://localhost/hivemind/app/employee/library');
  isNativeApp.mockReturnValue(true);
  const answer = status => ({ status, headers: {}, encoding: 'base64', data: btoa('{}') });
  nativePlugin.request.mockResolvedValueOnce(answer(401)).mockResolvedValueOnce(answer(200)).mockResolvedValueOnce(answer(200));
  apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'harness', ticket: 't' } });
  const first = await fetchWithRuntimeAdmission('/api/hivemind/artifacts');
  expect([apiClient.controlPlane.post.mock.calls.length, nativePlugin.request.mock.calls.length]).toEqual([1, 3]);
  expect(first.status).toBe(200);
  expect(nativePlugin.request.mock.calls.map(([options]) => `${options.method} ${options.url}`)).toEqual([
    'GET https://runtime-runner.singulancelabs.com/api/hivemind/artifacts',
    'POST https://runtime-runner.singulancelabs.com/api/hivemind/session/establish',
    'GET https://runtime-runner.singulancelabs.com/api/hivemind/artifacts',
  ]);
  expect(establishHarnessSession).not.toHaveBeenCalled();
});

test('a Runtime-host admission that does not help is not repeated during the cooldown', async () => {
  isNativeApp.mockReturnValue(true);
  const answer = status => ({ status, headers: {}, encoding: 'base64', data: btoa('{}') });
  nativePlugin.request.mockResolvedValue(answer(401));
  apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'harness', ticket: 't' } });
  expect((await fetchWithRuntimeAdmission('/api/hivemind/artifacts', undefined, () => 1000)).status).toBe(401);
  expect((await fetchWithRuntimeAdmission('/api/hivemind/artifacts', undefined, () => 2000)).status).toBe(401);
  expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(1);
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
