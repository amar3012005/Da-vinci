import { LOCAL_DUTIES_ENDPOINT, fetchLocalCalendar, fetchMergedCalendar, isLocalItem, mergeCalendars, CALENDAR_ENDPOINT, CalendarActionError, CalendarUnavailableError, boardRows, calendarUrl, deleteCalendarItem, fetchCalendar, groupByDay, nextRunText, ownerAgent, ownerLabel, rangeEntries, repeatLabel, stopCalendarItem, weekWindow, pauseCalendarItem, resumeCalendarItem, fetchDutyHistory, runMessageHref } from '../runtime-calendar';

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
  expect(boardRows({ items: [booked, { ...duty, active: false }, duty] }, { status: 'active' }).map(row => row.title)).toEqual(['Weekly pipeline check', 'Draft the launch note']);
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

const task = { ...duty, id: 'duty-b', label: 'Website check', status: 'active', manageable: true, cadence: 'Every day at 09:00 (Europe/Berlin)', until: '2026-12-31T22:59:59.999Z',
  ownerId: 'e1', ownerAvatarUrl: 'https://cdn.example/f.png', ownerAppearance: { seed: 'faraday' } };

test('ownerAgent gives AgentAvatar the saved appearance and never an id as the name', () => {
  expect(ownerAgent(task)).toEqual({ id: 'e1', name: 'Faraday', avatar_url: 'https://cdn.example/f.png', policy_rules: { appearance: { seed: 'faraday' } } });
  expect(ownerAgent(booked)).toEqual({ id: 'e2', name: 'Team member' });
});

test('boardRows filters by status and search, lists work ahead first, and carries label, until and manageability', () => {
  const stopped = { ...task, id: 'duty-c', label: 'Old check', status: 'stopped', active: false, nextAt: '2026-10-01T09:00:00.000Z' };
  const rows = boardRows({ items: [stopped, task, booked] });
  expect(rows.map(row => row.id)).toEqual(['duty-b', 'plan-a', 'duty-c']);
  expect(rows[0]).toMatchObject({ label: 'Website check', repeat: 'Every day at 09:00 (Europe/Berlin)', until: task.until, manageable: true, status: 'active' });
  expect(rows[1].manageable).toBe(false);
  expect(boardRows({ items: [stopped, task, booked] }, { status: 'inactive' }).map(row => row.id)).toEqual(['duty-c']);
  expect(boardRows({ items: [stopped, task, booked] }, { query: ' WEBSITE ' }).map(row => row.id)).toEqual(['duty-b']);
});

test('nextRunText says how far away a run is', () => {
  const now = Date.parse('2026-11-02T08:00:00Z');
  expect(nextRunText(now + 10 * 60000, now).relative).toBe('in 10 min');
  expect(nextRunText(now + 3 * 3600000, now).relative).toBe('in 3 h');
  expect(nextRunText(now + 2 * 86400000, now).relative).toBe('in 2 d');
  expect(nextRunText(now - 1000, now).relative).toBe('now');
});

test('stop posts to .../stop and delete uses DELETE; a refusal carries the runner code and status', async () => {
  const fetcher = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, state: 'stopped' }) }));
  await stopCalendarItem('duty b', { fetcher });
  expect(fetcher).toHaveBeenLastCalledWith('/api/hivemindHq/calendar/duty%20b/stop', expect.objectContaining({ method: 'POST', credentials: 'same-origin' }));
  await deleteCalendarItem('duty-b', { fetcher });
  expect(fetcher).toHaveBeenLastCalledWith('/api/hivemindHq/calendar/duty-b', expect.objectContaining({ method: 'DELETE' }));
  const refused = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'calendar_item_not_found' }) }));
  await expect(stopCalendarItem('x', { fetcher: refused })).rejects.toMatchObject({ code: 'calendar_item_not_found', status: 404 });
  const page = jest.fn(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) }));
  await expect(deleteCalendarItem('x', { fetcher: page })).rejects.toBeInstanceOf(CalendarActionError);
});

