/**
 * The live team board: one column per employee with state, task line and last result from the shared room rows and one extra read;
 * handoffs newest first with kind, files and an Open that goes to the recipient; the digest line and the week summary; no polling.
 */
import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
jest.mock('../AgentAvatar', () => ({ __esModule: true, default: ({ agent }) => <i data-testid="avatar" data-name={agent?.name} /> }));
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import TeamBoard from '../TeamBoard';
import { boardState, boardColumns, parseTeamBoard, parseTeamWeek } from '../../shared/team-board';

const fs = require('fs');
const path = require('path');
const LOCALES = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(LOCALES, 'en', 'dashboard.json'), 'utf8'));
i18n.use(initReactI18next).init({ lng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', resources: { en: { dashboard: en } }, interpolation: { escapeValue: false } });

const team = [{ id: 'e1', name: 'Maya', role: 'sales_lead' }, { id: 'e2', name: 'Ravi', role: 'Operations' }, { id: 'e3', name: 'Ines' }, { id: 'runtime', name: 'Runtime' }];
const now = Date.now();
const board = { version: 1, observedAt: now,
  employees: [
    { dotId: 'dot_1', employeeId: 'e1', name: 'Maya', task: { title: 'Draft the offer', status: 'in_progress' }, lastResult: { subject: 'Pricing check', outcome: 'completed', at: now - 3 * 3600_000 } },
    { dotId: 'dot_2', employeeId: 'E2', name: 'Ravi', task: null, lastResult: null },
  ],
  handoffs: [
    { id: 'h_old', fromDotId: 'dot_2', fromName: 'Ravi', toDotId: 'dot_1', toName: 'Maya', kind: 'reply', summary: 'Prices confirmed', files: [], at: now - 7200_000 },
    { id: 'h_new', fromDotId: 'dot_1', fromName: 'Maya', toDotId: 'dot_2', toName: 'Ravi', kind: 'question', summary: 'Please check the pricing page', files: ['pricing.md'], at: now - 600_000 },
  ],
  digests: [{ name: 'Maya', date: '2026-10-30', text: 'Brief: two tasks moved', at: now }] };
const week = { week: { totals: { completed: 4, blocked: 1, failed: 0, returned: 2, lessons: 3 }, rows: [{ name: 'Maya', subjects: ['Pricing check'] }] } };
const reply = data => Promise.resolve({ ok: true, status: 200, json: async () => data });
let fetchMock;
beforeEach(() => { fetchMock = jest.fn(url => reply(url.includes('team-week') ? week : board)); global.fetch = fetchMock; });
const rooms = [
  { id: 'e1', serverStatus: true, status: 'working', running: true, activity: 'Editing the offer', updatedAt: 1 },
  { id: 'e2', serverStatus: true, status: 'waiting', actionRequired: true, updatedAt: 1 },
  { id: 'e3', serverStatus: true, status: 'paused', updatedAt: 1 },
];

test('board state follows the same room row as the roster', () => {
  expect(boardState(undefined)).toBe('idle');
  expect(boardState({ status: 'working', running: true })).toBe('working');
  expect(boardState({ status: 'idle', waitingForAnswer: true })).toBe('waiting');
  expect(boardState({ status: 'paused' })).toBe('paused');
  expect(boardState({ status: 'working', error: true })).toBe('error');
  expect(boardState({ status: 'working', stale: true })).toBe('idle');
});

test('parsers keep only well-formed entries and the board skips Runtime', () => {
  expect(parseTeamBoard({ version: 2 })).toBeNull();
  const parsed = parseTeamBoard({ ...board, handoffs: [...board.handoffs, { id: 5 }], employees: [...board.employees, null] });
  expect(parsed.handoffs.map(item => item.id)).toEqual(['h_new', 'h_old']);
  expect(parseTeamWeek({ week: { totals: { completed: 2 }, rows: [{ name: 'A', subjects: ['x'] }, {}] } })).toEqual({ totals: { completed: 2, blocked: 0, failed: 0, returned: 0, lessons: 0 }, rows: [{ name: 'A', subject: 'x' }] });
  expect(boardColumns({ team, roomFor: () => undefined, extras: parsed }).map(column => column.id)).toEqual(['e1', 'e2', 'e3']);
});

test('each employee gets a column with state, task line and last result; waiting comes first', async () => {
  render(<TeamBoard team={team} rooms={rooms} onOpenTeammate={jest.fn()} />);
  await screen.findByText('Draft the offer');
  const columns = screen.getAllByRole('listitem').filter(item => item.classList.contains('tb-col'));
  expect(columns.map(item => item.getAttribute('data-board-state'))).toEqual(['waiting', 'working', 'paused']);
  const maya = columns[1];
  expect(within(maya).getByText('Working')).toBeInTheDocument();
  expect(within(maya).getByText(/Pricing check/)).toBeInTheDocument();
  expect(within(maya).getByText(/Done/)).toBeInTheDocument();
  expect(within(columns[0]).getByText('Waiting for you')).toBeInTheDocument();
  expect(within(columns[0]).getByText('No task right now')).toBeInTheDocument();
  expect(within(columns[2]).getByText('Paused')).toBeInTheDocument();
  expect(screen.queryByText('Runtime')).toBeNull();
});

test('a working employee without a recorded task shows its live activity line', async () => {
  fetchMock.mockImplementation(url => reply(url.includes('team-week') ? week : { ...board, employees: [] }));
  render(<TeamBoard team={team} rooms={rooms} />);
  expect(await screen.findByText('Editing the offer')).toBeInTheDocument();
});

test('handoffs list newest first with kind and files, and Open goes to the recipient', async () => {
  const onOpenTeammate = jest.fn();
  render(<TeamBoard team={team} rooms={rooms} onOpenTeammate={onOpenTeammate} />);
  const list = await screen.findByRole('list', { name: '' }, { timeout: 100 }).catch(() => null);
  await screen.findByText('Please check the pricing page');
  const rows = document.querySelectorAll('[data-handoff-kind]');
  expect([...rows].map(row => row.getAttribute('data-handoff-kind'))).toEqual(['question', 'reply']);
  expect(within(rows[0]).getByText('Maya to Ravi')).toBeInTheDocument();
  expect(within(rows[0]).getByText('pricing.md')).toBeInTheDocument();
  fireEvent.click(within(rows[0]).getByRole('button', { name: 'Open Ravi’s chat' }));
  expect(onOpenTeammate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'e2' }));
  void list;
});

