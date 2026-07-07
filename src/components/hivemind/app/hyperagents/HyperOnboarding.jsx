import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Sparkles, ArrowRight, Users, ListChecks, Target, FileText, Building2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import OnboardingTerminal from './OnboardingTerminal';

/**
 * HyperOnboarding — Polsia-style company genesis for HyperAgents.
 *
 * Layout mirrors Polsia's dashboard but in the HIVEMIND warm-light theme:
 *   • a live company dashboard (Company · Mission · Documents · Tasks · Team)
 *     whose panels reveal as the pipeline progresses, then fill on completion;
 *   • a narrow BLACK terminal pinned to the RIGHT, streaming the orchestrator's
 *     "> step" log lines exactly like Polsia's build log.
 * On completion the user drops into the normal room workspace (rooms left,
 * agents right).
 *
 * Server contract:
 *   POST /v1/hyper/onboarding/start  { website_url, goal? }
 *   GET  /v1/hyper/onboarding/status → { running, done, error, lines, result }
 */

// Map a log line to the dashboard panel it "lights up", so the panels reveal
// progressively as the terminal advances (Polsia's fill-as-you-go feel).
function panelsLitBy(lines) {
  const seen = lines.map((l) => (l.text || '').toLowerCase()).join('\n');
  return {
    company: /creating your company|reading your website|drafting your company profile|saving your profile/.test(seen),
    mission: /writing your mission|locking in your vision|filing your documents/.test(seen),
    team: /assembling your team|hiring /.test(seen),
    tasks: /planning your first tasks|saving your tasks/.test(seen),
    workspace: /provisioning your workspace|completed/.test(seen),
  };
}

