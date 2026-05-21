import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../shared/api-client';

const AuthContext = createContext(undefined);

/**
 * Four auth states — not one generic "unavailable":
 *
 *   loading                   → checking session / bootstrap in flight
  *   signed_out                → control plane is reachable, user not authenticated
  *   signed_in                 → bootstrap returned authenticated user context
 *   control_plane_unreachable → network failure or timeout — the only state that says "unavailable"
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [connectivity, setConnectivity] = useState(null);
  const [clientSupport, setClientSupport] = useState([]);
  const bootstrapAttempted = useRef(false);
  const location = useLocation();

  const runBootstrap = useCallback(async () => {
    setAuthState('loading');

    try {
      const data = await apiClient.bootstrap();
      setConnectivity(data.connectivity || null);
      setClientSupport(data.client_support || []);

      if (data.authenticated === false || !data.user) {
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setAuthState('signed_out');
      } else {
        setUser(data.user || null);
        setOrg(data.organization || null);
        setOnboarding(data.onboarding || null);
        setAuthState('signed_in');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setConnectivity(null);
        setClientSupport([]);
        setAuthState('signed_out');
      } else {
        setUser(null);
        setOrg(null);
        setOnboarding(null);
        setConnectivity(null);
        setClientSupport([]);
        setAuthState('control_plane_unreachable');
      }
    } finally {
      bootstrapAttempted.current = true;
    }
  }, []);

  useEffect(() => {
    runBootstrap();
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
    // Honor caller-provided returnTo (e.g. invitee bouncing through /hivemind/join/...)
    // and fall back to the default overview landing.
    const defaultReturn = `${window.location.origin}/hivemind/app/overview?auth=callback`;
    const returnTo = typeof options.returnTo === 'string' && options.returnTo
      ? options.returnTo
      : defaultReturn;
    if (options.provider === 'google') {
      // Direct Google OAuth — bypasses Zitadel
      window.location.href = apiClient.getGoogleLoginUrl(returnTo);
    } else {
      // Zitadel Enterprise SSO
      window.location.href = apiClient.getLoginUrl(returnTo);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Clear local state regardless
    }
    setUser(null);
    setOrg(null);
    setOnboarding(null);
    setAuthState('signed_out');
    window.location.href = '/hivemind';
  }, []);

  const createOrg = useCallback(async (name) => {
    const data = await apiClient.createOrg(name);
    setOrg(data.organization || null);
    setOnboarding(prev => prev ? { ...prev, needs_org_setup: false } : null);
    return data;
  }, []);

  const value = {
    // Four states
    authState,
    loading: authState === 'loading',
    isAuthenticated: authState === 'signed_in',
    isSignedOut: authState === 'signed_out',
    isUnreachable: authState === 'control_plane_unreachable',

    // Bootstrap payload
    user,
    org,
    onboarding,
    connectivity,
    clientSupport,

    // Derived flags
    needsOnboarding: onboarding?.needs_org_setup === true,
    hasApiKey: onboarding?.has_api_key === true,

    // Actions
    login,
    logout,
    createOrg,
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
