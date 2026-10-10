import { measureHarnessBoot } from '../harness-boot-timing';

afterEach(() => { window.history.replaceState(null, '', '/'); jest.restoreAllMocks(); });

test('diagnostics are silent by default and preserve the operation result', async () => {
  const log = jest.spyOn(console, 'info').mockImplementation(() => {});
  const result = { ticket: 'private-ticket' };
  await expect(measureHarnessBoot('admission-ticket', async () => result)).resolves.toBe(result);
  expect(log).not.toHaveBeenCalled();
});

test('opt-in diagnostics record duration and status without response contents or errors', async () => {
  window.history.replaceState(null, '', '/?hiveBootTiming=1');
  const log = jest.spyOn(console, 'info').mockImplementation(() => {});
  await measureHarnessBoot('session-cookie', async () => ({ status: 401, ticket: 'private-ticket' }));
  const error = new Error('private-error-detail');
  await expect(measureHarnessBoot('shell-import', async () => { throw error; })).rejects.toBe(error);
  expect(JSON.parse(log.mock.calls[0][1])).toEqual({ phase: 'session-cookie', outcome: 'completed', ms: expect.any(Number), status: 401 });
  expect(JSON.parse(log.mock.calls[1][1])).toEqual({ phase: 'shell-import', outcome: 'failed', ms: expect.any(Number) });
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-ticket|private-error-detail/);
});
