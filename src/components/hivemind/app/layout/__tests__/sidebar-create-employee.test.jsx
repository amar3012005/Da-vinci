import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
jest.mock('../GetStartedCard', () => () => null);

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
jest.mock('../CreateEmployeeDialog', () => ({ __esModule: true, default: ({ onCreated }) => <button type="button" data-testid="finish" onClick={() => onCreated({ id: 'new-employee', name: 'Nova' })}>Finish</button> }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: { id: 'org-a', name: 'Acme' }, user: { id: 'user-a', display_name: 'Amar' } }) }));

beforeAll(() => {
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});

const ROOM = '/hivemind/app/employee/dots/employee/00000000-0000-4000-8000-000000000001';

test('the Create employee dialog closes for good once the employee is created, even if its room does not open', async () => {
  const { container } = render(<MemoryRouter initialEntries={[ROOM]}><Sidebar collapsed={false} mobileDrawer mobileRoster /></MemoryRouter>);
  fireEvent.click(container.querySelector('.mobile-roster-create'));
  fireEvent.click(await screen.findByTestId('finish'));
  await act(async () => {});
  expect(screen.queryByTestId('finish')).toBeNull();
});
