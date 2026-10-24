jest.mock('../harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('../../pages/HarnessSurface', () => ({ establishHarnessSession: jest.fn() }));
const { fetchHarness } = require('../harness-fetch');
const { establishHarnessSession } = require('../../pages/HarnessSurface');
const { fetchWithRuntimeAdmission } = require('../runtime-admission');

const response = status => ({ status, ok: status < 400 });
beforeEach(() => {
  fetchHarness.mockReset(); establishHarnessSession.mockReset();
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
