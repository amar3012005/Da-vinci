import { mobileBrainUserName } from './mobile-brain-identity';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import TopBar from './TopBar';
import MobileShell from '../mobile/MobileShell';
import MobileBrainAddSheet from './MobileBrainAddSheet';
import { LegacyMobileAppsSheet } from '../mobile/LegacyChatSheets';

const mockNavigate = jest.fn();
let mockPath = '/hivemind/app/overview/new';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath }), useNavigate: () => mockNavigate }), { virtual: true });

jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ org: { name: 'SINGULANCE' } }) }));
jest.mock('../shared/useUsage', () => ({ useUsage: () => ({ usage: {} }) }));
jest.mock('../shared/CreditBalance', () => () => null);
jest.mock('../shared/SingulanceMark', () => () => null);
jest.mock('../shared/SingulanceBrand', () => () => <span>SINGULANCE</span>);
jest.mock('../mobile/SingulanceSplash', () => () => null);
jest.mock('../shared/hooks', () => ({ useHealthStatus: () => true }));
jest.mock('../shared/api-client', () => ({ listEmployees: () => Promise.resolve([]) }));
jest.mock('../shared/QuickRecorderProvider', () => ({ useQuickRecorder: () => ({ supported: true, active: false, openConfig: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, fallback) => typeof fallback === 'string' ? fallback : fallback?.defaultValue || key }) }));
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
afterEach(() => { act(() => root.unmount()); host.remove(); });
const render = node => act(() => root.render(node));

test('phone Brain header uses its identity and organization, with plain menu and language', async () => {
  mockPath = '/hivemind/app/overview/session/session-one';
  await act(async () => root.render(<TopBar mobileTeamToggle={() => {}} />));
  expect(host.querySelector('[data-mobile-brain-header]')).not.toBeNull();
  expect(host.querySelector('h1').textContent).toBe('Brain');
  expect(host.textContent).toContain('SINGULANCE');
  expect(host.querySelector('[aria-label="Open your team"]').className).not.toContain('rounded');
  expect(host.querySelector('[aria-label="Language"]')).not.toBeNull();
  expect(host.textContent).not.toContain('Recents');
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


test('native Brain reuses actual legacy MobileShell navigation and Recents closes its drawer', async () => {
  mockPath = '/hivemind/app/overview/new';
  const history = jest.fn(); window.addEventListener('hivemind:mobile-history', history);
  await act(async () => root.render(<MobileShell noScroll nativeChatViewport activeNavPath="/hivemind/m/chat" renderHeader={({ openDrawer }) => <TopBar mobileTeamToggle={openDrawer} />} extraDrawerActions={({ closeDrawer }) => <button onClick={() => { closeDrawer(); window.dispatchEvent(new Event('hivemind:mobile-history')); }}>Recents</button>}><div>Native chat</div></MobileShell>));
  expect(host.querySelector('[data-mobile-native-chat]')).not.toBeNull();
  act(() => host.querySelector('[aria-label="Open your team"]').click());
  const nav = host.querySelector('nav');
  expect([...nav.querySelectorAll('button')].map(button => button.textContent.trim())).toEqual(['Chat', 'Memories', 'Memory Graph', 'Meeting Notes', 'Connectors', 'Projects', 'Usage', 'Billing', 'Profile', 'Settings']);
  act(() => [...nav.querySelectorAll('button')].find(button => button.textContent.trim() === 'Connectors').click());
  expect(mockNavigate).toHaveBeenCalledWith('/hivemind/m/connectors');
  act(() => [...host.querySelectorAll('button')].find(button => button.textContent === 'Recents').click());
  expect(host.querySelector('nav')).toBeNull();
  expect(history).toHaveBeenCalledTimes(1);
  window.removeEventListener('hivemind:mobile-history', history);
});

test('other legacy pages retain default MobileShell header and viewport', () => {
  mockPath = '/hivemind/m/connectors';
  render(<MobileShell><div>Legacy connectors</div></MobileShell>);
  expect(host.querySelector('[data-mobile-native-chat]')).toBeNull();
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
