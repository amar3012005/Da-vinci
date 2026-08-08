const INVITATION_SESSION_KEY = 'hivemind_invitation_context_v1';

function availableStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function saveInvitationContext(context, storage) {
  if (!['personal', 'enterprise'].includes(context?.kind) || !context?.credential) return false;
  const target = availableStorage(storage);
  if (!target) return false;
  const record = {
    kind: context.kind,
    credential: String(context.credential),
    preview: context.preview && typeof context.preview === 'object' ? context.preview : null,
    expires_at: context.expires_at || context.preview?.invitation_expires_at || null,
    saved_at: new Date().toISOString(),
  };
  try {
    target.setItem(INVITATION_SESSION_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function loadInvitationContext(storage, now = Date.now()) {
  const target = availableStorage(storage);
  if (!target) return null;
  try {
    const record = JSON.parse(target.getItem(INVITATION_SESSION_KEY) || 'null');
    if (!['personal', 'enterprise'].includes(record?.kind) || !record?.credential) return null;
    const expiry = record.expires_at ? Date.parse(record.expires_at) : NaN;
    if (Number.isFinite(expiry) && expiry <= now) {
      target.removeItem(INVITATION_SESSION_KEY);
      return null;
    }
    return record;
  } catch {
    target.removeItem(INVITATION_SESSION_KEY);
    return null;
  }
}

export function clearInvitationContext(storage) {
  const target = availableStorage(storage);
  try { target?.removeItem(INVITATION_SESSION_KEY); } catch { /* ignore unavailable storage */ }
}

export { INVITATION_SESSION_KEY };
