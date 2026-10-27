import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
let mockPath = '/hivemind/app/overview/session/saved';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath, search: '' }), Outlet: () => <div data-testid="native-seat">Existing native chat seat</div> }), { virtual: true });
jest.mock('../shared/native-app', () => ({ isNativeApp: () => false }));
jest.mock('../shared/native-pane-protocol', () => ({ persistentShellEnabled: () => true,
  directRuntimeHost: (mode, origin) => mode === 'runtime' && origin === 'https://runtime-runner.singulancelabs.com',
  paneForPath: path => path.includes('/employee/harness') ? 'runtime' : path.includes('/overview') ? 'brain' : null }));
jest.mock('./PersistentHarnessPanes', () => ({ __esModule: true, default: ({ retainBrain }) => <div data-testid="panes" data-retain-brain={String(retainBrain)}/> }));
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, org: { id: 'o1' } }) }));
const mockPeek = jest.fn();
jest.mock('../shared/agent-roster', () => ({ agentRoster: { peek: (...args) => mockPeek(...args) } }));
jest.mock('../pages/OpenDotAppsNavigation', () => ({ __esModule: true, default: () => <div data-testid="apps"/> }));
let mockDotMounts = 0;
jest.mock('../pages/OpenDotEntry', () => {
  const React = require('react');
  return { __esModule: true, default: ({ route, active }) => { React.useEffect(() => { mockDotMounts += 1; }, []); return <div data-testid="dot-entry" data-active={String(active)} data-path={route.pathname}/>; } };
});
import AgentWorkspaceOutlet from './AgentWorkspaceOutlet';
const EMPLOYEE = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
const OTHER = '0f2a4a62-6a1c-4c3e-9d7c-2f0e9d4a5b11';
const boundEmployee = id => ({ id, name: 'Dot', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot_a' } } });
beforeEach(() => {
  mockPath = '/hivemind/app/overview/session/saved'; mockDotMounts = 0; mockPeek.mockReset(); localStorage.clear();
  window.requestIdleCallback = callback => window.setTimeout(callback, 0); window.cancelIdleCallback = id => window.clearTimeout(id);
});
afterEach(cleanup);
function viewport(desktop) { window.matchMedia = () => ({ matches: desktop, addEventListener: jest.fn(), removeEventListener: jest.fn() }); }
test('desktop Brain uses the existing native chat seat rather than a duplicate authenticated document', () => {
  viewport(true); render(<AgentWorkspaceOutlet/>);
  expect(screen.getByTestId('native-seat')).toBeInTheDocument();
  expect(screen.getByTestId('panes')).toHaveAttribute('data-retain-brain', 'false');
});
test('desktop Runtime keeps its independent native document', () => {
  viewport(true); mockPath = '/hivemind/app/employee/harness/session/runtime-saved'; render(<AgentWorkspaceOutlet/>);
  expect(screen.queryByTestId('native-seat')).not.toBeInTheDocument();
  expect(screen.getByTestId('panes')).toHaveAttribute('data-retain-brain', 'false');
});
test('mobile Brain keeps the existing embedded navigation path', () => {
  viewport(false); render(<AgentWorkspaceOutlet/>);
  expect(screen.queryByTestId('native-seat')).not.toBeInTheDocument();
  expect(screen.getByTestId('panes')).toHaveAttribute('data-retain-brain', 'true');
});

test('Runtime preloads one hidden OpenDot workspace from the cached roster without navigating', async () => {
  viewport(true); mockPath = '/hivemind/app/employee/harness/session/runtime-saved'; mockPeek.mockReturnValue([boundEmployee(EMPLOYEE)]);
  render(<AgentWorkspaceOutlet/>);
  const entry = await screen.findByTestId('dot-entry');
  expect(entry).toHaveAttribute('data-active', 'false');
  expect(entry).toHaveAttribute('data-path', `/hivemind/app/employee/dots/employee/${EMPLOYEE}`);
  expect(entry.parentElement).toHaveAttribute('hidden');
  expect(screen.getAllByTestId('dot-entry')).toHaveLength(1);
});
test('the remembered workspace wins over the roster and the roster never triggers a fetch', async () => {
  viewport(true); mockPath = '/hivemind/app/employee/harness/new';
  localStorage.setItem('hivemind.open-dot.last-route.v1:u1:o1', `/hivemind/app/employee/dots/employee/${OTHER}`);
  mockPeek.mockReturnValue([boundEmployee(EMPLOYEE)]);
  render(<AgentWorkspaceOutlet/>);
  expect((await screen.findByTestId('dot-entry'))).toHaveAttribute('data-path', `/hivemind/app/employee/dots/employee/${OTHER}`);
  expect(mockPeek).toHaveBeenCalledWith('u1:o1');
});
test('nothing is preloaded without a known employee, away from Runtime, or on Data Saver', async () => {
  viewport(true); mockPath = '/hivemind/app/employee/harness/new'; mockPeek.mockReturnValue(undefined);
  const first = render(<AgentWorkspaceOutlet/>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(screen.queryByTestId('dot-entry')).not.toBeInTheDocument();
  first.unmount();
  mockPeek.mockReturnValue([boundEmployee(EMPLOYEE)]); mockPath = '/hivemind/app/overview/session/saved';
  const second = render(<AgentWorkspaceOutlet/>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(screen.queryByTestId('dot-entry')).not.toBeInTheDocument();
  second.unmount();
  mockPath = '/hivemind/app/employee/harness/new';
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
  render(<AgentWorkspaceOutlet/>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(screen.queryByTestId('dot-entry')).not.toBeInTheDocument();
  Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
});
test('switching Runtime to an employee and back keeps the same OpenDot document mounted', async () => {
  viewport(true); mockPath = '/hivemind/app/employee/harness/session/runtime-saved'; mockPeek.mockReturnValue([boundEmployee(EMPLOYEE)]);
  const view = render(<AgentWorkspaceOutlet/>);
  const entry = await screen.findByTestId('dot-entry');
  mockPath = `/hivemind/app/employee/dots/employee/${EMPLOYEE}`; view.rerender(<AgentWorkspaceOutlet/>);
  expect(screen.getByTestId('dot-entry')).toBe(entry);
  expect(entry).toHaveAttribute('data-active', 'true');
  mockPath = '/hivemind/app/employee/harness/session/runtime-saved'; view.rerender(<AgentWorkspaceOutlet/>);
  expect(screen.getByTestId('dot-entry')).toBe(entry);
  expect(entry).toHaveAttribute('data-active', 'false');
  expect(mockDotMounts).toBe(1);
  expect(localStorage.getItem('hivemind.open-dot.last-route.v1:u1:o1')).toBe(`/hivemind/app/employee/dots/employee/${EMPLOYEE}`);
});
