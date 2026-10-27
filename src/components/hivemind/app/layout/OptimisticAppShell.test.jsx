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

test('the Runtime phone frame matches the settled composer instead of grey blocks', () => {
  mockPath = '/hivemind/app/employee/harness';
  render();
  const composer = host.querySelector('.optimistic-phone-room-composer');
  expect(composer.querySelector('.optimistic-phone-room-add')).not.toBeNull();
  expect(composer.querySelector('textarea').getAttribute('placeholder')).toBe('chat.messageRuntime');
  expect(composer.querySelector('.optimistic-phone-room-primary').getAttribute('aria-label')).toBe('chat.voice');
  expect(host.querySelector('.optimistic-skeleton')).toBeNull();
});

test('the Runtime phone frame paints the saved character from the boot cache', () => {
  mockPath = '/hivemind/app/employee/harness';
  const { rememberTenant, writeBootCache, clearBootCache } = jest.requireActual('../shared/boot-cache');
  rememberTenant('org-1', 'user-1');
  writeBootCache('org-1', 'user-1', 'runtime-appearance', { character: 'orbit' });
  render();
  expect(host.querySelector('.optimistic-phone-room-mark img').getAttribute('src')).toBe('/assets/runtime-characters/v2/stills/orbit-ready.webp');
  clearBootCache();
});

test('the Brain phone frame names Brain in the composer', () => {
  mockPath = '/hivemind/app/overview/new';
  render();
  expect(host.querySelector('.optimistic-phone-room-composer textarea').getAttribute('placeholder')).toBe('chat.messageBrain');
});

test('every loading stage before a phone chat room shows the room frame, other routes keep their loader', () => {
  const { RoomLoading } = require('./PhoneRoomFrame');
  act(() => root.render(<RoomLoading pathname="/hivemind/app/employee/harness/session/session-1" fallback={<p data-fallback>Connecting…</p>} />));
  expect(host.querySelector('[data-optimistic-phone-room="runtime"] .optimistic-phone-room-trailing')).not.toBeNull();
  expect(host.querySelector('[data-fallback]')).toBeNull();
  act(() => root.render(<RoomLoading pathname="/hivemind/app/connectors" fallback={<p data-fallback>Connecting…</p>} />));
  expect(host.querySelector('[data-fallback]')).not.toBeNull();
});
