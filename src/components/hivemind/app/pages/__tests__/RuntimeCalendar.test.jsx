import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RuntimeCalendar from '../RuntimeCalendar';
import { CalendarUnavailableError } from '../../shared/runtime-calendar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, arg, extra) => {
      const options = typeof arg === 'object' && arg ? arg : { ...(extra || {}), defaultValue: arg };
      return String(options.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (all, name) => (options[name] !== undefined ? options[name] : all));
    },
  }),
}));

let mockRuntimeEnabled = true;
jest.mock('../../shared/runtime-enabled', () => ({ useRuntimeEnabled: () => mockRuntimeEnabled }));
jest.mock('../../shared/runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn() }));
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: ({ agent }) => <span data-testid="avatar" data-agent={agent.id} data-seed={agent.policy_rules?.appearance?.seed || ''} /> }));

/** A Wednesday of the current week, 08:00 local, so the run is always inside the visible week. */
const monday = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
const at = days => new Date(monday.getTime() + days * 86400000).toISOString();
const value = {
  items: [
    { id: 'duty-a', kind: 'duty', title: 'Weekly pipeline check', owner: 'e1', ownerName: 'Faraday', ownerAppearance: { seed: 'faraday' }, label: 'Pipeline check', status: 'active', manageable: true, until: '2026-12-31T22:59:59.999Z', active: true, nextAt: at(2), startsAt: at(2), recurrence: { rule: { kind: 'weekly', days: [3] }, atLocal: '08:00', timeZone: 'UTC' } },
    { id: 'plan-a', kind: 'assignment', title: 'Draft the launch note', owner: 'e2', ownerName: 'Curie', status: 'active', manageable: false, active: true, nextAt: at(3), startsAt: at(3) },
  ],
  occurrences: [{ id: 'duty-a:1', itemId: 'duty-a', at: at(2) }, { id: 'plan-a:1', itemId: 'plan-a', at: at(3) }],
  wakes: [{ id: 'rest', title: 'Runtime rest wake', scheduledAt: at(1), status: 'active' }],
};
const ok = body => jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }));

beforeEach(() => { mockRuntimeEnabled = true; });

test('shows employee-owned repeating duties and booked work, without any Runtime chat mounted', async () => {
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  expect(await screen.findByText('Pipeline check')).toBeInTheDocument();
  expect(screen.getByText('Draft the launch note')).toBeInTheDocument();
  expect(screen.getByText('Faraday')).toBeInTheDocument();
  expect(screen.getByText('Every Wednesday at 08:00 (UTC)')).toBeInTheDocument();
  expect(document.querySelector('[data-calendar-until]').textContent).toMatch(/^Until .*(2026|2027)/);
  expect(screen.getAllByTestId('avatar')[0]).toHaveAttribute('data-seed', 'faraday');
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(screen.getByText('Runtime rest wake')).toBeInTheDocument();
  expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0);
});

