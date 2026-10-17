import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectorsWelcome from './ConnectorsWelcome';
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test('shows the supplied artwork on entry, dismisses without navigation, and opens on a later entry', () => {
  const view = render(<ConnectorsWelcome/>);
  expect(screen.getByRole('dialog', { name: 'Unlock ProActive Intelligence' })).toBeVisible();
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/announcements/unlock-proactive-intelligence.png');
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Connect apps' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe('hidden');
  view.unmount();
  render(<ConnectorsWelcome/>);
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close connectors introduction' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('Escape cancellation dismisses the introduction', () => {
  render(<ConnectorsWelcome/>);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
