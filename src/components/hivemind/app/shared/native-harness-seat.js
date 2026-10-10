// Retain the native-owned DOM and app only across authenticated chat route transitions.
let parked;
export function isNativeHarnessChatPath(path) {
  return /^\/hivemind\/app\/(?:overview|employee\/harness)(?:\/(?:new|session\/[^/]+))?$/.test(path);
}
export function parkNativeHarnessSeat(app, container, path) {
  if (!app || !isNativeHarnessChatPath(path)) return false;
  parked = { app, container };
  container.remove();
  return true;
}
export function takeNativeHarnessSeat(app, host) {
  if (!parked || parked.app !== app) { parked = undefined; return null; }
  const seat = parked; parked = undefined;
  host.append(seat.container);
  return seat;
}
export function clearNativeHarnessSeat() { parked = undefined; }

export function discardParkedNativeHarnessSeat(path) {
  if (isNativeHarnessChatPath(path) || !parked) return;
  const seat = parked; parked = undefined;
  if (window.__DSH_EMBED_APP__ === seat.app) window.__DSH_EMBED_APP__ = undefined;
  const disposing = Promise.resolve().then(() => seat.app.dispose()).catch(() => undefined);
  window.__HIVE_HARNESS_DISPOSE_PROMISE__ = disposing;
  void disposing.finally(() => {
    if (window.__HIVE_HARNESS_DISPOSE_PROMISE__ === disposing) window.__HIVE_HARNESS_DISPOSE_PROMISE__ = undefined;
  });
}
