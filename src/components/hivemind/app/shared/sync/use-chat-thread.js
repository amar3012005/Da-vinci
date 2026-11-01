import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { confirmedIdentity, onIdentityChange, syncScope } from './index';
import { chatEntities, latestConversation, RECENTS_KEY, registerChat } from './chat-feed';
import { pendingMessages, sendChatMessage } from './chat-outbox';
import { COMPANY_BRAIN_DOT_ID } from '../company-brain-room';
import { readLastTenant } from '../boot-cache';

const NONE = Object.freeze([]);

function lastTenantHint() {
  try { return readLastTenant(); } catch { return null; /* Blocked storage: no device copy to show. */ }
}

/**
 * The newest conversation of a surface, painted from the device copy and reconciled with the server.
 *
 * The first render uses the copy kept for the last signed-in person (before bootstrap has confirmed anyone), reads the
 * list and the conversation's last 50 messages from the LocalStore, and, once the identity is confirmed, refreshes both
 * by cursor. Unsent messages come from the Outbox and are appended with `pending: true`.
 *
 * @param {{ surface: 'brain'|'runtime', dotId?: string, conversationId?: string }} options - `brain` is the Company Brain
 *   room. `runtime` needs `dotId` (the employee) to pick a conversation; without it nothing is shown. `conversationId` pins a conversation.
 * @returns {{ conversation: object|undefined, messages: object[], source: 'none'|'cache'|'server', canSend: boolean, send: (text: string) => Promise<object|null>, retry: (clientId: string) => Promise<void> }} state. `send` resolves once the message is stored in the Outbox.
 */
export function useChatThread({ surface, dotId: employeeId, conversationId: pinned }) {
  const confirmed = useSyncExternalStore(onIdentityChange, confirmedIdentity, confirmedIdentity);
  const who = confirmed || lastTenantHint();
  const orgId = who?.orgId;
  const userId = who?.userId;
  const dotId = surface === 'brain' ? COMPANY_BRAIN_DOT_ID : employeeId;
  const names = chatEntities(surface);
  // Without an employee there is no conversation to show or send to (the Runtime lead's harness sessions are not in this feed).
  const bundle = useMemo(() => (orgId && userId && dotId ? syncScope(orgId, userId) : null), [orgId, userId, dotId]);
  const engine = bundle?.engine ?? null;
  if (engine) registerChat(engine);
  const refresh = Boolean(confirmed);

  const [recents, setRecents] = useState(() => engine?.peek(names.recents, RECENTS_KEY)?.items ?? NONE);
  const [source, setSource] = useState(() => (engine?.peek(names.recents, RECENTS_KEY) ? 'cache' : 'none'));
  useEffect(() => {
    if (!engine) { setRecents(NONE); setSource('none'); return undefined; }
    let active = true;
    const controller = new AbortController();
    const stop = engine.subscribe(names.recents, RECENTS_KEY, (snapshot) => { if (active) { setRecents(snapshot.items); setSource('server'); } });
    const opened = refresh
      ? engine.open(names.recents, RECENTS_KEY, { signal: controller.signal, onError: () => {} })
      : engine.read(names.recents, RECENTS_KEY).then((snapshot) => ({ snapshot }));
    opened.then(({ snapshot }) => { if (active && snapshot) { setRecents((current) => (current === NONE || current.length === 0 ? snapshot.items : current)); setSource((current) => (current === 'server' ? current : 'cache')); } })
      .catch(() => { /* No device copy: the room shows its own loading state. */ });
    return () => { active = false; stop(); controller.abort(); };
  }, [engine, names.recents, refresh]);

  const conversation = useMemo(() => (pinned ? recents.find((row) => row.id === pinned) ?? { id: pinned, dotId } : latestConversation(recents, { dotId })), [recents, pinned, dotId]);
  const conversationId = conversation?.id;

  const [messages, setMessages] = useState(() => (engine && conversationId ? engine.peek(names.messages, conversationId)?.items ?? NONE : NONE));
  useEffect(() => {
    if (!engine || !conversationId) { setMessages(NONE); return undefined; }
    let active = true;
    const controller = new AbortController();
    const stop = engine.subscribe(names.messages, conversationId, (snapshot) => { if (active) setMessages(snapshot.items); });
    const opened = refresh
      ? engine.open(names.messages, conversationId, { signal: controller.signal, onError: () => {} })
      : engine.read(names.messages, conversationId).then((snapshot) => ({ snapshot }));
    opened.then(({ snapshot }) => { if (active && snapshot) setMessages((current) => (current.length === 0 ? snapshot.items : current)); })
      .catch(() => { /* No device copy yet. */ });
    return () => { active = false; stop(); controller.abort(); };
  }, [engine, names.messages, conversationId, refresh]);

  const target = conversationId || (dotId ? `new:${dotId}` : '');
  const outbox = bundle?.outbox ?? null;
  const readPending = useCallback(() => (outbox && target ? pendingMessages(outbox, target) : NONE), [outbox, target]);
  const [pending, setPending] = useState(readPending);
  useEffect(() => {
    setPending(readPending());
    return outbox ? outbox.subscribe(() => setPending(readPending())) : undefined;
  }, [outbox, readPending]);

  const send = useCallback((text) => (bundle && dotId ? sendChatMessage(bundle, { conversationId, dotId, text }) : Promise.resolve(null)), [bundle, dotId, conversationId]);
  const shown = useMemo(() => {
    const unsent = pending.filter((item) => !messages.some((message) => message.clientId === item.clientId));
    return unsent.length ? [...messages, ...unsent] : messages;
  }, [messages, pending]);
  const retry = useCallback((clientId) => (outbox ? outbox.retry(clientId) : Promise.resolve()), [outbox]);
  return { conversation, messages: shown, source, canSend: Boolean(bundle && dotId), send, retry };
}
