import { parkNativeHarnessSeat, takeNativeHarnessSeat, clearNativeHarnessSeat, discardParkedNativeHarnessSeat } from './native-harness-seat';
afterEach(() => { clearNativeHarnessSeat(); delete window.__DSH_EMBED_APP__; });
it('reattaches the same app and composer DOM across native agent navigation', () => {
  const app = { dispose: jest.fn() }, old = document.createElement('div'), host = document.createElement('div');
  old.innerHTML = '<textarea>saved draft</textarea>';
  document.body.append(old);
  expect(parkNativeHarnessSeat(app, old, '/hivemind/app/employee/harness/session/owned')).toBe(true);
  expect(takeNativeHarnessSeat(app, host)).toEqual({ app, container: old });
  expect(host.firstChild).toBe(old);
  expect(host.querySelector('textarea').value).toBe('saved draft');
  expect(app.dispose).not.toHaveBeenCalled();
});
it('does not retain the app across settings or sign-out', async () => {
  const app = { dispose: jest.fn() }, seat = document.createElement('div');
  expect(parkNativeHarnessSeat(app, seat, '/login')).toBe(false);
  window.__DSH_EMBED_APP__ = app;
  parkNativeHarnessSeat(app, seat, '/hivemind/app/overview/session/owned');
  discardParkedNativeHarnessSeat('/hivemind/app/company-settings');
  await window.__HIVE_HARNESS_DISPOSE_PROMISE__;
  expect(app.dispose).toHaveBeenCalledTimes(1);
  expect(window.__DSH_EMBED_APP__).toBeUndefined();
  expect(takeNativeHarnessSeat(app, document.createElement('div'))).toBeNull();
});
it('never attaches a parked seat to another app identity', () => {
  const app = {}, host = document.createElement('div');
  parkNativeHarnessSeat(app, document.createElement('div'), '/hivemind/app/employee/harness');
  expect(takeNativeHarnessSeat({}, host)).toBeNull();
  expect(host.childNodes.length).toBe(0);
});
