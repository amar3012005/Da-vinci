import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SingulanceMark from '../shared/SingulanceMark';
import SingulanceBrand from '../shared/SingulanceBrand';
import {
  LayoutDashboard,
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
  Sparkles,
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

/** Build nav sections, conditionally including admin items. Filtered by activeSection. */
function buildNavSections({ showWebAdmin, showEnterpriseTeam, t, activeSection = 'hivemind' }) {
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
      ],
    },
    {
      label: tt('groups.yourBrain', 'Your Brain'),
      items: [
        { to: '/hivemind/app/connectors', icon: Cable,    label: tt('connectors',  'Connectors') },
        { to: '/hivemind/app/memories',   icon: Brain,    label: tt('memories',    'Memories') },
        { to: '/hivemind/app/meeting-notes', icon: Mic,   label: tt('meetingNotes', 'AI Meeting Notes') },
        { to: '/hivemind/app/graph',      icon: Network,  label: tt('graphMain',   'Memory Graph') },
        { to: '/hivemind/app/knowledge',  icon: BookOpen, label: tt('knowledge',   'Knowledge Base') },
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
    {
      label: tt('groups.aiFeatures', 'AI Features'),
      items: [
        { to: '/hivemind/app/web', icon: Globe, label: tt('webIntel', 'Web Intel'), children: [
          { to: '/hivemind/app/web?mode=research', icon: FileSearch, label: tt('deepResearch', 'Deep Research') },
          { to: '/hivemind/app/web?mode=search',   icon: Search,     label: tt('webSearch', 'Web Search') },
          { to: '/hivemind/app/web?mode=crawl',    icon: Globe,      label: tt('webCrawl', 'Web Crawl') },
        ]},
      ],
    },
    {
      label: tt('groups.advanced', 'Advanced'),
      items: advancedItems,
    },
  ];
}

