/**
 * One in-app notification model over the two existing feeds: the bell (`/v1/workspace/notifications`) and Needs you cards.
 * Items belong to one company; a feed row that names another company is dropped.
 * @typedef {{ id: string, companyId: string, category: 'needs_you' | 'results' | 'briefs', employee: { id: string, name: string } | null,
 *   title: string, body: string, createdAt: number, read: boolean, deepLink: string,
 *   ref?: { source: 'bell' | 'needs_you', id: string, cardId?: string, dotId?: string, conversationId?: string, employeeId?: string } }} NotificationItem
 */

export const CATEGORIES = ['needs_you', 'results', 'briefs'];
export const NEEDS_YOU_LINK_PREFIX = 'hivemind:needs-you:';
const BRIEF_TYPE = /brief|digest|lifecycle|summary|announcement|report/i;

function time(value) {
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Bell rows of daily briefs, digests and lifecycle reports are Briefs; every other bell row reports a result. */
export function bellCategory(notice) {
  return BRIEF_TYPE.test(String(notice?.type || notice?.data?.kind || '')) ? 'briefs' : 'results';
}

function employeeOf(data, roster) {
  const id = String(data?.employeeId || data?.employee_id || data?.agent_id || data?.agentId || '');
  if (!id) return null;
  const found = (roster || []).find(agent => String(agent?.id).toLowerCase() === id.toLowerCase());
  return { id, name: String(found?.name || data?.employeeName || data?.employee_name || '') };
}

/**
 * @param {{ companyId: string, bell?: object[], needsYou?: object[], roster?: object[] }} feeds - Rows as the bell and Needs you sync entities hold them.
 * @returns {NotificationItem[]} Newest first.
 */
export function deriveNotificationItems({ companyId, bell = [], needsYou = [], roster = [] }) {
  if (!companyId) return [];
  const items = [];
  for (const notice of bell || []) {
    if (!notice?.id) continue;
    const owner = notice.orgId || notice.org_id || notice.companyId || notice.company_id;
    if (owner && owner !== companyId) continue;
    items.push({
      id: `bell:${notice.id}`, companyId, category: bellCategory(notice), employee: employeeOf(notice.data || notice, roster),
      title: String(notice.title || ''), body: String(notice.body || ''), createdAt: time(notice.createdAt ?? notice.created_at),
      read: Boolean(notice.readAt || notice.read_at), deepLink: String(notice.data?.href || notice.href || ''),
      ref: { source: 'bell', id: String(notice.id) },
    });
  }
  for (const card of needsYou || []) {
    if (!card?.id) continue;
    const agent = (roster || []).find(entry => String(entry?.id).toLowerCase() === String(card.employeeId).toLowerCase());
    items.push({
      id: `needs_you:${card.id}`, companyId, category: 'needs_you', employee: { id: String(card.employeeId || ''), name: String(agent?.name || '') },
      title: String(card.title || ''), body: '', createdAt: time(card.createdAt), read: false, deepLink: `${NEEDS_YOU_LINK_PREFIX}${card.id}`,
      ref: { source: 'needs_you', id: String(card.id), employeeId: card.employeeId, cardId: card.id, dotId: card.dotId, conversationId: card.conversationId },
    });
  }
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Items whose id was not in `seen`. The caller seeds `seen` from the first read of each feed so opening the app never banners old items.
 * @param {NotificationItem[]} items - Current items.
 * @param {Set<string>} seen - Ids already known; updated in place.
 * @returns {NotificationItem[]} Arrivals, oldest first.
 */
export function takeArrivals(items, seen) {
  const arrivals = items.filter(item => !seen.has(item.id));
  items.forEach(item => seen.add(item.id));
  return arrivals.filter(item => !item.read).reverse();
}

/**
 * Mark an item read through the existing API. Needs you cards have no read state: they leave the list when answered.
 * @param {NotificationItem} item - Item.
 * @param {{ markWorkspaceNotificationRead: (id: string) => Promise<unknown> }} client - api-client.
 * @returns {Promise<boolean>} Whether the server was asked.
 */
export async function markItemRead(item, client) {
  if (item?.ref?.source !== 'bell' || item.read) return false;
  await client.markWorkspaceNotificationRead(item.ref.id).catch(() => null);
  return true;
}

/**
 * `singulance://app/<path>` (the macOS app's click-through form) becomes the in-app path; other links pass through.
 * @param {string} href - Link as delivered.
 * @returns {string} In-app path or the original link.
 */
export function normalizeDeepLink(href) {
  const match = /^singulance:\/\/app\/(.*)$/i.exec(String(href || ''));
  return match ? `/${match[1].replace(/^\/+/, '')}` : String(href || '');
}