test('keeps employee work but drops Runtime wakes while Runtime is switched off', async () => {
  mockRuntimeEnabled = false;
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  expect(await screen.findByText('Pipeline check')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(screen.getByText('Draft the launch note')).toBeInTheDocument();
  expect(screen.queryByText('Runtime rest wake')).toBeNull();
});

test('filters by status and search like the native board', async () => {
  const stopped = { ...value.items[0], id: 'duty-s', label: 'Old check', status: 'stopped', active: false };
  render(<RuntimeCalendar fetcher={ok({ ok: true, value: { ...value, items: [...value.items, stopped] } })} />);
  await screen.findByText('Pipeline check');
  expect(screen.getByText('Old check')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Active' }));
  expect(screen.queryByText('Old check')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Inactive' }));
  expect(screen.getByText('Old check')).toBeInTheDocument();
  expect(screen.getByText('Stopped')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  fireEvent.change(screen.getByLabelText('Search tasks'), { target: { value: 'launch' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

function actionFetcher(calls, { fail = 0 } = {}) {
  return jest.fn((url, init = {}) => {
    if (init.method === 'POST' || init.method === 'DELETE') {
      calls.push([init.method, url]);
      return fail ? Promise.resolve({ ok: false, status: fail, json: () => Promise.resolve({ error: 'x' }) }) : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value }) });
  });
}

test('stops a task after an in-page confirmation, never opening a browser dialog', async () => {
  const calls = []; const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
  render(<RuntimeCalendar fetcher={actionFetcher(calls)} />);
  await screen.findByText('Pipeline check');
  expect(screen.queryByRole('button', { name: /Actions for Draft the launch note/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Pipeline check' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Stop' }));
  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveTextContent('Stop “Pipeline check”?');
  expect(calls).toEqual([]);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stop task' }));
  await waitFor(() => expect(calls).toEqual([['POST', '/api/hivemindHq/calendar/duty-a/stop']]));
  expect(await screen.findByText('Stopped “Pipeline check”.')).toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(confirmSpy).not.toHaveBeenCalled();
  confirmSpy.mockRestore();
});

test('deletes with DELETE, and Cancel or Escape leaves the calendar untouched', async () => {
  const calls = [];
  render(<RuntimeCalendar fetcher={actionFetcher(calls)} />);
  await screen.findByText('Pipeline check');
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Pipeline check' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Pipeline check' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(calls).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Pipeline check' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
  await waitFor(() => expect(calls).toEqual([['DELETE', '/api/hivemindHq/calendar/duty-a']]));
});

test('a refused change keeps the dialog open with a message and changes nothing', async () => {
  const calls = [];
  render(<RuntimeCalendar fetcher={actionFetcher(calls, { fail: 403 })} />);
  await screen.findByText('Pipeline check');
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Pipeline check' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Stop' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop task' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the company administrator can change the calendar.');
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('Pipeline check')).toBeInTheDocument();
});

test('shows a skeleton while loading, the empty state for a company with no entries, and refetches the next week', async () => {
  const fetcher = ok({ ok: true, value: null });
  render(<RuntimeCalendar fetcher={fetcher} />);
  expect(document.querySelector('[data-calendar-loading]')).not.toBeNull();
  expect(await screen.findByText('Nothing is scheduled yet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const [first, second] = fetcher.mock.calls.map(call => new URL(call[0], 'http://x').searchParams.get('from'));
  expect(Number(second) - Number(first)).toBeGreaterThanOrEqual(7 * 86400000 - 3600000);
});

test('offers a retry after a failed read and a plain message where the route is not served', async () => {
  const failing = jest.fn().mockRejectedValueOnce(new Error('calendar_failed')).mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value }) });
  const { unmount } = render(<RuntimeCalendar fetcher={failing} />);
  expect(await screen.findByText('The calendar could not be loaded')).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
  expect(await screen.findByText('Pipeline check')).toBeInTheDocument();
  unmount();
  render(<RuntimeCalendar fetcher={() => Promise.reject(new CalendarUnavailableError())} />);
  expect(await screen.findByText('The calendar isn’t available here yet')).toBeInTheDocument();
});

const localTask = { id: 'local-duty:dot_a:brief', kind: 'duty', title: 'Morning brief', label: 'Morning brief', status: 'active', active: true, manageable: true, local: true, owner: 'Faraday', ownerName: 'Faraday',
  ownerId: 'e1', dutyKey: 'brief', nextAt: at(2), startsAt: at(2), cadence: 'Every day at 08:00 (UTC)' };
const localValue = { items: [localTask], occurrences: [{ id: 'local-duty:dot_a:brief:1', itemId: localTask.id, at: at(2) }], wakes: [] };

test('shows a task OpenDot keeps while Runtime is down, says so, and stops it in OpenDot', async () => {
  const calls = [];
  const fetcher = jest.fn(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({ error: 'open_dot_temporarily_unavailable' }) }));
  const localFetcher = jest.fn((url, init = {}) => {
    if (init.method === 'POST') { calls.push([url, init.body]); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) }); }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: localValue }) });
  });
  render(<RuntimeCalendar fetcher={fetcher} localFetcher={localFetcher} />);
  expect(await screen.findByText('Morning brief')).toBeInTheDocument();
  expect(document.querySelector('[data-calendar-local-only]')).not.toBeNull();
  expect(screen.queryByText('The calendar could not be loaded')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(screen.getByText(/08:00 · Faraday|· Faraday/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'List' }));
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Morning brief' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Stop' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop task' }));
  await waitFor(() => expect(calls).toEqual([['/api/dots/local-duties', JSON.stringify({ action: 'stop', id: localTask.id })]]));
});

