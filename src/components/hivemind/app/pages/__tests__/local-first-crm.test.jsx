/* CRM category: the screen paints its stored workspace while Control is pending. */
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

process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED = 'true';
const React = require('react');
const { render, screen } = require('@testing-library/react');
require('@testing-library/jest-dom');
const { adoptScope, localStore, wipeAllScopes } = require('../../shared/sync');
const { storeScope } = require('../../shared/sync/local-store');
const { LOCAL_FIRST } = require('../../shared/sync/catalog');
const apiClient = require('../../shared/api-client').default;
const YourCRM = require('../YourCRM').default;

const A = storeScope('org-a', 'user-1');
const never = () => new Promise(() => {});
async function seed(spec, key, value, at = Date.now()) {
  await localStore().put(A, spec.entity, key, { v: 1, items: [{ id: 'value', value }], cursor: null, meta: { at } });
}
beforeEach(async () => { await adoptScope('org-a', 'user-1'); });
afterEach(async () => { await wipeAllScopes(); jest.clearAllMocks(); });

test('CRM: the last workspace and first page of items paint before Control answers', async () => {
  const app = { id: 'app1', name: 'Sales', publishedVersion: 1, spec: { name: 'Sales', entities: [{ id: 'deal', name: 'Deals', fields: [{ id: 'name', name: 'Name', type: 'text' }] }], views: [{ id: 'table', name: 'All', type: 'table', entityId: 'deal' }] } };
  await seed(LOCAL_FIRST.crm, 'view', { tenantKey: 'org-a:user-1', apps: [{ id: 'app1', name: 'Sales', publishedVersion: 1 }], appId: 'app1', app, viewId: 'table', records: [{ id: 'r1', entityId: 'deal', data: { name: 'Acme renewal' } }], cursor: null, workflows: [] });
  apiClient.controlPlane.get.mockImplementation(never);
  render(React.createElement(YourCRM));
  expect(await screen.findByText('Acme renewal')).toBeInTheDocument();
  expect(screen.queryByText('Opening your CRM…')).toBeNull();
});

test('CRM: a stored workspace of another person is ignored', async () => {
  await seed(LOCAL_FIRST.crm, 'view', { tenantKey: 'org-z:user-9', apps: [], appId: 'x', app: { id: 'x', spec: { name: 'Other', entities: [], views: [] } }, viewId: 'v', records: [], workflows: [] });
  apiClient.controlPlane.get.mockImplementation(never);
  render(React.createElement(YourCRM));
  expect(await screen.findByText('Opening your CRM…')).toBeInTheDocument();
});
