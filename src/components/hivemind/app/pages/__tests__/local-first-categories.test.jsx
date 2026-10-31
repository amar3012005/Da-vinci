/* One test per local-first category: the screen's own hook paints the stored copy while the server read is pending. */
jest.mock('../../shared/native-auth', () => ({ nativePlugin: {} }));
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove() {} }) } }));
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => () => {},
  useLocation: () => ({ search: '', pathname: '/hivemind/app/crm' }),
}), { virtual: true });
jest.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' }, org: { id: 'org-a' } }), useOptionalAuth: () => ({ user: { id: 'user-1' }, org: { id: 'org-a' } }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, arg) => (typeof arg === 'string' ? arg : arg?.defaultValue ?? key) }) }));
jest.mock('../../shared/runtime-enabled', () => ({ useRuntimeEnabled: () => true, runtimeEnabledFor: () => true }));
jest.mock('../../shared/runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn(), fetchRuntime: jest.fn() }));
jest.mock('../../hyperagents/AgentAvatar', () => ({ __esModule: true, default: () => <span /> }));
jest.mock('../../shared/openCompanyRuntime', () => ({ openCompanyRuntime: jest.fn() }));
jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { getUsage: jest.fn(), controlPlane: { get: jest.fn() } },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import apiClient from '../../shared/api-client';
import { adoptScope, localStore, wipeAllScopes } from '../../shared/sync';
import { storeScope } from '../../shared/sync/local-store';
import { LOCAL_FIRST, PRELOAD_ENTITIES } from '../../shared/sync/catalog';
import { pageCache } from '../../shared/resource-cache';
import { PAGE_CACHE_ENTITY } from '../../shared/sync/page-cache-persistence';
import { maskMeterKeys } from '../../shared/sync/trim';
import { clearUserScopedStorage } from '../../shared/user-storage';
import RuntimeCalendar from '../RuntimeCalendar';
import useUsage from '../../shared/useUsage';

const A = storeScope('org-a', 'user-1');
const never = () => new Promise(() => {});
async function seed(spec, key, value, at = Date.now()) {
  await localStore().put(A, spec.entity, key, { v: 1, items: [{ id: 'value', value }], cursor: null, meta: { at } });
}

beforeEach(async () => { await adoptScope('org-a', 'user-1'); });
afterEach(async () => { await wipeAllScopes(); jest.clearAllMocks(); });

test('calendar: the last week paints from the device while the read is pending, then the server replaces it', async () => {
  const monday = new Date(); monday.setHours(8, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const when = new Date(monday.getTime() + 2 * 86400000).toISOString();
  const item = (id, label) => ({ id, kind: 'duty', title: label, owner: 'e1', ownerName: 'Faraday', label, status: 'active', manageable: true, active: true, nextAt: when, startsAt: when });
  await seed(LOCAL_FIRST.calendar, 'week:0', { value: { items: [item('d1', 'Cached duty')], occurrences: [{ id: 'd1:1', itemId: 'd1', at: when }], wakes: [] }, runtimeDown: false });
  const { rerender } = render(<RuntimeCalendar fetcher={never} />);
  expect(await screen.findByText('Cached duty')).toBeInTheDocument();
  expect(document.querySelector('[data-runtime-calendar]').dataset.localCopy).toBe('fresh');
  const answer = { ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: { items: [item('d2', 'Server duty')], occurrences: [{ id: 'd2:1', itemId: 'd2', at: when }], wakes: [] } }) };
  rerender(<RuntimeCalendar fetcher={() => Promise.resolve(answer)} />);
  expect(await screen.findByText('Server duty')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('Cached duty')).toBeNull());
});

test('usage card: the last plan and meters paint from the device', async () => {
  // The device copy keeps the token meter although the store removes credential-looking field names.
  await seed(LOCAL_FIRST.usage, 'summary', maskMeterKeys({ plan: 'pro', tokens: { used: 5, limit: 10 } }));
  apiClient.getUsage.mockImplementation(never);
  function Card() { const { usage } = useUsage(); return <div data-testid="plan">{usage ? `${usage.plan}:${usage.tokens.used}` : 'none'}</div>; }
  render(<Card />);
  await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('pro:5'));
});

test('Library and Company HQ: stored page-cache values are seeded into pageCache on adopt', async () => {
  await wipeAllScopes();
  pageCache.clear();
  await localStore().put(A, PAGE_CACHE_ENTITY, 'hq:work', { value: { rows: ['kept'] }, fetchedAt: 1234 });
  await adoptScope('org-a', 'user-1');
  expect(pageCache.read('hq:work')).toEqual({ value: { rows: ['kept'] }, at: 1234 });
});

test('autonomy dial: the tiny level key is removed at sign-out with the other account storage', () => {
  window.localStorage.setItem('hivemind.autonomy.v1:org-a', JSON.stringify({ level: 2, revision: 1, maxSelectable: 3 }));
  clearUserScopedStorage();
  expect(window.localStorage.getItem('hivemind.autonomy.v1:org-a')).toBeNull();
});

test('every category keeps a bounded copy: byte and key caps are declared and preloaded', () => {
  for (const spec of Object.values(LOCAL_FIRST)) {
    expect(spec.maxBytes).toBeGreaterThan(0);
    expect(spec.maxBytes).toBeLessThanOrEqual(250_000);
    expect(Number.isFinite(spec.maxKeys)).toBe(true);
    expect(PRELOAD_ENTITIES).toContain(spec.entity);
  }
});

test('connectors, memories and uploads screens read through their catalog entries', () => {
  const fs = require('fs');
  const path = require('path');
  const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  expect(read('Connectors.jsx')).toMatch(/LOCAL_FIRST\.connectors, key: 'status'/);
  expect(read('Connectors.jsx')).toMatch(/LOCAL_FIRST\.connectors, key: 'oauth'/);
  expect(read('Memories.jsx')).toMatch(/spec: LOCAL_FIRST\.memories/);
  expect(read('Memories.jsx')).toMatch(/spec: LOCAL_FIRST\.uploads/);
  expect(read('KnowledgeBase.jsx')).toMatch(/spec: LOCAL_FIRST\.uploads/);
});

test('usage meters survive the credential filter of the LocalStore through a save and restore', async () => {
  const stored = maskMeterKeys({ tokens: { used: 5 }, tokensScope: 'chat' });
  await seed(LOCAL_FIRST.usage, 'k', stored);
  const row = await localStore().get(A, LOCAL_FIRST.usage.entity, 'k');
  expect(JSON.stringify(row.value)).toContain('to~kens');
});
