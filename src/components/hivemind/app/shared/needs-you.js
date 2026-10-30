import { postOpenDotFocusCard } from './open-dot-frames';

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
  return body.cards
    .filter(card => card && CARD_ID.test(String(card.id)) && typeof card.employeeId === 'string' && typeof card.dotId === 'string' && typeof card.conversationId === 'string' && KINDS.has(card.kind))
    .map(card => ({ id: card.id, employeeId: card.employeeId, dotId: card.dotId, conversationId: card.conversationId, createdAt: Number(card.createdAt) || 0,
      kind: card.kind, title: String(card.title || '').slice(0, 200), quickApprove: card.kind === 'approval' && card.quickApprove === true }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Read every pending card across the company's employees.
 * @param {AbortSignal} [signal] - Cancels the read.
 * @returns {Promise<ReturnType<typeof parseNeedsYou>>} Entries.
 * @throws When the server cannot answer.
 */
export async function fetchNeedsYou(signal) {
  const response = await fetch('/api/hivemind/needs-you', { credentials: 'same-origin', cache: 'no-store', signal });
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
    const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
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
