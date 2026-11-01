import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
let mockPath = '/hivemind/app/overview/session/saved';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath, search: '' }), Outlet: () => <div data-testid="native-seat">Existing native chat seat</div> }), { virtual: true });
let mockNative = false;
jest.mock('../shared/native-app', () => ({ isNativeApp: () => mockNative }));
jest.mock('../pages/NativeOpenDotRoom', () => ({ __esModule: true, default: ({ route, active }) => <div data-testid="native-room" data-active={String(active)} data-path={route.pathname}/> }));
jest.mock('../shared/native-pane-protocol', () => ({ persistentShellEnabled: () => true,
  directRuntimeHost: (mode, origin) => mode === 'runtime' && origin === 'https://runtime-runner.singulancelabs.com',
  paneForPath: path => path.includes('/employee/harness') ? 'runtime' : path.includes('/overview') ? 'brain' : null }));
jest.mock('./PersistentHarnessPanes', () => ({ __esModule: true, default: ({ retainBrain, suppressBrain }) => <div data-testid="panes" data-retain-brain={String(retainBrain)} data-suppress-brain={String(Boolean(suppressBrain))}/> }));
jest.mock('../pages/CompanyBrainWarmup', () => ({ __esModule: true, default: ({ language }) => <div data-testid="warmup" data-language={language}/> }));
let mockRooms = null;
const mockOpenNativeBrain = jest.fn();
jest.mock('../shared/native-room', () => { const actual = jest.requireActual('../shared/native-room');
  return { ...actual, useHasNativeRooms: () => (mockRooms === null ? actual.useHasNativeRooms() : mockRooms), openNativeCompanyBrainRoom: (...args) => mockOpenNativeBrain(...args) }; });