test('lists Runtime and OpenDot tasks together without blanking when OpenDot does not answer', async () => {
  const { unmount } = render(<RuntimeCalendar fetcher={ok({ ok: true, value })} localFetcher={ok({ ok: true, value: localValue })} />);
  expect(await screen.findByText('Pipeline check')).toBeInTheDocument();
  expect(screen.getByText('Morning brief')).toBeInTheDocument();
  expect(document.querySelector('[data-calendar-local-only]')).toBeNull();
  unmount();
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} localFetcher={() => Promise.reject(new Error('down'))} />);
  expect(await screen.findByText('Pipeline check')).toBeInTheDocument();
  expect(screen.queryByText('Morning brief')).toBeNull();
});

const dutyRuns = [
  { at: at(-1), outcome: 'done', note: 'Two new leads from Acme.', messageId: 'msg_9', conversationId: 'conv_9' },
  { at: at(-2), outcome: 'missed', note: 'Missed: no server was running at the time and the run was too late to start.', messageId: null, conversationId: null },
  { at: at(-3), outcome: 'skipped', note: 'Paused: this run was skipped.', messageId: null, conversationId: null },
  { at: at(-4), outcome: 'no_change', note: 'Nothing changed.', messageId: 'msg_5', conversationId: 'conv_9' },
  { at: at(-5), outcome: 'blocked', note: 'Send the quote?', messageId: 'msg_4', conversationId: 'conv_9' },
  { at: at(-6), outcome: 'failed', note: 'The run failed.', messageId: null, conversationId: null },
];
function lifecycleFetcher(calls, { paused = false } = {}) {
  let isPaused = paused;
  return jest.fn((url, init = {}) => {
    if (init.method === 'POST') {
      const body = JSON.parse(init.body); calls.push(body.action);
      isPaused = body.action === 'pause';
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, state: isPaused ? 'paused' : 'active' }) });
    }
    if (String(url).includes('history=')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: { id: localTask.id, dotId: 'dot_a', paused: isPaused, runs: dutyRuns } }) });
    const item = isPaused ? { ...localTask, status: 'paused', active: false, paused: true, until: '2026-12-31T22:59:59.999Z' } : { ...localTask, until: '2026-12-31T22:59:59.999Z' };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: { items: [item], occurrences: isPaused ? [] : localValue.occurrences, wakes: [] } }) });
  });
}

test('opens a drawer for a task OpenDot keeps: next run, repeat, end date and its last runs with outcomes and a chat link', async () => {
  const calls = [];
  const localFetcher = lifecycleFetcher(calls);
  render(<RuntimeCalendar fetcher={() => Promise.reject(new Error('down'))} localFetcher={localFetcher} />);
  fireEvent.click(await screen.findByRole('button', { name: /^Morning brief/ }));
  const drawer = await screen.findByRole('dialog', { name: 'Task details' });
  expect(within(drawer).getByText('Next run')).toBeInTheDocument();
  expect(within(drawer).getByText('Every day at 08:00 (UTC)')).toBeInTheDocument();
  expect(drawer.querySelector('[data-calendar-ends]').textContent).toMatch(/2026|2027/);
  const runs = await waitFor(() => { const found = drawer.querySelectorAll('[data-calendar-run]'); expect(found).toHaveLength(6); return found; });
  expect([...runs].map(run => run.getAttribute('data-calendar-run'))).toEqual(['done', 'missed', 'skipped', 'no_change', 'blocked', 'failed']);
  expect(within(drawer).getByText('Two new leads from Acme.')).toBeInTheDocument();
  expect(within(drawer).getAllByRole('link', { name: /Open the chat message/ })[0]).toHaveAttribute('href', '/hivemind/app/employee/dots/dot_a?c=conv_9&m=msg_9');
  expect(within(drawer).getByText('Skipped (paused)')).toBeInTheDocument();
  expect(localFetcher.mock.calls.some(([url]) => String(url) === `/api/dots/local-duties?history=${encodeURIComponent(localTask.id)}`)).toBe(true);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Task details' })).toBeNull();
});

