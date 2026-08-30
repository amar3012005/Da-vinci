import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, BookOpen, UserPlus, BrainCircuit, Orbit, AudioWaveform } from 'lucide-react';
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
  { key: 'hivemind', label: 'BRAIN', icon: BrainCircuit },
  { key: 'hyperagents', label: 'OS', icon: Orbit },
  { key: 'tara', label: 'VOICE', icon: AudioWaveform },
];

const SECTION_TITLES = {
  hivemind: 'HIVEMIND',
  hyperagents: 'HyperAgents',
  tara: 'TARA',
};

export default function TopBar({ activeSection = 'hivemind', onSectionChange }) {
  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="relative">
        <div className="flex h-9 items-stretch border border-[#d4d0ca] bg-white/55 p-[2px] shadow-[0_8px_24px_rgba(10,10,10,0.045)] backdrop-blur-xl" style={{ clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)' }}>
          {SECTIONS.map((s, index) => {
            const active = activeSection === s.key;
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => onSectionChange?.(s.key)} className={`relative flex min-w-[68px] items-center justify-center gap-1.5 border-[#e3e0db] px-2.5 text-[9px] font-semibold tracking-[0.1em] transition-all duration-300 font-['Space_Grotesk'] sm:min-w-[86px] sm:px-4 sm:text-[10px] ${index ? 'border-l' : ''} ${active ? 'bg-[#0a0a0a] text-white' : 'text-[#8d8d8d] hover:bg-white/80 hover:text-[#0a0a0a]'}`}>
                <Icon size={13} strokeWidth={1.5} className={active ? (s.key === 'hyperagents' ? 'animate-[spin_5s_linear_infinite] text-[#7db8ff]' : 'animate-pulse text-[#7db8ff]') : ''} />
                <span>{s.label}</span>
                {active && <span className="absolute inset-x-3 bottom-0 h-px bg-[#117dff] shadow-[0_0_8px_#117dff]" />}
              </button>
            );
          })}
        </div>
        <span className="pointer-events-none absolute left-full top-1/2 ml-1.5 -translate-y-1/2 font-mono text-[7px] uppercase tracking-[0.12em] text-[#a3a3a3] sm:ml-2 sm:text-[8px]">Soon</span>
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
      </div>
    </header>
  );
}
