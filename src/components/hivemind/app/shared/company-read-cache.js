// Short-lived, same-origin window memory only. No credentials or disk storage.
const CACHE = '__HIVE_COMPANY_READS__';
export function companyReadOwner(win = window) {
  try { if (win.parent !== win && win.parent.location.origin === win.location.origin) return win.parent; } catch { /* Cross-origin panes keep their own read. */ }
  return win;
}
export function scopedCompanyRead(scope, read, owner = companyReadOwner(), now = Date.now()) {
  const rows = owner[CACHE] ||= new Map();
  const previous = rows.get(scope);
  if (previous && now - previous.at < 30000) return previous.promise;
  const promise = Promise.resolve().then(read);
  rows.set(scope, { at: now, promise });
  if (rows.size > 8) rows.delete(rows.keys().next().value);
  promise.catch(() => { if (rows.get(scope)?.promise === promise) rows.delete(scope); });
  return promise;
}
export function clearCompanyRead(scope, owner = companyReadOwner()) { owner[CACHE]?.delete(scope); }
