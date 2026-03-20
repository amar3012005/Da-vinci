import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useHealthStatus } from '../shared/hooks';
import { Search, Bell, BookOpen, ExternalLink } from 'lucide-react';

const pageTitles = {
  '/hivemind/app/overview': 'Overview',
  '/hivemind/app/memories': 'Memories',
  '/hivemind/app/keys': 'API Keys',
  '/hivemind/app/connectors': 'Connectors',
  '/hivemind/app/profile': 'Profile',
  '/hivemind/app/evaluation': 'Evaluation',
  '/hivemind/app/settings': 'Settings',
  '/hivemind/app/billing': 'Billing',
};

const pageDescriptions = {
  '/hivemind/app/overview': 'Your memory engine at a glance',
  '/hivemind/app/memories': 'Browse and manage stored knowledge',
  '/hivemind/app/keys': 'Manage API authentication keys',
  '/hivemind/app/connectors': 'Connect data sources and AI clients',
  '/hivemind/app/profile': 'Your memory footprint and context',
  '/hivemind/app/evaluation': 'Test retrieval quality',
  '/hivemind/app/settings': 'Workspace configuration',
  '/hivemind/app/billing': 'Manage your plan and usage',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const healthy = useHealthStatus();
  const [searchFocused, setSearchFocused] = useState(false);

  const title = pageTitles[location.pathname] || 'HIVEMIND';
  const description = pageDescriptions[location.pathname] || '';

  return (
    <header className="h-14 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Title + Description */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h1 className="text-white text-[15px] font-semibold font-['Space_Grotesk'] tracking-tight leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-white/25 text-[11px] font-['Space_Grotesk'] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <button
          onClick={() => navigate('/hivemind/app/memories')}
          className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-white/30 hover:text-white/50 transition-all text-xs font-['Space_Grotesk']"
        >
          <Search size={13} />
          <span className="hidden md:inline">Search memories...</span>
          <kbd className="hidden md:inline text-[10px] font-mono text-white/15 bg-white/[0.04] rounded px-1 py-0.5 ml-4">
            /
          </kbd>
        </button>

        {/* Docs */}
        <a
          href="https://docs.hivemind.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.04] text-white/25 hover:text-white/50 transition-colors"
          title="Documentation"
        >
          <BookOpen size={15} />
        </a>

        {/* Health */}
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              healthy === null
                ? 'bg-white/20'
                : healthy
                ? 'bg-emerald-400'
                : 'bg-red-400'
            }`}
          />
          <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">
            {healthy === null ? '...' : healthy ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
