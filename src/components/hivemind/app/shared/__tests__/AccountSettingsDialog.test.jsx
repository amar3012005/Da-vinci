import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccountSettingsDialog from '../AccountSettingsDialog';
jest.mock('../../pages/Profile', () => () => <div>Existing profile controls</div>);
jest.mock('../../pages/AIModels', () => () => <div>Model account connections</div>);
jest.mock('../../pages/Usage', () => () => <div>Existing usage controls</div>);
jest.mock('../../pages/Billing', () => () => <div>Existing billing controls</div>);
jest.mock('../../pages/Settings', () => () => <div>Existing settings controls</div>);

test('account sections open in a dialog without navigating away from chat', async () => {
  const before = window.location.href;
  const close = jest.fn();
  render(<AccountSettingsDialog onClose={close}/>);
  expect(screen.getByRole('dialog', { name: 'Account & Settings' })).toBeTruthy();
  expect(await screen.findByText('Existing profile controls')).toBeTruthy();
  for (const [section, text] of [['AI Models','Model account connections'],['Usage','Existing usage controls'],['Billing','Existing billing controls'],['Settings','Existing settings controls']]) {
    fireEvent.click(screen.getByRole('button', { name: section, exact: true }));
    expect(await screen.findByText(text)).toBeTruthy();
  }
  expect(window.location.href).toBe(before);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});

describe('phone layout', () => {
  const original = window.matchMedia;
  beforeEach(() => { window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); });
  afterEach(() => { window.matchMedia = original; });

  test('renders a full-height bottom sheet with one scrollable pill row and a 44pt close button', async () => {
    const close = jest.fn();
    render(<AccountSettingsDialog onClose={close}/>);
    const dialog = screen.getByRole('dialog', { name: 'Account & Settings' });
    expect(dialog).toHaveAttribute('data-layout', 'phone');
    expect(dialog.className).toContain('rounded-t-[28px]');
    const pills = screen.getByTestId('account-section-pills');
    expect(pills.className).toContain('overflow-x-auto');
    expect(pills.className).toContain('snap-x');
    for (const pill of pills.querySelectorAll('button')) { expect(pill.className).toContain('whitespace-nowrap'); expect(pill.className).toContain('shrink-0'); }
    expect(screen.getByRole('button', { name: 'Profile' }).className).toContain('bg-[#111]');
    const closeButton = screen.getByRole('button', { name: 'Close account settings' });
    expect(closeButton.className).toContain('h-11');
    fireEvent.click(screen.getByRole('button', { name: 'Billing' }));
    expect(await screen.findByText('Existing billing controls')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Billing' }).className).toContain('bg-[#111]');
    fireEvent.click(closeButton);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('swiping the header down dismisses the sheet', () => {
    const close = jest.fn();
    render(<AccountSettingsDialog onClose={close}/>);
    const header = screen.getByRole('dialog').querySelector('header');
    fireEvent.touchStart(header, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(header, { touches: [{ clientY: 260 }] });
    fireEvent.touchEnd(header);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
