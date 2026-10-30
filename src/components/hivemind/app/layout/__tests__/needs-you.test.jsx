/**
 * The Needs you inbox: the badge counts the employees the roster shows as waiting, the panel lists every pending card with the
 * employee, title and age, Approve appears only for reversible approvals, and an empty list reads "Nothing needs you."
 */
import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: ({ agent }) => <i data-testid="avatar" data-name={agent?.name} /> }));
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import NeedsYouPanel from '../NeedsYouPanel';
import DesktopHyperAgentsNavigation from '../DesktopHyperAgentsNavigation';
import { parseNeedsYou, waitingEmployeeIds, answerNeedsYouCard } from '../../shared/needs-you';
import { registerOpenDotFrame, postOpenDotFocusCard } from '../../shared/open-dot-frames';

const fs = require('fs');
const path = require('path');
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', 'en', 'dashboard.json'), 'utf8'));
i18n.use(initReactI18next).init({ lng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', resources: { en: { dashboard: en } }, interpolation: { escapeValue: false } });

const team = [{ id: 'e1', name: 'Maya' }, { id: 'E2', name: 'Theo' }];
const now = Date.now();
const body = { version: 1, observedAt: now, cards: [
  { id: 'msg_a', employeeId: 'e1', dotId: 'dot_1', conversationId: 'conv_1', createdAt: now - 3 * 3600_000, kind: 'approval', title: 'Open the pricing page', quickApprove: true },
  { id: 'msg_b', employeeId: 'e2', dotId: 'dot_2', conversationId: 'conv_2', createdAt: now - 60_000 * 10, kind: 'approval', title: 'Send the reply to Dana', quickApprove: false },
  { id: 'msg_c', employeeId: 'e2', dotId: 'dot_2', conversationId: 'conv_3', createdAt: now - 1000, kind: 'secure', title: 'Enter the code', quickApprove: false },
  { id: 'msg_x', employeeId: 'gone', dotId: 'dot_9', conversationId: 'conv_9', createdAt: now, kind: 'question', title: 'Left the team', quickApprove: false },
] };
const reply = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });
let fetchMock;
beforeEach(() => { fetchMock = jest.fn(); global.fetch = fetchMock; });

test('the badge counts the employees the server reports as waiting', () => {
  const rooms = [{ id: 'e1', serverStatus: true, status: 'waiting' }, { id: 'e1', serverStatus: true, status: 'waiting' }, { id: 'e2', serverStatus: true, status: 'working' }, { id: 'e3', status: 'waiting' }, { id: 'runtime' }];
  expect(waitingEmployeeIds(rooms)).toEqual(['e1']);
  const props = { team, rooms, selectedAgent: null, openingAgent: null, columns: 3, collapsed: false, user: { display_name: 'A' }, planLabel: 'x', onOpenAgent: jest.fn(), onCreate: jest.fn(), onCompany: jest.fn(), logout: jest.fn() };
  const onNeedsYou = jest.fn();
  render(<MemoryRouter><DesktopHyperAgentsNavigation {...props} onNeedsYou={onNeedsYou} needsYouCount={1} /></MemoryRouter>);
  const button = screen.getByRole('button', { name: '1 waiting for you' });
  expect(within(button).getByText('1')).toBeInTheDocument();
  fireEvent.click(button);
  expect(onNeedsYou).toHaveBeenCalledTimes(1);
});

