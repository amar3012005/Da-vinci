/**
 * Reads and presents the company calendar kept by Runtime's root session.
 * The root is only the data owner: the read needs no open Runtime chat and answers while Runtime is switched off.
 */
import { fetchWithRuntimeAdmission } from './runtime-admission';

/** Runner route that serves the calendar between two instants. */
export const CALENDAR_ENDPOINT = '/api/hivemindHq/calendar';
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

/**
 * Person-facing owner of an item; an opaque directory id is never shown.
 * @param {{ owner?: string, ownerName?: string }} item - calendar item.
 * @returns {string} the employee's name, `Runtime`, or `Team member` when the roster does not know the owner.
 */
export function ownerLabel(item) {
  if (item?.ownerName) return item.ownerName;
  return item?.owner === 'runtime' ? 'Runtime' : 'Team member';
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
 * Rows for the visible range: every run inside it, plus Runtime's own wakes unless Runtime is off.
 * @param {{ items?: Array<object>, occurrences?: Array<object>, wakes?: Array<object> }} calendar - the route's `value`.
 * @param {{ runtimeEnabled?: boolean }} [options] - whether Runtime's own wakes belong on the page.
 * @returns {Array<{ id: string, at: number, title: string, owner: string, repeat: string, kind: string, active: boolean }>} sorted by time.
 */
export function rangeEntries(calendar, { runtimeEnabled = true } = {}) {
  const items = new Map((calendar?.items || []).map(item => [item.id, item]));
  const entries = [];
  for (const run of calendar?.occurrences || []) {
    const item = items.get(run.itemId);
    if (!item) continue;
    entries.push({ id: run.id, at: Date.parse(run.at), title: item.title, owner: ownerLabel(item), repeat: repeatLabel(item.recurrence), kind: item.kind, active: item.active });
  }
  // A wake that plans a task is already one of the task's calendar items.
  if (runtimeEnabled) for (const wake of calendar?.wakes || []) {
    if (wake.taskId) continue;
    entries.push({ id: `wake:${wake.id}`, at: Date.parse(wake.scheduledAt), title: wake.title, owner: 'Runtime', repeat: '', kind: 'wake', active: wake.status === 'active' });
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
 * Items that still have work ahead, soonest first, for the "Duties and booked work" list.
 * @param {{ items?: Array<object> }} calendar - the route's `value`.
 * @returns {Array<{ id: string, at: number, title: string, owner: string, repeat: string, kind: string, active: boolean }>} active items by next run.
 */
export function upcomingItems(calendar) {
  return (calendar?.items || []).filter(item => item.active).map(item => ({
    id: item.id, at: Date.parse(item.nextAt), title: item.title, owner: ownerLabel(item), repeat: repeatLabel(item.recurrence), kind: item.kind, active: true,
  })).filter(entry => Number.isFinite(entry.at)).sort((a, b) => a.at - b.at);
}

export { DAY_MS };
