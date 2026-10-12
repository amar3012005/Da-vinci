import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationDropdown from './NotificationDropdown';

test('rows escape the sidebar header, preserve long content, and open the exact notice', () => {
  const notice = { id: 'saved-report', title: 'A long company report title that must wrap instead of overlapping', body: 'Saved evidence and follow-up actions for your team.', createdAt: '2026-10-12T10:00:00Z' };
  const onSelect = jest.fn(); const onClose = jest.fn();
  const anchorRef = { current: document.createElement('button') };
  document.body.appendChild(anchorRef.current);
  const { container, unmount } = render(<div className="mobile-roster-top"><NotificationDropdown items={[notice]} anchorRef={anchorRef} onClose={onClose} onSelect={onSelect} renderIcon={() => <span>Mail</span>} relativeTime={() => '2m ago'} /></div>);
  const dialog = screen.getByRole('dialog', { name: 'Notifications' });
  expect(container.contains(dialog)).toBe(false);
  expect(dialog.parentElement.parentElement).toBe(document.body);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close notifications' }));
  fireEvent.click(screen.getByRole('button', { name: /A long company report/ }));
  expect(onSelect).toHaveBeenCalledWith(notice);
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  expect(document.activeElement).toBe(anchorRef.current);
  anchorRef.current.remove();
});

test('empty state remains dismissible and keyboard focus stays in the dropdown', () => {
  const onClose = jest.fn(); const anchorRef = { current: null };
  render(<NotificationDropdown items={[]} anchorRef={anchorRef} onClose={onClose} onSelect={jest.fn()} renderIcon={() => null} relativeTime={() => ''} />);
  expect(screen.getByText('Workspace updates will appear here.')).toBeTruthy();
  const close = screen.getByRole('button', { name: 'Close notifications' });
  fireEvent.keyDown(close, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
  fireEvent.click(close);
  expect(onClose).toHaveBeenCalledTimes(1);
});