const localItem = { id: 'local-duty:dot_a:brief', kind: 'duty', title: 'Morning brief', label: 'Morning brief', status: 'active', active: true, manageable: true, local: true, owner: 'Faraday', ownerName: 'Faraday',
  ownerId: 'e1', dutyKey: 'brief', runtimeItemId: 'duty-abc', nextAt: '2026-11-03T08:00:00.000Z', cadence: 'Every day at 08:00 (UTC)' };
const localValue = { items: [localItem], occurrences: [{ id: 'local-duty:dot_a:brief:1', itemId: localItem.id, at: localItem.nextAt }], wakes: [] };
const response = value => ({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value }) });

test('mergeCalendars lists OpenDot items beside Runtime items and shows a duty once when Runtime already owns it', () => {
  const merged = mergeCalendars(calendar, localValue);
  expect(merged.items.map(item => item.id)).toEqual(['duty-a', 'plan-a', 'local-duty:dot_a:brief']);
  expect(merged.occurrences.some(run => run.itemId === localItem.id)).toBe(true);
  expect(merged.wakes).toBe(calendar.wakes);
  // Runtime lists the same duty under the id it gives a handed-over duty, so the OpenDot copy is dropped with its runs.
  const handed = mergeCalendars({ ...calendar, items: [...calendar.items, { id: 'duty-abc', kind: 'duty', title: 'Morning brief', owner: 'e1', active: true, nextAt: localItem.nextAt }] }, localValue);
  expect(handed.items.filter(item => item.title === 'Morning brief')).toHaveLength(1);
  expect(handed.occurrences.some(run => run.itemId === localItem.id)).toBe(false);
  // By duty key and employee when Runtime sends the key.
  const keyed = mergeCalendars({ ...calendar, items: [{ id: 'other-id', dutyKey: 'brief', ownerId: 'e1', owner: 'e1' }] }, localValue);
  expect(keyed.items.map(item => item.id)).toEqual(['other-id']);
  expect(mergeCalendars(calendar, { items: [] })).toBe(calendar);
  expect(mergeCalendars(null, localValue)).toBe(localValue);
});

test('fetchLocalCalendar reads the OpenDot route and treats any failure as no items', async () => {
  const window = { from: 1, to: 2 };
  const fetcher = jest.fn(() => Promise.resolve(response(localValue)));
  await expect(fetchLocalCalendar(window, { fetcher })).resolves.toEqual(localValue);
  expect(fetcher).toHaveBeenCalledWith(`${LOCAL_DUTIES_ENDPOINT}?from=1&to=2`, expect.objectContaining({ credentials: 'same-origin' }));
  await expect(fetchLocalCalendar(window, { fetcher: () => Promise.reject(new Error('down')) })).resolves.toBeNull();
  await expect(fetchLocalCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 502 }) })).resolves.toBeNull();
  await expect(fetchLocalCalendar(window, { fetcher: () => Promise.resolve(undefined) })).resolves.toBeNull();
});

test('fetchMergedCalendar shows OpenDot items when Runtime fails or has no root, and still fails when nothing is left to show', async () => {
  const window = { from: 1, to: 2 };
  const local = () => Promise.resolve(response(localValue));
  const down = () => Promise.resolve({ ok: false, status: 502 });
  await expect(fetchMergedCalendar(window, { fetcher: down, localFetcher: local })).resolves.toEqual({ value: localValue, runtimeDown: true });
  await expect(fetchMergedCalendar(window, { fetcher: () => Promise.reject(new TypeError('Failed to fetch')), localFetcher: local })).resolves.toMatchObject({ runtimeDown: true });
  await expect(fetchMergedCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 404 }), localFetcher: local })).resolves.toMatchObject({ runtimeDown: true });
  const noRoot = await fetchMergedCalendar(window, { fetcher: () => Promise.resolve(response(null)), localFetcher: local });
  expect(noRoot.value).toBe(localValue);
  expect(noRoot.runtimeDown).toBeUndefined();
  await expect(fetchMergedCalendar(window, { fetcher: down, localFetcher: () => Promise.reject(new Error('x')) })).rejects.toThrow('calendar_failed');
  await expect(fetchMergedCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 404 }), localFetcher: () => Promise.resolve(response({ items: [] })) })).rejects.toBeInstanceOf(CalendarUnavailableError);
  const merged = await fetchMergedCalendar(window, { fetcher: () => Promise.resolve(response(calendar)), localFetcher: local });
  expect(merged.value.items).toHaveLength(3);
});