const mockLeave = jest.fn();
jest.mock('../shared/company-brain-room', () => ({ ...jest.requireActual('../shared/company-brain-room'), navigateToCompanyBrain: (...args) => mockLeave(...args) }));
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
import { resetBrainPrimary } from '../shared/brain-primary';
const EMPLOYEE = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
const OTHER = '0f2a4a62-6a1c-4c3e-9d7c-2f0e9d4a5b11';
const boundEmployee = id => ({ id, name: 'Dot', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot_a' } } });
beforeEach(() => {
  mockNative = false; mockPath = '/hivemind/app/overview/session/saved'; mockDotMounts = 0; mockPeek.mockReset(); localStorage.clear();
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

test('the packaged app shows an employee room natively instead of framing OpenDot', async () => {
  viewport(false); mockNative = true; mockPath = `/hivemind/app/employee/dots/employee/${EMPLOYEE}`; render(<AgentWorkspaceOutlet/>);
  const room = await screen.findByTestId('native-room');
  expect(room).toHaveAttribute('data-active', 'true');
  expect(room).toHaveAttribute('data-path', mockPath);
  expect(screen.queryByTestId('dot-entry')).not.toBeInTheDocument();
});

describe('Company Brain chat', () => {
  beforeEach(() => { mockLeave.mockReset(); });
  test('the Chat route leaves for the top-level Company Brain page and renders no seat or frame', () => {
    viewport(true); mockPath = '/hivemind/app/overview/new'; render(<AgentWorkspaceOutlet/>);
    expect(mockLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('native-seat')).not.toBeInTheDocument();
    expect(screen.getByTestId('panes')).toHaveAttribute('data-suppress-brain', 'true');
    expect(document.querySelector('iframe')).toBeNull();
  });
  test('a click on a Brain chat link leaves instead of routing in-app', () => {
    viewport(true); mockPath = '/hivemind/app/memories'; render(<AgentWorkspaceOutlet/>);
    const link = document.createElement('a'); link.href = '/hivemind/app/overview/new'; document.body.appendChild(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(mockLeave).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
    link.dispatchEvent(modified);
    const other = document.createElement('a'); other.href = '/hivemind/app/memories'; document.body.appendChild(other);
    other.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    const session = document.createElement('a'); session.href = '/hivemind/app/overview/session/abc'; document.body.appendChild(session);
    session.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(mockLeave).toHaveBeenCalledTimes(1);
    link.remove(); other.remove(); session.remove();
  });
  test('the hidden warm-up mounts on any app page', () => {
    viewport(true); mockPath = '/hivemind/app/memories'; render(<AgentWorkspaceOutlet/>);
    expect(screen.getByTestId('warmup')).toBeInTheDocument();
  });
  test('saved sessions keep the harness chat', () => {
    viewport(true); mockPath = '/hivemind/app/overview/session/abc'; render(<AgentWorkspaceOutlet/>);
    expect(screen.getByTestId('native-seat')).toBeInTheDocument();
    expect(mockLeave).not.toHaveBeenCalled();
  });
  test('the packaged app keeps the harness chat and never leaves or frames the room', () => {
    mockNative = true; viewport(false); mockPath = '/hivemind/app/overview/new'; render(<AgentWorkspaceOutlet/>);
    expect(mockLeave).not.toHaveBeenCalled();
    expect(screen.queryByTestId('warmup')).not.toBeInTheDocument();
  });
  describe('brain-primary flag', () => {
    const flag = primary => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ primary }) }); };
    beforeEach(() => { resetBrainPrimary(); mockRooms = null; mockOpenNativeBrain.mockReset().mockResolvedValue(undefined); });
    afterEach(() => { delete global.fetch; mockRooms = null; resetBrainPrimary(); });
    test('harness keeps the old chat in the shell: no leave, no click interception, no warm-up', async () => {
      localStorage.setItem('hm:brain-primary', 'harness'); flag('harness');
      viewport(true); mockPath = '/hivemind/app/overview/new'; render(<AgentWorkspaceOutlet/>);
      await act(async () => { await Promise.resolve(); });
      expect(mockLeave).not.toHaveBeenCalled();
      expect(screen.getByTestId('native-seat')).toBeInTheDocument();
      expect(screen.queryByTestId('warmup')).not.toBeInTheDocument();
      const link = document.createElement('a'); link.href = '/hivemind/app/overview/new'; document.body.appendChild(link);
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      link.remove();
    });
    test('a flip to harness while the shell is open stops the leave from the next click', async () => {
      flag('harness'); viewport(true); mockPath = '/hivemind/app/memories'; render(<AgentWorkspaceOutlet/>);
      await waitFor(() => expect(screen.queryByTestId('warmup')).not.toBeInTheDocument());
    });
    test('an unreachable flag keeps the Company Brain primary', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      viewport(true); mockPath = '/hivemind/app/overview/new'; render(<AgentWorkspaceOutlet/>);
      await act(async () => { await Promise.resolve(); });
      expect(mockLeave).toHaveBeenCalled();
    });
    test('packaged app cold start on /overview/new opens the Company Brain room when company is primary', async () => {
      mockRooms = true; flag('company'); viewport(false); mockPath = '/hivemind/app/overview/new'; render(<AgentWorkspaceOutlet/>);
      await waitFor(() => expect(mockOpenNativeBrain).toHaveBeenCalledWith({ scope: 'o1:u1' }));
      expect(mockLeave).not.toHaveBeenCalled();
    });
    test('packaged app keeps the harness chat when harness is primary, and when the room is refused it stops retrying', async () => {
      mockRooms = true; flag('harness'); viewport(false); mockPath = '/hivemind/app/overview/new';
      const first = render(<AgentWorkspaceOutlet/>);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
      expect(mockOpenNativeBrain).not.toHaveBeenCalled();
      first.unmount(); resetBrainPrimary(); flag('company'); mockOpenNativeBrain.mockRejectedValue(new Error('Room is not allowed.'));
      render(<AgentWorkspaceOutlet/>);
      await waitFor(() => expect(mockOpenNativeBrain).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('native-seat')).toBeInTheDocument();
    });
  });
});
