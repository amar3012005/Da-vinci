import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import '@testing-library/jest-dom';
import GetRuntime, { RUNTIME_WORKSPACE } from './GetRuntime';
beforeEach(() => { window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() })); });
function setup() { return render(<HelmetProvider><GetRuntime/></HelmetProvider>); }
test('the cover has a single accessible heading and opens actual Runtime authentication without collecting credentials', () => {
  setup();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Continue to Runtime' })).toHaveAttribute('href', RUNTIME_WORKSPACE);
  expect(screen.getByRole('link', { name: 'Log in', exact: true })).toHaveAttribute('href', RUNTIME_WORKSPACE);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
test('the company example advances by keyboard and clearly keeps the human approval boundary', () => {
  setup();
  const delegate = screen.getByRole('tab', { name: 'Delegate' });
  fireEvent.click(delegate);
  expect(delegate).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(delegate, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Verify' })).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Requirements checked');
  fireEvent.click(screen.getByRole('tab', { name: 'Ask you' }));
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Your approval needed');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Illustrative workflow');
});
test('reduced motion keeps the hero stable instead of automatically cycling headlines', () => {
  jest.useFakeTimers(); const view = setup();
  try {
    const before = view.container.querySelector('.gr-outcome').textContent;
    act(() => jest.advanceTimersByTime(18000));
    expect(view.container.querySelector('.gr-outcome').textContent).toBe(before);
  } finally { view.unmount(); jest.useRealTimers(); }
});
