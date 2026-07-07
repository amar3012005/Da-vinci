import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Target, Users, FileText, Globe, ArrowUpRight,
  Sparkles, LayoutGrid, MessageSquare, RefreshCw, Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { API_DEFAULTS } from '../shared/theme';

// Screenshot is served by the control-plane (relative path in state) or, for
// legacy runs, may be an inline data: URL. Resolve to an absolute src that
// carries the session cookie (same-site img request to the api host).
function screenshotSrc(v) {
  if (!v) return null;
  if (v.startsWith('data:') || v.startsWith('http')) return v;
  return `${API_DEFAULTS.controlPlaneBase.replace(/\/$/, '')}${v}`;
}

/**
 * CompanyDashboard — the HyperAgents HERO page (Polsia-style operating view).
 *
 * Three-column dashboard fed by GET /v1/hyper/company (the state the
 * onboarding orchestrator persisted on the HQ room):
 *   col 1 — Company: name, tagline, mission, positioning, website, team
 *   col 2 — Tasks: the planned to-dos; CLICKING a task opens (or creates)
 *           its workroom via POST /v1/hyper/tasks/open → parent drops into
 *           the room thread (chat)
 *   col 3 — Documents (memories filed) + research highlights + agents
 */

const TAG_STYLES = {
  RESEARCH: 'bg-[#117dff]/10 text-[#117dff]',
  FEATURE: 'bg-orange-500/10 text-orange-600',
  MARKETING: 'bg-violet-500/10 text-violet-700',
  OUTREACH: 'bg-emerald-500/10 text-emerald-700',
  STRATEGY: 'bg-[#0a0a0a]/8 text-[#3f3d39]',
};

function SectionTitle({ children }) {
  return (
    <div className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] border-b border-[#0a0a0a] pb-1.5 mb-3">
      {children}
    </div>
  );
}

