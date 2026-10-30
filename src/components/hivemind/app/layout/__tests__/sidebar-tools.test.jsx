import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesktopHyperAgentsNavigation from '../DesktopHyperAgentsNavigation';
import Sidebar from '../Sidebar';

jest.mock('@humation/react', () => ({ __esModule: true, default: () => null, HumationAvatar: () => null }), { virtual: true });
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../../shared/RuntimeAvatar', () => ({ __esModule: true, default: () => null, RuntimeAppearanceProvider: ({ children }) => children }));
jest.mock('../AutonomyDial', () => ({ __esModule: true, default: () => null }));
jest.mock('../AnatomyModeToggle', () => ({ __esModule: true, default: () => null }));
jest.mock('../WorkspaceNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('../LangSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getWebAdminMetrics: () => Promise.reject(new Error('no')) } }));
jest.mock('../../shared/useUsage', () => ({ useUsage: () => ({ usage: null }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key }) }));
let mockOrg = { name: 'Acme' };
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: mockOrg, user: { display_name: 'Amar' } }) }));

beforeAll(() => {
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});

/** An OpenDot employee room: the native Runtime client is not mounted here. */
const ROOM = '/hivemind/app/employee/dots/employee/00000000-0000-4000-8000-000000000001';
const team = [{ id: 'agent-0', name: 'Faraday', role: 'Researcher' }];
const props = { team, rooms: [], selectedAgent: 'agent-0', openingAgent: null, columns: 3, user: { display_name: 'Amar' }, planLabel: 'Pro', onOpenAgent: jest.fn(), onCreate: jest.fn(), onCompany: jest.fn(), logout: jest.fn(), orgId: 'org-a' };

function expectTools(scope) {
  const calendar = within(scope).getByRole('link', { name: /Calendar/ });
  const library = within(scope).getByRole('link', { name: /Library/ });
  expect(calendar).toHaveAttribute('href', '/hivemind/app/employee/calendar');
  expect(library).toHaveAttribute('href', '/hivemind/app/employee/library');
  expect(within(scope).queryByRole('link', { name: /Artifacts/ })).toBeNull();
  expect(scope.querySelector('[disabled]')).toBeNull();
  expect(scope.querySelector('.ha-artifacts-unavailable, [data-hivemind-calendar-seat], [data-hivemind-artifacts-seat]')).toBeNull();
  expect(scope.querySelectorAll('a[href="/hivemind/app/employee/library"]')).toHaveLength(1);
}

describe.each([['with Runtime', true], ['without Runtime', false]])('Calendar and Library in an employee room %s', (unused, runtimeEnabled) => {
  beforeEach(() => { mockOrg = runtimeEnabled ? { name: 'Acme' } : { name: 'Acme', runtime_enabled: false }; });

  test('the desktop team sidebar renders both as working links, expanded and collapsed', () => {
    const view = element => <MemoryRouter initialEntries={[ROOM]}>{element}</MemoryRouter>;
    const r = render(view(<DesktopHyperAgentsNavigation {...props} runtimeEnabled={runtimeEnabled} collapsed={false} />));
    expectTools(screen.getByRole('navigation', { name: 'Workspace tools' }));
    r.unmount();
    render(view(<DesktopHyperAgentsNavigation {...props} runtimeEnabled={runtimeEnabled} collapsed />));
    const tools = screen.getByRole('navigation', { name: 'Workspace tools' });
    expect(tools.querySelector('[data-sidebar-tool="calendar"]')).toHaveAttribute('title', 'Calendar');
    expect(tools.querySelector('[data-sidebar-tool="library"]')).toHaveAttribute('title', 'Library');
  });

  test('the phone roster renders both as working links', () => {
    const { container } = render(<MemoryRouter initialEntries={[ROOM]}><Sidebar collapsed={false} mobileDrawer mobileRoster /></MemoryRouter>);
    expectTools(container.querySelector('.mobile-roster-shortcuts'));
  });

  test('the narrow drawer renders both as working links', () => {
    const { container } = render(<MemoryRouter initialEntries={[ROOM]}><Sidebar collapsed={false} mobileDrawer /></MemoryRouter>);
    expectTools(container.querySelector('aside'));
  });
});
