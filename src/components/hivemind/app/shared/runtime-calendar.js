/**
 * Reads and presents the company calendar kept by Runtime's root session, together with the duties OpenDot keeps itself for employees
 * that booked while Runtime did not answer. The root is only the data owner: the read needs no open Runtime chat and answers while
 * Runtime is switched off, and the OpenDot items are shown even when Runtime cannot be reached.
 */
import { fetchWithRuntimeAdmission } from './runtime-admission';

/** Runner route that serves the calendar between two instants. */
export const CALENDAR_ENDPOINT = '/api/hivemindHq/calendar';
/** OpenDot route that lists, stops and deletes the duties employees keep in OpenDot (same item fields as the Runtime calendar). */
export const LOCAL_DUTIES_ENDPOINT = '/api/dots/local-duties';
/** Id prefix of every item OpenDot keeps; stop and delete for these ids go to OpenDot, not Runtime. */
export const LOCAL_ITEM_PREFIX = 'local-duty:';
const DAY_MS = 86400000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Thrown when this host does not serve the calendar route (404). */
export class CalendarUnavailableError extends Error {
  constructor() { super('calendar_unavailable'); this.name = 'CalendarUnavailableError'; }
}

/**
 * Local Monday 00:00 of the week that holds a date, and the following Monday.
 * @param {number | Date} date - any instant inside the week.
 * @param {number} [offset] - whole weeks to move from that week.
 * @returns {{ from: number, to: number }} epoch milliseconds, `to` exclusive.
 */
export function weekWindow(date = Date.now(), offset = 0) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { from: start.getTime(), to: end.getTime() };
}

/**
 * @param {{ from: number, to: number }} window - the visible range.
 * @returns {string} the calendar route with the range.
 */
export function calendarUrl({ from, to }) {
  return `${CALENDAR_ENDPOINT}?from=${from}&to=${to}`;
}

/**
 * Read the calendar for one range.
 * @param {{ from: number, to: number }} window - the visible range.
 * @param {{ signal?: AbortSignal, fetcher?: typeof fetch }} [options] - cancellation and transport.
 * @returns {Promise<{ sessionId?: string, value: object | null }>} the calendar, or `value: null` when the company has no Runtime root yet.
 * @throws {CalendarUnavailableError} when the route answers 404.
 */
export async function fetchCalendar(window, { signal, fetcher = (...args) => fetchWithRuntimeAdmission(...args) } = {}) {
  const response = await fetcher(calendarUrl(window), { credentials: 'same-origin', cache: 'no-store', signal });
  if (response.status === 404) throw new CalendarUnavailableError();
  if (!response.ok) throw new Error('calendar_failed');
  return response.json();
}

/** @param {unknown} id - calendar item id. @returns {boolean} whether OpenDot, not Runtime, keeps the item. */
export function isLocalItem(id) {
  return typeof id === 'string' && id.startsWith(LOCAL_ITEM_PREFIX);
}

/**
 * Read the duties OpenDot keeps for the window. A failure is not an error: the page then shows Runtime's items only.
 * @param {{ from: number, to: number }} window - the visible range.
 * @param {{ signal?: AbortSignal, fetcher?: typeof fetch }} [options] - cancellation and transport.
 * @returns {Promise<object | null>} the calendar of OpenDot's items, or null when OpenDot did not answer.
 */
export async function fetchLocalCalendar({ from, to }, { signal, fetcher = (...args) => fetchWithRuntimeAdmission(...args) } = {}) {
  try {
    const response = await fetcher(`${LOCAL_DUTIES_ENDPOINT}?from=${from}&to=${to}`, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!response?.ok) return null;
    const body = await response.json();
    return body?.value && Array.isArray(body.value.items) ? body.value : null;
  } catch { return null; /* OpenDot being unreachable or slow only hides its own items */ }
}

/**
 * One calendar from Runtime's and OpenDot's. An OpenDot item Runtime already lists (same duty key and employee, or the id Runtime gives it
 * once it owns the duty) is shown once, as Runtime's.
 * @param {object | null} runtime - Runtime's `value`, or null.
 * @param {object | null} local - OpenDot's `value`, or null.
 * @returns {object | null} the merged `value`; Runtime's own when OpenDot has no items.
 */