test('fetchMergedCalendar shows OpenDot\'s calendar, even empty, when Runtime refuses the session', async () => {
  const window = { from: 1, to: 2 };
  const empty = { items: [], occurrences: [] };
  await expect(fetchMergedCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 401 }), localFetcher: () => Promise.resolve(response(empty)) })).resolves.toEqual({ value: empty });
  await expect(fetchMergedCalendar(window, { fetcher: () => Promise.resolve({ ok: false, status: 401 }), localFetcher: () => Promise.reject(new Error('x')) })).rejects.toThrow('calendar_failed');
});

test('stop and delete of an OpenDot item go to OpenDot, those of a Runtime item to Runtime', async () => {
  expect(isLocalItem(localItem.id)).toBe(true);
  expect(isLocalItem('duty-a')).toBe(false);
  const fetcher = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) }));
  await stopCalendarItem(localItem.id, { fetcher });
  await deleteCalendarItem(localItem.id, { fetcher });
  expect(fetcher).toHaveBeenNthCalledWith(1, LOCAL_DUTIES_ENDPOINT, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'stop', id: localItem.id }) }));
  expect(fetcher).toHaveBeenNthCalledWith(2, LOCAL_DUTIES_ENDPOINT, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'delete', id: localItem.id }) }));
  await stopCalendarItem('duty-a', { fetcher });
  expect(fetcher).toHaveBeenLastCalledWith('/api/hivemindHq/calendar/duty-a/stop', expect.objectContaining({ method: 'POST' }));
});

test('pause and resume go to OpenDot only, and the history is read per item with the run message link', async () => {
  const fetcher = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: { id: localItem.id, dotId: 'dot_a', paused: false, runs: [{ at: '2026-11-02T08:00:00.000Z', outcome: 'done', note: 'Two leads.', messageId: 'msg_1', conversationId: 'conv_1' }] } }) }));
  await pauseCalendarItem(localItem.id, { fetcher });
  await resumeCalendarItem(localItem.id, { fetcher });
  expect(fetcher).toHaveBeenNthCalledWith(1, LOCAL_DUTIES_ENDPOINT, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'pause', id: localItem.id }) }));
  expect(fetcher).toHaveBeenNthCalledWith(2, LOCAL_DUTIES_ENDPOINT, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'resume', id: localItem.id }) }));
  const history = await fetchDutyHistory(localItem.id, { fetcher });
  expect(fetcher).toHaveBeenLastCalledWith(`${LOCAL_DUTIES_ENDPOINT}?history=${encodeURIComponent(localItem.id)}`, expect.objectContaining({ cache: 'no-store' }));
  expect(history.runs[0].outcome).toBe('done');
  expect(runMessageHref(history.dotId, history.runs[0])).toBe('/hivemind/app/employee/dots/dot_a?c=conv_1&m=msg_1');
  expect(runMessageHref('dot_a', { conversationId: null })).toBeNull();
  await expect(fetchDutyHistory(localItem.id, { fetcher: () => Promise.resolve({ ok: false, status: 404 }) })).rejects.toThrow('duty_history_failed');
  await expect(fetchDutyHistory(localItem.id, { fetcher: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }) })).rejects.toThrow('duty_history_failed');
  await expect(pauseCalendarItem(localItem.id, { fetcher: () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'calendar_item_not_found' }) }) })).rejects.toMatchObject({ code: 'calendar_item_not_found', status: 404 });
});

test('a paused item is inactive with its own state, and rows say whether OpenDot keeps them', () => {
  const paused = { ...localItem, status: 'paused', active: false, paused: true };
  const [row] = boardRows({ items: [paused] });
  expect([row.status, row.state, row.statusText, row.local, row.dotId]).toEqual(['inactive', 'paused', 'Paused', true, paused.dotId || '']);
  expect(boardRows({ items: [duty] })[0].local).toBe(false);
});
