/* eslint-disable testing-library/no-node-access -- The seat order against the shortcuts is a DOM position contract. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../Sidebar';

jest.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className, ...props }) => <a href={to} className={typeof className === 'function' ? className({}) : className} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/hivemind/app/employees', search: '' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('../AutonomyDial', () => ({ __esModule: true, default: () => <div data-testid="autonomy-dial"/> }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ logout: jest.fn(), org: { name: 'Acme' }, user: { display_name: 'Amar' } }) }));
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { getWebAdminMetrics: () => Promise.reject(new Error('no')) } }));
jest.mock('../../shared/useUsage', () => ({ useUsage: () => ({ usage: null }) }));
jest.mock('../WorkspaceNotifications', () => ({ __esModule: true, default: () => null }));
jest.mock('../LangSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key }) }));

beforeAll(() => {
  window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
});

const renderDrawer = props => render(<Sidebar collapsed={false} mobileDrawer {...props}/>);
const before = (first, second) => expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

test('the phone drawer seats the one autonomy dial above its Company and Artifacts shortcuts', () => {
  const { container } = renderDrawer({ mobileRoster: true });
  const dials = screen.getAllByTestId('autonomy-dial');
  expect(dials).toHaveLength(1);
  const intro = container.querySelector('.mobile-roster-intro');
  expect(intro).toContainElement(dials[0]);
  before(dials[0], intro.querySelector('.mobile-roster-shortcuts'));
});

test('the narrow drawer seats the one autonomy dial directly above its Apps shortcut', () => {
  renderDrawer({ mobileRoster: false });
  const dials = screen.getAllByTestId('autonomy-dial');
  expect(dials).toHaveLength(1);
  const apps = screen.getByText('Apps').closest('a');
  before(dials[0], apps);
  expect(dials[0].closest('[data-drawer-autonomy-seat]').parentElement).toBe(apps.closest('.space-y-0\\.5').parentElement);
});

test('the dial and its confirm dialog are styled outside the desktop-only media block', () => {
  const css = require('fs').readFileSync(require('path').resolve(__dirname, '../desktop-hyperagents-navigation.css'), 'utf8');
  const desktopOnly = css.indexOf('@media(min-width:901px)');
  let depth = 0; let end = desktopOnly;
  for (; end < css.length; end++) { if (css[end] === '{') depth++; else if (css[end] === '}' && --depth === 0) break; }
  const insideDesktop = css.slice(desktopOnly, end);
  for (const rule of ['.ha-autonomy-dial {', '.ha-autonomy-overlay {', '.ha-autonomy-confirm {', '.ha-autonomy-cells i[data-filled]']) {
    expect(css).toContain(rule);
    expect(insideDesktop).not.toContain(rule);
  }
});
