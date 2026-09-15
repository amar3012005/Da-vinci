function fallbackId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateChatThreadId(storage, messageStorageKey) {
  const key = `${messageStorageKey}:thread-id`;
  const existing = storage?.getItem?.(key);
  if (existing) return existing;
  const id = window.crypto?.randomUUID?.() || fallbackId();
  storage?.setItem?.(key, id);
  return id;
}

export function resetChatThreadId(storage, messageStorageKey) {
  storage?.removeItem?.(`${messageStorageKey}:thread-id`);
}
