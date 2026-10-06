/* eslint-disable testing-library/no-unnecessary-act -- These tests use React DOM createRoot, not Testing Library render. */
import NativeMobileAppsSheet from './NativeMobileAppsSheet';
import apiClient from '../shared/api-client';
import { mobileBrainUserName, mobileBrainGreeting } from './mobile-brain-identity';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import TopBar from './TopBar';
import MobileShell from '../mobile/MobileShell';
import MobileBrainAddSheet from './MobileBrainAddSheet';
import MobileBrainHeaderActions from './MobileBrainHeaderActions';
import { LegacyMobileAppsSheet } from '../mobile/LegacyChatSheets';

const mockNavigate = jest.fn();
let mockPath = '/hivemind/app/overview/new';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath }), useNavigate: () => mockNavigate }), { virtual: true });

jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ org: { name: 'SINGULANCE' } }) }));
jest.mock('../shared/useUsage', () => ({ useUsage: () => ({ usage: {} }) }));
jest.mock('../shared/CreditBalance', () => () => null);
jest.mock('../shared/SingulanceMark', () => () => <span data-legacy-fish-logo />);
jest.mock('../shared/SingulanceBrand', () => () => <span>SINGULANCE</span>);
jest.mock('../mobile/SingulanceSplash', () => () => null);
jest.mock('../shared/hooks', () => ({ useHealthStatus: () => true }));
jest.mock('../shared/api-client', () => ({ listEmployees: () => Promise.resolve([]), listComposioToolkits: jest.fn(), startConnectorOAuth: jest.fn(), createComposioConnectLink: jest.fn() }));
jest.mock('../shared/QuickRecorderProvider', () => ({ useQuickRecorder: () => ({ supported: true, active: false, openConfig: jest.fn() }) }));
const mockI18n = { language: 'en', changeLanguage: jest.fn() };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: mockI18n, t: (key, fallback) => typeof fallback === 'string' ? fallback : fallback?.defaultValue || key }) }));
jest.mock('./LangSwitcher', () => () => <button aria-label="Language">EN</button>);
jest.mock('./WorkspaceNotifications', () => () => <button>Notifications</button>);
jest.mock('../hyperagents/AgentAvatar', () => () => null);
let host, root;
beforeEach(() => {
  window.localStorage.setItem('hm_m_splashed', '1');
  mockNavigate.mockClear();
  window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => { act(() => root.unmount()); host.remove(); jest.useRealTimers(); jest.clearAllMocks(); });
const render = node => act(() => root.render(node));

test('shared TopBar remains unchanged for Brain; mobile shell owns the mobile header', async () => {
  mockPath = '/hivemind/app/overview/session/session-one';
  await act(async () => root.render(<TopBar />));
  expect(host.querySelector('[data-mobile-brain-header]')).toBeNull();
  expect(host.querySelector('h1').textContent).toBe('SINGULANCE');
});
test.each(['/hivemind/app/employee/harness/session/session-one', '/hivemind/app/connectors'])('other routes retain existing header: %s', async route => {
  mockPath = route;
  await act(async () => root.render(<TopBar mobileTeamToggle={() => {}} />));
  expect(host.querySelector('[data-mobile-brain-header]')).toBeNull();
});
test('desktop Brain retains its existing header', async () => {
  window.matchMedia.mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() });
  mockPath = '/hivemind/app/overview/new';
  await act(async () => root.render(<TopBar />));
  expect(host.querySelector('[data-mobile-brain-header]')).toBeNull();
});
test('legacy Add presentation dispatches native intake and mode actions without sending', () => {
  const listener = jest.fn(); window.addEventListener('hivemind:mobile-brain-action', listener);
  render(<MobileBrainAddSheet onClose={() => {}} onConnectors={() => {}} />);
  const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));
  for (const label of ['Photo', 'Camera', 'File', 'Deep Research', 'Search']) act(() => button(label).click());
  expect(listener.mock.calls.map(([event]) => event.detail.kind)).toEqual(['photo', 'camera', 'file', 'research', 'search']);
  expect(host.textContent).toContain('Start taking meeting notes');
  window.removeEventListener('hivemind:mobile-brain-action', listener);
});
test('legacy Apps presentation keeps search, connected badge and selection', () => {
  const select = jest.fn();
  render(<LegacyMobileAppsSheet connectorSheetOpen onClose={() => {}} connectorSearch="" setConnectorSearch={() => {}} visibleToolkits={[{ slug: 'gmail', name: 'Gmail', connected: true }]} chooseToolkit={select} />);
  expect(host.querySelector('input').placeholder).toBe('Search Gmail, Slack, Calendar…');
  expect(host.textContent).toContain('Ready for this chat');
  act(() => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Gmail')).click());
  expect(select).toHaveBeenCalledWith({ slug: 'gmail', name: 'Gmail', connected: true });
});

test('legacy Add keeps focus inside and dismisses on Escape', () => {
  const close = jest.fn();
  render(<MobileBrainAddSheet onClose={close} onConnectors={() => {}} />);
  const buttons = [...host.querySelectorAll('button')];
  expect(document.activeElement).toBe(buttons[0]);
  buttons[buttons.length - 1].focus();
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
  expect(document.activeElement).toBe(buttons[0]);
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(close).toHaveBeenCalled();
});

test('legacy Apps traps focus and closes with Escape', () => {
  const close = jest.fn();
  render(<LegacyMobileAppsSheet connectorSheetOpen onClose={close} connectorSearch="" setConnectorSearch={() => {}} visibleToolkits={[{ slug: 'gmail', name: 'Gmail', connected: true }]} chooseToolkit={() => {}} />);
  expect(document.activeElement).toBe(host.querySelector('input'));
  const buttons = [...host.querySelectorAll('button')];
  buttons[buttons.length - 1].focus();
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
  expect(document.activeElement).toBe(buttons[0]);
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(close).toHaveBeenCalled();
});


test('native Brain uses original bare chat header and identical sidebar destinations', async () => {
  mockPath = '/hivemind/app/overview/new';
  await act(async () => root.render(<MobileShell noScroll bareHeader showBareLogo={false} nativeChatViewport activeNavPath="/hivemind/m/chat"><MobileBrainHeaderActions /><div>Native chat</div></MobileShell>));
  expect(host.querySelector('[data-mobile-native-chat]')).not.toBeNull();
  expect(host.querySelector('[data-legacy-fish-logo]')).toBeNull();
  expect(host.querySelector('.hm-mobile-brain-header-title').textContent).toBe('BRAIN');
  expect(host.querySelector('.hm-mobile-brain-header-org').textContent).toBe('SINGULANCE');
  expect(host.querySelector('.hm-mobile-brain-header-icon svg').getAttribute('aria-label')).toBe('Brain');
  expect(host.querySelector('[data-mobile-brain-header]')).toBeNull();
  act(() => host.querySelector('[aria-label="Menu"]').click());
  const nav = host.querySelector('nav');
  expect([...nav.querySelectorAll('button')].map(button => button.textContent.trim())).toEqual(['Chat', 'Memories', 'Memory Graph', 'Meeting Notes', 'Connectors', 'Projects', 'Usage', 'Billing', 'Profile', 'Settings']);
  expect(nav.textContent).not.toContain('Recents');
  expect(host.querySelector('[aria-label="Recent conversations"]')).not.toBeNull();
  act(() => [...nav.querySelectorAll('button')].find(button => button.textContent.trim() === 'Connectors').click());
  expect(mockNavigate).toHaveBeenCalledWith('/hivemind/m/connectors');
});

test('other legacy pages retain default MobileShell header and viewport', () => {
  mockPath = '/hivemind/m/connectors';
  render(<MobileShell><div>Legacy connectors</div></MobileShell>);
  expect(host.querySelector('[data-mobile-native-chat]')).toBeNull();
  expect(host.querySelector('.hm-mobile-brain-header-identity')).toBeNull();
  expect(host.querySelector('[aria-label="Menu"]')).not.toBeNull();
  expect(host.querySelector('[data-mobile-brain-header]')).toBeNull();
});


test('mobile greeting identity uses the actual name and never derives it from email', () => {
  expect(mobileBrainUserName({ display_name: '  Amar Sai  ', name: 'Other', email: 'private@example.com' }, true)).toBe('Amar Sai');
  expect(mobileBrainUserName({ display_name: '  ', name: ' Mateo ' }, true)).toBe('Mateo');
  expect(mobileBrainUserName({ email: 'private@example.com' }, true)).toBeUndefined();
});

test('greeting identity is omitted outside mobile Brain and when absent', () => {
  const user = { display_name: 'Amar Sai' };
  render(<div data-mobile-brain-user-name={mobileBrainUserName(user, false)} />);
  expect(host.querySelector('[data-mobile-brain-user-name]')).toBeNull();
  expect(mobileBrainUserName(null, true)).toBeUndefined();
  render(<div data-mobile-brain-user-name={mobileBrainUserName(user, true)} />);
  expect(host.querySelector('[data-mobile-brain-user-name]').dataset.mobileBrainUserName).toBe('Amar Sai');
});


test.each([[8, 'overview.morning'], [14, 'overview.afternoon'], [21, 'overview.evening']])('greeting reuses existing translated time key at hour %s', (hour, key) => {
  const translate = jest.fn(() => 'Localized greeting');
  expect(mobileBrainGreeting({ display_name: 'Amar Sai' }, true, translate, hour)).toBe('Localized greeting, Amar');
  expect(translate.mock.calls[0][0]).toBe(key);
  expect(mobileBrainGreeting({ email: 'private@example.com' }, true, translate, hour)).toBe('Localized greeting');
  expect(mobileBrainGreeting({ name: 'Amar' }, false, translate, hour)).toBeUndefined();
});

test('native Apps reports loading from initial paint and connected selection does not start OAuth', async () => {
  jest.useFakeTimers();
  let resolveCatalog;
  apiClient.listComposioToolkits.mockReturnValue(new Promise(resolve => { resolveCatalog = resolve; }));
  const selected = jest.fn(); const close = jest.fn();
  window.addEventListener('hivemind:connector-selected', selected);
  render(<NativeMobileAppsSheet legacy onClose={close} />);
  expect(host.querySelector('[role="status"]').textContent).toBe('Loading apps…');
  expect(host.textContent).not.toContain('No apps match');
  await act(async () => { jest.advanceTimersByTime(200); });
  expect(apiClient.listComposioToolkits).toHaveBeenCalledWith({ catalog: true, limit: 100 });
  expect(host.textContent).not.toContain('No apps match');
  await act(async () => resolveCatalog({ toolkits: [{ slug: 'gmail', name: 'Gmail', connected: true }] }));
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.textContent).toContain('Connected');
  act(() => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Gmail')).click());
  expect(selected.mock.calls[0][0].detail).toEqual({ name: 'Gmail' });
  expect(close).toHaveBeenCalledTimes(1);
  expect(apiClient.startConnectorOAuth).not.toHaveBeenCalled();
  expect(apiClient.createComposioConnectLink).not.toHaveBeenCalled();
  window.removeEventListener('hivemind:connector-selected', selected);
});

test('native Apps surfaces request rejection without a false empty catalog', async () => {
  jest.useFakeTimers();
  apiClient.listComposioToolkits.mockRejectedValue(new Error('Catalog request failed'));
  render(<NativeMobileAppsSheet legacy onClose={() => {}} />);
  await act(async () => { jest.advanceTimersByTime(200); });
  expect(host.querySelector('[role="alert"]').textContent).toBe('Catalog request failed');
  expect(host.textContent).not.toContain('No apps match');
  expect(host.querySelector('[role="status"]')).toBeNull();
});

test.each(['<html>Login page</html>', {}, { toolkits: 'bad' }, { toolkits: [null] }])('native Apps rejects malformed successful responses: %j', async data => {
  jest.useFakeTimers();
  apiClient.listComposioToolkits.mockResolvedValue(data);
  render(<NativeMobileAppsSheet legacy onClose={() => {}} />);
  await act(async () => { jest.advanceTimersByTime(200); });
  expect(host.querySelector('[role="alert"]').textContent).toContain('invalid catalog');
  expect(host.textContent).not.toContain('No apps match');
});


test('original floating language and Recents controls route only to native history', () => {
  const history = jest.fn(); window.addEventListener('hivemind:mobile-history', history);
  render(<MobileBrainHeaderActions />);
  act(() => host.querySelector('[aria-label="Reply language"]').click());
  act(() => [...host.querySelectorAll('button')].find(b => b.textContent.startsWith('Deutsch')).click());
  expect(mockI18n.changeLanguage).toHaveBeenCalledWith('de');
  expect(host.textContent).not.toContain('Deutsch');
  act(() => host.querySelector('[aria-label="Reply language"]').click());
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.activeElement).toBe(host.querySelector('[aria-label="Reply language"]'));
  act(() => host.querySelector('[aria-label="Recent conversations"]').click());
  expect(history).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  window.removeEventListener('hivemind:mobile-history', history);
});
