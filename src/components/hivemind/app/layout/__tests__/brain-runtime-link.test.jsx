/* eslint-disable testing-library/no-node-access -- The phone roster Runtime tile has no accessible name beyond its avatar and label. */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { RUNTIME_WORKSPACE } from '../../shared/runtime-workspace';

jest.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className, ...props }) => <a href={to} className={typeof className === 'function' ? className({}) : className} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/hivemind/app/overview/session/session-1', search: '' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('@humation/react', () => ({ __esModule: true, default: () => null, HumationAvatar: () => null }), { virtual: true });
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => <span/> }));
jest.mock('../../shared/RuntimeAvatar', () => ({ __esModule: true, default: () => <span/>, RuntimeAppearanceProvider: ({ children }) => children }));
jest.mock('../AutonomyDial', () => ({ __esModule: true, default: () => null }));
jest.mock('../AnatomyModeToggle', () => ({ __esModule: true, default: () => null }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: { id: 'o', name: 'Acme' }, user: { id: 'u', display_name: 'Amar' } }) }));
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getWebAdminMetrics: () => Promise.reject(new Error('no')) } }));
jest.mock('../../shared/useUsage', () => ({ useUsage: () => ({ usage: null }) }));
jest.mock('../WorkspaceNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('../LangSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key }) }));

const original = window.location;
beforeAll(() => {
  window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});
afterAll(() => { window.location = original; });

test('Runtime in the phone roster on the Brain host opens the Runtime room on its own host', async () => {
  delete window.location;
  window.location = { hostname: 'next.singulancelabs.com', pathname: '/hivemind/app/overview/session/session-1', search: '', href: 'https://next.singulancelabs.com/hivemind/app/overview/session/session-1', assign: jest.fn() };
  const { container } = render(<Sidebar collapsed={false} mobileDrawer mobileRoster />);
  fireEvent.click(container.querySelector('.mobile-roster-runtime'));
  await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith(RUNTIME_WORKSPACE));
});
