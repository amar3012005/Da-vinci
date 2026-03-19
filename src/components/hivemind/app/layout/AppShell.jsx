import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../auth/AuthProvider';
import OnboardingFlow from '../pages/Onboarding';

export default function AppShell() {
  const { needsOnboarding } = useAuth();

  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-['Space_Grotesk']">
      <Sidebar />
      <div className="ml-[240px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