function Panel({ icon: Icon, title, lit, children }) {
  return (
    <div className={`bg-white border rounded-xl p-4 transition-all duration-500 ${lit ? 'border-[#e3e0db] opacity-100' : 'border-[#efece6] opacity-45'}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={13} className={lit ? 'text-[#117dff]' : 'text-[#c9c4bc]'} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3] font-['Space_Grotesk']">{title}</span>
        {lit && <CheckCircle2 size={12} className="text-[#16a34a] ml-auto" />}
      </div>
      {lit ? children : <div className="space-y-1.5"><div className="h-2.5 bg-[#f2efe9] rounded w-3/4 animate-pulse" /><div className="h-2.5 bg-[#f2efe9] rounded w-1/2 animate-pulse" /></div>}
    </div>
  );
}

export default function HyperOnboarding({ onComplete, onSkip }) {
  const { t } = useTranslation('dashboard');
  const [phase, setPhase] = useState('input'); // input | running | done
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [lines, setLines] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => stopPolling, []);

  const poll = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const s = await apiClient.hyperOnboardingStatus();
        setLines(s.lines || []);
        if (s.done) {
          stopPolling();
          if (s.error) setError(s.error);
          else { setResult(s.result); setPhase('done'); }
        }
      } catch { /* transient */ }
    }, 1100);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await apiClient.hyperOnboardingStatus();
        if (s.running) { setPhase('running'); setLines(s.lines || []); poll(); }
        else if (s.done && !s.error && s.result) { setResult(s.result); setLines(s.lines || []); setPhase('done'); }
      } catch { /* fresh */ }
    })();
  }, [poll]);

  const start = async (e) => {
    e?.preventDefault();
    if (!websiteUrl.trim() || starting) return;
    setStarting(true); setError(null);
    try {
      await apiClient.startHyperOnboarding({ website_url: websiteUrl.trim(), goal: goal.trim() || undefined });
      setPhase('running'); setLines([]); poll();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setStarting(false); }
  };

  // ── Phase: input ──────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div className="max-w-[640px] mx-auto pt-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#a3a3a3] mb-3">
            <span className="text-violet-500">〉</span> HYPERAGENTS <span className="text-[#d4d0ca]">· ONBOARDING</span>
          </div>
          <h1 className="text-[32px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            {t('hyperOnboarding.headline', 'Run your company with AI')}
          </h1>
          <p className="text-[13.5px] text-[#525252] mt-2 max-w-[520px]">
            {t('hyperOnboarding.sub', 'Enter your website. Your agents read it, draft a grounded company profile and mission into HIVEMIND memory, assemble your team, plan first tasks and open your HQ room.')}
          </p>
          <form onSubmit={start} className="mt-7 space-y-3">
            <div className="relative">
              <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
              <input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder={t('hyperOnboarding.urlPlaceholder', 'yourcompany.com')} autoFocus
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-[#e3e0db] rounded-xl text-[14px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15 font-mono" />
            </div>
            <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder={t('hyperOnboarding.goalPlaceholder', 'Optional: what should your AI team focus on first?')}
              className="w-full px-4 py-3 bg-white border border-[#e3e0db] rounded-xl text-[13px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15" />
            {error && <p className="text-[12px] text-[#dc2626] font-mono">{error}</p>}
            <button type="submit" disabled={!websiteUrl.trim() || starting}
              className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-40 text-white text-[13.5px] font-semibold px-4 py-3.5 rounded-xl transition-colors">
              {starting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>{t('hyperOnboarding.start', 'Start onboarding')} <ArrowRight size={15} /></>}
            </button>
          </form>
          <button onClick={() => onSkip?.()} className="mt-5 text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors">
            {t('hyperOnboarding.skip', 'Skip — take me to the playground')}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Phase: running / done — Polsia-style dashboard + right terminal ────
  const done = phase === 'done';
  const lit = done
    ? { company: true, mission: true, team: true, tasks: true, workspace: true }
    : panelsLitBy(lines);
  const p = result?.profile || {};
  const companyName = result?.company || (websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0] || 'Your company').toUpperCase();

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] min-h-[560px]">
      {/* ── Top build-log strip (Polsia position, day-mode styling) ── */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1.5 px-0.5">
          <Sparkles size={12} className="text-violet-500" />
          <span className="text-[11px] font-semibold text-[#525252] font-['Space_Grotesk']">{t('hyperOnboarding.buildLog', 'Build log')}</span>
          <span className="text-[10px] font-mono text-[#a3a3a3] ml-auto">{lines.length} steps</span>
        </div>
        <div className={done ? 'h-[96px]' : 'h-[168px]'}>
          <OnboardingTerminal lines={lines} done={done} error={error} />
        </div>
      </div>

      {/* ── Dashboard ── */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#a3a3a3]">
              <span className="text-violet-500">〉</span> HYPERAGENTS · {done ? 'READY' : 'BUILDING'}
            </div>
            <h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-0.5">{companyName}</h1>
            {p.tagline ? <p className="text-[12.5px] text-[#525252]">{p.tagline}</p> : null}
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg ${done ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-violet-500/10 text-violet-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-[#16a34a]' : 'bg-violet-500 animate-pulse'}`} />
            {done ? t('hyperOnboarding.completed', 'Completed') : t('hyperOnboarding.building', 'Building…')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Panel icon={Building2} title={t('hyperOnboarding.company', 'Company')} lit={lit.company}>
            <p className="text-[12.5px] text-[#0a0a0a] leading-relaxed">{p.what_it_does || '—'}</p>
            {p.icp ? <p className="text-[11.5px] text-[#525252] mt-1.5"><span className="text-[#a3a3a3]">ICP:</span> {p.icp}</p> : null}
            {p.positioning ? <p className="text-[11.5px] text-[#525252] mt-1"><span className="text-[#a3a3a3]">Positioning:</span> {p.positioning}</p> : null}
          </Panel>

          <Panel icon={Target} title={t('hyperOnboarding.mission', 'Mission')} lit={lit.mission}>
            <p className="text-[12.5px] text-[#0a0a0a] leading-relaxed">{result?.mission || '—'}</p>
          </Panel>

          <Panel icon={Users} title={t('hyperOnboarding.team', 'Your team')} lit={lit.team}>
            <div className="flex flex-wrap gap-1.5">
              {(result?.team || []).map((m) => (
                <span key={m.id} className="text-[12px] px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 font-medium">{m.name}</span>
              ))}
            </div>
          </Panel>

          <Panel icon={ListChecks} title={t('hyperOnboarding.firstTasks', 'First tasks')} lit={lit.tasks}>
            <ul className="space-y-1.5">
              {(result?.tasks || []).map((task, i) => (
                <li key={i} className="text-[12px] text-[#0a0a0a] flex gap-2">
                  <span className="text-[#a3a3a3] font-mono text-[10px] mt-0.5">{String(i + 1).padStart(2, '0')}</span>{task}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="col-span-2">
            <Panel icon={FileText} title={t('hyperOnboarding.documents', 'Documents filed to HIVEMIND memory')} lit={lit.company}>
              <div className="flex flex-wrap gap-2">
                {[`${companyName} — Company profile`, `${companyName} — Mission`].map((d) => (
                  <span key={d} className="text-[11.5px] px-2.5 py-1 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] font-mono">{d}</span>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <AnimatePresence>
          {done && (
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => onComplete?.(result)}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[13px] font-semibold px-4 py-3 rounded-xl transition-colors">
              {t('hyperOnboarding.enterWorkspace', 'Enter your workspace')} <ArrowRight size={15} />
            </motion.button>
          )}
        </AnimatePresence>
        {error && (
          <div className="mt-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-[12.5px] text-[#dc2626] font-mono">{error}</span>
            <button onClick={() => { setPhase('input'); setError(null); }} className="text-[12px] font-semibold text-[#0a0a0a] hover:underline shrink-0 ml-4">
              {t('hyperOnboarding.retry', 'Try again')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
