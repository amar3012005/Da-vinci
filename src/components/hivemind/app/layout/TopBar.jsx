import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHealthStatus } from '../shared/hooks';
import { Search, BookOpen, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TeamSwitcher from './TeamSwitcher';
import LangSwitcher from './LangSwitcher';
import WorkspaceNotifications from './WorkspaceNotifications';
import SingulanceBrand from '../shared/SingulanceBrand';

const pageTitles = {
  '/hivemind/app/overview': 'Overview',
  '/hivemind/app/memories': 'Memories',
  '/hivemind/app/keys': 'API Keys',
  '/hivemind/app/connectors': 'Connectors',
  '/hivemind/app/profile': 'Profile',
  '/hivemind/app/evaluation': 'Evaluation',
  '/hivemind/app/settings': 'Settings',
  '/hivemind/app/billing': 'Billing',
  '/hivemind/app/web': 'Web Studio',
  '/hivemind/app/mcp': 'MCP Server',
  '/hivemind/app/graph': 'Memory Graph',
  '/hivemind/app/engine': 'Engine Intelligence',
  '/hivemind/app/team/members': 'Team Members',
  '/hivemind/app/team/projects': 'Team Projects',
  '/hivemind/app/audit': 'Audit Log',
  '/hivemind/app/admin/users': 'Org Members',
  '/hivemind/app/admin/sso': 'SSO Configuration',
  '/hivemind/app/employees': 'Hyper Agents',
  '/hivemind/app/workspace': 'Workspace Admin',
  '/hivemind/app/hermes': 'Hermes Agents',
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
  '/hivemind/app/web': 'Ask the web or paste a URL — auto-routed to search or crawl, results stream into memory',
  '/hivemind/app/mcp': '22 MCP tools — memory, web intelligence, coding intelligence, and bi-temporal time travel — with setup guides',
  '/hivemind/app/graph': 'Explore connections between memories — semantic clusters, temporal decay, and relationship traversal',
  '/hivemind/app/engine': 'SOTA memory engine — cognitive framing, temporal queries, swarm reasoning, and Byzantine consensus',
  '/hivemind/app/team/members': 'Invite, review, and manage members of the active team',
  '/hivemind/app/team/projects': 'Organize shared memory streams into projects within the active team',
  '/hivemind/app/audit': 'Immutable trail of every mutating action — SOC2 + GDPR ready',
  '/hivemind/app/admin/users': 'Org-wide roles, deactivation, and invite management',
  '/hivemind/app/admin/sso': 'SAML routing + SCIM provisioning for enterprise SSO',
  '/hivemind/app/employees': 'Hyper Agents — autonomous brains with HIVEMIND memory + Slack access',
  '/hivemind/app/workspace': 'Members, teams, projects, invitations, audit and SSO — all in one place',
  '/hivemind/app/hermes': 'Hermes Agents — per-tenant task agents with run history and approval flows',
};

const SECTIONS = [
  { key: 'hivemind', label: 'BRAIN' },
  { key: 'hyperagents', label: 'Operating System' },
  { key: 'tara', label: 'VOICE' },
];

const SECTION_TITLES = {
  hivemind: 'HIVEMIND',
  hyperagents: 'HyperAgents',
  tara: 'TARA',
};

export default function TopBar({ activeSection = 'hivemind', onSectionChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const healthy = useHealthStatus();

  const title = pageTitles[location.pathname] || SECTION_TITLES[activeSection] || 'HIVEMIND';
  const description = pageDescriptions[location.pathname] || '';

  const { t } = useTranslation('dashboard');
  // Translate page title/description via topbar.pages.<routeSlug> keys when present.
  const routeSlug = (location.pathname || '').replace(/^\/+/, '').replace(/\//g, '.') || 'home';
  const tTitle = t(`topbar.titles.${routeSlug}`, { defaultValue: title });
  const tDesc = description ? t(`topbar.descriptions.${routeSlug}`, { defaultValue: description }) : '';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-center border-b border-[#e3e0db] bg-[#faf9f4]/90 px-3 backdrop-blur-xl md:justify-between md:px-6">
      {/* Left: Title + Description + Team switcher */}
      <div className="hidden min-w-0 items-center gap-4 lg:flex">
        <button
          type="button"
          onClick={() => navigate('/hivemind/app/overview')}
          className="shrink-0 border-0 bg-transparent p-0"
          aria-label="SINGULANCE overview"
        >
          <SingulanceBrand variant="light" markSize={28} />
        </button>
        <span className="h-7 w-px shrink-0 bg-[#e3e0db]" aria-hidden="true" />
        <div>
          <h1 className="text-[#0a0a0a] text-[15px] font-semibold font-['Space_Grotesk'] tracking-tight leading-none">
            {tTitle}
          </h1>
          {tDesc && (
            <p className="text-[#a3a3a3] text-[11px] mt-0.5">
              {tDesc}
            </p>
          )}
        </div>
        <TeamSwitcher />
      </div>

      {/* Section Toggle */}
      <div className="flex items-center h-8 bg-[#f3f1ec] rounded-lg border border-[#e3e0db] p-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSectionChange?.(s.key)}
            className={`relative px-3.5 py-1 rounded-md text-[11px] font-semibold tracking-[0.04em] transition-all duration-150 font-['Space_Grotesk'] ${
              activeSection === s.key
                ? 'bg-white text-[#0a0a0a] shadow-sm'
                : 'text-[#a3a3a3] hover:text-[#525252]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="absolute right-3 flex items-center gap-2 md:static">
        {/* Global Search */}
        <button
          onClick={() => navigate('/hivemind/app/memories')}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] hover:border-[#d4d0ca] text-[#a3a3a3] hover:text-[#525252] transition-all text-xs"
        >
          <Search size={13} />
          <span className="hidden md:inline">{t('topbar.searchMemories', 'Search memories...')}</span>
          <kbd className="hidden md:inline text-[10px] font-mono text-[#a3a3a3] bg-[#eae7e1] rounded px-1 py-0.5 ml-4">
            /
          </kbd>
        </button>

        {/* Docs */}
        <a
          href="/hivemind/docs"
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-[6px] hover:bg-[#f3f1ec] text-[#a3a3a3] hover:text-[#525252] transition-colors"
          title="Documentation"
        >
          <BookOpen size={15} />
        </a>

        {/* Durable lifecycle + workspace notification center. */}
        <WorkspaceNotifications />

        {/* Invite your Team — ALWAYS visible on the main navbar, right next
            to the language toggle. Routes to the Workspace Admin members tab,
            which owns the full invite flow (email + link + channels). */}
        <button
          onClick={() => navigate('/hivemind/app/workspace?tab=members')}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-[6px] bg-[#117dff] text-white hover:bg-[#0e6fe0] transition-all text-xs font-semibold"
        >
          <UserPlus size={13} />
          <span className="hidden md:inline">{t('topbar.inviteTeam', 'Invite your Team')}</span>
        </button>

        {/* Language switcher */}
        <div className="hidden md:block"><LangSwitcher /></div>


        {/* Health */}
        <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db]">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              healthy === null
                ? 'bg-[#a3a3a3]'
                : healthy
                ? 'bg-[#16a34a]'
                : 'bg-[#dc2626]'
            }`}
          />
          <span className="text-[10px] text-[#a3a3a3] font-mono whitespace-nowrap">
            {healthy === null ? '...' : healthy ? t('topbar.online', 'Online') : t('topbar.offline', 'Offline')}
          </span>
        </div>
      </div>
    </header>
  );
}
