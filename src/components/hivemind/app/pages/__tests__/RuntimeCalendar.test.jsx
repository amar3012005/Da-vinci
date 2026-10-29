import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RuntimeCalendar from '../RuntimeCalendar';
import { CalendarUnavailableError } from '../../shared/runtime-calendar';

let mockRuntimeEnabled = true;
jest.mock('../../shared/runtime-enabled', () => ({ useRuntimeEnabled: () => mockRuntimeEnabled }));
jest.mock('../../shared/runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn() }));

/** A Wednesday of the current week, 08:00 local, so the run is always inside the visible week. */
const monday = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
const at = days => new Date(monday.getTime() + days * 86400000).toISOString();
const value = {
  items: [
    { id: 'duty-a', kind: 'duty', title: 'Weekly pipeline check', owner: 'e1', ownerName: 'Faraday', active: true, nextAt: at(2), startsAt: at(2), recurrence: { rule: { kind: 'weekly', days: [3] }, atLocal: '08:00', timeZone: 'UTC' } },
    { id: 'plan-a', kind: 'assignment', title: 'Draft the launch note', owner: 'e2', ownerName: 'Curie', active: true, nextAt: at(3), startsAt: at(3) },
  ],
  occurrences: [{ id: 'duty-a:1', itemId: 'duty-a', at: at(2) }, { id: 'plan-a:1', itemId: 'plan-a', at: at(3) }],
  wakes: [{ id: 'rest', title: 'Runtime rest wake', scheduledAt: at(1), status: 'active' }],
};
const ok = body => jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }));

beforeEach(() => { mockRuntimeEnabled = true; });

test('shows employee-owned repeating duties and booked work, without any Runtime chat mounted', async () => {
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  expect(await screen.findByText('Weekly pipeline check')).toBeInTheDocument();
  expect(screen.getByText('Draft the launch note')).toBeInTheDocument();
  expect(screen.getByText(/Faraday · Repeating duty/)).toBeInTheDocument();
  expect(screen.getByText(/Curie · Booked work/)).toBeInTheDocument();
  expect(screen.getByText('Every Wednesday at 08:00 (UTC)')).toBeInTheDocument();
  expect(screen.getByText('Runtime rest wake')).toBeInTheDocument();
  expect(document.querySelector('[disabled]')).toBeNull();
});

test('keeps employee work but drops Runtime wakes while Runtime is switched off', async () => {
  mockRuntimeEnabled = false;
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  expect(await screen.findByText('Weekly pipeline check')).toBeInTheDocument();
  expect(screen.queryByText('Runtime rest wake')).toBeNull();
});

test('lists duties and booked work with their next run in the second view', async () => {
  render(<RuntimeCalendar fetcher={ok({ ok: true, value })} />);
  await screen.findByText('Weekly pipeline check');
  fireEvent.click(screen.getByRole('button', { name: 'Duties and booked work' }));
  const list = document.querySelector('[data-calendar-duties]');
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
});

test('shows a skeleton while loading, the empty state for a company with no entries, and refetches the next week', async () => {
  const fetcher = ok({ ok: true, value: null });
  render(<RuntimeCalendar fetcher={fetcher} />);
  expect(document.querySelector('[data-calendar-loading]')).not.toBeNull();
  expect(await screen.findByText('Nothing is booked yet')).toBeInTheDocument();
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
  expect(await screen.findByText('Weekly pipeline check')).toBeInTheDocument();
  unmount();
  render(<RuntimeCalendar fetcher={() => Promise.reject(new CalendarUnavailableError())} />);
  expect(await screen.findByText('The calendar isn’t available here yet')).toBeInTheDocument();
});
