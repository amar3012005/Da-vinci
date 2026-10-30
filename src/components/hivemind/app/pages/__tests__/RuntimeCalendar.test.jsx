import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RuntimeCalendar from '../RuntimeCalendar';
import { CalendarUnavailableError } from '../../shared/runtime-calendar';

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
