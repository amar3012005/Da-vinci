/**
 * Switching the interface language at run time re-renders the shell sidebar, the Brain first-run card and the onboarding
 * card in place, with no reload: the DOM nodes stay mounted, their text changes, and `<html dir>` follows the language
 * (rtl for Arabic, ltr again for the rest). Uses the app's real i18next instance, so the `languageChanged` handler that
 * sets `dir` is the production one. Live screenshots are a separate step (tracker wk-lang-proof).
 */
import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Brain } from 'lucide-react';
import i18n from '../../../../../i18n';
import '../../shared/onboarding/onboarding-i18n';
import DesktopBrainNavigation from '../DesktopBrainNavigation';
import BrainGetStarted from '../BrainGetStarted';
import GetStartedCard from '../GetStartedCard';
import { STEP_IDS } from '../../shared/onboarding/registry';

// The dictionaries are added from the JSON files below; the HTTP backend would only try to reach a server from jsdom.
jest.mock('i18next-http-backend', () => ({ __esModule: true, default: { type: 'backend', init() {}, read(language, namespace, callback) { callback(null, {}); } } }));
jest.mock('../../shared/api-client', () => ({ listDocuments: jest.fn(async () => ({ documents: [] })), listMemories: jest.fn(async () => ({ memories: [] })), getConnectorConnectionStatus: jest.fn(async () => ({ connectors: [] })) }));
jest.mock('../../shared/agent-roster', () => ({ agentRoster: { peek: () => [] } }));
const mockState = { view: null, store: null, error: '' };
jest.mock('../../shared/onboarding/onboarding-store', () => ({ useOnboarding: () => mockState }));

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['hi', 'ja', 'ar'];
const dictionary = (locale, namespace = 'dashboard') => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', locale, `${namespace}.json`), 'utf8'));
const onboarding = require('../../shared/onboarding/onboarding-locales.json');
const link = (to, label) => ({ to: `/hivemind/app/${to}`, label, icon: Brain });
const sections = [{ items: [link('overview', 'Overview'), link('memories', 'Memories')] }];

const dir = () => document.documentElement.getAttribute('dir');
const switchTo = async language => { await act(async () => { await i18n.changeLanguage(language); }); };

beforeAll(async () => {
  for (const locale of ['en', ...LANGUAGES]) for (const namespace of ['common', 'dashboard']) i18n.addResourceBundle(locale, namespace, dictionary(locale, namespace), true, true);
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  localStorage.clear();
  mockState.view = { version: 1, open: true, locale: null, surfaces: {}, steps: STEP_IDS.map(id => ({ id, status: id === 'awaken' ? 'done' : 'todo', ready: false })), proactive: { state: 'waiting', item: null } };
  mockState.store = { track: jest.fn(), milestone: jest.fn(), confirmLocale: jest.fn(), closeSurfaces: jest.fn() };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(async () => { await switchTo('en'); });

const mountSurfaces = (route = '/hivemind/app/overview') => render(<MemoryRouter initialEntries={[route]}>
  <div data-testid="sidebar"><DesktopBrainNavigation sections={sections} user={{ display_name: 'Amar' }} planLabel="Plan" credits={{ percent_used: 41, remaining: 2358, included: 4000 }} logout={jest.fn()} banner={null} /></div>
  <div data-testid="brain-card"><BrainGetStarted scope="user:org" /></div>
  <div data-testid="onboarding-card"><GetStartedCard userId="u" orgId="o" /></div>
</MemoryRouter>);

test('the three surfaces start in English from the same dictionaries the other tests read', async () => {
  mountSurfaces(); await act(async () => {});
  expect(screen.getByTestId('sidebar').textContent).toContain(dictionary('en').sidebar.askMeAnything);
  expect(screen.getByTestId('brain-card').textContent).toContain(dictionary('en').brainGetStarted.title);
  expect(screen.getByTestId('onboarding-card').textContent).toContain(onboarding.en.title);
  expect(dir()).toBe('ltr');
});

test.each(LANGUAGES)('switching to %s re-renders the sidebar, the Brain first-run card and onboarding in place, without a reload', async language => {
  const { container } = mountSurfaces(); await act(async () => {});
  const nodes = ['sidebar', 'brain-card', 'onboarding-card'].map(id => screen.getByTestId(id));
  const aside = nodes[0].querySelector('aside, nav');
  expect(aside).toBeTruthy();
  const english = { sidebar: dictionary('en').sidebar.askMeAnything, brain: dictionary('en').brainGetStarted.title, onboarding: onboarding.en.title };
  const translated = { sidebar: dictionary(language).sidebar.askMeAnything, brain: dictionary(language).brainGetStarted.title, onboarding: onboarding[language].title };
  for (const key of Object.keys(english)) expect(translated[key]).not.toBe(english[key]);

  await switchTo(language);

  expect(screen.getByTestId('sidebar').textContent).toContain(translated.sidebar);
  expect(screen.getByTestId('sidebar').textContent).not.toContain(english.sidebar);
  expect(screen.getByTestId('brain-card').textContent).toContain(translated.brain);
  expect(screen.getByTestId('brain-card').textContent).not.toContain(english.brain);
  expect(screen.getByTestId('onboarding-card').textContent).toContain(translated.onboarding);
  expect(screen.getByTestId('onboarding-card').textContent).not.toContain(english.onboarding);
  // Same DOM nodes: the tree re-rendered, it was not remounted or reloaded.
  expect(['sidebar', 'brain-card', 'onboarding-card'].map(id => screen.getByTestId(id))).toEqual(nodes);
  expect(nodes[0].querySelector('aside, nav')).toBe(aside);
  expect(container.isConnected).toBe(true);
  expect(document.documentElement.getAttribute('lang')).toBe(language);
  expect(dir()).toBe(language === 'ar' ? 'rtl' : 'ltr');
});

test('the document direction goes rtl for Arabic and back to ltr for every other language', async () => {
  mountSurfaces(); await act(async () => {});
  const seen = [];
  for (const language of ['hi', 'ar', 'ja', 'ar', 'en']) { await switchTo(language); seen.push(`${language}:${dir()}`); }
  expect(seen).toEqual(['hi:ltr', 'ar:rtl', 'ja:ltr', 'ar:rtl', 'en:ltr']);
});

test('the Arabic walkthrough card reads in Arabic with the Beta tag in its language list', async () => {
  mountSurfaces('/hivemind/app/crm'); await act(async () => {});
  await switchTo('ar');
  const options = screen.getAllByRole('option').map(option => option.textContent);
  expect(options).toContain(`العربية (${onboarding.ar.beta})`);
  expect(options).toContain(`Deutsch (${onboarding.ar.beta})`);
  expect(options).toContain('English');
});
