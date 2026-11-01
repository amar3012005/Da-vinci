/** @jest-environment jsdom */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import CreateEmployeeDialog from '../CreateEmployeeDialog';
import apiClient from '../../shared/api-client';

const fs = require('fs');
const path = require('path');

jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { manageNativeEmployeeLifecycle: jest.fn(), createRegisteredOpenDotEmployee: jest.fn() } }));

const LOCALES = ['en', 'de', 'hi', 'ja', 'ar'];
const dictionary = locale => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', locale, 'dashboard.json'), 'utf8'));

async function openIn(locale) {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: locale, fallbackLng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', interpolation: { escapeValue: false },
    resources: Object.fromEntries(LOCALES.map(code => [code, { dashboard: dictionary(code) }])),
  });
  const onCreated = jest.fn().mockResolvedValue(true);
  render(<I18nextProvider i18n={i18n}><CreateEmployeeDialog onClose={jest.fn()} onCreated={onCreated} /></I18nextProvider>);
  return { i18n, onCreated };
}
const chips = () => Array.from(document.querySelectorAll('[data-role-template]'));

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'draft-uuid' } });
});

test('four role chips render localized in de and hi, and differ from English', async () => {
  await openIn('en');
  const english = chips().map(chip => chip.textContent);
  expect(english).toEqual(['Research analyst', 'Sales follow-up', 'Support triage', 'Finance operator']);
  cleanup();
  for (const locale of ['de', 'hi']) {
    await openIn(locale);
    const shown = chips().map(chip => chip.textContent);
    expect(shown).toHaveLength(4);
    shown.forEach((text, index) => { expect(text).toBeTruthy(); expect(text).not.toBe(english[index]); });
    cleanup();
  }
});

test('choosing a chip selects it, asks for a computer employee and sends the chip text as the role; nothing is created until Create', async () => {
  const { i18n } = await openIn('de');
  const german = chips().map(chip => chip.textContent);
  fireEvent.change(screen.getByLabelText(i18n.t('sidebar.createEmployeeDialog.employeeName', { ns: 'dashboard' })), { target: { value: 'Maya' } });
  fireEvent.click(chips()[1]);
  expect(chips()[1].getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('checkbox').checked).toBe(true);
  expect(apiClient.createRegisteredOpenDotEmployee).not.toHaveBeenCalled();
  apiClient.createRegisteredOpenDotEmployee.mockResolvedValue({ employee: { id: 'e1' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('sidebar.createEmployeeDialog.create', { ns: 'dashboard' }) }));
  await waitFor(() => expect(apiClient.createRegisteredOpenDotEmployee).toHaveBeenCalledTimes(1));
  expect(apiClient.createRegisteredOpenDotEmployee.mock.calls[0][0]).toEqual(expect.objectContaining({ creation_key: 'draft-uuid', name: 'Maya', role: german[1] }));
  expect(apiClient.manageNativeEmployeeLifecycle).not.toHaveBeenCalled();
});

test('chips follow a live language switch', async () => {
  const { i18n } = await openIn('en');
  const before = chips().map(chip => chip.textContent);
  await act(async () => { await i18n.changeLanguage('ja'); });
  expect(chips().map(chip => chip.textContent)).not.toEqual(before);
});