export default function Sidebar({ activeSection = 'hivemind' }) {
  const { t } = useTranslation('dashboard');
  const { logout, org, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showWebAdmin, setShowWebAdmin] = useState(false);
  const { usage } = useUsage();

  // Probe admin access once on mount
  useEffect(() => {
    apiClient.getWebAdminMetrics()
      .then(() => setShowWebAdmin(true))
      .catch(() => setShowWebAdmin(false));
  }, []);

  // Listen for hivemind:close-sidebar and hivemind:open-sidebar events
  useEffect(() => {
    const handleClose = () => setCollapsed(true);
    const handleOpen = () => setCollapsed(false);

    window.addEventListener('hivemind:close-sidebar', handleClose);
    window.addEventListener('hivemind:open-sidebar', handleOpen);

    return () => {
      window.removeEventListener('hivemind:close-sidebar', handleClose);
      window.removeEventListener('hivemind:open-sidebar', handleOpen);
    };
  }, []);

  const navSections = buildNavSections({ showWebAdmin, showEnterpriseTeam: org?.plan === 'enterprise', t, activeSection });
  const planLabel = org?.plan
    ? t(`sidebar.planLabel.${org.plan}`, { defaultValue: `${org.plan[0].toUpperCase()}${org.plan.slice(1)} Plan` })
    : t('sidebar.planLabel.free', { defaultValue: 'Free Plan' });
  const isPaid = org?.plan && ['pro', 'enterprise', 'team', 'business'].includes(org.plan);
  const tt = (k, def) => t(`sidebar.${k}`, { defaultValue: def });
  const accountItems = [
    { to: '/hivemind/app/profile',  icon: User,       label: tt('profile',  'Profile') },
    { to: '/hivemind/app/usage',    icon: Gauge,      label: tt('usage',    'Usage') },
    { to: '/hivemind/app/billing',  icon: CreditCard, label: tt('billing',  'Billing') },
    { to: '/hivemind/app/settings', icon: Settings,   label: tt('settings', 'Settings') },
  ];

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[260px]';

  return (
    <aside
      data-tour-sidebar
      className={`fixed left-0 top-0 bottom-0 ${sidebarWidth} bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40 transition-all duration-200`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#e3e0db]">
        <div className="flex items-center gap-2.5 min-w-0">
          {collapsed ? (
            <SingulanceMark size={24} />
          ) : (
            <SingulanceBrand variant="light" markSize={27} />
          )}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col overflow-hidden"
            >
              {org && (
                <span className="text-[#a3a3a3] text-[10px] font-mono truncate max-w-[140px]">
                  {activeSection === 'hyperagents' ? 'HYPERAGENTS' : activeSection === 'tara' ? 'TARA' : 'HIVEMIND'} · {org.name || org.slug || org.id?.slice(0, 8)}
                </span>
              )}
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-[#f3f1ec] text-[#a3a3a3] hover:text-[#525252] transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-4">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && !collapsed && (
              <div className="px-2.5 mb-1.5">
                <span className="text-[#a3a3a3] text-[10px] font-medium uppercase tracking-[0.08em]">
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
                const isActive =
                  location.pathname === pathOnly ||
                  (pathOnly !== '/hivemind/app/overview' && location.pathname.startsWith(pathOnly));
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <div key={item.to}>
                    {hasChildren && !collapsed ? (
                      <div
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] group`}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className="text-[#a3a3a3] flex-shrink-0"
                        />
                        <span className="text-[#525252] font-medium truncate">
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <NavLink
                        to={item.to}
                        data-tour-id={item.to}
                        className={`relative flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 group`}
                        title={collapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute inset-0 bg-[#f3f1ec] rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className={`relative z-10 transition-colors flex-shrink-0 ${
                            isActive ? 'text-[#0a0a0a]' : 'text-[#a3a3a3] group-hover:text-[#525252]'
                          }`}
                        />
                        {!collapsed && (
                          <span
                            className={`relative z-10 transition-colors truncate ${
                              isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#525252] group-hover:text-[#0a0a0a]'
                            }`}
                          >
                            {item.label}
                          </span>
                        )}
                      </NavLink>
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
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-all duration-150 group ${
                                cIsActive ? 'bg-[#f3f1ec] text-[#0a0a0a] font-medium' : 'text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]/50'
                              }`}
                            >
                              <child.icon
                                size={14}
                                strokeWidth={1.75}
                                className={`flex-shrink-0 ${cIsActive ? 'text-[#0a0a0a]' : 'text-[#a3a3a3] group-hover:text-[#525252]'}`}
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
              <span className="text-[#a3a3a3] text-[10px] font-medium uppercase tracking-[0.08em]">
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
                  className={`relative flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 group`}
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
                      isActive ? 'text-[#0a0a0a]' : 'text-[#a3a3a3] group-hover:text-[#525252]'
                    }`}
                  />
                  {!collapsed && (
                    <span
                      className={`relative z-10 transition-colors truncate ${
                        isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#525252] group-hover:text-[#0a0a0a]'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.label === 'Billing' && (
                    <span className="relative z-10 ml-auto text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded">
                      PRO
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Upgrade Banner — hidden for paid plans */}
        {!collapsed && !isPaid && (
          <div className="mx-2.5 mb-2">
            <div className="bg-[#117dff]/[0.04] border border-[#117dff]/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={14} className="text-[#117dff]" />
                <span className="text-[#0a0a0a] text-xs font-semibold">
                  Upgrade to Pro
                </span>
              </div>
              <p className="text-[#a3a3a3] text-[10px] leading-relaxed mb-2.5">
                Unlock unlimited memories, priority support, and advanced connectors.
              </p>
              <NavLink
                to="/hivemind/app/billing"
                className="block text-center text-[11px] font-semibold uppercase tracking-[0.075em] bg-[#117dff] text-white rounded-[4px] py-1.5 hover:bg-[#0066e0] transition-colors"
              >
                View Plans
              </NavLink>
            </div>
          </div>
        )}

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
                <p className="text-[#a3a3a3] text-[10px] font-mono truncate">
                  {planLabel}
                </p>
                <CreditBalance credits={usage?.credits} inline />
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] text-[#a3a3a3] hover:text-[#dc2626] hover:bg-[#dc2626]/5 transition-all`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>{t('sidebar.signOut', 'Sign Out')}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
