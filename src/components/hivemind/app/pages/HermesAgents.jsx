/**
 * HermesAgents — two-pane shell (v2, Phase 6h)
 *
 * Layout mirrors HyperAgents' left-rail pattern:
 *   left aside (240 px) — agent identity + status pill, then nav items
 *   right main           — switches on activeSection state (not routes)
 *
 * P1 active sections: Home, Tasks, Library
 * P2/P3 sections:     Persona, Schedules, Skills, Channels, Approvals, Memory
 *                     (rendered as disabled "coming soon" stubs)
 *
 * Default-OFF safety: GET /hermes/agent 404 → calm "not enabled" state.
 * No routing change — shell is consumed at /hivemind/app/hermes via HiveMindApp.jsx.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cpu,
  RefreshCw,
  Home,
  ListTodo,
  BookOpen,
  User,
  Clock,
  Wrench,
  Hash,
  CheckSquare,
  Brain,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import HomeTab from './hermes/Home';
import TasksTab from './hermes/Tasks';
import LibraryTab from './hermes/Library';
import PersonaTab from './hermes/Persona';
import SchedulesTab from './hermes/Schedules';
import SkillsTab from './hermes/Skills';
import ChannelsTab from './hermes/Channels';
import ApprovalsTab from './hermes/Approvals';
import MemoryTab from './hermes/Memory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errStatus(e) {
  return e?.response?.status || null;
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active:   { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Active' },
  running:  { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Active' },
  paused:   { bg: 'bg-amber-500/10',   text: 'text-amber-700',  dot: 'bg-amber-500', label: 'Paused' },
  archived: { bg: 'bg-[#f3f1ec]',      text: 'text-[#737373]',  dot: 'bg-[#a3a3a3]', label: 'Archived' },
  error:    { bg: 'bg-red-500/10',     text: 'text-[#dc2626]',  dot: 'bg-[#dc2626]', label: 'Error' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.archived;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Nav item definitions ──────────────────────────────────────────────────────

const P1_SECTIONS = ['home', 'tasks', 'library', 'persona', 'schedules', 'skills', 'channels', 'approvals', 'memory'];

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      Icon: Home,        p1: true  },
  { id: 'tasks',     label: 'Tasks',     Icon: ListTodo,    p1: true  },
  { id: 'library',   label: 'Library',   Icon: BookOpen,    p1: true  },
  { id: 'persona',   label: 'Persona',   Icon: User,        p1: true  },
  { id: 'schedules', label: 'Schedules', Icon: Clock,       p1: true  },
  { id: 'skills',    label: 'Skills',    Icon: Wrench,      p1: true  },
  { id: 'channels',  label: 'Channels',  Icon: Hash,        p1: true },
  { id: 'approvals', label: 'Approvals', Icon: CheckSquare, p1: true },
  { id: 'memory',    label: 'Memory',    Icon: Brain,       p1: true },
];

// ─── Nav row ──────────────────────────────────────────────────────────────────

function NavRow({ item, active, onClick }) {
  const { id, label, Icon, p1 } = item;
  const disabled = !p1;

  if (disabled) {
    return (
      <div
        className="w-full flex items-center gap-2.5 px-3 py-2 border-l-2 border-transparent opacity-40 cursor-not-allowed select-none"
        title="Coming soon"
        aria-disabled="true"
      >
        <Icon size={14} className="text-[#a3a3a3] shrink-0" />
        <span className="text-[12px] text-[#737373] flex-1 truncate">{label}</span>
        <span className="text-[9px] font-mono text-[#a3a3a3] shrink-0">soon</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-l-2 ${
        active
          ? 'bg-white border-[#117dff]'
          : 'border-transparent hover:bg-white/60'
      }`}
      aria-current={active ? 'page' : undefined}
      data-section={id}
    >
      <Icon
        size={14}
        className={active ? 'text-[#117dff] shrink-0' : 'text-[#a3a3a3] shrink-0'}
      />
      <span
        className={`text-[12px] font-${active ? 'semibold' : 'medium'} flex-1 truncate ${
          active ? 'text-[#0a0a0a]' : 'text-[#525252]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── "Not enabled" calm state ─────────────────────────────────────────────────

function NotEnabled({ t }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-[#117dff]/10 flex items-center justify-center mb-4">
        <Cpu size={28} className="text-[#117dff]" />
      </div>
      <p className="text-[15px] font-semibold text-[#0a0a0a]">
        {t('hermesAgents.notEnabledTitle', 'Hermes is not enabled')}
      </p>
      <p className="text-[12px] text-[#737373] mt-1 max-w-sm">
        {t(
          'hermesAgents.notEnabledBody',
          'This workspace does not have the Hermes agent runtime enabled yet. Contact your administrator to turn it on.',
        )}
      </p>
    </div>
  );
}

// ─── Coming-soon stub for P2/P3 sections ─────────────────────────────────────

function ComingSoon({ section }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-3">
        <Cpu size={20} className="text-[#a3a3a3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#0a0a0a] capitalize">{section}</p>
      <p className="text-[11px] text-[#737373] mt-1">Coming in a future release.</p>
    </div>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function HermesAgents() {
  const { t } = useTranslation('dashboard');

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notEnabled, setNotEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState('library');

  // Collapse sidebar to give max canvas (mirrors HyperAgents pattern).
  useEffect(() => {
    window.dispatchEvent(new Event('hivemind:close-sidebar'));
    return () => window.dispatchEvent(new Event('hivemind:open-sidebar'));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getHermesAgent();
      setAgent(data?.agent || null);
      setNotEnabled(false);
    } catch (e) {
      if (errStatus(e) === 404) {
        setNotEnabled(true);
        setAgent(null);
      } else {
        // Non-404 errors: surface inline but don't block UI
        setAgent(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <RefreshCw size={20} className="animate-spin text-[#a3a3a3]" />
      </div>
    );
  }

  // ── Not-enabled calm state (flat, no rail) ──────────────────────────────────
  if (notEnabled) {
    return (
      <div className="font-['Space_Grotesk'] flex h-[calc(100vh-3.5rem)] min-h-[600px] -m-6 max-w-none bg-white border-t border-[#e3e0db] overflow-hidden items-center justify-center">
        <NotEnabled t={t} />
      </div>
    );
  }

  // ── Two-pane shell ──────────────────────────────────────────────────────────
  return (
    <div className="font-['Space_Grotesk'] flex h-[calc(100vh-3.5rem)] min-h-[600px] -m-6 max-w-none bg-white border-t border-[#e3e0db] overflow-hidden">

      {/* ── Left rail ────────────────────────────────────────────────────────── */}
      <aside className="w-[240px] min-w-[240px] border-r border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">

        {/* Agent identity block */}
        <header className="px-3 py-3 border-b border-[#e3e0db]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg border bg-[#117dff]/10 border-[#117dff]/20 flex items-center justify-center shrink-0">
              <Cpu size={14} className="text-[#117dff]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#0a0a0a] truncate">
                {agent?.name || t('hermesAgents.defaultName', 'Hermes Agent')}
              </p>
              {agent?.status && (
                <div className="mt-0.5">
                  <StatusPill status={agent.status} />
                </div>
              )}
            </div>
            <button
              onClick={load}
              className="shrink-0 text-[#a3a3a3] hover:text-[#525252] p-0.5 rounded transition-colors"
              title={t('hermesAgents.refresh', 'Refresh')}
              aria-label={t('hermesAgents.refresh', 'Refresh')}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </header>

        {/* Nav list */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-1" aria-label="Hermes sections">
          {/* P1 divider */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3]">
              {t('hermesAgents.navActive', 'Active')}
            </span>
          </div>
          {NAV_ITEMS.filter((item) => item.p1).map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}

          {/* P2/P3 divider */}
          <div className="px-3 pt-4 pb-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3]">
              {t('hermesAgents.navComingSoon', 'Coming soon')}
            </span>
          </div>
          {NAV_ITEMS.filter((item) => !item.p1).map((item) => (
            <NavRow key={item.id} item={item} active={false} onClick={() => {}} />
          ))}
        </nav>

        {/* Bottom: empty per spec (nothing in P1) */}
      </aside>

      {/* ── Right pane ───────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        {activeSection === 'home' && (
          <HomeTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'tasks' && (
          <TasksTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'library' && (
          <LibraryTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'persona' && (
          <PersonaTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'schedules' && (
          <SchedulesTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'skills' && (
          <SkillsTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'channels' && (
          <ChannelsTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'approvals' && (
          <ApprovalsTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {activeSection === 'memory' && (
          <MemoryTab agent={agent} apiClient={apiClient} refresh={load} />
        )}
        {!P1_SECTIONS.includes(activeSection) && (
          <ComingSoon section={activeSection} />
        )}
      </main>
    </div>
  );
}