test('Pause keeps the task and Resume brings it back, from the drawer next to Stop and Delete', async () => {
  const calls = [];
  render(<RuntimeCalendar fetcher={() => Promise.reject(new Error('down'))} localFetcher={lifecycleFetcher(calls)} />);
  fireEvent.click(await screen.findByRole('button', { name: /^Morning brief/ }));
  const drawer = await screen.findByRole('dialog', { name: 'Task details' });
  expect(within(drawer).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  expect(within(drawer).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  expect(within(drawer).queryByRole('button', { name: 'Resume' })).toBeNull();
  fireEvent.click(within(drawer).getByRole('button', { name: 'Pause' }));
  expect(await screen.findByText('Paused “Morning brief”. Its runs are skipped until you resume it.')).toBeInTheDocument();
  await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Task details' })).getByRole('button', { name: 'Resume' })).toBeInTheDocument());
  const paused = screen.getByRole('dialog', { name: 'Task details' });
  expect(within(paused).getByText('Next run once resumed')).toBeInTheDocument();
  expect(within(paused).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  fireEvent.click(within(paused).getByRole('button', { name: 'Resume' }));
  expect(await screen.findByText('Resumed “Morning brief”.')).toBeInTheDocument();
  await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Task details' })).getByRole('button', { name: 'Pause' })).toBeInTheDocument());
  expect(calls).toEqual(['pause', 'resume']);
});

test('the row menu offers Pause and Resume for a task OpenDot keeps, and a refusal is shown in the drawer', async () => {
  const calls = [];
  render(<RuntimeCalendar fetcher={() => Promise.reject(new Error('down'))} localFetcher={lifecycleFetcher(calls, { paused: true })} />);
  await screen.findByText('Morning brief');
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Morning brief' }));
  expect(screen.getByRole('menuitem', { name: 'Resume' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Stop' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Pause' })).toBeNull();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Resume' }));
  await waitFor(() => expect(calls).toEqual(['resume']));
});

test('a task Runtime keeps opens a drawer that points to where history is kept and offers no Pause', async () => {
  const localFetcher = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: { items: [], occurrences: [], wakes: [] } }) }));
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} localFetcher={localFetcher} />);
  fireEvent.click(await screen.findByRole('button', { name: /^Pipeline check/ }));
  const drawer = await screen.findByRole('dialog', { name: 'Task details' });
  expect(within(drawer).getByText('History available for duties the employee keeps in HIVEMIND')).toBeInTheDocument();
  expect(within(drawer).queryByRole('button', { name: 'Pause' })).toBeNull();
  expect(within(drawer).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  expect(drawer.querySelectorAll('[data-calendar-run]')).toHaveLength(0);
  expect(localFetcher.mock.calls.some(([url]) => String(url).includes('history='))).toBe(false);
  expect(within(drawer).getByText('Every Wednesday at 08:00 (UTC)')).toBeInTheDocument();
});

test('booked work that is not a scheduled task has no drawer', async () => {
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  await screen.findByText('Draft the launch note');
  expect(screen.queryByRole('button', { name: /^Draft the launch note/ })).toBeNull();
});
