import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const navItems = [
  { to: '/hivemind/app/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/hivemind/app/memories', icon: Brain, label: 'Memories' },
  { to: '/hivemind/app/keys', icon: Key, label: 'API Keys' },
  { to: '/hivemind/app/connectors', icon: Cable, label: 'Connectors' },
  { to: '/hivemind/app/profile', icon: User, label: 'Profile' },
  { to: '/hivemind/app/evaluation', icon: FlaskConical, label: 'Evaluation' },
  { to: '/hivemind/app/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout, org } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-[#bdf213]/10 flex items-center justify-center">
          <Hexagon size={18} className="text-[#bdf213]" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-sm font-semibold tracking-wide font-['Space_Grotesk']">
            HIVEMIND
          </span>
          {org && (
            <span className="text-white/30 text-[10px] font-mono truncate max-w-[140px]">
              {org.name || org.id?.slice(0, 8)}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/hivemind/app/overview' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[#bdf213]/[0.08] rounded-lg border border-[#bdf213]/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                size={18}
                className={`relative z-10 transition-colors ${
                  isActive ? 'text-[#bdf213]' : 'text-white/40 group-hover:text-white/70'
                }`}
              />
              <span
                className={`relative z-10 font-['Space_Grotesk'] transition-colors ${
                  isActive ? 'text-white font-medium' : 'text-white/50 group-hover:text-white/80'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all font-['Space_Grotesk']"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
