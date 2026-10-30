import React from 'react';
jest.mock('react-router-dom', () => {
 global.TextEncoder = require('util').TextEncoder;
 return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import fs from 'fs';
import path from 'path';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmployeesEntry, RuntimeSessionRoute } from '../RuntimeSessionRoute';
import { agentRoster } from '../../shared/agent-roster';
import { setEmployeeRoomOpen } from '../../shared/runtime-enabled';

let mockOrg = { id: 'org-a', runtime_enabled: false };
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u' }, org: mockOrg }) }));

const READY = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const ready = { id: READY, name: 'Mia', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-1' } } };
const Where = () => <output data-testid="where">{useLocation().pathname}</output>;
beforeEach(() => { mockOrg = { id: 'org-a', runtime_enabled: false }; setEmployeeRoomOpen(false); agentRoster.remember('u:org-a', [ready]); });

const session = entry => <MemoryRouter initialEntries={[entry]}><Routes>
  <Route path="/hivemind/app/employee/harness/*" element={<RuntimeSessionRoute><p>Runtime room</p></RuntimeSessionRoute>} />
  <Route path="*" element={<Where />} />
</Routes></MemoryRouter>;

test('Runtime\'s session page does not mount for a company without Runtime', () => {
  render(session('/hivemind/app/employee/harness/session/session-abc'));
  expect(screen.queryByText('Runtime room')).toBeNull();
});

test('it mounts when Runtime is on, and for an employee room opened from the roster', () => {
  mockOrg = { id: 'org-a', runtime_enabled: true };
  const on = render(session('/hivemind/app/employee/harness'));
  expect(screen.getByText('Runtime room')).toBeInTheDocument();
  on.unmount();
  mockOrg = { id: 'org-a', runtime_enabled: false };
  setEmployeeRoomOpen(true);
  render(session('/hivemind/app/employee/harness/session/session-emp'));
  expect(screen.getByText('Runtime room')).toBeInTheDocument();
});

test('/employees opens Runtime when it is on, otherwise the first employee room', () => {
  const entry = () => <MemoryRouter initialEntries={['/hivemind/app/employees']}><Routes>
    <Route path="/hivemind/app/employees" element={<EmployeesEntry />} /><Route path="*" element={<Where />} />
  </Routes></MemoryRouter>;
  render(entry());
  expect(screen.getByTestId('where')).toHaveTextContent(`/hivemind/app/employee/dots/employee/${READY}`);
});

test('/employees opens Runtime when the company has it', () => {
  mockOrg = { id: 'org-a' };
  render(<MemoryRouter initialEntries={['/hivemind/app/employees']}><Routes>
    <Route path="/hivemind/app/employees" element={<EmployeesEntry />} /><Route path="*" element={<Where />} />
  </Routes></MemoryRouter>);
  expect(screen.getByTestId('where')).toHaveTextContent('/hivemind/app/employee/harness');
});

describe('shell wiring', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'HiveMindApp.jsx'), 'utf8');
  test('Sidebar drops the Runtime item and the mobile roster card when Runtime is off', () => {
    const sidebar = read('Sidebar.jsx');
    expect(sidebar).toMatch(/\.\.\.\(runtimeEnabled \? \[\{ to: '\/hivemind\/app\/employee\/harness'[^\]]*runtime: true \}\] : \[\]\)/);
    expect(sidebar).toMatch(/\{runtimeEnabled && <button type="button" data-agent-room-link className="mobile-roster-runtime"/);
    expect(sidebar).toMatch(/runtimeEnabled=\{runtimeEnabled\}\/>\}/);
    expect(sidebar).toMatch(/agent\.id === 'runtime' && !runtimeEnabled\) return false/);
  });
  test('AppShell shows the Get Started card with Runtime off and guards the route', () => {
    const shell = read('AppShell.jsx');
    expect(shell).toMatch(/\.test\(location\.pathname\) && !initialNativePane && !hyperFullscreen && !crmFullscreen && startOverlay && <GetStartedCard/);
    expect(shell).not.toMatch(/RuntimeGetStarted /);
    expect(shell).toMatch(/useRuntimeRouteGuard\(\{ enabled: runtimeEnabled/);
  });
  test('the router wraps the Runtime session route and the /employees entry', () => {
    expect(app).toMatch(/path="employee\/harness\/\*" element=\{<RuntimeSessionRoute>/);
    expect(app).toMatch(/path="employees" element=\{<EmployeesEntry \/>\}/);
  });
});

test('the bare /employee/ entry opens the HyperAgents room instead of falling to the Brain overview', () => {
  const entry = path => <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/hivemind/app/employee" element={<EmployeesEntry />} /><Route path="*" element={<Where />} />
  </Routes></MemoryRouter>;
  mockOrg = { id: 'org-a', runtime_enabled: true };
  const on = render(entry('/hivemind/app/employee/'));
  expect(screen.getByTestId('where')).toHaveTextContent('/hivemind/app/employee/harness');
  on.unmount();
  mockOrg = null;
  render(entry('/hivemind/app/employee'));
  expect(screen.getByTestId('where')).toHaveTextContent('/hivemind/app/employee/harness');
  const app = fs.readFileSync(path.join(__dirname, '../../HiveMindApp.jsx'), 'utf8');
  expect(app).toMatch(/<Route path="employee" element=\{<EmployeesEntry \/>\} \/>/);
});
