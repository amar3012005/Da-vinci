import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import EmployeeMobileNavigation from './EmployeeMobileNavigation';
jest.mock('./Sidebar', () => ({ __esModule: true, default: () => <nav><button data-agent-room-link>Runtime</button><button data-agent-room-link>Ravi</button><a href="/company">Company</a></nav> }));
afterEach(cleanup);
test('keeps the existing team actions in an accessible dismissible drawer', () => {
  const close = jest.fn();
  render(<EmployeeMobileNavigation activeSection="hivemind" onClose={close} />);
  expect(screen.getByRole('dialog', { name: 'Your team' }).getAttribute('aria-modal')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Ravi' }));
  expect(close).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(2);
});
test('returns focus to the opener and contains keyboard focus', () => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus();
  const view = render(<EmployeeMobileNavigation onClose={jest.fn()} />);
  const first = screen.getByRole('button', { name: 'Close your team' });
  const last = screen.getByRole('button', { name: 'Close team navigation' });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(document.activeElement).toBe(first);
  view.unmount(); expect(document.activeElement).toBe(opener); opener.remove();
});
