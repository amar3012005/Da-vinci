import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountRowTools from './AccountRowTools';
import { sendBugReport } from '../shared/bug-report';

jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/hivemind/app/overview' }) }), { virtual: true });
let mockSnapshot = { update: null };
jest.mock('../shared/app-update', () => ({
  ...jest.requireActual('../shared/app-update'),
  sharedUpdateStore: () => ({ subscribe: () => () => {}, snapshot: () => mockSnapshot }),
}));
jest.mock('../shared/native-auth', () => ({ nativePlugin: {} }));
jest.mock('../auth/AuthProvider', () => ({ useOptionalAuth: () => ({ user: { id: 'u-1' }, org: { id: 'org-1' } }) }));
jest.mock('../shared/bug-report', () => ({
  ...jest.requireActual('../shared/bug-report'),
  sendBugReport: jest.fn(),
}));

const setup = () => render(<AccountRowTools/>);

beforeEach(() => { sendBugReport.mockResolvedValue({ id: 'r-9' }); mockSnapshot = { update: null }; window.localStorage.clear(); });

test('the bug button is always there and the update button only with an update', () => {
  setup();
  expect(screen.getByLabelText('Report a problem')).toBeTruthy();
  expect(screen.queryByLabelText('Update available')).toBeNull();
});

test('an update shows the button; the card opens on click and Later remembers the version', () => {
  mockSnapshot = { update: { kind: 'reload', version: 'bbb' } };
  setup();
  fireEvent.click(screen.getByLabelText('Update available'));
  expect(screen.getByText('Reload to update')).toBeTruthy();
  fireEvent.click(screen.getByText('Later'));
  expect(window.localStorage.getItem('hm:update-dismissed:reload:bbb')).toBe('1');
  expect(screen.queryByText('Reload to update')).toBeNull();
});

test('a downloading macOS update shows progress, a downloaded one offers restart', () => {
  mockSnapshot = { update: { kind: 'download', version: '2.0.0', percent: 40 } };
  const { unmount } = setup();
  fireEvent.click(screen.getByLabelText('Update available'));
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
  unmount();
  mockSnapshot = { update: { kind: 'install', version: '2.0.0' } };
  setup();
  fireEvent.click(screen.getByLabelText('Update available'));
  expect(screen.getByText('Restart to update')).toBeTruthy();
});

test('the bug card sends and shows the report id', async () => {
  setup();
  fireEvent.click(screen.getByLabelText('Report a problem'));
  const send = screen.getByText('Send');
  expect(send.disabled).toBe(true);
  fireEvent.change(screen.getByPlaceholderText('What went wrong?'), { target: { value: 'It broke' } });
  await act(async () => { fireEvent.click(screen.getByText('Send')); });
  await waitFor(() => expect(screen.getByText(/r-9/)).toBeTruthy());
});
