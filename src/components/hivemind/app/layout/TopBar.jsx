import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useHealthStatus } from '../shared/hooks';

const pageTitles = {
  '/hivemind/app/overview': 'Overview',
  '/hivemind/app/memories': 'Memories',
  '/hivemind/app/keys': 'API Keys',
  '/hivemind/app/connectors': 'Connectors',
  '/hivemind/app/profile': 'Profile',
  '/hivemind/app/evaluation': 'Evaluation',
  '/hivemind/app/settings': 'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const { user } = useAuth();
  const healthy = useHealthStatus();

  const title = pageTitles[location.pathname] || 'HIVEMIND';

  return (
    <header className="h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-white text-lg font-semibold font-['Space_Grotesk'] tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Core Health Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              healthy === null
                ? 'bg-white/20'
                : healthy
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
            }`}
          />
          <span className="text-xs text-white/40 font-mono">
            {healthy === null ? 'checking' : healthy ? 'core online' : 'core offline'}
          </span>
        </div>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-4 border-l border-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-[#bdf213]/10 flex items-center justify-center">
              <span className="text-[#bdf213] text-xs font-bold font-mono">
                {(user.display_name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-white/60 text-sm font-['Space_Grotesk'] max-w-[120px] truncate">
              {user.display_name || user.email || 'User'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
