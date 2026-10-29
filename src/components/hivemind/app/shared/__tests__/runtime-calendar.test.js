import { CALENDAR_ENDPOINT, CalendarUnavailableError, calendarUrl, fetchCalendar, groupByDay, ownerLabel, rangeEntries, repeatLabel, upcomingItems, weekWindow } from '../runtime-calendar';

jest.mock('../runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn() }));

const duty = { id: 'duty-a', kind: 'duty', title: 'Weekly pipeline check', owner: 'e1', ownerName: 'Faraday', active: true, nextAt: '2026-11-02T08:00:00.000Z',
  recurrence: { rule: { kind: 'weekly', days: [3, 1] }, atLocal: '08:00', timeZone: 'UTC' } };
const booked = { id: 'plan-a', kind: 'assignment', title: 'Draft the launch note', owner: 'e2', active: true, nextAt: '2026-11-04T09:00:00.000Z' };
const calendar = {
  items: [duty, booked],
  occurrences: [{ id: 'duty-a:2', itemId: 'duty-a', at: '2026-11-04T08:00:00.000Z' }, { id: 'plan-a:1', itemId: 'plan-a', at: '2026-11-04T09:00:00.000Z' }, { id: 'x', itemId: 'gone', at: '2026-11-04T10:00:00.000Z' }],
  wakes: [{ id: 'rest', title: 'Rest', scheduledAt: '2026-11-03T07:00:00.000Z', status: 'active' }, { id: 'task-wake', title: 'Planned', scheduledAt: '2026-11-03T07:30:00.000Z', status: 'active', taskId: 'task-1' }],
};

test('weekWindow spans Monday to the next Monday in local time and moves by whole weeks', () => {
  const { from, to } = weekWindow(new Date(2026, 9, 29, 15, 30).getTime());
  expect(new Date(from)).toEqual(new Date(2026, 9, 26, 0, 0));
  expect(new Date(to)).toEqual(new Date(2026, 10, 2, 0, 0));
  expect(weekWindow(new Date(2026, 9, 29).getTime(), 1).from).toBe(to);
  expect(new Date(weekWindow(new Date(2026, 10, 1, 12).getTime()).from)).toEqual(new Date(2026, 9, 26));
});

test('repeatLabel reads each rule kind and never invents text for a single item', () => {
  expect(repeatLabel(duty.recurrence)).toBe('Every Monday, Wednesday at 08:00 (UTC)');
  expect(repeatLabel({ rule: { kind: 'every_n_days', n: 3 }, atLocal: '09:30' })).toBe('Every 3 days at 09:30');
  expect(repeatLabel({ rule: { kind: 'every_n_days', n: 1 }, atLocal: '09:30' })).toBe('Every day at 09:30');
  expect(repeatLabel({ rule: { kind: 'monthly', dayOfMonth: 5 }, atLocal: '10:00' })).toBe('Monthly on day 5 at 10:00');
  expect(repeatLabel({ rule: { kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] }, atLocal: '07:00' })).toBe('Every day at 07:00');
  expect(repeatLabel({ ...duty.recurrence, stopped: true })).toBe('Stopped');
  expect(repeatLabel(undefined)).toBe('');
});

test('ownerLabel shows a name, Runtime, or a neutral label and never an id', () => {
  expect(ownerLabel(duty)).toBe('Faraday');
  expect(ownerLabel({ owner: 'runtime' })).toBe('Runtime');
  expect(ownerLabel(booked)).toBe('Team member');
});

test('rangeEntries lists runs by time, skips orphan runs and task-bound wakes, and drops Runtime wakes when Runtime is off', () => {
  const on = rangeEntries(calendar);
  expect(on.map(entry => [entry.title, entry.owner, entry.kind])).toEqual([
    ['Rest', 'Runtime', 'wake'], ['Weekly pipeline check', 'Faraday', 'duty'], ['Draft the launch note', 'Team member', 'assignment']]);
  expect(on[1].repeat).toBe('Every Monday, Wednesday at 08:00 (UTC)');
  expect(rangeEntries(calendar, { runtimeEnabled: false }).map(entry => entry.title)).toEqual(['Weekly pipeline check', 'Draft the launch note']);
  expect(rangeEntries(null)).toEqual([]);
});

test('groupByDay returns seven local days with each run on its own day, and upcomingItems orders active work by next run', () => {
  const window = weekWindow(Date.parse('2026-11-04T12:00:00'));
  const days = groupByDay(rangeEntries(calendar, { runtimeEnabled: false }), window);
  expect(days).toHaveLength(7);
  expect(days.flatMap(day => day.entries)).toHaveLength(2);
  expect(upcomingItems({ items: [booked, { ...duty, active: false }, duty] }).map(entry => entry.title)).toEqual(['Weekly pipeline check', 'Draft the launch note']);
});

test('fetchCalendar reads the runner route with the range and maps 404 to unavailable', async () => {
  const window = { from: 10, to: 20 };
  expect(calendarUrl(window)).toBe(`${CALENDAR_ENDPOINT}?from=10&to=20`);
  const fetcher = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: null }) }));
  await expect(fetchCalendar(window, { fetcher })).resolves.toEqual({ ok: true, value: null });
  expect(fetcher).toHaveBeenCalledWith('/api/hivemindHq/calendar?from=10&to=20', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }));
  await expect(fetchCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 404 }) })).rejects.toBeInstanceOf(CalendarUnavailableError);
  await expect(fetchCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 503 }) })).rejects.toThrow('calendar_failed');
});
