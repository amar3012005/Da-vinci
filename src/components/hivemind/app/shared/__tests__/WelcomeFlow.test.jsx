import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ActivationGate, WelcomeSlides } from '../WelcomeFlow';

jest.mock('framer-motion', () => {
  const React = require('react');
  const component = React.forwardRef(({ children, initial, animate, exit, transition, ...props }, ref) => <div ref={ref} {...props}>{children}</div>);
  return { AnimatePresence: ({ children }) => children, motion: new Proxy({}, { get: () => component }) };
});

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { jest.useRealTimers(); });

test('welcome resumes the exact slide after remount without crossing workspace keys', () => {
  const first = render(<WelcomeSlides progressKey="tenant-a" />);
  fireEvent.click(screen.getByRole('button', { name: 'Slide 3' }));
  expect(sessionStorage.getItem('tenant-a:slide')).toBe('2');
  first.unmount();
  const resumed = render(<WelcomeSlides progressKey="tenant-a" />);
  expect(screen.getByText('[3/5]')).toBeTruthy();
  resumed.unmount();
  render(<WelcomeSlides progressKey="tenant-b" />);
  expect(screen.getByText('[1/5]')).toBeTruthy();
});

test('activation finishes on time despite parent callback changes, using latest callback', () => {
  jest.useFakeTimers();
  const oldDone = jest.fn(), latestDone = jest.fn();
  const view = render(<ActivationGate onDone={oldDone} durationMs={1000} />);
  act(() => { jest.advanceTimersByTime(800); });
  view.rerender(<ActivationGate onDone={latestDone} durationMs={1000} />);
  act(() => { jest.advanceTimersByTime(550); });
  expect(oldDone).not.toHaveBeenCalled();
  expect(latestDone).toHaveBeenCalledTimes(1);
});

test('Enter on a navigation button does not also invoke the global shortcut', () => {
  render(<WelcomeSlides progressKey="keyboard" />);
  const next = screen.getByRole('button', { name: 'Next' });
  fireEvent.keyDown(next, { key: 'Enter' });
  fireEvent.click(next);
  expect(screen.getByText('[2/5]')).toBeTruthy();
});
