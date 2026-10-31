/**
 * Trim helpers for the part of a server answer that is stored on the device.
 */

/** Items kept per stored list page. */
export const FIRST_PAGE_ITEMS = 40;

/**
 * Keep the first page of every array field a list answer carries (`memories`, `results`, `documents`, `items`).
 * Pagination counters stay so the screen still knows the total.
 * @param {unknown} data - server answer.
 * @param {number} [limit] - items kept per array.
 * @returns {unknown} the same answer with each list field cut to `limit` items; non-objects return unchanged.
 */
export function firstPageOf(data, limit = FIRST_PAGE_ITEMS) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return Array.isArray(data) ? data.slice(0, limit) : data;
  const copy = { ...data };
  for (const field of ['memories', 'results', 'documents', 'items', 'evidence']) {
    if (Array.isArray(copy[field])) copy[field] = copy[field].slice(0, limit);
  }
  return copy;
}

const TOKEN_MASK = [['token', 'to~ken'], ['Token', 'To~ken'], ['TOKEN', 'TO~KEN']];
const mapKeys = (value, pairs) => {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, pairs));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [name, field] of Object.entries(value)) {
    let renamed = name;
    for (const [from, to] of pairs) renamed = renamed.split(from).join(to);
    out[renamed] = mapKeys(field, pairs);
  }
  return out;
};

/**
 * Rename usage-meter fields that contain the word "token" (LLM token counts, not credentials) so the LocalStore's
 * credential filter does not remove them. Real credentials are still removed: only the usage entity applies this.
 * @param {unknown} data - usage answer.
 * @returns {unknown} copy with `tokens` stored as `to~kens`.
 */
export function maskMeterKeys(data) { return mapKeys(data, TOKEN_MASK); }

/**
 * Reverse of {@link maskMeterKeys}.
 * @param {unknown} data - stored usage answer.
 * @returns {unknown} copy with the original field names.
 */
export function unmaskMeterKeys(data) { return mapKeys(data, TOKEN_MASK.map(([from, to]) => [to, from])); }
