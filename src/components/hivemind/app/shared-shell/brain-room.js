// Where the Company Brain room lives and which conversation this device last showed in it. OpenDot's room writes the id under
// the same key (src/lib/brain-room-session.ts there), so the Brain shell and Brain links can reopen that conversation.
export const BRAIN_ORIGIN = 'https://brain-runner.singulancelabs.com';
export const BRAIN_ROOM_PATH = '/dots/dot_company_brain';
const KEY_PART = /^[A-Za-z0-9_.-]{1,128}$/;
const CONVERSATION_ID = /^conv_[A-Za-z0-9_-]{1,160}$/;

function deviceStorage() {
  try { return window.localStorage; } catch { return null; }
}

/**
 * Device-storage key of the last Company Brain conversation, scoped by company and user.
 * @param {{ tenant: string, user: string }} scope - organization id and user id.
 * @returns {string | null} The key, or null when a part cannot form one.
 */
export function brainRoomStorageKey(scope) {
  const parts = [scope?.tenant, scope?.user, 'brain-room', 'dot_company_brain'];
  return parts.every(part => typeof part === 'string' && KEY_PART.test(part)) ? `hm:${parts.join(':')}` : null;
}

/**
 * The conversation id this device cached for the Company Brain room.
 * @param {{ tenant: string, user: string }} scope - organization id and user id.
 * @param {Storage | null} [storage] - Device storage; defaults to localStorage.
 * @returns {string | null} A well-formed conversation id, or null when none is cached or storage is unavailable.
 */
export function cachedBrainRoomId(scope, storage = deviceStorage()) {
  const key = brainRoomStorageKey(scope);
  if (!key || !storage) return null;
  try {
    const value = storage.getItem(key);
    return value && CONVERSATION_ID.test(value) ? value : null;
  } catch { return null; }
}

/**
 * The Company Brain room address, carrying the cached conversation when there is one.
 * @param {string | null} conversationId - Cached conversation id.
 * @param {string} [search] - Extra query string of the link being replaced (for example hm_locale); its `c` is replaced.
 * @returns {string} Absolute room URL.
 */
export function brainRoomUrl(conversationId, search = '') {
  const url = new URL(BRAIN_ROOM_PATH, BRAIN_ORIGIN);
  const params = new URLSearchParams(search);
  params.delete('c');
  if (conversationId && CONVERSATION_ID.test(conversationId)) params.set('c', conversationId);
  url.search = params.toString();
  return url.href;
}
