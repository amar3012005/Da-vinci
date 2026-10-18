import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/hivemind/app/employee/apps', search: '' }) }));
import OpenDotEntry from '../OpenDotEntry';

test('Apps shows a bounded retry when embedded service never becomes ready', () => {
  jest.useFakeTimers();
  render(<OpenDotEntry apps />);
  expect(screen.getByRole('status').textContent).toContain('Connecting');
  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByRole('alert').textContent).toContain('hasn’t finished loading');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status')).toBeTruthy();
  jest.useRealTimers();
});


test('readiness is accepted only from the owned Dot frame and cancels the timeout', () => {
  jest.useFakeTimers();
  render(<OpenDotEntry apps />);
  const frame = screen.getByTitle('Apps');
  const data = { type: 'hivemind.open-dot.ready', version: 1 };
  act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', source: frame.contentWindow, data })));
  expect(screen.getByRole('status')).toBeTruthy();
  act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://dots.singulancelabs.com', source: frame.contentWindow, data })));
  expect(screen.queryByRole('status')).toBeNull();
  act(() => jest.advanceTimersByTime(30000));
  expect(screen.queryByRole('alert')).toBeNull();
  jest.useRealTimers();
});
