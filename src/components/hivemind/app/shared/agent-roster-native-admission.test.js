import { agentRoster } from './agent-roster';
import { fetchHarness } from './harness-fetch';
import { establishHarnessSession } from './harness-admission';
jest.mock('./harness-fetch', () => ({ fetchHarness: jest.fn() }));
jest.mock('./native-app', () => ({ isNativeApp: () => true }));
jest.mock('./harness-admission', () => ({ establishHarnessSession: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test('cold native sidebar exchanges authentication before retrying an HTML fallback', async () => {
  const fallbackJson = jest.fn();
  fetchHarness.mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'text/html' }, json: fallbackJson })
    .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ profiles: [{ id: 'fixture-agent', name: 'Fixture' }] }) });
  establishHarnessSession.mockResolvedValue({ mode: 'harness' });
  await expect(agentRoster.load('fixture-user:fixture-org')).resolves.toEqual([{ id: 'fixture-agent', name: 'Fixture' }]);
  expect(establishHarnessSession).toHaveBeenCalledTimes(1);
  expect(fetchHarness).toHaveBeenCalledTimes(2);
  expect(fallbackJson).not.toHaveBeenCalled();
});
test('rejected admission never exposes or caches a roster', async () => {
  fetchHarness.mockResolvedValue({ ok: false, status: 401, headers: { get: () => 'application/json' } });
  establishHarnessSession.mockRejectedValue(new Error('denied'));
  await expect(agentRoster.load('other-user:other-org')).rejects.toThrow('denied');
  expect(agentRoster.peek('other-user:other-org')).toBeUndefined();
  expect(fetchHarness).toHaveBeenCalledTimes(1);
});
