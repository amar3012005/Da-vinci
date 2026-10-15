// Retain the native-owned DOM and app only across authenticated chat route transitions.
let parked;
export function isNativeHarnessChatPath(path) {
  return /^\/hivemind\/app\/(?:overview|employee\/harness)(?:\/(?:new|session\/[^/]+))?$/.test(path);
}
function canRetainSeat(path) {
  return isNativeHarnessChatPath(path) || /^\/hivemind\/app\/employee\/(?:dots(?:\/|$)|apps$)/.test(path);
}
export function parkNativeHarnessSeat(app, container, path, ownerScope) {
  if (!app || !canRetainSeat(path)) return false;
  parked = { app, container, ownerScope };
  container.remove();
  return true;
}
export function takeNativeHarnessSeat(app, host, ownerScope) {
  if (parked && parked.ownerScope !== ownerScope) discardParkedNativeHarnessSeat('/scope-changed');
  if (!parked || parked.app !== app) { parked = undefined; return null; }
  const seat = parked; parked = undefined;
  host.append(seat.container);
  return seat;
}
export function clearNativeHarnessSeat() { parked = undefined; }

export function discardParkedNativeHarnessSeat(path) {
  if (canRetainSeat(path) || !parked) return;
  const seat = parked; parked = undefined;
  if (window.__DSH_EMBED_APP__ === seat.app) window.__DSH_EMBED_APP__ = undefined;
  const disposing = Promise.resolve().then(() => seat.app.dispose()).catch(() => undefined);
  window.__HIVE_HARNESS_DISPOSE_PROMISE__ = disposing;
  void disposing.finally(() => {
    if (window.__HIVE_HARNESS_DISPOSE_PROMISE__ === disposing) window.__HIVE_HARNESS_DISPOSE_PROMISE__ = undefined;
  });
}
