jest.mock('../harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('../native-app', () => ({ isNativeApp: jest.fn(() => false) }));
jest.mock('../../pages/HarnessSurface', () => ({ establishHarnessSession: jest.fn() }));
const { fetchHarness } = require('../harness-fetch');
const { establishHarnessSession } = require('../../pages/HarnessSurface');
const { isNativeApp } = require('../native-app');
const { fetchWithRuntimeAdmission } = require('../runtime-admission');

const response = status => ({ status, ok: status < 400 });
beforeEach(() => {
  fetchHarness.mockReset(); establishHarnessSession.mockReset(); isNativeApp.mockReturnValue(false);
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

test('the packaged app admits once and retries, because its native cookie jar starts without a runner session', async () => {
  delete window.location;
  window.location = new URL('capacitor://localhost/hivemind/m/chat');
  isNativeApp.mockReturnValue(true);
  fetchHarness.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
  establishHarnessSession.mockResolvedValue({ mode: 'harness' });
  const result = await fetchWithRuntimeAdmission('/api/hivemind/workspace-shell?resource=roster');
  expect(establishHarnessSession).toHaveBeenCalledTimes(1);
  expect(result.status).toBe(200);
});

test('a web browser outside the Runtime host still never admits', async () => {
  delete window.location;
  window.location = new URL('https://next.singulancelabs.com/hivemind/app');
  fetchHarness.mockResolvedValueOnce(response(401));
  expect((await fetchWithRuntimeAdmission('/api/x')).status).toBe(401);
  expect(establishHarnessSession).not.toHaveBeenCalled();
});
