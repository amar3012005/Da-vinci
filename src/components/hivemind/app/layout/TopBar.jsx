import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHealthStatus } from '../shared/hooks';
import { UserPlus, BrainCircuit, Orbit, AudioWaveform } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LangSwitcher from './LangSwitcher';
import WorkspaceNotifications from './WorkspaceNotifications';

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

const PAGE_PREFIXES = [
  ['/hivemind/app/overview', '/hivemind/app/overview'],
  ['/hivemind/app/employees/operating-rooms', '/hivemind/app/employees/operating-rooms'],
  ['/hivemind/app/employees', '/hivemind/app/employees'],
  ['/hivemind/app/team/members', '/hivemind/app/team/members'],
  ['/hivemind/app/team/projects', '/hivemind/app/team/projects'],
];

export default function TopBar({ activeSection = 'hivemind', onSectionChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const healthy = useHealthStatus();

  const pagePath = pageTitles[location.pathname]
    ? location.pathname
    : PAGE_PREFIXES.find(([prefix]) => location.pathname.startsWith(`${prefix}/`))?.[1] || location.pathname;
  const title = pageTitles[pagePath] || SECTION_TITLES[activeSection] || 'HIVEMIND';
  const description = pageDescriptions[pagePath] || '';

  const { t } = useTranslation('dashboard');
  // Translate page title/description via topbar.pages.<routeSlug> keys when present.
  const routeSlug = (pagePath || '').replace(/^\/+/, '').replace(/\//g, '.') || 'home';
  const tTitle = t(`topbar.titles.${routeSlug}`, { defaultValue: title });
  const tDesc = description ? t(`topbar.descriptions.${routeSlug}`, { defaultValue: description }) : '';

  return (
    <header className="pointer-events-none sticky top-0 z-30 grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center bg-transparent px-3 md:px-6">
      {/* Branding and team selection live in the persistent HIVE sidebar. */}
      <div className="pointer-events-auto min-w-0 justify-self-start">
        <div className="min-w-0">
          <h1 className="text-[#0a0a0a] text-[15px] font-semibold font-['Space_Grotesk'] tracking-tight leading-none">
            {tTitle}
          </h1>
          {tDesc && (
            <p className="hidden text-[#a3a3a3] text-[11px] mt-0.5 lg:block">
              {tDesc}
            </p>
          )}
        </div>
      </div>

      {/* Section Toggle */}
      <div className="pointer-events-auto relative justify-self-center">
        <div className="flex h-10 items-stretch overflow-hidden rounded-[10px] border border-[#d4d0ca] bg-white shadow-[0_8px_20px_rgba(10,10,10,0.10)]">
          {SECTIONS.map((s, index) => {
            const active = activeSection === s.key;
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => onSectionChange?.(s.key)} className={`relative flex min-w-[72px] items-center justify-center gap-2 border-[#e3e0db] px-3 text-[10px] font-semibold tracking-[0.08em] transition-colors font-['Space_Grotesk'] sm:min-w-[104px] sm:px-5 ${index ? 'border-l' : ''} ${active ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#525252] hover:bg-[#f3f1ec] hover:text-[#0a0a0a]'}`}>
                <Icon size={15} strokeWidth={1.75} className={active ? 'text-white' : 'text-[#0a0a0a]'} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
        <span className="pointer-events-none absolute left-full top-1/2 ml-1.5 -translate-y-1/2 font-mono text-[7px] uppercase tracking-[0.12em] text-[#a3a3a3] sm:ml-2 sm:text-[8px]">Soon</span>
      </div>

      {/* Right: Actions */}
      <div className="pointer-events-auto flex items-center gap-2 justify-self-end">
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
