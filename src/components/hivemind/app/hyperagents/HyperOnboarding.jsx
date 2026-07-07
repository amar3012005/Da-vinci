import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Sparkles, ArrowRight, Users, ListChecks, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import OnboardingTerminal from './OnboardingTerminal';

/**
 * HyperOnboarding — Polsia-style company genesis for the HyperAgents section.
 *
 * Flow: enter your company website (+ optional goal) → the control-plane
 * orchestrator reads the site, drafts a grounded company profile + mission
 * (persisted to HIVEMIND memory), hires a starting team, plans first tasks
 * and provisions an HQ room — all streamed here as a live terminal. On
 * completion we show the company summary and drop the user into their room.
 *
 * Server contract:
 *   POST /v1/hyper/onboarding/start  { website_url, goal? }
 *   GET  /v1/hyper/onboarding/status → { running, done, error, lines, result }
 */
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
          if (s.error) {
            setError(s.error);
          } else {
            setResult(s.result);
            setPhase('done');
          }
        }
      } catch { /* transient poll failure — keep trying */ }
    }, 1200);
  }, []);

  // Re-attach to an in-flight run (refresh mid-onboarding).
  useEffect(() => {
    (async () => {
      try {
        const s = await apiClient.hyperOnboardingStatus();
        if (s.running) { setPhase('running'); setLines(s.lines || []); poll(); }
        else if (s.done && !s.error && s.result) { setResult(s.result); setPhase('done'); }
      } catch { /* fresh start */ }
    })();
  }, [poll]);

  const start = async (e) => {
    e?.preventDefault();
    if (!websiteUrl.trim() || starting) return;
    setStarting(true);
    setError(null);
    try {
      await apiClient.startHyperOnboarding({ website_url: websiteUrl.trim(), goal: goal.trim() || undefined });
      setPhase('running');
      setLines([]);
      poll();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setStarting(false);
    }
  };

  // ── Phase: done — company summary ─────────────────────────────────────
  if (phase === 'done' && result) {
    return (
      <div className="max-w-[760px] mx-auto pt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#e3e0db] rounded-2xl p-7">
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#16a34a] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            {t('hyperOnboarding.completed', 'Completed · onboarding')}
          </div>
          <h1 className="text-[26px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{result.company}</h1>
          {result.profile?.tagline ? (
            <p className="text-[13px] text-[#525252] mt-1">{result.profile.tagline}</p>
          ) : null}

          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <Target size={15} className="text-[#117dff] mt-0.5 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-wide">{t('hyperOnboarding.mission', 'Mission')}</div>
                <p className="text-[13px] text-[#0a0a0a] mt-0.5">{result.mission}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users size={15} className="text-[#117dff] mt-0.5 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-wide">{t('hyperOnboarding.team', 'Your team')}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(result.team || []).map((m) => (
                    <span key={m.id} className="text-[12px] px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 font-medium">{m.name}</span>
                  ))}
                </div>
              </div>
            </div>
            {(result.tasks || []).length > 0 && (
              <div className="flex items-start gap-3">
                <ListChecks size={15} className="text-[#117dff] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-wide">{t('hyperOnboarding.firstTasks', 'First tasks')}</div>
                  <ul className="mt-1.5 space-y-1">
                    {result.tasks.map((task, i) => (
                      <li key={i} className="text-[13px] text-[#0a0a0a] flex gap-2">
                        <span className="text-[#a3a3a3] font-mono text-[11px] mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onComplete?.(result)}
            className="mt-7 w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[13px] font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            {t('hyperOnboarding.enterWorkspace', 'Enter your workspace')} <ArrowRight size={15} />
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Phase: running — live terminal ────────────────────────────────────
  if (phase === 'running') {
    return (
      <div className="max-w-[860px] mx-auto pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-violet-500" />
            <span className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              {t('hyperOnboarding.building', 'Building your company')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#a3a3a3]">{lines.length} steps</span>
        </div>
        <div className="h-[440px]">
          <OnboardingTerminal lines={lines} done={false} error={error} />
        </div>
        {error && (
          <div className="mt-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-[12.5px] text-[#dc2626] font-mono">{error}</span>
            <button onClick={() => { setPhase('input'); setError(null); }}
              className="text-[12px] font-semibold text-[#0a0a0a] hover:underline shrink-0 ml-4">
              {t('hyperOnboarding.retry', 'Try again')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: input — company website ────────────────────────────────────
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
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder={t('hyperOnboarding.urlPlaceholder', 'yourcompany.com')}
              autoFocus
              className="w-full pl-10 pr-4 py-3.5 bg-white border border-[#e3e0db] rounded-xl text-[14px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15 font-mono"
            />
          </div>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t('hyperOnboarding.goalPlaceholder', 'Optional: what should your AI team focus on first?')}
            className="w-full px-4 py-3 bg-white border border-[#e3e0db] rounded-xl text-[13px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15"
          />
          {error && <p className="text-[12px] text-[#dc2626] font-mono">{error}</p>}
          <button
            type="submit"
            disabled={!websiteUrl.trim() || starting}
            className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-40 text-white text-[13.5px] font-semibold px-4 py-3.5 rounded-xl transition-colors"
          >
            {starting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <>{t('hyperOnboarding.start', 'Start onboarding')} <ArrowRight size={15} /></>}
          </button>
        </form>

        <button
          onClick={() => onSkip?.()}
          className="mt-5 text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors"
        >
          {t('hyperOnboarding.skip', 'Skip — take me to the playground')}
        </button>
      </motion.div>
    </div>
  );
}
