import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';
import OpenDotEntry from '../../pages/OpenDotEntry';

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
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key, i18n: { language: 'en', options: {} } }) }));
jest.mock('../CreateEmployeeDialog', () => ({ __esModule: true, default: ({ onCreated }) => <button type="button" data-testid="finish" onClick={() => onCreated({ id: '061604cc-0000-4000-8000-000000000001', name: 'Nova', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot_x' } } })}>Finish</button> }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: { id: 'org-a', name: 'Acme' }, user: { id: 'user-a', display_name: 'Amar' } }) }));

beforeAll(() => {
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});

const created = '061604cc-0000-4000-8000-000000000001';
const first = '83aed244-0000-4000-8000-000000000002';
const ROOM = `/hivemind/app/employee/dots/employee/${first}`;
const origin = 'https://runtime-runner.singulancelabs.com';

function Shell({ initial }) {
  const location = useLocation();
  return <><Sidebar collapsed={false} mobileDrawer mobileRoster /><OpenDotEntry initialRoute={initial} route={location} /></>;
}

test('Create employee: the room frame is opened on the new employee as soon as the route moves, with no wait for an acknowledgement', async () => {
  {
    const { container } = render(<MemoryRouter initialEntries={[ROOM]}><Shell initial={{ pathname: ROOM, search: '' }} /></MemoryRouter>);
    const frame = screen.getByTitle('HyperAgent workspace');
    act(() => { window.dispatchEvent(new MessageEvent('message', { origin, source: frame.contentWindow, data: { type: 'hivemind.open-dot.ready', version: 1, employeeId: first } })); });
    expect(frame.getAttribute('src')).toContain(`/employees/${first}`);
    fireEvent.click(container.querySelector('.mobile-roster-create'));
    const finish = await screen.findByTestId('finish');
    await act(async () => { fireEvent.click(finish); });
    // No timer has run: the frame already belongs to the new employee.
    const next = screen.getByTitle('HyperAgent workspace');
    expect(next).not.toBe(frame);
    expect(next.getAttribute('src')).toContain(`/employees/${created}`);
    expect(screen.getByRole('status')).toBeTruthy();
    act(() => { window.dispatchEvent(new MessageEvent('message', { origin, source: next.contentWindow, data: { type: 'hivemind.open-dot.ready', version: 1, employeeId: created } })); });
    expect(screen.queryByRole('status')).toBeNull();
  }
});
