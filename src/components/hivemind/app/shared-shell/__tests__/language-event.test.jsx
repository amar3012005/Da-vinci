/**
 * The OpenDot room announces its language with `hivemind:set-language`; the shared sidebar follows without a reload and
 * `<html dir>` flips to rtl for Arabic and back to ltr (tracker wk-lang-proof, code part). Uses the app's real i18next instance.
 */
import React, { act } from 'react';
import { mount } from '../entry';
import i18n from '../../../../../i18n';

// The dictionaries are added from the JSON files below; the HTTP backend would only try to reach a server from jsdom.
jest.mock('i18next-http-backend', () => ({ __esModule: true, default: { type: 'backend', init() {}, read(language, namespace, callback) { callback(null, {}); } } }));
jest.mock('react-router-dom', () => ({ Router: props => props.children }), { virtual: true });
jest.mock('../../auth/AuthProvider', () => ({ AuthProvider: ({ children }) => children, useAuth: () => ({ loading: false, isAuthenticated: true, user: { id: 'u' }, org: { id: 'o' } }) }));
jest.mock('../../layout/Sidebar', () => ({ __esModule: true, default: function Sidebar() { const s = require('../../layout/sidebar-copy').useSidebarCopy(); return <aside data-testid="shared-sidebar">{s('yourTeam', 'Your team')}</aside>; } }));

const fs = require('fs');
const path = require('path');

const dictionary = (locale, namespace) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..', 'public', 'locales', locale, `${namespace}.json`), 'utf8'));
const announce = locale => act(async () => { window.dispatchEvent(new CustomEvent('hivemind:set-language', { detail: { locale } })); await Promise.resolve(); });
const dir = () => document.documentElement.getAttribute('dir');

let host; let cleanup;
beforeAll(async () => {
  for (const locale of ['en', 'hi', 'ja', 'ar']) for (const namespace of ['common', 'dashboard']) i18n.addResourceBundle(locale, namespace, dictionary(locale, namespace), true, true);
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, 'location', { configurable: true, value: { hostname: 'dots.singulancelabs.com', pathname: '/apps', search: '', hash: '', assign: jest.fn(), replace: jest.fn(), reload: jest.fn() } });
  host = document.createElement('div'); document.body.append(host);
  act(() => { cleanup = mount(host, { identity: { userId: 'u', organizationId: 'o' }, stylesheet: '/s.css' }); });
});
afterEach(async () => { act(() => cleanup()); host.remove(); await act(async () => { await i18n.changeLanguage('en'); }); });

test.each(['hi', 'ja', 'ar'])('a set-language event for %s re-renders the shared sidebar in place with the right direction', async locale => {
  const text = () => host.shadowRoot.querySelector('[data-testid="shared-sidebar"]').textContent;
  const node = host.shadowRoot.querySelector('[data-testid="shared-sidebar"]');
  expect(text()).toBe(dictionary('en', 'dashboard').sidebar.yourTeam);
  await announce(locale);
  expect(text()).toBe(dictionary(locale, 'dashboard').sidebar.yourTeam);
  expect(text()).not.toBe(dictionary('en', 'dashboard').sidebar.yourTeam);
  expect(host.shadowRoot.querySelector('[data-testid="shared-sidebar"]')).toBe(node);
  expect(dir()).toBe(locale === 'ar' ? 'rtl' : 'ltr');
});

test('Arabic sets dir=rtl and the next language sets it back to ltr, through the event alone', async () => {
  await announce('ar'); expect(dir()).toBe('rtl');
  await announce('hi'); expect(dir()).toBe('ltr');
  await announce('ar'); await announce('en'); expect(dir()).toBe('ltr');
});
