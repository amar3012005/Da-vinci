/** @jest-environment node */
import { createNativeSessionRecovery, nativeAdmissionMessage } from './native-session-recovery';
global.DOMException = require('vm').runInThisContext('DOMException');
const reply = (status, contentType = 'application/json') => ({ status, ok: status < 400, headers: { get: () => contentType } });
function fixture(request) {
  const deps = { request: jest.fn(request), checkBridge: jest.fn(async () => {}), admit: jest.fn(async () => ({mode: 'harness', ticket: 'signed-ticket'})), establish: jest.fn(async () => {}) };
  return { deps, session: createNativeSessionRecovery(deps) };
}
test('expired read refreshes once and retries the same request; a second denial remains denied', async () => {
  const {deps, session} = fixture(() => reply(401));
  expect((await session.fetch('/api/hivemind/boot')).status).toBe(401);
  expect(deps.request).toHaveBeenCalledTimes(2);
  expect(deps.admit).toHaveBeenCalledTimes(1);
  expect(deps.establish).toHaveBeenCalledWith('signed-ticket');
});
test('concurrent roster and history reads share one admission', async () => {
  const {deps, session} = fixture(() => reply(deps.establish.mock.calls.length ? 200 : 401));
  const responses = await Promise.all([session.fetch('/api/hivemind/employees'), session.fetch('/api/remote.read')]);
  expect(responses.every(response => response.ok)).toBe(true);
  expect(deps.admit).toHaveBeenCalledTimes(1);
});
test('roster SPA HTML is not mistaken for an empty team and gets a single recovery', async () => {
  const {deps, session} = fixture(() => reply(200, deps.establish.mock.calls.length ? 'application/json' : 'text/html'));
  expect((await session.fetch('/api/hivemind/employees')).headers.get('content-type')).toBe('application/json');
  expect(deps.admit).toHaveBeenCalledTimes(1);
});
test('denied rollout never falls back to web credentials, creates cookies, or replays reads', async () => {
  const {deps, session} = fixture(() => reply(403));
  deps.admit.mockRejectedValue(new Error('iPhone chat access disabled'));
  await expect(session.fetch('/api/hivemind/boot')).rejects.toThrow('iPhone chat access disabled');
  expect(deps.establish).not.toHaveBeenCalled();
  expect(deps.request).toHaveBeenCalledTimes(1);
});
test('mutations and server failures are never retried', async () => {
  const {deps, session} = fixture(() => reply(403));
  await session.fetch('/api/remote.invoke', {method: 'POST', body: 'user prompt'});
  deps.request.mockImplementation(() => reply(503));
  await session.fetch('/api/hivemind/boot');
  expect(deps.admit).not.toHaveBeenCalled();
  expect(deps.request).toHaveBeenCalledTimes(2);
});
test('account changes invalidate in-flight admission before a ticket is established', async () => {
  let finish;
  const {deps, session} = fixture(() => reply(401));
  deps.admit.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const response = session.fetch('/api/hivemind/employees');
  await new Promise(setImmediate);
  session.reset(); finish({mode: 'harness', ticket: 'old-account'});
  await expect(response).rejects.toMatchObject({name: 'AbortError'});
  expect(deps.establish).not.toHaveBeenCalled();
});
test('incompatible bridge prevents admission and cancellation prevents a retry', async () => {
  const {deps, session} = fixture(() => reply(401));
  deps.checkBridge.mockRejectedValue(new Error('Update app'));
  await expect(session.refresh()).rejects.toThrow('Update app');
  expect(deps.admit).not.toHaveBeenCalled();
  const abort = new AbortController(); abort.abort();
  await expect(session.fetch('/api/hivemind/boot', {signal: abort.signal})).rejects.toMatchObject({name: 'AbortError'});
  expect(deps.admit).not.toHaveBeenCalled();
});
test('admission errors distinguish server-disabled native access from sign-in expiry', () => {
  expect(nativeAdmissionMessage({response: {status: 503, data: {code: 'MOBILE_RUNNER_NOT_READY'}}})).toContain('Signing in again will not resolve');
  expect(nativeAdmissionMessage({response: {status: 401}})).toContain('sign-in has expired');
  expect(nativeAdmissionMessage({response: {status: 403}})).toContain('permission');
});
