import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const navSections = [
  {
    label: null,
    items: [
      { to: '/hivemind/app/overview', icon: LayoutDashboard, label: 'Overview' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/hivemind/app/memories', icon: Brain, label: 'Memories' },
      { to: '/hivemind/app/connectors', icon: Cable, label: 'Connectors' },
      { to: '/hivemind/app/profile', icon: User, label: 'Profile' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { to: '/hivemind/app/keys', icon: Key, label: 'API Keys' },
      { to: '/hivemind/app/evaluation', icon: FlaskConical, label: 'Evaluation' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/hivemind/app/billing', icon: CreditCard, label: 'Billing' },
      { to: '/hivemind/app/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const { logout, org, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[260px]';

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 ${sidebarWidth} bg-[#09090b] border-r border-white/[0.06] flex flex-col z-40 transition-all duration-200`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#bdf213]/20 to-[#bdf213]/5 flex items-center justify-center flex-shrink-0">
            <Hexagon size={16} className="text-[#bdf213]" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-white text-[13px] font-semibold tracking-wide font-['Space_Grotesk'] whitespace-nowrap">
                HIVEMIND
              </span>
              {org && (
                <span className="text-white/25 text-[10px] font-mono truncate max-w-[140px]">
                  {org.name || org.slug || org.id?.slice(0, 8)}
                </span>
              )}
            </motion.div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
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
                <span className="text-white/20 text-[10px] font-medium uppercase tracking-[0.08em] font-['Space_Grotesk']">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && section.label && (
              <div className="h-px bg-white/[0.04] mx-2 mb-2" />
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
                    className={`relative flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 group`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-white/[0.06] rounded-lg"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon
                      size={18}
                      strokeWidth={1.75}
                      className={`relative z-10 transition-colors flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-white/30 group-hover:text-white/60'
                      }`}
                    />
                    {!collapsed && (
                      <span
                        className={`relative z-10 font-['Space_Grotesk'] transition-colors truncate ${
                          isActive ? 'text-white font-medium' : 'text-white/45 group-hover:text-white/75'
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.label === 'Billing' && (
                      <span className="relative z-10 ml-auto text-[9px] font-mono bg-[#bdf213]/10 text-[#bdf213] px-1.5 py-0.5 rounded">
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
          <div className="bg-gradient-to-br from-[#bdf213]/[0.08] to-transparent border border-[#bdf213]/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-[#bdf213]" />
              <span className="text-white text-xs font-semibold font-['Space_Grotesk']">
                Upgrade to Pro
              </span>
            </div>
            <p className="text-white/30 text-[10px] font-['Space_Grotesk'] leading-relaxed mb-2.5">
              Unlock unlimited memories, priority support, and advanced connectors.
            </p>
            <NavLink
              to="/hivemind/app/billing"
              className="block text-center text-[11px] font-semibold font-['Space_Grotesk'] bg-[#bdf213] text-[#09090b] rounded-lg py-1.5 hover:bg-[#d4ff3a] transition-colors"
            >
              View Plans
            </NavLink>
          </div>
        </div>
      )}

      {/* User + Logout */}
      <div className="p-2.5 border-t border-white/[0.06]">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#bdf213]/20 to-[#bdf213]/5 flex items-center justify-center flex-shrink-0">
              <span className="text-[#bdf213] text-[10px] font-bold font-mono">
                {(user.display_name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-['Space_Grotesk'] truncate">
                {user.display_name || user.email || 'User'}
              </p>
              <p className="text-white/20 text-[10px] font-mono truncate">
                Free Plan
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] text-white/30 hover:text-red-400 hover:bg-red-400/5 transition-all font-['Space_Grotesk']`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
