import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useSidebarCopy } from '../sidebar-copy';

const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'de', 'hi', 'ja', 'ar'];
const dictionary = locale => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', locale, 'dashboard.json'), 'utf8'));

function Probe() {
  const s = useSidebarCopy();
  return <p data-testid="copy">{s('yourTeam', 'Your team')} | {s('statusWaiting', 'Waiting for you')} | {s('deleteEmployee', 'Delete {{name}}', { name: 'Mia' })}</p>;
}

// Runs first: `initReactI18next` below registers a process-wide i18n instance.
test('without a loaded dictionary the English default still shows with its placeholders filled', () => {
  render(<Probe />);
  expect(screen.getByTestId('copy').textContent).toBe('Your team | Waiting for you | Delete Mia');
});

test('sidebar copy follows the chosen language immediately, without a reload', async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'en', fallbackLng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', interpolation: { escapeValue: false },
    resources: Object.fromEntries(LOCALES.map(locale => [locale, { dashboard: dictionary(locale) }])),
  });
  render(<I18nextProvider i18n={i18n}><Probe /></I18nextProvider>);
  expect(screen.getByTestId('copy').textContent).toBe('Your team | Waiting for you | Delete Mia');
  const seen = new Set();
  for (const locale of ['de', 'hi', 'ja', 'ar']) {
    await act(async () => { await i18n.changeLanguage(locale); });
    const text = screen.getByTestId('copy').textContent;
    expect(text).not.toContain('Your team');
    expect(text).toContain('Mia');
    seen.add(text);
  }
  expect(seen.size).toBe(4);
});
