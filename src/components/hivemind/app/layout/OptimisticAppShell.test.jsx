/* eslint-disable testing-library/no-unnecessary-act -- These tests use React DOM createRoot, not Testing Library render. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import OptimisticAppShell from './OptimisticAppShell';

let mockPath = '/hivemind/app/overview/new';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath }) }), { virtual: true });
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ optimisticShell: null, restoredShell: null }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, fallback) => fallback?.defaultValue || key }) }));
jest.mock('./BrainModeIcon', () => () => <span data-brain-icon />);

let host, root, phone;
beforeEach(() => {
  phone = true;
  window.matchMedia = jest.fn(query => ({ matches: query.includes('max-width') ? phone : !phone }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const render = () => act(() => root.render(<OptimisticAppShell fallback={<p data-fallback>Connecting…</p>} />));

test('Brain chat on a phone shows the glass room bar and composer instead of the loader', () => {
  render();
  expect(host.querySelector('[data-optimistic-phone-room="brain"]')).not.toBeNull();
  expect(host.textContent).toContain('Company Brain');
  expect(host.querySelector('.optimistic-phone-room-composer')).not.toBeNull();
  expect(host.querySelector('[data-fallback]')).toBeNull();
});

test('the Runtime room on a phone shows the Runtime identity pill', () => {
  mockPath = '/hivemind/app/employee/harness';
  render();
  expect(host.querySelector('[data-optimistic-phone-room="runtime"]')).not.toBeNull();
  expect(host.textContent).toContain('Runtime');
});

test('other phone routes keep the fallback', () => {
  mockPath = '/hivemind/app/connectors';
  render();
  expect(host.querySelector('[data-optimistic-phone-room]')).toBeNull();
  expect(host.querySelector('[data-fallback]')).not.toBeNull();
});
