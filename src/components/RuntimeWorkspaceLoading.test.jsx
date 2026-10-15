import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import RuntimeWorkspaceLoading from './RuntimeWorkspaceLoading';
afterEach(() => { cleanup(); jest.useRealTimers(); });
test('shows loading then explicit retry without automatically reloading', () => {
  jest.useFakeTimers();
  render(<RuntimeWorkspaceLoading />);
  expect(screen.getByRole('status').textContent).toContain('Opening');
  expect(screen.queryByRole('button')).toBeNull();
  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByRole('alert').textContent).toContain('taking longer');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
});
