import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import BrainGetStarted from './BrainGetStarted';
import apiClient from '../shared/api-client';
const mockNavigate = jest.fn(); let mockPath = '/hivemind/app/overview';
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
jest.mock('../shared/api-client', () => ({ listDocuments: jest.fn(async () => ({ documents: [{ id: 'doc' }] })), listMemories: jest.fn(async () => ({ memories: [] })), getConnectorConnectionStatus: jest.fn(async () => ({ connectors: [] })) }));
beforeEach(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); apiClient.listDocuments.mockResolvedValue({ documents: [{ id: 'doc' }] }); apiClient.listMemories.mockResolvedValue({ memories: [] }); apiClient.getConnectorConnectionStatus.mockResolvedValue({ connectors: [] }); localStorage.clear(); mockPath = '/hivemind/app/overview'; });
it('uses Brain milestones and does not complete a save from navigation', async () => {
  render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('1');
  fireEvent.click(screen.getByText('Save something worth remembering'));
  expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/memories');
  expect(screen.getByRole('button', { name: 'Save something worth remembering', hidden: true })).toBeTruthy();
  expect(screen.queryByRole('checkbox', { hidden: true })).toBeNull();
  expect(screen.queryByText('Awaken Runtime')).toBeNull();
});
it('isolates Brain progress from Runtime and other accounts', async () => {
  localStorage.setItem('hivemind.runtime-get-started:v1:user:org', JSON.stringify({ chat: true }));
  mockPath = '/hivemind/app/overview/session/saved';
  const first = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(JSON.parse(localStorage.getItem('hivemind.brain-get-started:v1:user:org')).chat).toBe(true);
  first.unmount(); mockPath = '/hivemind/app/overview';
  render(<BrainGetStarted scope="other:org" />); await act(async () => {});
  expect(screen.getByRole('button', { name: 'Start a Brain conversation', hidden: true })).toBeTruthy();
});
describe('accessibility', () => {
  it('has no control nested in a button, names the done steps and announces the count in a live region', async () => {
    apiClient.listDocuments.mockResolvedValue({ documents: [{ id: 'doc' }] });
    const view = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    const live = view.container.querySelector('[role="status"][aria-live="polite"]');
    expect(live.textContent).toBe('1 of 6');
    expect(view.container.querySelector('button [role="checkbox"], button [role="progressbar"]')).toBeNull();
    const source = screen.getByRole('button', { name: /Add your first source/, hidden: true });
    expect(source.textContent).toContain('Done');
    expect(screen.getByRole('button', { name: 'Save something worth remembering', hidden: true }).textContent).not.toContain('Done');
    expect(view.container.querySelectorAll('.hm-runtime-start-check[aria-hidden="true"]')).toHaveLength(6);
    apiClient.listMemories.mockResolvedValue({ memories: [{ id: 'm' }] });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(live.textContent).toBe('2 of 6');
  });
  it('Escape closes the open card and returns focus to its summary', async () => {
    const view = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    const summary = view.container.querySelector('summary');
    const details = view.container.querySelector('details');
    await act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')); });
    expect(details.open).toBe(true);
    fireEvent.keyDown(screen.getByRole('button', { name: /Add your first source/, hidden: true }), { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
  it('keeps a visible focus ring and drops transitions for reduced motion', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'RuntimeGetStarted.css'), 'utf8');
    expect(css).toMatch(/summary:focus-visible \{ outline:2px solid/);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)[^}]*transition:none/);
  });
});
describe('translated card', () => {
  const { createInstance } = require('i18next');
  const { I18nextProvider, initReactI18next } = require('react-i18next');
  const locales = ['en', 'de', 'hi', 'ja', 'ar'];
  const make = async lng => {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng, fallbackLng: 'en', ns: ['dashboard'], defaultNS: 'dashboard', interpolation: { escapeValue: false },
      resources: Object.fromEntries(locales.map(locale => [locale, { dashboard: require(`../../../../../public/locales/${locale}/dashboard.json`) }])),
    });
    return i18n;
  };

  it('shows the checklist in the chosen language and switches without a reload', async () => {
    const i18n = await make('de');
    render(<I18nextProvider i18n={i18n}><BrainGetStarted scope="user:org" /></I18nextProvider>); await act(async () => {});
    expect(screen.getByText('Erste Schritte')).toBeTruthy();
    expect(screen.getByText('Verbinde deine Apps')).toBeTruthy();
    expect(screen.queryByText('Connect your apps')).toBeNull();
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-label')).toBe('Fortschritt der ersten Schritte mit Brain');
    await act(async () => { await i18n.changeLanguage('hi'); });
    expect(screen.getByText('अपने ऐप्स कनेक्ट करें')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('ar'); });
    expect(screen.getByText('اربط تطبيقاتك')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اربط تطبيقاتك', hidden: true })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Getting Started|Connect your apps|of 6/);
    expect(document.body.textContent).toContain(new Intl.NumberFormat('ar').format(6));
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByText('はじめに')).toBeTruthy();
  });

  it('uses logical alignment so Arabic text and the open chip card follow the reading direction', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'RuntimeGetStarted.css'), 'utf8');
    expect(css).not.toMatch(/text-align:\s*left/);
    expect(css).toMatch(/hm-runtime-start-card\[open\][^}]*inset-inline-end:0/);
  });
});
