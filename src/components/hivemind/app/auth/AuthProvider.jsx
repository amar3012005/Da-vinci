import { classifyConnectionFailure } from './connection-failure';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../shared/api-client';
import posthog, { isPostHogEnabled } from '../../../../analytics/posthog';
import { setStorageUser, clearUserScopedStorage } from '../shared/user-storage';
import { clearBootCache, readLastTenant, rememberTenant, writeBootCache } from '../shared/boot-cache';
import { defaultAuthReturnUrl } from './mobile-routing';
import { isNativeApp } from '../shared/native-app';
import { bindNativeTouchFeedback } from '../shared/native-haptics';
import { bindNativeAuthCallbacks, nativeAuth } from '../shared/native-auth';
import { nativeWorkspaceAccess } from '../shared/native-room';
import { adoptScope, wipeAllScopes } from '../shared/sync';
import { clearShellBootstrap, readShellBootstrap, writeShellBootstrap } from '../shared/shell-bootstrap-cache';

const AuthContext = createContext(undefined);
const ACCESS_CHECK_THROTTLE_MS = 15000;

// One workspace-access read. Shared by the early read started at mount and the read run after bootstrap.
async function fetchModeAccess(signal) {
  // The packaged app's origin cannot reach the Worker; the native plugin asks the same endpoint with the stored session.
  if (isNativeApp()) return nativeWorkspaceAccess();
  const response = await fetch('/__hivemind/account-mode-access', {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!response.ok) throw new Error('workspace_access_unavailable');
  return response.json();
}

/**
 * Four auth states — not one generic "unavailable":
 *
 *   loading                   → checking session / bootstrap in flight
  *   signed_out                → control plane is reachable, user not authenticated
  *   signed_in                 → bootstrap returned authenticated user context
 *   control_plane_unreachable → network failure or timeout — the only state that says "unavailable"
 */
export function AuthProvider({ children, shellIdentity }) {
  // The sidebar shell passes the identity its host verified: a bootstrap this tab confirmed earlier for that identity draws at once, and the
  // live bootstrap below still refreshes it. Nothing else passes it, so the app's own sign-in flow is unchanged.
  const [seed] = useState(() => (shellIdentity ? readShellBootstrap(shellIdentity) : null));
  useEffect(() => bindNativeTouchFeedback({ document, storage: window.localStorage }), []);
  const [authState, setAuthState] = useState(seed ? 'signed_in' : 'loading');
  const [connectionFailure, setConnectionFailure] = useState(null);
  const [user, setUser] = useState(seed?.user ?? null);
  const [org, setOrg] = useState(seed?.organization ?? null);
  const [onboarding, setOnboarding] = useState(seed?.onboarding ?? null);
  const [connectivity, setConnectivity] = useState(seed?.connectivity ?? null);
  const [clientSupport, setClientSupport] = useState(seed?.client_support ?? []);
  const [modeAccess, setModeAccess] = useState({ userId: null, enabled: false });
  // Shell hint saved by the last confirmed session. It is display-only and is exposed as
  // `optimisticShell` while bootstrap is in flight; no identity reaches `user` or `org` until bootstrap confirms.
  const [optimisticHint] = useState(() => readLastTenant());
  // Set only when bootstrap confirms the same organization and user as the saved hint. Cached identity
  // may then render before the workspace gates finish; it is never set from the hint alone.
  const [restoredHint, setRestoredHint] = useState(null);
  useEffect(() => {
    if (authState !== 'signed_in' || !user?.id) return undefined;
    const controller = new AbortController();
    let pending = false;
    // The last verified display state for this account renders the workspace
    // at once on reload; the request below still confirms it, and server
    // authorization gates every protected request.
    const accessKey = `hivemind.mode-access:${user.id}`;
    try {
      const remembered = sessionStorage.getItem(accessKey);
      if (remembered === '1' || remembered === '0') setModeAccess(previous => previous.userId === user.id ? previous : { userId: user.id, enabled: remembered === '1', error: null });
    } catch { /* Storage-blocked tabs wait for the access check. */ }
    const refreshAccess = async (reason) => {
      if (pending || document.visibilityState === 'hidden') return;
      // Focus and visibility events fire right after a load; one check per window is enough.
      if (reason !== 'interval' && Date.now() - lastAccessCheck.current < ACCESS_CHECK_THROTTLE_MS) return;
      pending = true;
      try {
        const early = earlyAccess.current;
        earlyAccess.current = null;
        const result = early && early.userId === user.id
          ? await early.promise
          : await fetchModeAccess(controller.signal);
        lastAccessCheck.current = Date.now();
        if (typeof result.enabled !== 'boolean') throw new Error('workspace_access_unavailable');
        try { sessionStorage.setItem(accessKey, result.enabled ? '1' : '0'); } catch { /* Display memory only. */ }
        if (!controller.signal.aborted) setModeAccess({ userId: user.id, enabled: result.enabled, error: null });
      } catch {
        // An unavailable check is not a revocation. Keep this account's last
        // verified display state; server authorization still gates every request.
        if (!controller.signal.aborted) setModeAccess(previous => ({
          userId: user.id, enabled: previous.userId === user.id && previous.enabled,
          error: 'Workspace access could not be checked. Please retry.',
        }));
      }
      finally { pending = false; }
    };
    const onFocus = () => refreshAccess('focus');
    const onVisibility = () => refreshAccess('visibility');
    void refreshAccess('mount');
    const interval = window.setInterval(() => refreshAccess('interval'), 60000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort(); window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authState, user?.id]);

  const lastAccessCheck = useRef(0);
  const earlyAccess = useRef(null);
  // Start the workspace-access read at mount for the saved identity, in parallel with bootstrap. The refresh
  // effect consumes it only when bootstrap confirms the same user, so the result never applies to another account.
  useEffect(() => {
    if (isNativeApp() || !optimisticHint?.userId) return undefined;
    const controller = new AbortController();
    const promise = fetchModeAccess(controller.signal);
    promise.catch(() => { /* Consumed or dropped by the refresh effect, which reports its own failure. */ });
    earlyAccess.current = { userId: optimisticHint.userId, promise };
    return () => controller.abort();
  }, [optimisticHint]);

  const bootstrapAttempted = useRef(false);
  const activeTenantRef = useRef(null);
  const authStateRef = useRef(seed ? 'signed_in' : 'loading');
  useEffect(() => { authStateRef.current = authState; }, [authState]);
  const location = useLocation();

  const runBootstrap = useCallback(async () => {
    // A background refresh keeps a signed-in tree mounted; resetting to
    // 'loading' would unmount the workspace and remount its iframe and panes.
    if (authStateRef.current !== 'signed_in') setAuthState('loading');
    setConnectionFailure(null);
    if (isNativeApp()) { setUser(null); setOrg(null); setOnboarding(null); }

    try {
      // Hard timeout so a hung bootstrap never traps the user on the
      // "Loading HIVEMIND..." spinner forever. If the control-plane request
      // stalls (e.g. a poisoned browser connection, network wedge), we fall
      // through to a retryable connection notice without treating it as sign-out.
      const data = await Promise.race([
        apiClient.bootstrap(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('bootstrap_timeout')), 12000)
        ),
      ]);
      setConnectivity(data.connectivity || null);
      setClientSupport(data.client_support || []);

      if (data.authenticated === false || !data.user) {
        clearBootCache();
        clearShellBootstrap();
        // A session that ended without a sign-out on this device leaves no cached rows behind.
        void wipeAllScopes();
        if (activeTenantRef.current) window.dispatchEvent(new CustomEvent('hm:tenant-changed'));
        activeTenantRef.current = null;
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setAuthState('signed_out');
      } else {
        // Per-account storage identity — on an account SWITCH this purges the
        // previous user's chat caches so they never leak across logins.
        try { setStorageUser(data.user); } catch { /* storage blocked */ }
        // A saved hint for another identity (account or organization switch) drops its cached display data.
        const storedHint = readLastTenant();
        const identityMatches = Boolean(storedHint && storedHint.orgId === data.organization?.id && storedHint.userId === data.user?.id);
        if (storedHint && !identityMatches) clearBootCache();
        setRestoredHint(identityMatches ? storedHint : null);
        setUser(data.user || null);
        setOrg(data.organization || null);
        setOnboarding(data.onboarding || null);
        setAuthState('signed_in');
        if (shellIdentity) writeShellBootstrap(data);
        const nextTenant = `${data.organization?.id || ''}:${data.user?.id || ''}`;
        if (activeTenantRef.current && activeTenantRef.current !== nextTenant) window.dispatchEvent(new CustomEvent('hm:tenant-changed'));
        activeTenantRef.current = nextTenant;
        // Rows of any other person or company on this device are removed before a screen reads from the local store.
        void adoptScope(data.organization?.id, data.user?.id);
        rememberTenant(data.organization?.id, data.user?.id, undefined, { displayName: data.user?.display_name || data.user?.name, orgName: data.organization?.name });
        // Display-only: lets the restoring frame omit Runtime's card for a company that switched Runtime off.
        writeBootCache(data.organization?.id, data.user?.id, 'runtime-enabled', { enabled: data.organization?.runtime_enabled !== false });
        if (data.organization?.id) {
          try { localStorage.removeItem('hivemind_onboarding'); } catch { /* ignore */ }
        }
        // PostHog: attribute sessions to the user + org (no-op if PH disabled).
        try {
          if (posthog && isPostHogEnabled() && data.user?.id) {
            posthog.identify(data.user.id, {
              email: data.user.email,
              name: data.user.display_name || data.user.name,
              org_id: data.organization?.id,
            });
            if (data.organization?.id) posthog.group('organization', data.organization.id, { name: data.organization.name });
          }
        } catch { /* analytics never blocks auth */ }
      }
    } catch (err) {
      // Only an explicit authentication denial signs the user out. A timeout
      // or unreachable service cannot establish whether a session is valid.
      if (err.response?.status === 401) {
        // A rejected session ends the stale shell hint and cached display data.
        clearBootCache();
        clearShellBootstrap();
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setConnectivity(null);
        setClientSupport([]);
        setAuthState('signed_out');
      } else if (shellIdentity && authStateRef.current === 'signed_in') {
        // The sidebar already drawn from this tab's confirmed bootstrap stays through a timeout or network failure.
      } else {
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setConnectivity(null);
        setClientSupport([]);
        setConnectionFailure(classifyConnectionFailure(err));
        setAuthState('control_plane_unreachable');
      }
    } finally {
      bootstrapAttempted.current = true;
    }
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  // A 401 from a data request (for example the team roster) re-checks the session at most every 30 s,
  // so an expired session reaches sign-in instead of leaving a stale screen.
  useEffect(() => {
    let last = 0;
    const recheck = () => { if (Date.now() - last < 30000) return; last = Date.now(); void runBootstrap(); };
    window.addEventListener('hm:session-check', recheck);
    return () => window.removeEventListener('hm:session-check', recheck);
  }, [runBootstrap]);

  useEffect(() => {
    if (authState !== 'control_plane_unreachable') return undefined;
    const retry = () => { void runBootstrap(); };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
    };
  }, [authState, runBootstrap]);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    let cancelled = false; let dispose;
    bindNativeAuthCallbacks(runBootstrap, () => { setAuthState(current => current === 'signed_in' ? current : 'signed_out'); })
      .then(cleanup => { if (cancelled) cleanup(); else dispose = cleanup; })
      .catch(() => { if (!cancelled) setAuthState('signed_out'); });
    return () => { cancelled = true; dispose?.(); };
  }, [runBootstrap]);

  // Re-bootstrap when returning from ZITADEL callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'callback' && bootstrapAttempted.current) {
      runBootstrap();
    }
  }, [location.search, runBootstrap]);

  // CLI handoff recovery: when the user lands here authed AND we have a
  // pending cli_return_to stashed in sessionStorage (LoginPage put it
  // there when the user first arrived from the CLI), bounce them across
  // to the control-plane URL so the API key gets minted and the
  // localhost callback fires. Without this safety net, OAuth round-trips
  // that drop URL params would dump the user on /overview while the CLI
  // sat in its 'Waiting for sign-in…' loop forever.
  useEffect(() => {
    if (authState !== 'signed_in') return;
    let pending;
    try { pending = sessionStorage.getItem('hivemind_cli_return_to'); } catch (e) {}
    if (!pending) return;
    // Single-shot — clear before redirecting so we don't ping-pong.
    try { sessionStorage.removeItem('hivemind_cli_return_to'); } catch (e) {}
    // Cross-origin: control-plane host (api.hivemind.davinciai.eu:8040) is
    // different from FE host (hivemind.davinciai.eu). window.location is
    // the right tool — React Router can't navigate cross-origin.
    window.location.href = pending;
  }, [authState]);

  const login = useCallback((options = {}) => {
    if (isNativeApp()) {
      nativeAuth().start().then(completed => { if (completed) runBootstrap(); }).catch(() => setAuthState('signed_out'));
      return;
    }
    // Honor caller-provided returnTo (e.g. invitee bouncing through /hivemind/join/...)
    // and fall back to the default overview landing.
    const defaultReturn = defaultAuthReturnUrl(window.location.origin);
    const returnTo = typeof options.returnTo === 'string' && options.returnTo
      ? options.returnTo
      : defaultReturn;
    if (options.provider === 'google') {
      // Direct Google OAuth — bypasses Zitadel
      window.location.href = apiClient.getGoogleLoginUrl(returnTo, null, options.workspaceInviteToken);
    } else if (options.provider === 'microsoft' || options.provider === 'apple') {
      // Federated through ZITADEL — control plane maps the hint to the
      // registered IdP (or falls back to the ZITADEL chooser).
      window.location.href = apiClient.getLoginUrl(returnTo, options.provider, options.workspaceInviteToken);
    } else {
      // Zitadel Enterprise SSO
      window.location.href = apiClient.getLoginUrl(returnTo, undefined, options.workspaceInviteToken);
    }
  }, [runBootstrap]);

  const logout = useCallback(async () => {
    try {
      if (isNativeApp()) await nativeAuth().logout();
      else await apiClient.logout();
    } catch {
      // Clear local state regardless
    }
    apiClient.clearApiKey();
    setUser(null);
    setOrg(null);
    setOnboarding(null);
    setAuthState('signed_out');
    activeTenantRef.current = null;
    try { window.dispatchEvent(new CustomEvent('hm:tenant-changed')); } catch { /* noop */ }
    // Purge this account's chat caches + storage identity so the next login
    // on this device starts clean (the cross-account cache bug).
    try { setStorageUser(null); clearUserScopedStorage(); } catch { /* noop */ }
    try { if (posthog && isPostHogEnabled()) posthog.reset(); } catch { /* noop */ }
    window.location.href = isNativeApp() ? '/hivemind/login' : '/hivemind';
  }, []);

  // The Enable Runtime setting changes the company in place, so Runtime appears or disappears without a reload.
  const setRuntimeEnabled = useCallback((enabled) => {
    setOrg(current => (current ? { ...current, runtime_enabled: enabled === true } : current));
    if (user?.id && org?.id) writeBootCache(org.id, user.id, 'runtime-enabled', { enabled: enabled === true });
  }, [user?.id, org?.id]);

  const createOrg = useCallback(async (name) => {
    const data = await apiClient.createOrg(name);
    setOrg(data.organization || null);
    setOnboarding(prev => prev ? { ...prev, needs_org_setup: false } : null);
    // Freshly-created org = brand-new user → AppShell shows the capability
    // walkthrough slides + activation sequence before the workspace opens.
    try { sessionStorage.setItem('hm_new_user', '1'); } catch { /* best effort */ }
    return data;
  }, []);

  const value = {
    // Four states
    authState,
    // Cached shell hint for the optimistic first paint. Set only while bootstrap is in flight.
    optimisticShell: authState === 'loading' && !isNativeApp() ? optimisticHint : null,
    // Cached identity confirmed by bootstrap for the same organization and user. Null otherwise.
    restoredShell: authState === 'signed_in' && !isNativeApp() ? restoredHint : null,
    loading: authState === 'loading',
    isAuthenticated: authState === 'signed_in',
    isSignedOut: authState === 'signed_out',
    isUnreachable: authState === 'control_plane_unreachable',
    connectionFailure,

    // Bootstrap payload
    user,
    org,
    onboarding,
    connectivity,
    clientSupport,

    workspaceModesError: modeAccess.userId === user?.id ? modeAccess.error : null,
    workspaceModesReady: authState === 'signed_in' && modeAccess.userId === user?.id,
    workspaceModesEnabled: authState === 'signed_in' && modeAccess.userId === user?.id && modeAccess.enabled,

    // Derived flags
    needsOnboarding: authState === 'signed_in' && (!org?.id || onboarding?.needs_org_setup === true),
    hasApiKey: onboarding?.has_api_key === true,

    // Actions
    login,
    logout,
    createOrg,
    setRuntimeEnabled,
    refresh: runBootstrap,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Auth context when one is mounted, otherwise null: for components that also render outside the signed-in app.
 * @returns {object|null} the auth context.
 */
export function useOptionalAuth() {
  return useContext(AuthContext) ?? null;
}