export function mergeCalendars(runtime, local) {
  if (!local?.items?.length) return runtime;
  if (!runtime) return local;
  const ids = new Set((runtime.items || []).map(item => item.id));
  const keys = new Set((runtime.items || []).filter(item => item.dutyKey).map(item => `${item.ownerId}\0${item.dutyKey}`));
  const kept = local.items.filter(item => !(item.runtimeItemId && ids.has(item.runtimeItemId)) && !keys.has(`${item.ownerId}\0${item.dutyKey}`));
  const keptIds = new Set(kept.map(item => item.id));
  return {
    ...runtime,
    items: [...(runtime.items || []), ...kept],
    occurrences: [...(runtime.occurrences || []), ...(local.occurrences || []).filter(run => keptIds.has(run.itemId))],
  };
}

/**
 * Read Runtime's calendar and OpenDot's items together. Runtime failing (unreachable, 404, error) does not blank the page while OpenDot has items.
 * @param {{ from: number, to: number }} window - the visible range.
 * @param {{ signal?: AbortSignal, fetcher?: typeof fetch, localFetcher?: typeof fetch }} [options] - cancellation and transports.
 * @returns {Promise<{ sessionId?: string, value: object | null, runtimeDown?: boolean }>} the merged calendar; `runtimeDown` when only OpenDot's items are shown.
 * @throws {CalendarUnavailableError | Error} Runtime's failure when OpenDot has no items to show instead.
 */
export async function fetchMergedCalendar(window, { signal, fetcher, localFetcher } = {}) {
  const [runtime, local] = await Promise.allSettled([
    fetchCalendar(window, { signal, ...(fetcher ? { fetcher } : {}) }),
    fetchLocalCalendar(window, { signal, ...(localFetcher ? { fetcher: localFetcher } : {}) }),
  ]);
  const own = local.status === 'fulfilled' ? local.value : null;
  if (runtime.status === 'fulfilled') return { ...runtime.value, value: mergeCalendars(runtime.value?.value ?? null, own) };
  if (!signal?.aborted && own?.items?.length) return { value: own, runtimeDown: true };
  throw runtime.reason;
}

/**
 * Person-facing owner of an item; an opaque directory id is never shown.
 * @param {{ owner?: string, ownerName?: string }} item - calendar item.
 * @returns {string} the employee's name, `Runtime`, or `Team member` when the roster does not know the owner.
 */
export function ownerLabel(item) {
  if (item?.ownerName) return item.ownerName;
  return item?.owner === 'runtime' ? 'Runtime' : 'Team member';
}

/** Thrown when the runner refuses to stop or delete an item; `code` is the runner's error code and `status` its HTTP status. */
export class CalendarActionError extends Error {
  constructor(code, status) { super(code); this.name = 'CalendarActionError'; this.code = code; this.status = status; }
}

/**
 * Stop an employee-booked repeating task (a task OpenDot keeps is stopped in OpenDot): it stays on the Calendar as stopped, no later run starts, and its employee is told.
 * @param {string} itemId - the calendar item id.
 * @param {{ fetcher?: typeof fetch }} [options] - transport.
 * @returns {Promise<{ ok: true, itemId: string, state: string, notified: boolean }>} the runner's answer.
 * @throws {CalendarActionError} when the runner refuses (404 unknown item, 403 not the administrator, 5xx outage).
 */
export function stopCalendarItem(itemId, { fetcher = (...args) => fetchWithRuntimeAdmission(...args) } = {}) {
  if (isLocalItem(itemId)) return calendarAction(LOCAL_DUTIES_ENDPOINT, 'POST', fetcher, { action: 'stop', id: itemId });
  return calendarAction(`${CALENDAR_ENDPOINT}/${encodeURIComponent(itemId)}/stop`, 'POST', fetcher);
}

/**
 * Delete an employee-booked task (a task OpenDot keeps is deleted in OpenDot): its series stops, it leaves the Calendar, and its employee is told.
 * @param {string} itemId - the calendar item id.
 * @param {{ fetcher?: typeof fetch }} [options] - transport.
 * @returns {Promise<{ ok: true, itemId: string, state: string, notified: boolean }>} the runner's answer.
 * @throws {CalendarActionError} when the runner refuses.
 */
