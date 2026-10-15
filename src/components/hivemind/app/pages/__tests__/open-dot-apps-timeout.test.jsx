import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/hivemind/app/employee/apps', search: '' }) }));
import OpenDotEntry from '../OpenDotEntry';

test('Apps shows a bounded retry when embedded service never becomes ready', () => {
  jest.useFakeTimers();
  render(<OpenDotEntry apps />);
  expect(screen.getByRole('status').textContent).toContain('Opening workspace');
  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByRole('alert').textContent).toContain('hasn’t finished loading');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status')).toBeTruthy();
  jest.useRealTimers();
});
