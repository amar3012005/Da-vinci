import React from 'react';
jest.mock('react-router-dom', () => {
 global.TextEncoder = require('util').TextEncoder;
 return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesktopHyperAgentsNavigation from '../DesktopHyperAgentsNavigation';
import { useRuntimeRouteGuard } from '../useRuntimeRouteGuard';
import { agentRoster } from '../../shared/agent-roster';
import { setEmployeeRoomOpen } from '../../shared/runtime-enabled';

jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../../shared/RuntimeAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({}) }));
jest.mock('../AutonomyDial', () => ({ __esModule: true, default: ({ runtimeEnabled }) => <div data-testid="dial" data-runtime-enabled={String(runtimeEnabled)} /> }));

const team = [{ id: 'agent-0', name: 'Mia', role: 'Researcher' }];
const props = { team, rooms: [], selectedAgent: null, openingAgent: null, columns: 3, collapsed: false, user: { display_name: 'Amar' }, planLabel: 'Enterprise', onOpenAgent: jest.fn(), onCreate: jest.fn(), onCompany: jest.fn(), logout: jest.fn(), orgId: 'org-a' };
const view = overrides => <MemoryRouter><DesktopHyperAgentsNavigation {...props} {...overrides} /></MemoryRouter>;

describe('team sidebar without Runtime', () => {
  test('hides the Runtime card but keeps employees, Apps, Artifacts, Calendar, Company HQ and Library', () => {
    render(view({ runtimeEnabled: false }));
    expect(screen.queryByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeNull();
    expect(screen.queryByText('AI Chief of Staff')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mia, Researcher' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create employee' })).toBeInTheDocument();
    const tools = screen.getByRole('navigation', { name: 'Workspace tools' });
    expect(within(tools).getByText('Apps')).toBeInTheDocument();
    expect(within(tools).getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/hivemind/app/employee/calendar');
    expect(within(tools).getByRole('link', { name: 'Artifacts' })).toHaveAttribute('href', '/hivemind/app/employee/artifacts');
    expect(within(tools).getByText('Company HQ')).toBeInTheDocument();
    expect(within(tools).getByText('Library')).toBeInTheDocument();
    expect(screen.getByTestId('dial')).toHaveAttribute('data-runtime-enabled', 'false');
  });

  test('shows the Runtime card by default and when enabled', () => {
    const r = render(view());
    expect(screen.getByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeInTheDocument();
    expect(screen.getByTestId('dial')).toHaveAttribute('data-runtime-enabled', 'true');
    r.rerender(view({ runtimeEnabled: false }));
    expect(screen.queryByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeNull();
    r.rerender(view({ runtimeEnabled: true }));
    expect(screen.getByRole('button', { name: 'Runtime, AI Chief of Staff' })).toBeInTheDocument();
  });
});

describe('Runtime route guard', () => {
  const READY = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const ready = { id: READY, name: 'Mia', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-1' } } };
  function Probe({ enabled, scope = 'u:o' }) {
    const location = useLocation();
    const navigate = require('react-router-dom').useNavigate();
    useRuntimeRouteGuard({ enabled, location, navigate, scope });
    return <output data-testid="where">{location.pathname}{location.search}</output>;
  }
  const at = (entry, enabled) => <MemoryRouter initialEntries={[entry]}><Routes><Route path="*" element={<Probe enabled={enabled} />} /></Routes></MemoryRouter>;
  const where = () => screen.getByTestId('where').textContent;
  beforeEach(() => { agentRoster.remember('u:o', undefined); setEmployeeRoomOpen(false); });

  test('sends a direct Runtime session link to the first employee room', async () => {
    agentRoster.remember('u:o', [{ id: 'legacy', name: 'Old' }, ready]);
    await act(async () => { render(at('/hivemind/app/employee/harness/session/session-abc', false)); });
    expect(where()).toBe(`/hivemind/app/employee/dots/employee/${READY}`);
  });

  test('falls back to the team page when no employee room is ready', async () => {
    agentRoster.remember('u:o', [{ id: 'legacy', name: 'Old' }]);
    await act(async () => { render(at('/hivemind/app/employee/harness', false)); });
    expect(where()).toBe('/hivemind/app/employee/apps');
  });

  test('leaves Runtime alone when it is enabled, and leaves other pages alone when it is not', async () => {
    agentRoster.remember('u:o', [ready]);
    await act(async () => { render(at('/hivemind/app/employee/harness/new', true)); });
    expect(where()).toBe('/hivemind/app/employee/harness/new');
    for (const path of ['/hivemind/app/crm', '/hivemind/app/employee/library', '/hivemind/app/employees/mycompany', '/hivemind/app/employee/apps']) {
      document.body.innerHTML = '';
      await act(async () => { render(at(path, false)); });
      expect(where()).toBe(path);
    }
  });

  test('lets an employee opened from the roster use the shared route', async () => {
    agentRoster.remember('u:o', [ready]);
    setEmployeeRoomOpen(true);
    await act(async () => { render(at('/hivemind/app/employee/harness/session/session-emp', false)); });
    expect(where()).toBe('/hivemind/app/employee/harness/session/session-emp');
  });

  test('a stale ?employee=runtime link is still sent away', async () => {
    agentRoster.remember('u:o', [ready]);
    await act(async () => { render(at('/hivemind/app/employee/harness?employee=runtime', false)); });
    expect(where()).toBe(`/hivemind/app/employee/dots/employee/${READY}`);
  });
});
