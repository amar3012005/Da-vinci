import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import BrainGetStarted from './BrainGetStarted';
import apiClient from '../shared/api-client';
const mockNavigate = jest.fn(); let mockPath = '/hivemind/app/overview';
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
const mockState = { view: null, store: null };
jest.mock('../shared/onboarding/onboarding-store', () => ({ useOnboarding: () => mockState }));
jest.mock('../shared/api-client', () => ({ listDocuments: jest.fn(async () => ({ documents: [{ id: 'doc' }] })), listMemories: jest.fn(async () => ({ memories: [] })), getConnectorConnectionStatus: jest.fn(async () => ({ connectors: [] })) }));
beforeEach(() => { mockState.view = null; mockState.store = { track: jest.fn(), milestone: jest.fn() }; Object.defineProperty(document, 'hidden', { configurable: true, value: false }); apiClient.listDocuments.mockResolvedValue({ documents: [{ id: 'doc' }] }); apiClient.listMemories.mockResolvedValue({ memories: [] }); apiClient.getConnectorConnectionStatus.mockResolvedValue({ connectors: [] }); localStorage.clear(); mockPath = '/hivemind/app/overview'; });
it('uses Brain milestones and does not complete a save from navigation', async () => {
  render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('1');
  expect(mockState.store.milestone).toHaveBeenCalledWith('source_added');
  fireEvent.click(screen.getByText('Save something worth remembering'));
  expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/memories');
  expect(screen.getByRole('button', { name: 'Save something worth remembering', hidden: true })).toBeTruthy();
  expect(screen.queryByRole('checkbox', { hidden: true })).toBeNull();
  expect(screen.queryByText('Awaken Runtime')).toBeNull();
});
it('isolates the offline cache from Runtime and other accounts', async () => {
  localStorage.setItem('hivemind.runtime-get-started:v1:user:org', JSON.stringify({ source: true }));
  const first = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
  expect(JSON.parse(localStorage.getItem('hivemind.brain-get-started:v2:user:org')).source).toBe(true);
  first.unmount();
  apiClient.listDocuments.mockResolvedValue({ documents: [] });
  render(<BrainGetStarted scope="other:org" />); await act(async () => {});
  expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('0');
});
describe('accessibility', () => {
  it('has no control nested in a button, names the done steps and announces the count in a live region', async () => {
    apiClient.listDocuments.mockResolvedValue({ documents: [{ id: 'doc' }] });
    const view = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    const live = view.container.querySelector('[role="status"][aria-live="polite"]');
    expect(live.textContent).toBe('1 of 7');
    expect(view.container.querySelector('button [role="checkbox"], button [role="progressbar"]')).toBeNull();
    const source = screen.getByRole('button', { name: /Add your first source/, hidden: true });
    expect(source.textContent).toContain('Done');
    expect(screen.getByRole('button', { name: 'Save something worth remembering', hidden: true }).textContent).not.toContain('Done');
    expect(view.container.querySelectorAll('.hm-runtime-start-check[aria-hidden="true"]')).toHaveLength(7);
    apiClient.listMemories.mockResolvedValue({ memories: [{ id: 'm' }] });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(live.textContent).toBe('2 of 7');
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
describe('server record (wk-brain-steps)', () => {
  const ids = ['language', 'company', 'source', 'ask', 'remember', 'connect', 'invite'];
  const serverView = (statuses = {}, extra = {}) => ({ version: 1, open: true, locale: null, tier: 'brain_only', brainSteps: ids.map(id => ({ id, status: statuses[id] || 'todo', at: null })), ...extra });

  it('resumes on a second device from the server record, with an empty browser cache and nothing in the Brain app yet', async () => {
    apiClient.listDocuments.mockResolvedValue({ documents: [] });
    mockState.view = serverView({ company: 'done', source: 'done', ask: 'done' }, { locale: 'de' });
    localStorage.clear();
    render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('4');
    expect(screen.getByRole('button', { name: /Ask a question and get an answer with its source/, hidden: true }).textContent).toContain('Done');
    expect(screen.getByRole('button', { name: /Invite someone to your Brain/, hidden: true }).textContent).not.toContain('Done');
  });

  it('ask completes only from the server record: a cached or clicked ask stays open', async () => {
    apiClient.listDocuments.mockResolvedValue({ documents: [] });
    localStorage.setItem('hivemind.brain-get-started:v2:user:org', JSON.stringify({ ask: true }));
    mockState.view = serverView();
    render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    const ask = screen.getByRole('button', { name: /Ask a question and get an answer with its source/, hidden: true });
    fireEvent.click(ask);
    expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/overview');
    expect(mockState.store.track).toHaveBeenCalledWith('onb_step_view', 'ask');
    expect(mockState.store.track).not.toHaveBeenCalledWith('onb_step_done', 'ask');
    expect(ask.textContent).not.toContain('Done');
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('0');
  });

  it('shows the seven steps with zero employees and no Runtime, reporting what the Brain app sees', async () => {
    apiClient.listMemories.mockResolvedValue({ memories: [{ id: 'm' }] });
    mockState.view = serverView();
    const view = render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    expect(view.container.querySelectorAll('li')).toHaveLength(7);
    expect(mockState.store.milestone).toHaveBeenCalledWith('source_added');
    expect(mockState.store.milestone).toHaveBeenCalledWith('memory_saved');
  });

  it('keeps finished Brain steps once the company has a team', async () => {
    mockState.view = serverView({ company: 'done', source: 'done' }, { tier: 'team' });
    apiClient.listDocuments.mockResolvedValue({ documents: [] });
    render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('2');
  });

  it('the language step opens a picker that applies the language through the shared language event', async () => {
    mockState.view = serverView();
    const heard = jest.fn(); window.addEventListener('hivemind:ui-language', heard);
    render(<BrainGetStarted scope="user:org" />); await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /Choose your language/, hidden: true }));
    fireEvent.change(screen.getByRole('combobox', { hidden: true }), { target: { value: 'de' } });
    expect(heard.mock.calls[0][0].detail).toEqual({ language: 'de' });
    window.removeEventListener('hivemind:ui-language', heard);
  });

  it('Brain-only copy names no employee or colleague in the card, its defaults or any shipped language', () => {
    const fs = require('fs'); const path = require('path');
    const words = /employee|colleague|coworker|teammate|team member|digest|hand-?off|mitarbeiter|kolleg|employé|collègue|empleado|colega|कर्मचारी|सहकर्मी|従業員|同僚|社員|موظف|زميل|زملاء/i;
    const strings = [];
    for (const language of ['en', 'de', 'fr', 'es', 'hi', 'ja', 'ar']) {
      const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, `../../../../../public/locales/${language}/dashboard.json`), 'utf8'));
      const flat = node => typeof node === 'string' ? [node] : Object.values(node || {}).flatMap(flat);
      expect(Object.keys(dictionary.brainGetStarted.steps)).toEqual(expect.arrayContaining(['language', 'company', 'source', 'ask', 'remember', 'connect', 'invite']));
      strings.push(...flat(dictionary.brainGetStarted).map(text => [language, text]));
    }
    const source = fs.readFileSync(path.join(__dirname, 'BrainGetStarted.jsx'), 'utf8');
    const defaults = source.slice(source.indexOf('const FALLBACK = {'), source.indexOf('};', source.indexOf('const FALLBACK = {')));
    strings.push(...[...defaults.matchAll(/'([^']+)'/g)].map(match => ['source', match[1]]));
    expect(strings.length).toBeGreaterThan(60);
    expect(strings.filter(([, text]) => words.test(text))).toEqual([]);
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
    expect(document.body.textContent).not.toMatch(/Getting Started|Connect your apps|of 7/);
    expect(document.body.textContent).toContain(new Intl.NumberFormat('ar').format(7));
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByText('はじめに')).toBeTruthy();
  });

  it('uses logical alignment so Arabic text and the open chip card follow the reading direction', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'RuntimeGetStarted.css'), 'utf8');
    expect(css).not.toMatch(/text-align:\s*left/);
    expect(css).toMatch(/hm-runtime-start-card\[open\][^}]*inset-inline-end:0/);
  });
});
