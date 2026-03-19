import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../shared/api-client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const runBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.bootstrap();
      setUser(data.user || null);
      setOrg(data.org || null);
      setNeedsOnboarding(!data.org);

      // If we have an API key from bootstrap, set it
      if (data.api_key) {
        apiClient.setApiKey(data.api_key);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Not authenticated — that's expected
        setUser(null);
        setOrg(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  const login = useCallback(() => {
    window.location.href = apiClient.getLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setOrg(null);
      window.location.href = '/hivemind';
    }
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
