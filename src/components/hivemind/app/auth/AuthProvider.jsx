import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../shared/api-client';

const AuthContext = createContext(undefined);

/**
 * AuthProvider
 *
 * Handles the full OIDC auth lifecycle per the control-plane record:
 *   1. GET /auth/login?redirect_uri=...  → ZITADEL
 *   2. ZITADEL → GET /auth/callback      → sets hm_cp_session cookie
 *   3. GET /v1/bootstrap                  → returns user, org, core_api_base_url
 *
 * The login page is NEVER blocked by bootstrap. If the control plane is
 * unreachable, the login page renders immediately with a "Sign In" button.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const bootstrapAttempted = useRef(false);
  const location = useLocation();

  const runBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.bootstrap();
      setUser(data.user || null);
      setOrg(data.org || null);
      setNeedsOnboarding(data.user && !data.org);

      if (data.api_key) {
        apiClient.setApiKey(data.api_key);
      }
    } catch (err) {
      // 401 = not authenticated (expected for login page)
      // Network errors = control plane unreachable
      // Either way: user is not authenticated
      setUser(null);
      setOrg(null);
      if (err.response?.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      bootstrapAttempted.current = true;
    }
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  // Re-run bootstrap when returning from OIDC callback
  // The control plane redirects back with ?auth=callback after successful login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'callback' && bootstrapAttempted.current) {
      runBootstrap();
    }
  }, [location.search, runBootstrap]);

  const login = useCallback(() => {
    // Build the redirect URI the control plane should return the user to after OIDC
    const redirectUri = `${window.location.origin}/hivemind/app/overview?auth=callback`;
    const loginUrl = apiClient.getLoginUrl(redirectUri);
    window.location.href = loginUrl;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore logout failures — clear local state regardless
    }
    setUser(null);
    setOrg(null);
    window.location.href = '/hivemind';
  }, []);

  const createOrg = useCallback(async (name) => {
    const data = await apiClient.createOrg(name);
    setOrg(data.org || data);
    setNeedsOnboarding(false);
    return data;
  }, []);

  const value = {
    user,
    org,
    loading,
    error,
    needsOnboarding,
    login,
    logout,
    createOrg,
    refresh: runBootstrap,
    isAuthenticated: !!user,
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
