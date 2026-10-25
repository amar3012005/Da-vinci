import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutonomyDial, { AUTONOMY_ENDPOINT } from '../AutonomyDial';

afterEach(() => window.localStorage.clear());

const json = (value, status = 200) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(value) });
const state = { revision: 3, level: 2, changedAt: 1, maxSelectable: 2 };

function setup(post = json({ ok: true, value: { ok: true, value: { ...state, revision: 4, level: 1 } } })) {
  const fetcher = jest.fn((url, init) => init?.method === 'POST' ? post : json({ ok: true, sessionId: 'session-root', value: state }));
  render(<AutonomyDial fetcher={fetcher}/>);
  return fetcher;
}
const slider = () => screen.getByRole('slider', { name: 'Autonomy level for Runtime and HyperAgents' });
const move = value => { fireEvent.change(slider(), { target: { value: String(value) } }); fireEvent.pointerUp(slider(), { target: { value: String(value) } }); };

test('shows the saved level as a progress bar and saves a change only after confirming previous → new', async () => {
  const fetcher = setup();
  await screen.findByText('2/4 · Prepare');
  move(1);
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('Prepare→Suggest');
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
  expect(fetcher).toHaveBeenLastCalledWith(AUTONOMY_ENDPOINT, expect.objectContaining({ method: 'POST', body: JSON.stringify({ level: 1, expectedRevision: 3 }) }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('1/4 · Suggest')).toBeInTheDocument();
});

test('cancel keeps the saved level and sends nothing', async () => {
  const fetcher = setup();
  await screen.findByText('2/4 · Prepare');
  move(0);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('2/4 · Prepare')).toBeInTheDocument();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
});

test('a locked level springs back without a dialog', async () => {
  setup();
  await screen.findByText('2/4 · Prepare');
  move(4);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Higher levels unlock');
  expect(screen.getByText('2/4 · Prepare')).toBeInTheDocument();
});

test('stays visible where the autonomy API does not exist, showing the cached level and opening Runtime to change it', async () => {
  window.localStorage.setItem('hivemind.autonomy.v1:unknown', JSON.stringify({ level: 3, revision: 5, maxSelectable: 4 }));
  const fetcher = jest.fn(() => json({}, 404));
  render(<AutonomyDial fetcher={fetcher}/>);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(screen.getByText('3/4 · Act in lanes')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Change the level in the Runtime room' })).toHaveAttribute('href', expect.stringContaining('runtime-runner.singulancelabs.com'));
  window.localStorage.clear();
});

test('remembers the confirmed level for an instant paint next time', async () => {
  setup();
  await screen.findByText('2/4 · Prepare');
  expect(JSON.parse(window.localStorage.getItem('hivemind.autonomy.v1:unknown'))).toEqual({ level: 2, revision: 3, maxSelectable: 2 });
  window.localStorage.clear();
});

test('Escape cancels the confirmation without saving or reaching the drawer behind it', async () => {
  const fetcher = setup();
  const drawerKey = jest.fn();
  document.addEventListener('keydown', drawerKey);
  await screen.findByText('2/4 · Prepare');
  move(1);
  fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
  document.removeEventListener('keydown', drawerKey);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(drawerKey).not.toHaveBeenCalled();
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
});

test('a re-rendering parent neither refetches nor cancels the dial read', async () => {
  const original = global.fetch;
  global.fetch = jest.fn(() => json({ ok: true, sessionId: 'session-root', value: state }));
  try {
    const { rerender } = render(<AutonomyDial/>);
    for (let i = 0; i < 5; i++) rerender(<AutonomyDial/>);
    await screen.findByText('2/4 · Prepare');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally { global.fetch = original; }
});

test('clicking a checkpoint opens the previous → new dialog and Save sets that level', async () => {
  const fetcher = setup();
  await screen.findByText('2/4 · Prepare');
  fireEvent.click(screen.getByRole('button', { name: 'Suggest' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Prepare→Suggest');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
  expect(fetcher).toHaveBeenLastCalledWith(AUTONOMY_ENDPOINT, expect.objectContaining({ body: JSON.stringify({ level: 1, expectedRevision: 3 }) }));
  expect(await screen.findByText('1/4 · Suggest')).toBeInTheDocument();
});

test('a locked checkpoint explains the lock instead of opening the dialog, and no copy says Dot', async () => {
  setup();
  await screen.findByText('2/4 · Prepare');
  fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Higher levels unlock');
  expect(document.body.textContent).not.toMatch(/\bDots?\b/);
});

test('Lanes and Auto open the save dialog once Runtime allows every level', async () => {
  const fetcher = jest.fn(() => json({ ok: true, sessionId: 'session-root', value: { ...state, maxSelectable: 4 } }));
  render(<AutonomyDial fetcher={fetcher}/>);
  await screen.findByText('2/4 · Prepare');
  fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Prepare→Autonomous');
  expect(screen.getByRole('dialog')).toHaveTextContent('No approvals');
});
