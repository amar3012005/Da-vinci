import React from 'react';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import OptimisticAppShell from '../../layout/OptimisticAppShell';
import { HYPERAGENT_WIDTHS } from '../../layout/hyperagent-widths';
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

afterEach(() => {
  delete process.env.REACT_APP_OPTIMISTIC_IDENTITY;
});

beforeEach(() => {
  delete process.env.REACT_APP_OPTIMISTIC_IDENTITY;
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
    global.__testPath = '/hivemind/app/employee/harness';
    const pending = deferred();
    apiClient.bootstrap.mockReturnValue(pending.promise);

    renderShell();

    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.queryByText('Priya')).not.toBeInTheDocument();
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

describe('optimistic frame geometry and scope', () => {
  test('the team route frame uses the settled team sidebar width and three roster columns', async () => {
    process.env.REACT_APP_OPTIMISTIC_IDENTITY = 'true';
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    const aside = container.querySelector('aside');
    expect(aside.style.width).toBe(`${HYPERAGENT_WIDTHS[3]}px`);
    expect(container.querySelector('[data-optimistic-shell] > div.min-w-0').style.marginLeft).toBe(`${HYPERAGENT_WIDTHS[3]}px`);
    expect(container.querySelector('.ha-employee-grid').style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(screen.getByText('1 employee')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.getByText('Runtime')).toBeInTheDocument();
  });

  test('the Brain route frame has no team roster, so cached employees are not drawn there', () => {
    seedHint();
    global.__testPath = '/hivemind/app/overview';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    expect(container.querySelector('aside').style.width).toBe('300px');
    expect(screen.queryByText('Priya')).not.toBeInTheDocument();
    expect(screen.queryByText('Your team')).not.toBeInTheDocument();
  });

  test('the restoring frame exposes no controls and no links while bootstrap is in flight', () => {
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    expect(container.querySelectorAll('button, a, input, select, textarea, [tabindex], [href], [role="button"]')).toHaveLength(0);
    expect(container.querySelector('aside').getAttribute('aria-hidden')).toBe('true');
  });

  test('a roster stored for another tenant is never drawn in the frame', () => {
    rememberTenant('org-a', 'user-a', STORE, { displayName: 'Ada', orgName: 'Acme' });
    writeBootCache('org-b', 'user-b', 'employees', [{ id: 'x', name: 'Other Tenant Agent' }], STORE);
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    expect(screen.queryByText('Other Tenant Agent')).not.toBeInTheDocument();
    expect(container.querySelector('.ha-employee-name')).toBeNull();
  });

  test('without a cached roster the team frame holds three placeholder tiles and no names', () => {
    rememberTenant('org-a', 'user-a', STORE, { displayName: 'Ada', orgName: 'Acme' });
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    expect(container.querySelectorAll('.ha-employee-tile.is-placeholder')).toHaveLength(3);
    expect(container.querySelector('[data-runtime-avatar-pending]')).toBeInTheDocument();
    expect(container.querySelector('.ha-employee-name')).toBeNull();
  });

  test('the frame keeps the settled header and reserved sizes from the stylesheet', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', '..', 'layout', 'OptimisticAppShell.css'), 'utf8');
    expect(css).toMatch(/\.optimistic-shell-header\s*\{\s*height:\s*56px;?\s*\}/);
    expect(css).toMatch(/\.optimistic-shell-composer\s*\{[^}]*min-height:\s*96px/);
    const nav = fs.readFileSync(path.join(__dirname, '..', '..', 'layout', 'desktop-hyperagents-navigation.css'), 'utf8');
    expect(nav).toMatch(/\.ha-employee-tile \{[^}]*min-height:145px/);
  });
});

// Stands in for AppShell's company-check gate: the frame is the only content, so its reveal rule is what shows.
function renderGate() {
  return render(
    <AuthProvider>
      <Routes>
        <Route path="/hivemind/app/*" element={<ProtectedRoute optimisticFallback={<OptimisticAppShell />}><OptimisticAppShell fallback={<div>GATE FALLBACK</div>} /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>,
  );
}

describe('identity stays hidden until bootstrap confirms it', () => {
  test('default restoring DOM holds no organization name, member name, or avatar source', () => {
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    const html = container.innerHTML;
    expect(html).not.toContain('Acme');
    expect(html).not.toContain('Priya');
    expect(html).not.toContain('runtime-characters');
    expect(html).not.toContain('orbit');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('.optimistic-skeleton').length).toBeGreaterThan(0);
  });

  test('default restoring frame keeps the settled box sizes of the revealed frame', () => {
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const hidden = renderShell().container;
    const hiddenBoxes = {
      aside: hidden.querySelector('aside').style.width,
      content: hidden.querySelector('[data-optimistic-shell] > div.min-w-0').style.marginLeft,
      grid: hidden.querySelector('.ha-employee-grid').style.gridTemplateColumns,
      avatarSlot: hidden.querySelector('[data-runtime-avatar-pending]').style.width,
      headerHeightClass: hidden.querySelector('.optimistic-shell-header').className,
      titleSkeleton: hidden.querySelector('h1 .optimistic-skeleton').style.width,
    };
    expect(hiddenBoxes).toEqual({
      aside: `${HYPERAGENT_WIDTHS[3]}px`,
      content: `${HYPERAGENT_WIDTHS[3]}px`,
      grid: 'repeat(3, minmax(0, 1fr))',
      avatarSlot: '82px',
      headerHeightClass: 'optimistic-shell-header grid grid-cols-[minmax(0,1fr)_auto] items-center px-6',
      titleSkeleton: '180px',
    });
  });

  test('the cached identity appears right after a matching bootstrap, with no further request', async () => {
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockResolvedValue(signedIn());

    renderGate();

    expect(await screen.findByText('Priya')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.queryByText('GATE FALLBACK')).not.toBeInTheDocument();
    expect(apiClient.listEmployees).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a mismatched bootstrap never reveals the previous identity in the gate', async () => {
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockResolvedValue(signedIn({ id: 'org-b', name: 'Other Co' }));

    const { container } = renderGate();

    expect(await screen.findByText('GATE FALLBACK')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('Priya');
    expect(container.innerHTML).not.toContain('Acme');
  });

  test('the opt-in build flag shows the cached identity while bootstrap is pending', () => {
    process.env.REACT_APP_OPTIMISTIC_IDENTITY = 'true';
    seedHint();
    global.__testPath = '/hivemind/app/employee/harness';
    apiClient.bootstrap.mockReturnValue(new Promise(() => {}));

    const { container } = renderShell();

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(container.querySelector('img').getAttribute('src')).toContain('orbit-ready.webp');
    expect(container.querySelector('aside').style.width).toBe(`${HYPERAGENT_WIDTHS[3]}px`);
  });
});

describe('REACT_APP_OPTIMISTIC_IDENTITY validation', () => {
  const { parseOptimisticIdentityFlag } = require('../../shared/optimistic-identity');

  test('unset, empty and false keep identity hidden', () => {
    expect(parseOptimisticIdentityFlag(undefined)).toBe(false);
    expect(parseOptimisticIdentityFlag('')).toBe(false);
    expect(parseOptimisticIdentityFlag('false')).toBe(false);
  });

  test('only the exact value true enables it', () => {
    expect(parseOptimisticIdentityFlag('true')).toBe(true);
  });

  test('any other value fails loudly instead of choosing a mode', () => {
    expect(() => parseOptimisticIdentityFlag('TRUE')).toThrow(/REACT_APP_OPTIMISTIC_IDENTITY/);
    expect(() => parseOptimisticIdentityFlag('1')).toThrow(/REACT_APP_OPTIMISTIC_IDENTITY/);
    expect(() => parseOptimisticIdentityFlag('yes')).toThrow(/REACT_APP_OPTIMISTIC_IDENTITY/);
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
