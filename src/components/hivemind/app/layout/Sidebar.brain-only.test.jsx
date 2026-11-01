import React from 'react';
import { render, within, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });

let mockRoster = [];
const mockAuth = () => ({ logout: jest.fn(), org: { id: 'org1', name: 'Acme', plan: 'free' }, user: { id: 'u1', email: 'a@acme.io' } });
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => mockAuth(), useOptionalAuth: () => mockAuth() }));
jest.mock('../shared/api-client', () => ({ __esModule: true, default: new Proxy({}, { get: () => async () => ({}) }) }));
jest.mock('./WorkspaceNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('../shared/agent-roster', () => ({ agentRoster: { peek: () => mockRoster, load: async () => mockRoster, remember: jest.fn() } }));
jest.mock('../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('./AutonomyDial', () => ({ __esModule: true, default: () => <div>autonomy-dial</div> }));
jest.mock('./WorkspaceModeSwitcher', () => ({ __esModule: true, default: () => <div>mode-switcher</div> }));
jest.mock('./GetStartedCard', () => ({ __esModule: true, default: () => null }));
beforeAll(() => { window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); });
afterEach(cleanup);

/* eslint-disable testing-library/no-container, testing-library/no-node-access -- The phone roster is the `.mobile-roster-intro` block; the legacy nav beside it is hidden by CSS. */
const renderRoster = () => { const view = render(<MemoryRouter initialEntries={['/hivemind/app/employee/apps']}><Sidebar activeSection="hivemind" mobileDrawer mobileRoster /></MemoryRouter>); return { roster: () => within(view.container.querySelector('.mobile-roster-intro')) }; };

test('a Brain-only company sees the Brain surfaces and no HyperAgent surface', async () => {
  mockRoster = [];
  const { roster } = renderRoster();
  await waitFor(() => expect(roster().getByText('Memories')).toBeTruthy());
  for (const name of ['Chat', 'Uploads', 'Connectors', 'AI meeting notes', 'Memory graph']) expect(roster().getByText(name)).toBeTruthy();
  for (const gone of ['Your team', 'Create employee', 'Needs you', 'Runtime', 'CRM', 'autonomy-dial', 'mode-switcher']) expect(roster().queryByText(gone)).toBeNull();
});

test('a company with HyperAgent employees keeps the team, Create employee, Needs you and Runtime', async () => {
  mockRoster = [{ id: 'emp-1', name: 'Ravi', role: 'Sales' }];
  const { roster } = renderRoster();
  await waitFor(() => expect(roster().getByText('Ravi')).toBeTruthy());
  for (const present of ['Your team', 'Create employee', 'Needs you', 'Runtime', 'autonomy-dial']) expect(roster().getByText(present)).toBeTruthy();
  expect(roster().getByText('Memories')).toBeTruthy();
});
