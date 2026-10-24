import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import OptimisticAppShell from '../../layout/OptimisticAppShell';
import apiClient from '../../shared/api-client';
import { readBootCache, readLastTenant, rememberTenant, writeBootCache } from '../../shared/boot-cache';

// Minimal router stand-in. The installed react-router-dom does not resolve under this Jest setup.
jest.mock('react-router-dom', () => {
  const React = require('react');
  const matches = (pattern, path) => (pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);
  return {
    Routes: ({ children }) => {
      const match = React.Children.toArray(children).find(child => matches(child.props.path, global.__testPath));
      return match ? match.props.element : null;
    },
    Route: () => null,
    Navigate: ({ to }) => React.createElement('div', null, `NAVIGATE ${to}`),
    useLocation: () => ({ pathname: global.__testPath, search: '', state: null }),
  };
}, { virtual: true });

jest.mock('../../shared/api-client', () => {
  const methods = ['bootstrap', 'logout', 'clearApiKey', 'listEmployees', 'listTeams', 'listAccessibleProjects', 'getRuntimeAppearance', 'getWebAdminMetrics'];
  const api = Object.fromEntries(methods.map(name => [name, jest.fn()]));
  return { __esModule: true, default: api };
});
jest.mock('../../../../../analytics/posthog', () => ({
  __esModule: true,
  default: { identify: () => {}, group: () => {}, reset: () => {} },
  isPostHogEnabled: () => false,
}));
jest.mock('../../shared/native-haptics', () => ({ bindNativeTouchFeedback: () => undefined }));
jest.mock('../../shared/native-auth', () => ({ bindNativeAuthCallbacks: () => Promise.resolve(() => {}), nativeAuth: () => ({}) }));

const STORE = window.localStorage;
const ORG_A = { id: 'org-a', name: 'Acme' };
const USER_A = { id: 'user-a', display_name: 'Ada', email: 'ada@example.com' };

function deferred() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function signedIn(org = ORG_A, user = USER_A) {
  return { authenticated: true, user, organization: org, onboarding: { needs_org_setup: false, has_api_key: true } };
}

function renderShell() {
  return render(
    <AuthProvider>
      <Routes>
        <Route path="/hivemind/app/*" element={<ProtectedRoute optimisticFallback={<OptimisticAppShell />}><div>SHELL CHILD</div></ProtectedRoute>} />
      </Routes>
    </AuthProvider>,
  );
}

function seedHint(org = ORG_A, user = USER_A) {
  rememberTenant(org.id, user.id, STORE, { displayName: user.display_name, orgName: org.name });
  writeBootCache(org.id, user.id, 'employees', [{ id: 'e1', name: 'Priya' }], STORE);
  writeBootCache(org.id, user.id, 'runtime-appearance', { character: 'orbit' }, STORE);
}

beforeEach(() => {
  STORE.clear();
  global.__testPath = '/hivemind/app/overview';
  jest.clearAllMocks();
  window.matchMedia = jest.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  Object.values(apiClient).forEach(fn => fn.mockReset?.());
});