export default function CompanyDashboard({ onOpenRoom, onShowRoster }) {
  const { t } = useTranslation('dashboard');
  const [state, setState] = useState(null); // {company, employees, hq_room_id}
  const [loading, setLoading] = useState(true);
  const [openingTask, setOpeningTask] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await apiClient.hyperCompany();
      setState(d);
    } catch { setState(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openTask = async (task) => {
    if (openingTask) return;
    setOpeningTask(task.id);
    try {
      const d = await apiClient.openHyperTask(task.id);
      // Freshly provisioned room (201 returns kickoff_message): fire the
      // optimized kickoff as the first turn so the swarm starts executing the
      // task immediately — the thread opens with agents already working.
      if (d?.room?.id && d?.kickoff_message) {
        try {
          await apiClient.postHyperTurn(d.room.id, {
            user_message: d.kickoff_message,
            idempotency_key: `task-kickoff-${task.id}-${d.room.id}`,
          });
        } catch { /* room still opens; user can send manually */ }
      }
      if (d?.room?.id) onOpenRoom?.(d.room);
      load(); // refresh task→room links
    } catch { /* stays on dashboard */ }
    finally { setOpeningTask(null); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[12px] text-[#a3a3a3] font-mono">
        {t('hyperDash.loading', 'Loading company…')}
      </div>
    );
  }
  if (!state?.onboarded || !state?.company) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[12px] text-[#a3a3a3]">
        <span>{t('hyperDash.notOnboarded', 'No company yet — run onboarding to generate your operating dashboard.')}</span>
        <a href="/hivemind/app/employees?onboard=1" className="text-[#117dff] hover:underline text-[12px] font-semibold">
          {t('hyperDash.runOnboarding', 'Run onboarding →')}
        </a>
      </div>
    );
  }

  const c = state.company;
  const p = c.profile || {};
  const employees = state.employees || [];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      {/* Header — Polsia's name bar */}
      <div className="px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-start justify-between sticky top-0 bg-white z-10">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{c.company}</h1>
          <div className="flex items-center gap-2 mt-1 text-[11.5px] text-[#525252]">
            <span className="flex items-center gap-1 text-[#16a34a]"><span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" /> {t('hyperDash.shipped', 'Operating')}</span>
            {c.website ? (
              <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#0a0a0a] font-mono">
                <Globe size={11} /> {c.website.replace(/^https?:\/\//, '')}
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onShowRoster}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-white hover:bg-[#faf9f4] transition-colors">
            <LayoutGrid size={12} /> {t('hyperDash.agents', 'Agents')}
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-white hover:bg-[#faf9f4] transition-colors">
            <RefreshCw size={12} /> {t('hyperDash.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Three-column Polsia grid */}
      <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1280px]">
        {/* ── Col 1 · Company ── */}
        <div>
          <SectionTitle>{t('hyperDash.company', 'Company')}</SectionTitle>
          {p.tagline ? <p className="text-[13px] text-[#0a0a0a] font-medium">{p.tagline}</p> : null}
          <p className="text-[12.5px] text-[#525252] mt-2 leading-relaxed">{p.what_it_does}</p>

          <div className="mt-4 space-y-2 text-[12px]">
            {p.icp ? <div><span className="text-[#a3a3a3] font-mono text-[10.5px] uppercase">ICP</span><p className="text-[#3f3d39] mt-0.5">{p.icp}</p></div> : null}
            {p.positioning ? <div><span className="text-[#a3a3a3] font-mono text-[10.5px] uppercase">Positioning</span><p className="text-[#3f3d39] mt-0.5">{p.positioning}</p></div> : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#a3a3a3] uppercase mb-1.5"><Target size={11} /> {t('hyperDash.mission', 'Mission')}</div>
            <p className="text-[12.5px] text-[#0a0a0a] leading-relaxed">{c.mission}</p>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#a3a3a3] uppercase mb-2"><Users size={11} /> {t('hyperDash.team', 'Team')}</div>
            <div className="space-y-1.5">
              {employees.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-[12px]">
                  <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-700 flex items-center justify-center text-[10px] font-bold">{(m.name || '?')[0]}</span>
                  <span className="text-[#0a0a0a] font-medium">{m.name}</span>
                  {m.roleArchetype ? <span className="text-[#a3a3a3] text-[11px]">{m.roleArchetype}</span> : null}
                </div>
              ))}
            </div>
          </div>

          {c.screenshot ? (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#a3a3a3] uppercase mb-2"><Globe size={11} /> {t('hyperDash.website', 'Website')}</div>
              <a href={c.website} target="_blank" rel="noreferrer" className="block group">
                <img
                  src={screenshotSrc(c.screenshot)}
                  alt={`${c.company} homepage`}
                  className="w-full rounded-xl border border-[#e3e0db] group-hover:border-[#0a0a0a] transition-colors"
                  loading="lazy"
                />
              </a>
            </div>
          ) : null}
        </div>

        {/* ── Col 2 · Tasks (click → room) ── */}
        <div>
          <SectionTitle>{t('hyperDash.tasks', 'Tasks')}</SectionTitle>
          <div className="space-y-2.5">
            {(c.tasks || []).map((task) => (
              <motion.button
                key={task.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => openTask(task)}
                className={`w-full text-left border rounded-xl px-4 py-3 transition-colors group ${task.room_id ? 'bg-[#faf9f4] border-[#e3e0db]' : 'bg-white border-[#e3e0db] hover:border-[#0a0a0a]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">{task.title}</span>
                  {openingTask === task.id
                    ? <span className="w-3.5 h-3.5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                    : task.room_id
                      ? <MessageSquare size={13} className="text-[#117dff] shrink-0 mt-0.5" />
                      : <ArrowUpRight size={13} className="text-[#a3a3a3] group-hover:text-[#0a0a0a] shrink-0 mt-0.5" />}
                </div>
                {task.detail ? <p className="text-[11.5px] text-[#525252] mt-1 leading-relaxed">{task.detail}</p> : null}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded ${TAG_STYLES[task.tag] || TAG_STYLES.RESEARCH}`}>{task.tag}</span>
                  {task.room_id ? <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[#16a34a]/10 text-[#16a34a]">{t('hyperDash.inRoom', 'ROOM OPEN')}</span> : null}
                </div>
              </motion.button>
            ))}
            {(c.tasks || []).length === 0 && (
              <p className="text-[11.5px] text-[#a3a3a3]">{t('hyperDash.noTasks', 'No planned tasks — re-run onboarding or create a room manually.')}</p>
            )}
          </div>
        </div>

        {/* ── Col 3 · Documents · Research ── */}
        <div>
          <SectionTitle>{t('hyperDash.documents', 'Documents')}</SectionTitle>
          <div className="space-y-1.5">
            {(c.documents || []).map((d) => (
              <div key={d} className="flex items-center gap-2 text-[12px] text-[#3f3d39]">
                <FileText size={12} className="text-[#a3a3a3] shrink-0" /> {d}
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-[#a3a3a3] mt-2 font-mono">{t('hyperDash.filedTo', 'Filed to HIVEMIND memory — agents recall these before acting.')}</p>

          {(c.research || []).length > 0 && (
            <div className="mt-6">
              <SectionTitle>{t('hyperDash.research', 'Market research')}</SectionTitle>
              <div className="space-y-2.5">
                {(c.research || []).slice(0, 5).map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block group">
                    <div className="flex items-start gap-2">
                      <Search size={11} className="text-[#a3a3a3] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[12px] text-[#0a0a0a] font-medium group-hover:underline leading-snug line-clamp-1">{r.title || r.url}</span>
                        <p className="text-[11px] text-[#a3a3a3] leading-relaxed line-clamp-2">{r.snippet}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <SectionTitle>{t('hyperDash.hq', 'HQ')}</SectionTitle>
            <button
              onClick={() => state.hq_room_id && onOpenRoom?.({ id: c.room_id || state.hq_room_id, name: c.room_name })}
              className="w-full flex items-center justify-between border border-[#e3e0db] hover:border-[#0a0a0a] rounded-xl px-4 py-3 bg-white transition-colors group"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
                <Sparkles size={13} className="text-violet-500" /> {c.room_name || `${c.company} — HQ`}
              </span>
              <ArrowUpRight size={13} className="text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[10.5px] font-mono text-[#a3a3a3]">
            <Building2 size={11} />
            {t('hyperDash.onboardedAt', 'Onboarded')} {c.onboarded_at ? new Date(c.onboarded_at).toLocaleDateString() : ''}
            <a href="/hivemind/app/employees?onboard=1" className="ml-auto text-[#117dff] hover:underline">{t('hyperDash.rerun', 'Re-run onboarding')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