test('without waiting employees the entry shows no badge', () => {
  const props = { team, rooms: [], selectedAgent: null, openingAgent: null, columns: 3, collapsed: false, user: { display_name: 'A' }, planLabel: 'x', onOpenAgent: jest.fn(), onCreate: jest.fn(), onCompany: jest.fn(), logout: jest.fn() };
  render(<MemoryRouter><DesktopHyperAgentsNavigation {...props} onNeedsYou={jest.fn()} needsYouCount={0} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Needs you' }).querySelector('.ny-badge')).toBeNull();
});

test('the list keeps well-formed cards newest first', () => {
  expect(parseNeedsYou({ version: 2, cards: [] })).toEqual([]);
  const cards = parseNeedsYou({ version: 1, cards: [{ ...body.cards[0], quickApprove: true }, { ...body.cards[2] }, { id: 'bad id', employeeId: 'e1', dotId: 'd', conversationId: 'c', kind: 'approval' }, { ...body.cards[1], kind: 'weird' }] });
  expect(cards.map(card => card.id)).toEqual(['msg_c', 'msg_a']);
  expect(cards.find(card => card.id === 'msg_c').quickApprove).toBe(false);
});

test('rows show the employee, title and age; Approve only for a reversible approval; unknown employees are not listed', async () => {
  fetchMock.mockImplementation(() => reply(body));
  const onOpenCard = jest.fn();
  render(<NeedsYouPanel team={team} refreshKey="e1" onClose={jest.fn()} onOpenCard={onOpenCard} />);
  const rows = await screen.findAllByRole('listitem');
  expect(rows).toHaveLength(3);
  expect(screen.queryByText('Left the team')).toBeNull();
  expect(fetchMock).toHaveBeenCalledWith('/api/hivemind/needs-you', expect.objectContaining({ credentials: 'same-origin' }));
  const pricing = rows.find(row => within(row).queryByText('Open the pricing page'));
  expect(within(pricing).getByText('Maya')).toBeInTheDocument();
  expect(within(pricing).getByText('Approval')).toBeInTheDocument();
  expect(within(pricing).getByText(/3 hours ago/)).toBeInTheDocument();
  expect(within(pricing).getByRole('button', { name: /^Approve/ })).toBeInTheDocument();
  expect(within(pricing).getByRole('button', { name: /^Deny/ })).toBeInTheDocument();
  const send = rows.find(row => within(row).queryByText('Send the reply to Dana'));
  expect(within(send).queryByRole('button', { name: /^Approve/ })).toBeNull();
  expect(within(send).getByRole('button', { name: /^Deny/ })).toBeInTheDocument();
  const secure = rows.find(row => within(row).queryByText('Enter the code'));
  expect(within(secure).queryByRole('button', { name: /^(Approve|Deny)/ })).toBeNull();
  expect(within(secure).getByText('Just now')).toBeInTheDocument();
  fireEvent.click(within(pricing).getByRole('button', { name: /Open Maya/ }));
  expect(onOpenCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg_a', dotId: 'dot_1', conversationId: 'conv_1' }));
});

test('Approve and Deny use the room card route and remove the row; a refusal keeps the row with a plain message', async () => {
  let remaining = body.cards;
  fetchMock.mockImplementation((url, init) => {
    if (url === '/api/hivemind/needs-you') return reply({ ...body, cards: remaining });
    if (init.body.includes('approve')) { remaining = remaining.filter(card => card.id !== 'msg_a'); return reply({ ok: true }); }
    return reply({ ok: false, error: 'no' }, 409);
  });
  render(<NeedsYouPanel team={team} refreshKey="" onClose={jest.fn()} onOpenCard={jest.fn()} />);
  await screen.findAllByRole('listitem');
  const status = jest.fn();
  window.addEventListener('hivemind:employee-status-changed', status);
  fireEvent.click(screen.getByRole('button', { name: 'Approve: Open the pricing page' }));
  await waitFor(() => expect(screen.queryByText('Open the pricing page')).toBeNull());
  expect(fetchMock).toHaveBeenCalledWith('/api/cards/msg_a', expect.objectContaining({ method: 'POST', body: JSON.stringify({ choice: 'approve' }) }));
  expect(status).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Deny: Send the reply to Dana' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('That did not go through');
  expect(screen.getByText('Send the reply to Dana')).toBeInTheDocument();
  window.removeEventListener('hivemind:employee-status-changed', status);
});

test('an empty list reads "Nothing needs you." and a live frame change reloads the list', async () => {
  fetchMock.mockImplementation(() => reply({ version: 1, observedAt: now, cards: [] }));
  render(<NeedsYouPanel team={team} refreshKey="" onClose={jest.fn()} onOpenCard={jest.fn()} />);
  expect(await screen.findByText('Nothing needs you.')).toBeInTheDocument();
  const calls = fetchMock.mock.calls.length;
  await act(async () => { window.dispatchEvent(new Event('hivemind:employee-status-changed')); });
  await waitFor(() => expect(fetchMock.mock.calls.length).toBe(calls + 1));
});

test('a failed read says so and offers a retry', async () => {
  fetchMock.mockImplementationOnce(() => reply({}, 503)).mockImplementation(() => reply({ version: 1, cards: [] }));
  render(<NeedsYouPanel team={team} refreshKey="" onClose={jest.fn()} onOpenCard={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Nothing needs you.')).toBeInTheDocument();
});

test('only a reversible choice for a well-formed card id is ever sent', async () => {
  fetchMock.mockImplementation(() => reply({ ok: true }));
  expect(await answerNeedsYouCard('msg_a', 'always')).toBe(false);
  expect(await answerNeedsYouCard('../x', 'approve')).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('the focus request goes to registered OpenDot frames at their own origin and carries ids only', () => {
  const postMessage = jest.fn();
  const dispose = registerOpenDotFrame({ src: 'https://runtime-runner.singulancelabs.com/employees/x?embed=hivemind', contentWindow: { postMessage } });
  expect(postOpenDotFocusCard({ cardId: 'msg_a', dotId: 'dot_1', conversationId: 'conv_1' })).toBe(1);
  expect(postMessage).toHaveBeenCalledWith({ type: 'hivemind.open-dot.focus-card', version: 1, cardId: 'msg_a', dotId: 'dot_1', conversationId: 'conv_1' }, 'https://runtime-runner.singulancelabs.com');
  dispose();
  expect(postOpenDotFocusCard({ cardId: 'msg_a', dotId: 'dot_1', conversationId: 'conv_1' })).toBe(0);
});

test('the panel and the sidebar read their copy from the dictionaries in all seven languages', () => {
  for (const locale of ['en', 'de', 'fr', 'es', 'hi', 'ja', 'ar']) {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', locale, 'dashboard.json'), 'utf8'));
    expect(Object.keys(d.needsYou).sort()).toEqual(Object.keys(en.needsYou).sort());
    expect(d.sidebar.needsYouBadge).toContain('{{n}}');
  }
});
