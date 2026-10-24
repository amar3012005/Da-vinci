import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutonomyDial, { AUTONOMY_ENDPOINT } from '../AutonomyDial';

const json = (value, status = 200) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(value) });
const state = { revision: 3, level: 2, changedAt: 1, maxSelectable: 2 };

function setup(post = json({ ok: true, value: { ok: true, value: { ...state, revision: 4, level: 1 } } })) {
  const fetcher = jest.fn((url, init) => init?.method === 'POST' ? post : json({ ok: true, sessionId: 'session-root', value: state }));
  render(<AutonomyDial fetcher={fetcher}/>);
  return fetcher;
}
const slider = () => screen.getByRole('slider', { name: 'Autonomy level for Runtime and every Dot' });
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

test('renders nothing where the Runtime dial endpoint does not exist', async () => {
  const fetcher = jest.fn(() => json({}, 404));
  const { container } = render(<AutonomyDial fetcher={fetcher}/>);
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
