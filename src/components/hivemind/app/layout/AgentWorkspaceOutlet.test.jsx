import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
let mockPath = '/hivemind/app/overview/session/saved';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath, search: '' }), Outlet: () => <div data-testid="native-seat">Existing native chat seat</div> }), { virtual: true });
jest.mock('../shared/native-app', () => ({ isNativeApp: () => false }));
jest.mock('../shared/native-pane-protocol', () => ({ persistentShellEnabled: () => true, paneForPath: path => path.includes('/employee/harness') ? 'runtime' : path.includes('/overview') ? 'brain' : null }));
jest.mock('./PersistentHarnessPanes', () => ({ __esModule: true, default: ({ retainBrain }) => <div data-testid="panes" data-retain-brain={String(retainBrain)}/> }));
import AgentWorkspaceOutlet from './AgentWorkspaceOutlet';
beforeEach(() => { mockPath = '/hivemind/app/overview/session/saved'; });
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
