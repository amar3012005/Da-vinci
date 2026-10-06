import CompanyWorkspaceOverlay from '../shared/CompanyWorkspaceOverlay';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BotAvatar } from 'bot-avatars';
import BrainModeIcon from './BrainModeIcon';
import AgentRoomStatus, { aggregateAgentRooms } from './AgentRoomStatus';
import VoiceModeIcon from './VoiceModeIcon';
import {
  LayoutDashboard,
  Moon,
  Brain,
  Key,
  Cable,
  User,
  Users,
  UserPlus,
  FlaskConical,
  Settings,
  LogOut,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  Globe,
  Server,
  Network,
  Cpu,
  BookOpen,
  Bot,
  Mic,
  Building2,
  Gauge,
  FolderKanban,
  Search,
  FileSearch,
  Waypoints,
  Sliders,
  Star,
  Clock,
  PhoneCall,
  Database,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import { useUsage } from '../shared/useUsage';
import CreditBalance from '../shared/CreditBalance';
import AgentAvatar from '../hyperagents/AgentAvatar';

/** Build nav sections, conditionally including admin items. Filtered by activeSection. */
function buildNavSections({ showWebAdmin, showEnterpriseTeam, t, activeSection = 'hivemind', team = [] }) {
  const tt = (k, def) => t(`sidebar.${k}`, { defaultValue: def });
  const advancedItems = [
    // Agent Swarm + Engine hidden for now (kept routable, just off the sidebar).
    { to: '/hivemind/app/mcp',        icon: Server,       label: tt('mcpServer', 'MCP Server') },
    { to: '/hivemind/app/keys',       icon: Key,          label: tt('apiKeys', 'API Keys') },
    { to: '/hivemind/app/evaluation', icon: FlaskConical, label: tt('evaluation', 'Evaluation') },
  ];

  // Web Admin used to be a separate entry. It now lives as a collapsible
  // "System Health" drawer inside /web (Web Studio) — same admin gate.
  const adminItems = [
    { to: '/hivemind/app/workspace', icon: Building2, label: tt('workspaceAdmin', 'Workspace Admin') },
    { to: '/hivemind/app/employees', icon: Bot,      label: tt('hyperAgents', 'Hyper Agents') },
    { to: '/hivemind/app/hermes',    icon: Cpu,      label: tt('hermesAgents', 'Hermes Agents') },
  ];

  if (activeSection === 'hyperagents') {
    return [
      { label: null, items: [{ to: '/hivemind/app/employees', icon: Bot, label: tt('hyperAgents', 'Hyper Agents') }] },
      {
        label: tt('groups.workspaceAdmin', 'Workspace Admin'),
        items: adminItems,
      },
    ];
  }

  if (activeSection === 'tara') {
    return [
      {
        label: null,
        items: [
          { to: '/hivemind/app/tara', icon: Mic, label: tt('tara', 'TARA × HIVE'), children: [
            { to: '/hivemind/app/tara?tab=skills',    icon: Sliders,   label: tt('taraSkills', 'Skills') },
            { to: '/hivemind/app/tara?tab=leads',     icon: Star,      label: tt('taraLeads', 'Leads') },
            { to: '/hivemind/app/tara?tab=history',   icon: Clock,     label: tt('taraHistory', 'Call History') },
            { to: '/hivemind/app/tara?tab=insights',  icon: Brain,     label: tt('taraInsights', 'Insights') },
            { to: '/hivemind/app/tara?tab=usage',     icon: Gauge,     label: tt('taraUsage', 'Usage') },
            { to: '/hivemind/app/tara?tab=outbound',  icon: PhoneCall, label: tt('taraOutbound', 'Outbound') },
            { to: '/hivemind/app/tara?tab=campaigns', icon: Waypoints, label: tt('taraCampaigns', 'Campaigns') },
          ]},
        ],
      },
      {
        label: tt('groups.taraMemory', 'TARA Memory'),
        items: [
          { to: '/hivemind/app/tara?tab=memory', icon: Database, label: tt('taraMemory', 'TARA-MEMORY') },
        ],
      },
    ];
  }

  // Default: hivemind
  return [
    {
      label: null,
      items: [
        { to: '/hivemind/app/overview', icon: LayoutDashboard, label: tt('overview', 'Overview') },
        { to: '/hivemind/app/overview/dreaming', icon: Moon, label: tt('dreaming', 'Dreaming') },
      ],
    },
    {
      label: tt('groups.yourTeam', 'Your Team'),
      items: [
        { to: '/hivemind/app/employee/harness', icon: Cpu, label: tt('runTime', 'Run Time'), runtime: true },
        ...team.map(agent => ({ to: '/hivemind/app/overview', agent, label: agent.name })),
      ],
    },
    {
      label: tt('groups.yourBrain', 'Your Brain'),
      items: [
        { to: '/hivemind/app/connectors', icon: Cable,    label: tt('connectors',  'Connectors') },
        { to: '/hivemind/app/memories',   icon: Brain,    label: tt('memories',    'Memories') },
        { to: '/hivemind/app/meeting-notes', icon: Mic,   label: tt('meetingNotes', 'AI Meeting Notes') },
        { to: '/hivemind/app/graph',      icon: Network,  label: tt('graphMain',   'Memory Graph') },
        { to: '/hivemind/app/knowledge',  icon: BookOpen, label: tt('knowledge',   'Upload Everything') },
      ],
    },
    {
      label: tt('groups.workspaceAdmin', 'Workspace Admin'),
      items: [
        { to: '/hivemind/app/workspace',      icon: Building2,    label: tt('workspaceAdmin', 'Workspace Admin'), children: [
          { to: '/hivemind/app/workspace?tab=members',   icon: Users,        label: tt('orgMembers', 'Org Members') },
          { to: '/hivemind/app/workspace?tab=teams',     icon: User,         label: tt('teamMembers', 'Team Members') },
          { to: '/hivemind/app/workspace?tab=projects',  icon: FolderKanban, label: tt('projects', 'Projects') },
          { to: '/hivemind/app/workspace?tab=invites',   icon: UserPlus,     label: tt('invites', 'Invites') },
          { to: '/hivemind/app/workspace?tab=cognition', icon: Waypoints,    label: tt('cognitiveLayer', 'Cognitive Layer') },
        ]},
      ],
    },
    // Web Intelligence remains routable and entitled server-side, but is
    // intentionally not advertised in the HIVE sidebar at this stage.
    {
      label: tt('groups.advanced', 'Advanced'),
      items: advancedItems,
    },
  ];
}

export default function Sidebar({
  activeSection = 'hivemind',
  collapsed = false,
  onCollapsedChange,
}) {
  const { t } = useTranslation('dashboard');
  const { logout, org, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuRef = useRef(null);
  const voiceMode = location.pathname.startsWith('/hivemind/app/tara');
  const teamMode = location.pathname.startsWith('/hivemind/app/employee/harness');
  useEffect(() => setModeMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!modeMenuOpen) return;
    const dismiss = event => { if (event.key === 'Escape') setModeMenuOpen(false); };
    const outside = event => { if (!modeMenuRef.current?.contains(event.target)) setModeMenuOpen(false); };
    window.addEventListener('keydown', dismiss);
    window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', dismiss); window.removeEventListener('pointerdown', outside); };
  }, [modeMenuOpen]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [openingAgent, setOpeningAgent] = useState(null);
  const [teamError, setTeamError] = useState('');
  const [rooms, setRooms] = useState([]);
  const teamScope = useRef(null);
  const [teamLoadError, setTeamLoadError] = useState(false);
  const [teamRetry, setTeamRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const scope = user?.id && org?.id ? `${user.id}:${org.id}` : null;
    if (teamScope.current !== scope) {
      teamScope.current = scope;
      setTeam([]);
      setTeamLoadError(false);
    }
    let retryTimer;
    let attempts = 0;
    const load = async () => {
      if (!scope || controller.signal.aborted) return;
      try {
        const response = await fetch('/api/hivemind/employees', { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) throw new Error('team unavailable');
        const value = await response.json();
        if (!Array.isArray(value.profiles)) throw new Error('invalid team response');
        if (controller.signal.aborted || teamScope.current !== scope) return;
        setTeam(value.profiles.filter(agent => typeof agent.id === 'string' && typeof agent.name === 'string'));
        setTeamLoadError(false);
      } catch {
        if (controller.signal.aborted || teamScope.current !== scope) return;
        setTeamLoadError(true);
        if (++attempts < 3) retryTimer = setTimeout(load, attempts * 1500);
      }
    };
    const refresh = () => { clearTimeout(retryTimer); attempts = 0; load(); };
    load();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { controller.abort(); clearTimeout(retryTimer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [user?.id, org?.id, teamMode, teamRetry]);

  useEffect(() => {
    const selection = event => setSelectedAgent(event.detail?.id || null);
    const activity = event => setRooms(event.detail?.rooms || []);
    setRooms([]);
    window.addEventListener('hivemind:agent-rooms', activity);
    window.addEventListener('hivemind:agent-selected', selection);
    window.dispatchEvent(new Event('hivemind:request-agent-rooms'));
    return () => { window.removeEventListener('hivemind:agent-selected', selection); window.removeEventListener('hivemind:agent-rooms', activity); };
  }, [user?.id, org?.id]);

  const openAgent = async (event, agent) => {
    event.preventDefault();
    if (openingAgent) return;
    setOpeningAgent(agent.id); setTeamError('');
    document.documentElement.dataset.agentRoomOpening = 'true';
    const previousStart = window.__HIVEMIND_START_AGENT__;
    const needsNavigation = !/^\/hivemind\/app\/(overview|employee\/harness)(\/|$)/.test(location.pathname);
    if (needsNavigation) navigate('/hivemind/app/employee/harness');
    try {
      let start;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        start = window.__HIVEMIND_START_AGENT__;
        if (typeof start === 'function' && (!needsNavigation || start !== previousStart)) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (typeof start !== 'function' || !await start(agent.id)) throw new Error('selection unavailable');
      setSelectedAgent(agent.id === 'runtime' ? null : agent.id);
    } catch { setTeamError(tt('teamOpenError', 'Could not open this agent. Please try again.')); }
    finally { setOpeningAgent(null); delete document.documentElement.dataset.agentRoomOpening; }
  };
  const [companyOpen, setCompanyOpen] = useState(false);
  const closeCompany = useCallback(() => setCompanyOpen(false), []);
  useEffect(() => { setCompanyOpen(false); }, [org?.id, user?.id]);
  const [showWebAdmin, setShowWebAdmin] = useState(false);
  const { usage } = useUsage();

  // Probe admin access once on mount
  useEffect(() => {
    apiClient.getWebAdminMetrics()
      .then(() => setShowWebAdmin(true))
      .catch(() => setShowWebAdmin(false));
  }, []);

  useEffect(() => {
    const handleClose = () => onCollapsedChange?.(true);
    const handleOpen = () => onCollapsedChange?.(false);
    window.addEventListener('hivemind:close-sidebar', handleClose);
    window.addEventListener('hivemind:open-sidebar', handleOpen);
    return () => {
      window.removeEventListener('hivemind:close-sidebar', handleClose);
      window.removeEventListener('hivemind:open-sidebar', handleOpen);
    };
  }, [onCollapsedChange]);

  const allNavSections = buildNavSections({ showWebAdmin, showEnterpriseTeam: org?.plan === 'enterprise', t, activeSection: activeSection === 'tara' ? 'tara' : 'hivemind', team });
  const navSections = activeSection === 'tara' ? allNavSections : teamMode
    ? [allNavSections[1], { label: null, items: [{ to: '/hivemind/app/employees', companyWorkspace: true, icon: Building2, label: t('sidebar.companyWorkspace', { defaultValue: 'Company workspace' }) }] }]
    : allNavSections.filter((_, index) => index !== 1);
  const planLabel = org?.plan
    ? t(`sidebar.planLabel.${org.plan}`, { defaultValue: `${org.plan[0].toUpperCase()}${org.plan.slice(1)} Plan` })
    : t('sidebar.planLabel.free', { defaultValue: 'Free Plan' });
  const tt = (k, def) => t(`sidebar.${k}`, { defaultValue: def });
  const accountItems = [
    { to: '/hivemind/app/profile',  icon: User,       label: tt('profile',  'Profile') },
    { to: '/hivemind/app/usage',    icon: Gauge,      label: tt('usage',    'Usage') },
    { to: '/hivemind/app/billing',  icon: CreditCard, label: tt('billing',  'Billing') },
    { to: '/hivemind/app/settings', icon: Settings,   label: tt('settings', 'Settings') },
  ];

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[300px]';

  return (
    <aside
      data-tour-sidebar
      style={{ viewTransitionName: 'product-sidebar' }}
      className={`fixed left-0 top-0 h-[var(--hm-app-viewport-height,100dvh)] ${sidebarWidth} bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40 transition-all duration-200`}
    >
      <div className="shrink-0 px-4 pt-2 pb-3 border-b border-[#e3e0db]">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/images/singulance-orbit.png" alt="Singulance" className="h-10 w-10 shrink-0 object-contain" />
            {!collapsed && <span className="text-[19px] font-semibold tracking-wide text-[#292929]">HIVEMIND</span>}
          </div>
          {!collapsed && <button type="button" aria-label="Collapse sidebar" aria-expanded="true" onClick={() => onCollapsedChange?.(true)} className="p-1 rounded-md hover:bg-[#eeece6] text-[#737373]"><PanelLeft size={18} strokeWidth={1.75} /></button>}
        </div>
        {collapsed && <button type="button" aria-label="Expand sidebar" aria-expanded="false" onClick={() => onCollapsedChange?.(false)} className="mx-auto block p-1 text-[#737373]"><PanelLeft size={18} /></button>}
        <div ref={modeMenuRef} className="relative mt-1">
          <button type="button" aria-label="Choose workspace mode" aria-expanded={modeMenuOpen} aria-haspopup="menu" onClick={() => setModeMenuOpen(value => !value)} className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-[#383838] hover:bg-[#eeece6]">
            {voiceMode ? <VoiceModeIcon size={32} /> : teamMode ? <BotAvatar type="mech" shading="fabric" size={32} interactive={false} /> : <BrainModeIcon size={32} />}
            {!collapsed && <><span className="text-[15px] font-medium">{voiceMode ? t('sidebar.voice', { defaultValue: 'Voice' }) : teamMode ? 'HyperAgents' : t('sidebar.brain', { defaultValue: 'Brain' })}</span><ChevronDown size={14} /></>}
          </button>
          {modeMenuOpen && <div role="menu" aria-label="Workspace mode" className="absolute left-0 top-full mt-2 w-[310px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#e3e0db] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] z-50">
            {[{ name: t('sidebar.brain', { defaultValue: 'Brain' }), description: t('sidebar.brainDescription', { defaultValue: 'Remember. Connect. Understand.' }), path: '/hivemind/app/overview/new', selected: !teamMode && !voiceMode, brain: true },
              { name: 'HyperAgents', description: t('sidebar.hyperagentsDescription', { defaultValue: 'Assign. Build. Deliver.' }), path: '/hivemind/app/employee/harness', selected: teamMode },
              { name: t('sidebar.voice', { defaultValue: 'Voice' }), description: t('sidebar.voiceDescription', { defaultValue: 'Speak. Connect. Represent.' }), path: '/hivemind/app/tara', selected: voiceMode, voice: true }].map(mode =>
              <button key={mode.path} role="menuitemradio" aria-checked={mode.selected} type="button" onClick={() => { setModeMenuOpen(false); navigate(mode.path); window.dispatchEvent(new PopStateEvent('popstate')); }} className={`flex items-center gap-3 w-full rounded-xl px-3 py-3 text-left text-[#333333] hover:bg-[#efede6] ${mode.selected ? 'bg-[#f7f6f2]' : ''}`}>
                <span className="shrink-0">{mode.brain ? <BrainModeIcon size={32} /> : mode.voice ? <VoiceModeIcon size={32} /> : <BotAvatar type="mech" shading="fabric" size={32} interactive={false} />}</span>
                <span className="flex flex-col gap-1"><span className="text-[17px] font-medium leading-tight">{mode.name}</span><span className="text-[14px] text-[#858585] font-normal leading-snug">{mode.description}</span></span>
              </button>)}
          </div>}
        </div>
      </div>

      {teamMode && teamLoadError && <p role="status" className="px-4 py-2 text-xs text-[#737373]">Could not refresh our team. <button type="button" className="underline" onClick={() => setTeamRetry(value => value + 1)}>Retry</button></p>}
      {teamError && <p role="status" className="px-4 py-2 text-xs text-[#737373]">{teamError}</p>}
      {/* Navigation */}
      <nav className="flex-1 min-h-0 py-3 px-2.5 overflow-y-auto space-y-4">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && !collapsed && (
              <div className="px-2.5 mb-1.5">
                <span className="text-[#737373] text-[11px] font-semibold uppercase tracking-[0.08em]">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && section.label && (
              <div className="h-px bg-[#e3e0db] mx-2 mb-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const pathOnly = item.to.split('?')[0];
                const isActive = item.agent ? selectedAgent === item.agent.id : item.runtime ? location.pathname.startsWith('/hivemind/app/employee/harness') && !selectedAgent :
                  location.pathname === pathOnly ||
                  (location.pathname.startsWith(`${pathOnly}/`)
                    && !(pathOnly === '/hivemind/app/overview' && location.pathname === '/hivemind/app/overview/dreaming'));
                const ItemLink = item.agent || item.runtime || item.companyWorkspace ? 'button' : NavLink;
                const room = aggregateAgentRooms(rooms, item.agent?.id || 'runtime');
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <div key={item.agent?.id || item.to}>
                    {hasChildren && !collapsed ? (
                      <div
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[15px] group`}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className="text-[#737373] flex-shrink-0"
                        />
                        <span className="text-[#333333] font-medium truncate">
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <ItemLink
                        type={item.agent || item.runtime || item.companyWorkspace ? "button" : undefined}
                        to={item.agent || item.runtime || item.companyWorkspace ? undefined : item.to}
                        data-tour-id={item.to}
                        onClick={item.agent ? event => openAgent(event, item.agent) : item.runtime ? event => openAgent(event, { id: 'runtime' }) : item.companyWorkspace ? () => setCompanyOpen(true) : undefined}
                        aria-busy={openingAgent === (item.agent?.id || (item.runtime ? 'runtime' : undefined)) ? true : undefined}
                        className={`relative w-full text-left flex items-center ${collapsed ? 'justify-center gap-2.5 px-2.5 py-2' : item.runtime ? 'gap-3 px-2.5 py-3 mb-2 min-h-[96px]' : 'gap-2.5 px-2.5 py-2'} rounded-lg text-[15px] transition-all duration-150 group`}
                        title={collapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute inset-0 bg-[#f3f1ec] rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        {item.runtime ? <img src="/assets/runtime-computer-c2305f5b.webp?v=c2305f5b" alt="" aria-hidden="true" width={collapsed ? 24 : 80} height={collapsed ? 24 : 80} style={{ mixBlendMode: 'multiply', filter: 'brightness(1.08)' }} className="relative z-10 flex-shrink-0 object-contain" /> : item.agent ? <AgentAvatar agent={item.agent} size={25} className="relative z-10" /> : <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className={`relative z-10 transition-colors flex-shrink-0 ${
                            isActive ? 'text-[#0a0a0a]' : 'text-[#737373] group-hover:text-[#333333]'
                          }`}
                        />}
                        {!collapsed && (
                          <span
                            className={`relative z-10 min-w-0 flex-1 transition-colors ${
                              isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#333333] group-hover:text-[#0a0a0a]'
                            }`}
                          >
                            {item.runtime ? <strong className="block text-[24px] font-semibold leading-tight tracking-tight">Runtime</strong> : item.label}
                            {teamMode && (item.agent || item.runtime) && <small className="block font-normal text-[12px] text-[#737373] leading-snug mt-1 truncate capitalize">{item.runtime ? 'AI Chief of Staff' : String(item.agent?.role || item.agent?.job_title || item.agent?.role_archetype || item.agent?.roleArchetype || 'Team member').replace(/_/g, ' ')}</small>}
                          </span>
                        )}
                        {teamMode && (item.agent || item.runtime) && <AgentRoomStatus room={room} collapsed={collapsed} />}
                      </ItemLink>
                    )}
                    {/* Always-visible children sub-nav */}
                    {hasChildren && !collapsed && (
                      <div className="ml-4 pl-2.5 border-l border-[#e3e0db] mt-0.5 space-y-0.5">
                        {item.children.map((child) => {
                          const cp = child.to.split('?')[0];
                          const qs = child.to.includes('?') ? '?' + child.to.split('?')[1] : '';
                          const cIsActive = location.pathname === cp && (!qs || location.search === qs);
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[14px] transition-all duration-150 group ${
                                cIsActive ? 'bg-[#f3f1ec] text-[#0a0a0a] font-medium' : 'text-[#333333] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]/50'
                              }`}
                            >
                              <child.icon
                                size={14}
                                strokeWidth={1.75}
                                className={`flex-shrink-0 ${cIsActive ? 'text-[#0a0a0a]' : 'text-[#737373] group-hover:text-[#333333]'}`}
                              />
                              <span className="truncate">{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {teamMode && location.pathname.startsWith('/hivemind/app/employee/harness') && (
          <div data-hivemind-artifacts-seat data-collapsed={collapsed || undefined} />
        )}
      </nav>

      {/* Fixed bottom: Account nav + upgrade banner + user/logout */}
      <div className="flex-shrink-0 border-t border-[#e3e0db]">
        {collapsed && (
          <div className="pt-2">
            <CreditBalance credits={usage?.credits} compact collapsed />
          </div>
        )}
        {/* Account section */}
        <div className="px-2.5 pt-2.5 pb-1">
          {!collapsed && (
            <div className="px-2.5 mb-1.5">
              <span className="text-[#737373] text-[11px] font-semibold uppercase tracking-[0.08em]">
                {tt('groups.account', 'Account')}
              </span>
            </div>
          )}
          {collapsed && <div className="h-px bg-[#e3e0db] mx-2 mb-2" />}
          <div className="space-y-0.5">
            {accountItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-tour-id={item.to}
                  className={`relative w-full text-left flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-[15px] transition-all duration-150 group`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-account"
                      className="absolute inset-0 bg-[#f3f1ec] rounded-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon
                    size={18}
                    strokeWidth={1.75}
                    className={`relative z-10 transition-colors flex-shrink-0 ${
                      isActive ? 'text-[#0a0a0a]' : 'text-[#737373] group-hover:text-[#333333]'
                    }`}
                  />
                  {!collapsed && (
                    <span
                      className={`relative z-10 min-w-0 flex-1 transition-colors ${
                        isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#333333] group-hover:text-[#0a0a0a]'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* User + Logout */}
        <div className="p-2.5 border-t border-[#e3e0db]">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <div className="w-7 h-7 rounded-full bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#117dff] text-[10px] font-bold font-mono">
                  {(user.display_name || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#0a0a0a] text-xs truncate">
                  {user.display_name || user.email || 'User'}
                </p>
                <p className="text-[#737373] text-[10px] font-mono truncate">
                  {planLabel}
                </p>
                <CreditBalance credits={usage?.credits} inline />
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 w-full px-2.5 py-2 rounded-lg text-[15px] text-[#737373] hover:text-[#dc2626] hover:bg-[#dc2626]/5 transition-all`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>{t('sidebar.signOut', 'Sign Out')}</span>}
          </button>
        </div>
      </div>
      {companyOpen ? <CompanyWorkspaceOverlay onClose={closeCompany} /> : null}
    </aside>
  );
}
