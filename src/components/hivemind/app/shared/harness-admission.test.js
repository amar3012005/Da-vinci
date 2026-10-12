import apiClient from './api-client';
import { fetchHarness } from './harness-fetch';
import { establishHarnessSession } from './harness-admission';
jest.mock('./api-client', () => ({ controlPlane: { post: jest.fn() } }));
jest.mock('./harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('./harness-boot-timing', () => ({ measureHarnessBoot: (_stage, fn) => fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  global.crypto = { randomUUID: () => 'fixture-request' };
  global.window = { dispatchEvent: jest.fn() };
});
test('concurrent roster and chat admission share one signed exchange without agent execution', async () => {
  apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'harness', ticket: 'fixture-ticket' } });
  fetchHarness.mockResolvedValue({ ok: true });
  const results = await Promise.all([establishHarnessSession(), establishHarnessSession()]);
  expect(results).toEqual([{ mode: 'harness' }, { mode: 'harness' }]);
  expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(1);
  expect(fetchHarness).toHaveBeenCalledTimes(1);
  expect(fetchHarness.mock.calls[0][0]).toBe('/api/hivemind/session/establish');
  expect(JSON.parse(fetchHarness.mock.calls[0][1].body)).toEqual({ ticket: 'fixture-ticket', request_id: 'fixture-request' });
});
test('legacy admission remains legacy and does not exchange a ticket', async () => {
  apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'legacy' } });
  await expect(establishHarnessSession()).resolves.toEqual({ mode: 'legacy' });
  expect(fetchHarness).not.toHaveBeenCalled();
});
test('rejected exchange clears the pending request so an authorized retry can recover', async () => {
  apiClient.controlPlane.post.mockResolvedValue({ data: { mode: 'harness', ticket: 'fixture-ticket' } });
  fetchHarness.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
  await expect(establishHarnessSession()).rejects.toThrow('secure HIVEMIND session');
  await expect(establishHarnessSession()).resolves.toEqual({ mode: 'harness' });
  expect(fetchHarness).toHaveBeenCalledTimes(2);
});