test('the digest line and the week summary show beside the columns', async () => {
  render(<TeamBoard team={team} rooms={rooms} />);
  expect(await screen.findByText(/Maya \(.*\): Brief: two tasks moved/)).toBeInTheDocument();
  const tile = document.querySelector('[data-week]');
  expect(within(tile).getByText('4')).toBeInTheDocument();
  expect(within(tile).getByText('Sent back')).toBeInTheDocument();
});

test('empty handoffs and a quiet week read plainly', async () => {
  fetchMock.mockImplementation(url => reply(url.includes('team-week') ? { week: { totals: {}, rows: [] } } : { ...board, handoffs: [], digests: [] }));
  render(<TeamBoard team={team} rooms={rooms} />);
  expect(await screen.findByText('No messages between colleagues yet.')).toBeInTheDocument();
  expect(screen.getByText('Nothing recorded yet this week.')).toBeInTheDocument();
  expect(screen.getByText(/No digest line yet/)).toBeInTheDocument();
});

test('the board reads once, then again only when a state changes, never on a timer', async () => {
  jest.useFakeTimers();
  const { rerender } = render(<TeamBoard team={team} rooms={rooms} />);
  await act(async () => { await Promise.resolve(); });
  const reads = () => fetchMock.mock.calls.filter(([url]) => url === '/api/dots/team-board').length;
  expect(reads()).toBe(1);
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(reads()).toBe(1);
  rerender(<TeamBoard team={team} rooms={rooms.map(room => room.id === 'e3' ? { ...room, status: 'working', running: true } : room)} />);
  await act(async () => { jest.advanceTimersByTime(7000); await Promise.resolve(); });
  expect(reads()).toBe(2);
  jest.useRealTimers();
});

test('a failed read says so and offers a retry', async () => {
  fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }));
  render(<TeamBoard team={team} rooms={rooms} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2));
});
