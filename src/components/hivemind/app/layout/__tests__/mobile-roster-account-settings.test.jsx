import React, { useEffect, useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeMobileNavigation from '../EmployeeMobileNavigation';

jest.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className, ...props }) => <a href={to} className={typeof className === 'function' ? className({}) : className} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/hivemind/app/employees', search: '' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('@humation/react', () => ({ __esModule: true, default: () => null, HumationAvatar: () => null }), { virtual: true });
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => <span/> }));
jest.mock('../../shared/RuntimeAvatar', () => ({ __esModule: true, default: () => <span/>, RuntimeAppearanceProvider: ({ children }) => children }));
jest.mock('../AutonomyDial', () => ({ __esModule: true, default: () => null }));
jest.mock('../AnatomyModeToggle', () => ({ __esModule: true, default: () => null }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: { name: 'Acme' }, user: { display_name: 'Amar' } }) }));
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getWebAdminMetrics: () => Promise.reject(new Error('no')) } }));
jest.mock('../../shared/useUsage', () => ({ useUsage: () => ({ usage: null }) }));
jest.mock('../WorkspaceNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('../LangSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init() {} }, useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key }) }));
jest.mock('../../shared/AccountSettingsDialog', () => ({ __esModule: true, default: ({ onClose }) => <section role="dialog" aria-label="Account settings"><span>Notifications &amp; permissions</span><button onClick={onClose}>x</button></section> }));

beforeAll(() => {
  window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});
afterEach(cleanup);

// Mirrors AppShell: the drawer state and the hm:open-account-settings listener live in the shell.
function Host() {
  const [drawer, setDrawer] = useState(true);
  const [account, setAccount] = useState(false);
  useEffect(() => { const open = () => setAccount(true); window.addEventListener('hm:open-account-settings', open); return () => window.removeEventListener('hm:open-account-settings', open); }, []);
  const Dialog = require('../../shared/AccountSettingsDialog').default;
  return <>{drawer && <EmployeeMobileNavigation activeSection="hivemind" onClose={() => setDrawer(false)} />}{account && <Dialog onClose={() => setAccount(false)} />}</>;
}

test.each([
  ['Account and security row', () => screen.getByText('Account and security').closest('button')],
  ['gear icon', () => screen.getByRole('button', { name: 'Settings' })],
])('phone roster %s closes the drawer and opens account settings', (_name, target) => {
  render(<Host />);
  expect(screen.getByRole('dialog', { name: 'Your team' })).toBeInTheDocument();
  fireEvent.click(target());
  expect(screen.queryByRole('dialog', { name: 'Your team' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Account settings' })).toBeInTheDocument();
  expect(screen.getByText('Notifications & permissions')).toBeInTheDocument();
});
