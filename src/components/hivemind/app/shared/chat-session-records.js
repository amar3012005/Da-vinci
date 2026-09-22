const MAX_TRANSCRIPT_MESSAGES = 200;
const MAX_SESSION_RECORDS = 24;

function fallbackId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function createId() {
  return window.crypto?.randomUUID?.() || fallbackId();
}

function readJson(storage, key, fallback) {
  try {
    const value = storage?.getItem?.(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try { storage?.setItem?.(key, JSON.stringify(value)); } catch { /* storage is best-effort */ }
}

export function conversationStorageKeys(messageStorageKey, conversationId) {
  return {
    active: `${messageStorageKey}:active-conversation`,
    index: `${messageStorageKey}:sessions`,
    transcript: `${messageStorageKey}:conversation:${conversationId}`,
    legacyThread: `${messageStorageKey}:thread-id`,
  };
}

export function titleForConversation(messages) {
  const firstUserMessage = (messages || []).find((message) => message?.role === 'user' && typeof message.content === 'string');
  const compact = firstUserMessage?.content?.replace(/\s+/g, ' ').trim() || '';
  if (!compact) return 'New conversation';
  return compact.length > 64 ? `${compact.slice(0, 61).trimEnd()}…` : compact;
}

export function loadConversationRecord(storage, messageStorageKey) {
  const baseKeys = conversationStorageKeys(messageStorageKey, 'pending');
  const legacyMessages = readJson(storage, messageStorageKey, []);
  const legacyThreadId = storage?.getItem?.(baseKeys.legacyThread);
  const conversationId = storage?.getItem?.(baseKeys.active) || legacyThreadId || createId();
  const keys = conversationStorageKeys(messageStorageKey, conversationId);
  const storedMessages = readJson(storage, keys.transcript, null);
  const messages = Array.isArray(storedMessages) ? storedMessages : (Array.isArray(legacyMessages) ? legacyMessages : []);

  // The former one-transcript shape becomes the first user-facing record. This
  // keeps existing mobile chats available and does not read LangGraph state.
  if (!Array.isArray(storedMessages) && messages.length) writeJson(storage, keys.transcript, messages.slice(-MAX_TRANSCRIPT_MESSAGES));
  storage?.setItem?.(keys.active, conversationId);
  storage?.setItem?.(keys.legacyThread, conversationId);
  return { conversationId, messages };
}

export function listConversationRecords(storage, messageStorageKey) {
  const keys = conversationStorageKeys(messageStorageKey, 'pending');
  const records = readJson(storage, keys.index, []);
  return Array.isArray(records) ? records.filter((record) => record?.id && record?.title).slice(0, MAX_SESSION_RECORDS) : [];
}

export function saveConversationRecord(storage, messageStorageKey, conversationId, messages) {
  const safeMessages = Array.isArray(messages) ? messages.slice(-MAX_TRANSCRIPT_MESSAGES) : [];
  const keys = conversationStorageKeys(messageStorageKey, conversationId);
  writeJson(storage, messageStorageKey, safeMessages); // retain the legacy active-chat cache for safe rollback.
  writeJson(storage, keys.transcript, safeMessages);
  storage?.setItem?.(keys.active, conversationId);
  storage?.setItem?.(keys.legacyThread, conversationId);

  if (!safeMessages.length) return listConversationRecords(storage, messageStorageKey);
  const updatedAt = new Date().toISOString();
  const record = { id: conversationId, title: titleForConversation(safeMessages), updatedAt };
  const next = [record, ...listConversationRecords(storage, messageStorageKey).filter((item) => item.id !== conversationId)]
    .slice(0, MAX_SESSION_RECORDS);
  writeJson(storage, keys.index, next);
  return next;
}

export function selectConversationRecord(storage, messageStorageKey, conversationId) {
  const keys = conversationStorageKeys(messageStorageKey, conversationId);
  const messages = readJson(storage, keys.transcript, []);
  storage?.setItem?.(keys.active, conversationId);
  storage?.setItem?.(keys.legacyThread, conversationId);
  return Array.isArray(messages) ? messages : [];
}

export function startConversationRecord(storage, messageStorageKey) {
  const conversationId = createId();
  const keys = conversationStorageKeys(messageStorageKey, conversationId);
  storage?.setItem?.(keys.active, conversationId);
  storage?.setItem?.(keys.legacyThread, conversationId);
  return { conversationId, messages: [] };
}

export function clearConversationRecords(storage, messageStorageKey) {
  const records = listConversationRecords(storage, messageStorageKey);
  for (const record of records) storage?.removeItem?.(conversationStorageKeys(messageStorageKey, record.id).transcript);
  const keys = conversationStorageKeys(messageStorageKey, 'pending');
  storage?.removeItem?.(messageStorageKey);
  storage?.removeItem?.(keys.index);
  storage?.removeItem?.(keys.active);
  storage?.removeItem?.(keys.legacyThread);
}