describe('optimistic shell before bootstrap', () => {
  test('paints cached display data and makes no API call until bootstrap confirms', async () => {
    seedHint();
    const pending = deferred();
    apiClient.bootstrap.mockReturnValue(pending.promise);

    renderShell();

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.queryByText('SHELL CHILD')).not.toBeInTheDocument();
    expect(apiClient.bootstrap).toHaveBeenCalledTimes(1);
    Object.entries(apiClient).filter(([name]) => name !== 'bootstrap').forEach(([name, fn]) => {
      expect([name, fn.mock.calls.length]).toEqual([name, 0]);
    });
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => { pending.resolve(signedIn()); });
    expect(await screen.findByText('SHELL CHILD')).toBeInTheDocument();
    expect(screen.queryByText('Loading workspace')).not.toBeInTheDocument();
  });

  test('a matching identity keeps the saved hint and cached roster', async () => {
    seedHint();
    apiClient.bootstrap.mockResolvedValue(signedIn());

    renderShell();

    expect(await screen.findByText('SHELL CHILD')).toBeInTheDocument();
    expect(readLastTenant(STORE)).toEqual({ orgId: 'org-a', userId: 'user-a', displayName: 'Ada', orgName: 'Acme' });
    expect(readBootCache('org-a', 'user-a', 'employees', STORE).value).toEqual([{ id: 'e1', name: 'Priya' }]);
  });

  test('an organization switch clears the cached display data and replaces the hint', async () => {
    seedHint();
    apiClient.bootstrap.mockResolvedValue(signedIn({ id: 'org-b', name: 'Other Co' }));

    renderShell();

    expect(await screen.findByText('SHELL CHILD')).toBeInTheDocument();
    expect(readBootCache('org-a', 'user-a', 'employees', STORE)).toBeUndefined();
    expect(readBootCache('org-a', 'user-a', 'runtime-appearance', STORE)).toBeUndefined();
    expect(readLastTenant(STORE)).toEqual({ orgId: 'org-b', userId: 'user-a', displayName: 'Ada', orgName: 'Other Co' });
  });

  test('an account mismatch clears the cached display data and replaces the hint', async () => {
    seedHint();
    apiClient.bootstrap.mockResolvedValue(signedIn(ORG_A, { id: 'user-b', display_name: 'Ben' }));

    renderShell();

    expect(await screen.findByText('SHELL CHILD')).toBeInTheDocument();
    expect(readBootCache('org-a', 'user-a', 'employees', STORE)).toBeUndefined();
    expect(readLastTenant(STORE)).toEqual({ orgId: 'org-a', userId: 'user-b', displayName: 'Ben', orgName: 'Acme' });
  });

  test('a 401 bootstrap with a stale hint ends on the sign-in route and clears the hint', async () => {
    seedHint();
    apiClient.bootstrap.mockRejectedValue(Object.assign(new Error('unauthorized'), { response: { status: 401 } }));

    renderShell();

    expect(await screen.findByText('NAVIGATE /hivemind/login')).toBeInTheDocument();
    expect(screen.queryByText('SHELL CHILD')).not.toBeInTheDocument();
    expect(readLastTenant(STORE)).toBeNull();
    expect(readBootCache('org-a', 'user-a', 'employees', STORE)).toBeUndefined();
  });

  test('an unauthenticated bootstrap with a stale hint clears the hint and ends on sign-in', async () => {
    seedHint();
    apiClient.bootstrap.mockResolvedValue({ authenticated: false, user: null });

    renderShell();

    expect(await screen.findByText('NAVIGATE /hivemind/login')).toBeInTheDocument();
    expect(readLastTenant(STORE)).toBeNull();
  });

  test('phone widths keep the loading screen instead of the desktop frame', async () => {
    seedHint();
    window.matchMedia = jest.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    renderShell();

    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.queryByText('Priya')).not.toBeInTheDocument();
  });

  test('without a saved hint the route waits for bootstrap with no frame', () => {
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    renderShell();

    expect(screen.queryByText('Loading workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('SHELL CHILD')).not.toBeInTheDocument();
  });
});

describe('shell hint sign-out', () => {
  test('logout clears the hint and cached display data', async () => {
    seedHint();
    apiClient.bootstrap.mockResolvedValue(signedIn());
    apiClient.logout.mockResolvedValue({});
    let auth;
    function Probe() { auth = useAuth(); return null; }
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, origin: 'http://localhost', href: 'http://localhost/hivemind/app/overview' };
    try {
      render(<AuthProvider><Probe /></AuthProvider>);
      await waitFor(() => expect(auth.isAuthenticated).toBe(true));
      await act(async () => { await auth.logout(); });
      expect(readLastTenant(STORE)).toBeNull();
      expect(readBootCache('org-a', 'user-a', 'employees', STORE)).toBeUndefined();
    } finally {
      window.location = originalLocation;
    }
  });
});
