import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AccountSettingsDialog from '../AccountSettingsDialog';
jest.mock('../../pages/Profile', () => () => <div>Existing profile controls</div>);
jest.mock('../../pages/Usage', () => () => <div>Existing usage controls</div>);
jest.mock('../../pages/Billing', () => () => <div>Existing billing controls</div>);
jest.mock('../../pages/Settings', () => () => <div>Existing settings controls</div>);

test('account sections open in a dialog without navigating away from chat', async () => {
  const before = window.location.href;
  const close = jest.fn();
  render(<AccountSettingsDialog onClose={close}/>);
  expect(screen.getByRole('dialog', { name: 'Account & Settings' })).toBeTruthy();
  expect(await screen.findByText('Existing profile controls')).toBeTruthy();
  for (const [section, text] of [['Usage','Existing usage controls'],['Billing','Existing billing controls'],['Settings','Existing settings controls']]) {
    fireEvent.click(screen.getByRole('button', { name: section, exact: true }));
    expect(await screen.findByText(text)).toBeTruthy();
  }
  expect(window.location.href).toBe(before);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});
