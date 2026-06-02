import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Key,
  Cable,
  User,
  FlaskConical,
  Settings,
  LogOut,
  Hexagon,
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';

/** Build nav sections, conditionally including admin items. */
function buildNavSections({ showWebAdmin, showEnterpriseTeam, t }) {
  const tt = (k, def) => t(`sidebar.${k}`, { defaultValue: def });
  const advancedItems = [
    { to: '/hivemind/app/swarm',      icon: Bot,          label: tt('agentSwarm', 'Agent Swarm') },
    { to: '/hivemind/app/engine',     icon: Cpu,          label: tt('engine', 'Engine') },
    { to: '/hivemind/app/mcp',        icon: Server,       label: tt('mcpServer', 'MCP Server') },
    { to: '/hivemind/app/keys',       icon: Key,          label: tt('apiKeys', 'API Keys') },
    { to: '/hivemind/app/evaluation', icon: FlaskConical, label: tt('evaluation', 'Evaluation') },
  ];

  // Web Admin used to be a separate entry. It now lives as a collapsible
  // "System Health" drawer inside /web (Web Studio) — same admin gate.
  const adminItems = [
    { to: '/hivemind/app/workspace', icon: Building2, label: tt('workspaceAdmin', 'Workspace Admin') },
    { to: '/hivemind/app/employees', icon: Bot,      label: tt('hyperAgents', 'Hyper Agents') },
  ];

  // Order is skill-graded: no-code-friendly groups first (Your Brain →
  // Workspace/Agents → AI Features), technical groups (Advanced) near the
  // bottom, Account last. Workspace Admin sits just below Your Brain so the
  // agents people actually run are reachable in one glance.
  const sections = [
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
        { to: '/hivemind/app/meeting-notes', icon: Sparkles, label: tt('meetingNotes', 'AI Meeting Notes') },
        { to: '/hivemind/app/graph',      icon: Network,  label: tt('graphMain',   'Memory Graph') },
        { to: '/hivemind/app/knowledge',  icon: BookOpen, label: tt('knowledge',   'Knowledge Base') },
      ],
    },
    {
      label: tt('groups.workspaceAdmin', 'Workspace Admin'),
      items: adminItems,
    },
    {
      label: tt('groups.aiFeatures', 'AI Features'),
      items: [
        { to: '/hivemind/app/web',  icon: Globe, label: tt('webIntel', 'Web Intel') },
        { to: '/hivemind/app/tara', icon: Mic,   label: tt('tara',     'TARA × HIVE') },
      ],
    },
    {
      label: tt('groups.advanced', 'Advanced'),
      items: advancedItems,
    },
    {
      label: tt('groups.account', 'Account'),
      items: [
        { to: '/hivemind/app/profile',  icon: User,       label: tt('profile',  'Profile') },
        { to: '/hivemind/app/billing',  icon: CreditCard, label: tt('billing',  'Billing') },
        { to: '/hivemind/app/settings', icon: Settings,   label: tt('settings', 'Settings') },
      ],
    },
  ];

  return sections;
}

export default function Sidebar() {
  const { t } = useTranslation('dashboard');
  const { logout, org, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showWebAdmin, setShowWebAdmin] = useState(false);

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

  const navSections = buildNavSections({ showWebAdmin, showEnterpriseTeam: org?.plan === 'enterprise', t });
  const planLabel = org?.plan
    ? t(`sidebar.planLabel.${org.plan}`, { defaultValue: `${org.plan[0].toUpperCase()}${org.plan.slice(1)} Plan` })
    : t('sidebar.planLabel.free', { defaultValue: 'Free Plan' });

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[260px]';

  return (
    <aside
      data-tour-sidebar
      className={`fixed left-0 top-0 bottom-0 ${sidebarWidth} bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40 transition-all duration-200`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#e3e0db]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
            <Hexagon size={16} className="text-[#117dff]" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-[#0a0a0a] text-[13px] font-semibold tracking-wide font-['Space_Grotesk'] whitespace-nowrap">
                HIVEMIND
              </span>
              {org && (
                <span className="text-[#a3a3a3] text-[10px] font-mono truncate max-w-[140px]">
                  {org.name || org.slug || org.id?.slice(0, 8)}
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
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== '/hivemind/app/overview' && location.pathname.startsWith(item.to));

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
        ))}
      </nav>

      {/* Upgrade Banner */}
      {!collapsed && (
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
            <div className="min-w-0">
              <p className="text-[#0a0a0a] text-xs truncate">
                {user.display_name || user.email || 'User'}
              </p>
              <p className="text-[#a3a3a3] text-[10px] font-mono truncate">
                {planLabel}
              </p>
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
    </aside>
  );
}
