import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../auth/AuthProvider';
import OnboardingFlow from '../pages/Onboarding';
import ApiKeySetup from '../pages/ApiKeySetup';
import apiClient from '../shared/api-client';

/**
 * AppShell — Supermemory-style layout:
 *   1. needs_org_setup -> show org creation
 *   2. has_api_key === false -> show first API key setup
 *   3. otherwise -> full dashboard with collapsible sidebar
 */
export default function AppShell() {
  const { needsOnboarding, hasApiKey } = useAuth();

  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  if (hasApiKey === false) {
    return <ApiKeySetup />;
  }

  if (hasApiKey === true && !apiClient.hasApiKey()) {
    return <ApiKeySetup />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] font-['Space_Grotesk']">
      <Sidebar />
      {/* Content area - responsive to sidebar. CSS transition handled by sidebar width. */}
      <div className="ml-[260px] flex flex-col min-h-screen transition-all duration-200">
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