export function deleteCalendarItem(itemId, { fetcher = (...args) => fetchWithRuntimeAdmission(...args) } = {}) {
  if (isLocalItem(itemId)) return calendarAction(LOCAL_DUTIES_ENDPOINT, 'POST', fetcher, { action: 'delete', id: itemId });
  return calendarAction(`${CALENDAR_ENDPOINT}/${encodeURIComponent(itemId)}`, 'DELETE', fetcher);
}

async function calendarAction(url, method, fetcher, body) {
  const response = await fetcher(url, { method, credentials: 'same-origin', cache: 'no-store', ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    let code = 'calendar_action_failed';
    try { const body = await response.json(); if (typeof body?.error === 'string') code = body.error; } catch { /* a non-JSON error page carries no code */ }
    throw new CalendarActionError(code, response.status);
  }
  return response.json();
}

/**
 * @param {{ rule?: object, atLocal?: string, timeZone?: string, stopped?: boolean } | undefined} recurrence - repeat rule of a series.
 * @returns {string} such as `Every Monday at 08:00 (UTC)`, `Every 3 days at 09:30` or `Stopped`; empty for a single item.
 */
export function repeatLabel(recurrence) {
  if (!recurrence?.rule) return '';
  if (recurrence.stopped) return 'Stopped';
  const { rule } = recurrence;
  const at = recurrence.atLocal ? ` at ${recurrence.atLocal}${recurrence.timeZone ? ` (${recurrence.timeZone})` : ''}` : '';
  if (rule.kind === 'every_n_days') return `${rule.n === 1 ? 'Every day' : `Every ${rule.n} days`}${at}`;
  if (rule.kind === 'monthly') return `Monthly on day ${rule.dayOfMonth}${at}`;
  if (rule.kind === 'weekly') {
    const days = [...(rule.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(day => WEEKDAYS[day]).filter(Boolean);
    return `${days.length === 7 ? 'Every day' : days.length ? `Every ${days.join(', ')}` : 'Weekly'}${at}`;
  }
  return '';
}

/**
 * What the Calendar shows for an owner's avatar: the shape `AgentAvatar` reads, with the saved appearance when the runner sent one.
 * @param {{ owner?: string, ownerId?: string, ownerName?: string, ownerAvatarUrl?: string, ownerAppearance?: object }} item - calendar item.
 * @returns {{ id: string, name: string, avatar_url?: string, policy_rules?: { appearance: object } }} the agent for `AgentAvatar`.
 */
export function ownerAgent(item) {
  return {
    id: item?.ownerId || item?.owner || 'unknown',
    name: item?.ownerName || ownerLabel(item),
    ...(item?.ownerAvatarUrl ? { avatar_url: item.ownerAvatarUrl } : {}),
    ...(item?.ownerAppearance ? { policy_rules: { appearance: item.ownerAppearance } } : {}),
  };
}

/** @param {{ label?: string, title?: string }} item - calendar item. @returns {string} the short name for rows: the saved label, else the title. */
export function itemLabel(item) {
  return (item?.label || item?.title || '').trim();
}

/** @param {{ cadence?: string, recurrence?: object }} item - calendar item. @returns {string} the cadence in words; the runner's wording first. */
export function cadenceOf(item) {
  return item?.cadence || repeatLabel(item?.recurrence);
}

const STATUS_LABEL = { active: 'Active', ended: 'Ended', stopped: 'Stopped', done: 'Done' };
/** @param {string} status - runner status. @returns {string} the person-facing status. */
export function statusLabel(status) { return STATUS_LABEL[status] || 'Active'; }

/**
 * @param {{ status?: string, active?: boolean }} item - calendar item.
 * @returns {'active' | 'inactive'} the native board's two states: work ahead, or stopped, ended and done.
 */
export function boardStatus(item) {
  return item?.status ? (item.status === 'active' ? 'active' : 'inactive') : (item?.active ? 'active' : 'inactive');
}

/**
 * Rows for the visible range: every run inside it, plus Runtime's own wakes unless Runtime is off.
 * @param {{ items?: Array<object>, occurrences?: Array<object>, wakes?: Array<object> }} calendar - the route's `value`.
 * @param {{ runtimeEnabled?: boolean }} [options] - whether Runtime's own wakes belong on the page.
 * @returns {Array<object>} sorted by time; each has `id`, `itemId`, `at`, `title`, `label`, `owner` (name), `agent`, `repeat`, `kind`, `active` and `status`.
 */
export function rangeEntries(calendar, { runtimeEnabled = true } = {}) {
  const items = new Map((calendar?.items || []).map(item => [item.id, item]));
  const entries = [];
  for (const run of calendar?.occurrences || []) {
    const item = items.get(run.itemId);
    if (!item) continue;
    entries.push({
      id: run.id, itemId: item.id, at: Date.parse(run.at), title: item.title, label: itemLabel(item), owner: ownerLabel(item), agent: ownerAgent(item),
      repeat: cadenceOf(item), kind: item.kind, active: item.active, status: boardStatus(item),
    });
  }
  // A wake that plans a task is already one of the task's calendar items.
  if (runtimeEnabled) for (const wake of calendar?.wakes || []) {
    if (wake.taskId) continue;
    entries.push({
      id: `wake:${wake.id}`, itemId: null, at: Date.parse(wake.scheduledAt), title: wake.title, label: wake.title, owner: 'Runtime', agent: null,
      repeat: '', kind: 'wake', active: wake.status === 'active', status: wake.status === 'active' ? 'active' : 'inactive',
    });
  }
  return entries.filter(entry => Number.isFinite(entry.at)).sort((a, b) => a.at - b.at);
}

/**
 * @param {Array<{ at: number }>} entries - rows of one range.
 * @param {{ from: number }} window - the visible range.
 * @returns {Array<{ day: number, entries: Array<object> }>} seven local days from the range start, empty days included.
 */
export function groupByDay(entries, window) {
  return Array.from({ length: 7 }, (unused, index) => {
    const start = new Date(window.from);
    start.setDate(start.getDate() + index);
    const day = start.getTime();
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { day, entries: entries.filter(entry => entry.at >= day && entry.at < end.getTime()) };
  });
}

/**
 * The list view's rows, like the native Automation board: one row per calendar item, work ahead first.
 * @param {{ items?: Array<object> }} calendar - the route's `value`.
 * @param {{ status?: 'all' | 'active' | 'inactive', query?: string }} [filter] - the board's status tabs and search box.
 * @returns {Array<object>} rows with `id`, `at` (next run), `title`, `label`, `owner`, `agent`, `repeat`, `kind`, `status`, `statusText`, `until` and `manageable`.
 */
export function boardRows(calendar, { status = 'all', query = '' } = {}) {
  const needle = query.trim().toLowerCase();
  return (calendar?.items || []).map(item => ({
    id: item.id, at: Date.parse(item.nextAt), title: item.title, label: itemLabel(item), owner: ownerLabel(item), agent: ownerAgent(item), repeat: cadenceOf(item),
    kind: item.kind, status: boardStatus(item), statusText: statusLabel(item.status || (item.active ? 'active' : 'ended')), until: item.until || '', manageable: item.manageable === true,
  })).filter(row => (status === 'all' || row.status === status)
    && (!needle || `${row.label} ${row.title} ${row.owner} ${row.repeat}`.toLowerCase().includes(needle)))
    .sort((a, b) => (a.status === b.status ? a.at - b.at : a.status === 'active' ? -1 : 1));
}

/**
 * @param {number} at - next run, epoch milliseconds.
 * @param {number} [now] - the current time.
 * @returns {{ absolute: string, relative: string }} the run's local date and time, and how far away it is (`in 3 d`, `in 2 h`, `in 10 min`, `now`).
 */
export function nextRunText(at, now = Date.now()) {
  const absolute = new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const minutes = Math.round((at - now) / 60000);
  const relative = minutes <= 0 ? 'now' : minutes < 60 ? `in ${minutes} min` : minutes < 1440 ? `in ${Math.round(minutes / 60)} h` : `in ${Math.round(minutes / 1440)} d`;
  return { absolute, relative };
}

export { DAY_MS };
