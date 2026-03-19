import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../shared/api-client';

const AuthContext = createContext(undefined);

/**
 * AuthProvider — wired to the control-plane-server.js contract
 *
 * Bootstrap response shape:
 *   user:         { id, email, display_name, zitadel_user_id }
 *   organization: { id, name, slug } | null
 *   onboarding:   { needs_org_setup, has_api_key }
 *   connectivity: { core_api_base_url, core_health }
 *   client_support: string[]
 *
 * Auth flow:
 *   1. GET /auth/login?return_to=<frontend_url>  → ZITADEL
 *   2. ZITADEL → GET /auth/callback → hm_cp_session cookie → redirect to return_to
 *   3. Frontend calls GET /v1/bootstrap (cookie sent automatically)
 *   4. If no org → POST /v1/orgs
 *   5. POST /v1/api-keys → mint key
 *   6. GET /v1/clients/descriptors → MCP configs
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [connectivity, setConnectivity] = useState(null);
  const [clientSupport, setClientSupport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bootstrapAttempted = useRef(false);
  const location = useLocation();

  const runBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.bootstrap();

      // Map to the actual control plane response shape
      setUser(data.user || null);
      setOrg(data.organization || null);
      setOnboarding(data.onboarding || null);
      setConnectivity(data.connectivity || null);
      setClientSupport(data.client_support || []);
    } catch (err) {
      setUser(null);
      setOrg(null);
      setOnboarding(null);
      setConnectivity(null);
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

  // Re-bootstrap when returning from ZITADEL callback
  // The control plane redirects back with ?auth=callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'callback' && bootstrapAttempted.current) {
      runBootstrap();
    }
  }, [location.search, runBootstrap]);

  const login = useCallback(() => {
    // return_to tells the control plane where to redirect after ZITADEL auth
    const returnTo = `${window.location.origin}/hivemind/app/overview?auth=callback`;
    window.location.href = apiClient.getLoginUrl(returnTo);
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
    window.location.href = '/hivemind';
  }, []);

  const createOrg = useCallback(async (name) => {
    const data = await apiClient.createOrg(name);
    // Response: { success, organization: { id, name, slug } }
    setOrg(data.organization || null);
    setOnboarding(prev => prev ? { ...prev, needs_org_setup: false } : null);
    return data;
  }, []);

  const value = {
    user,
    org,
    onboarding,
    connectivity,
    clientSupport,
    loading,
    error,
    needsOnboarding: onboarding?.needs_org_setup === true,
    hasApiKey: onboarding?.has_api_key === true,
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
