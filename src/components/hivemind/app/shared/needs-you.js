import { postOpenDotFocusCard } from './open-dot-frames';
import { fetchRuntime } from './runtime-admission';

const KINDS = new Set(['approval', 'question', 'secure', 'connect', 'schedule']);
const CARD_ID = /^(?:msg|card)_[A-Za-z0-9_-]{1,160}$/;

/**
 * Employees the server reports as waiting for the person: the same `agent.state === 'waiting'` rows that give the roster its
 * "Waiting for you" chip. The badge counts these employees, so it always agrees with the roster.
 * @param {Array<{ id?: string, serverStatus?: boolean, status?: string }>} rooms - Sidebar room rows.
 * @returns {string[]} Sorted unique employee ids.
 */
export function waitingEmployeeIds(rooms) {
  return [...new Set((rooms || []).filter(room => room?.serverStatus === true && room.status === 'waiting' && typeof room.id === 'string').map(room => room.id))].sort();
}

/**
 * Keep only well-formed entries of the `/api/hivemind/needs-you` answer, newest first.
 * @param {unknown} body - Parsed JSON.
 * @returns {Array<{ id: string, employeeId: string, dotId: string, conversationId: string, createdAt: number, kind: string, title: string, quickApprove: boolean }>} Entries.
 */
export function parseNeedsYou(body) {
  if (!body || body.version !== 1 || !Array.isArray(body.cards)) return [];
  return body.cards.map(needsYouCard).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * One well-formed card, or null. A feed entry keeps its `revision` so a newer copy replaces an older one.
 * @param {object} card - Entry of the plain answer or the changes-since feed.
 * @returns {object|null} Card.
 */
function needsYouCard(card) {
  if (!(card && CARD_ID.test(String(card.id)) && typeof card.employeeId === 'string' && typeof card.dotId === 'string' && typeof card.conversationId === 'string' && KINDS.has(card.kind))) return null;
  return { id: card.id, employeeId: card.employeeId, dotId: card.dotId, conversationId: card.conversationId, createdAt: Number(card.createdAt) || 0,
    kind: card.kind, title: String(card.title || '').slice(0, 200), quickApprove: card.kind === 'approval' && card.quickApprove === true,
    ...(typeof card.revision === 'string' ? { revision: card.revision } : {}) };
}

/**
 * Turn the changes-since answer (or the plain answer of a server without the feed) into engine items and removals:
 * `pending` cards stay, `resolved` ones (answered, or their employee paused or archived) are removed.
 * @param {{ items: object[], deletes: string[], cursor: unknown, replace: boolean }} page - Page from `readSinceFeed`.
 * @returns {{ items: object[], deletes: string[], cursor: unknown, replace: boolean }} Page with well-formed pending cards only.
 */
export function needsYouFeedPage(page) {
  const deletes = [...page.deletes];
  const items = [];
  for (const row of page.items) {
    if (row?.state === 'resolved') { if (row.id) deletes.push(String(row.id)); continue; }
    const card = needsYouCard(row);
    if (card) items.push(card);
  }
  return { ...page, items, deletes };
}

/**
 * One request of the Needs you feed.
 * @param {string} since - Cursor, or `start` for everything.
 * @param {{ signal?: AbortSignal }} [context] - Cancels the read.
 * @returns {Promise<object>} Parsed body: `{ items, deleted, next_cursor, has_more }`, or the plain `{ version: 1, cards }` from a server without the feed.
 * @throws When the server cannot answer.
 */
export async function fetchNeedsYouPage(since, { signal } = {}) {
  const response = await fetchRuntime(`/api/hivemind/needs-you?since=${encodeURIComponent(since)}&limit=200`, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Needs you unavailable');
  return response.json();
}

/**
 * Read every pending card across the company's employees.
 * @param {AbortSignal} [signal] - Cancels the read.
 * @returns {Promise<ReturnType<typeof parseNeedsYou>>} Entries.
 * @throws When the server cannot answer.
 */
export async function fetchNeedsYou(signal) {
  const response = await fetchRuntime('/api/hivemind/needs-you', { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Needs you unavailable');
  return parseNeedsYou(await response.json());
}

/**
 * Answer one card through the same route the room uses.
 * @param {string} cardId - Card message id.
 * @param {'approve' | 'deny'} choice - The person's decision.
 * @returns {Promise<boolean>} Whether the server recorded it.
 */
export async function answerNeedsYouCard(cardId, choice) {
  if (!CARD_ID.test(cardId) || (choice !== 'approve' && choice !== 'deny')) return false;
  try {
    const response = await fetchRuntime(`/api/cards/${encodeURIComponent(cardId)}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice }) });
    const body = await response.json().catch(() => null);
    return response.ok && body?.ok === true;
  } catch { return false; }
}

/**
 * Ask the open room to show a card. The employee's room may still be loading, so the request repeats for a few seconds.
 * @param {{ id: string, dotId: string, conversationId: string }} card - Entry to show.
 * @returns {() => void} Cancels the remaining repeats.
 */
export function focusCardInRoom(card) {
  const timers = [0, 500, 1200, 2500, 4500, 7000].map(delay => setTimeout(() => postOpenDotFocusCard({ cardId: card.id, dotId: card.dotId, conversationId: card.conversationId }), delay));
  return () => timers.forEach(clearTimeout);
}
