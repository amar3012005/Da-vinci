import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07', search: '' }) }), { virtual: true });
jest.mock('../../layout/sidebar-copy', () => ({ useSidebarCopy: () => (_key, fallback) => fallback }));
jest.mock('../../components/AsciiWorkspaceLoading', () => ({ __esModule: true, default: ({ label }) => <div>{label}</div> }));
const mockOpen = jest.fn();
const mockClose = jest.fn();
let mockClosed;
const mockRemove = jest.fn();
jest.mock('../../shared/native-room', () => ({
  openNativeRoom: (...args) => mockOpen(...args),
  closeNativeRoom: () => mockClose(),
  onNativeRoomClosed: listener => { mockClosed = listener; return Promise.resolve({ remove: mockRemove }); },
}));
import NativeOpenDotRoom from '../NativeOpenDotRoom';

const EMPLOYEE = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
beforeEach(() => { mockOpen.mockReset().mockResolvedValue(undefined); mockClose.mockReset().mockResolvedValue(undefined); mockRemove.mockReset(); mockClosed = undefined; });
afterEach(cleanup);

test('opens the native room of the route employee and closes it on leaving', async () => {
  const { unmount } = render(<NativeOpenDotRoom active />);
  await waitFor(() => expect(mockOpen).toHaveBeenCalledWith(EMPLOYEE));
  unmount();
  expect(mockClose).toHaveBeenCalled();
});

test('an inactive retained document opens nothing', () => {
  render(<NativeOpenDotRoom active={false} />);
  expect(mockOpen).not.toHaveBeenCalled();
});

test('Done opens the team and the room can be opened again', async () => {
  const team = jest.fn();
  window.addEventListener('hivemind:open-dot-team', team);
  render(<NativeOpenDotRoom active />);
  await waitFor(() => expect(mockClosed).toBeDefined());
  act(() => mockClosed());
  expect(team).toHaveBeenCalledTimes(1);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledTimes(2));
  window.removeEventListener('hivemind:open-dot-team', team);
});

test('a room that cannot open offers another try instead of a blank screen', async () => {
  mockOpen.mockRejectedValueOnce(new Error('denied'));
  render(<NativeOpenDotRoom active />);
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
