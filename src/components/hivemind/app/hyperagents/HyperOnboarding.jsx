import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Globe, Sparkles, ArrowRight, Users, ListChecks, Target, FileText, Building2, CheckCircle2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import SingulanceMark from '../shared/SingulanceMark';
import OnboardingTerminal from './OnboardingTerminal';
import AgentAvatar from './AgentAvatar';
import WebsitePreview from './WebsitePreview';

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
 *   POST /v1/hyper/onboarding/start  { website_url, company_location?, goal? }
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

// `lit` = this section is being worked on (log-line heuristic) — dims the
// panel in/out for liveliness. `complete` = the actual data has landed —
// gates the green checkmark, so a panel never reads as "done" (checkmark)
// while its content is still an empty placeholder dash. Without this split,
// `lit` alone drove both, and a panel could show a checkmark next to "—"
// the moment its log line appeared but before the real profile/mission
// data existed — the "looks odd, half-done" bug.
function Panel({ icon: Icon, title, lit, complete = lit, children, className = '' }) {
  return (
    <div className={`bg-white border rounded-lg p-3 overflow-hidden transition-all duration-500 ${lit ? 'border-[#e3e0db] opacity-100' : 'border-[#efece6] opacity-45'} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className={lit ? 'text-[#117dff]' : 'text-[#c9c4bc]'} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3] font-['Space_Grotesk']">{title}</span>
        {complete && <CheckCircle2 size={12} className="text-[#16a34a] ml-auto" />}
      </div>
      {!lit ? (
        <div className="space-y-1.5"><div className="h-2.5 bg-[#f2efe9] rounded w-3/4 animate-pulse" /><div className="h-2.5 bg-[#f2efe9] rounded w-1/2 animate-pulse" /></div>
      ) : !complete ? (
        <p className="text-[11.5px] text-[#a3a3a3] italic flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#117dff] animate-pulse" /> Still gathering…
        </p>
      ) : children}
    </div>
  );
}

const AWAKENING_LINES = [
  'IT’S THE AWAKENING',
  'Your HIVEMIND is awake.',
  'We reviewed {company} and prepared your first moves…',
  'Three HyperAgents now live inside your company brain.',
];

function agentAssignment(member) {
  return member?.assignment
    || member?.job
    || member?.responsibility
    || member?.persona
    || member?.description
    || 'Briefed with your company context and ready for the first move.';
}

function AwakeningOverlay({ company, team, onContinue, onClose }) {
  const reduceMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [profilesVisible, setProfilesVisible] = useState(false);
  const sentences = useMemo(
    () => AWAKENING_LINES.map((line) => line.replace('{company}', company)),
    [company],
  );
  const activeSentence = sentences[lineIndex] || '';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (profilesVisible) return undefined;
    if (reduceMotion) {
      setLineIndex(sentences.length - 1);
      setCharacterIndex(sentences.at(-1).length);
      const revealTimer = window.setTimeout(() => setProfilesVisible(true), 500);
      return () => window.clearTimeout(revealTimer);
    }
    if (characterIndex < activeSentence.length) {
      const typeTimer = window.setTimeout(() => setCharacterIndex((current) => current + 1), lineIndex === 0 ? 72 : 38);
      return () => window.clearTimeout(typeTimer);
    }
    const holdTimer = window.setTimeout(() => {
      if (lineIndex < sentences.length - 1) {
        setLineIndex((current) => current + 1);
        setCharacterIndex(0);
      } else {
        setProfilesVisible(true);
      }
    }, lineIndex === 0 ? 1050 : 1250);
    return () => window.clearTimeout(holdTimer);
  }, [activeSentence, characterIndex, lineIndex, profilesVisible, reduceMotion, sentences]);

  const skipToProfiles = () => {
    setLineIndex(sentences.length - 1);
    setCharacterIndex(sentences.at(-1).length);
    setProfilesVisible(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.45 }}
      className="fixed inset-0 z-[110] overflow-y-auto bg-[#d7d7d7] text-[#0a0a0a]"
      role="dialog"
      aria-modal="true"
      aria-label={`${company} HIVEMIND awakening`}
    >
      <div
        className="fixed inset-0"
        aria-hidden="true"
        style={{
          background: 'repeating-linear-gradient(90deg, rgba(0,0,0,.34) 0, rgba(0,0,0,.06) 2px, rgba(255,255,255,.42) 7px, rgba(255,255,255,.08) 13px, rgba(18,18,18,.25) 18px), linear-gradient(180deg,#e7e7e7 0%,#c9c9c9 48%,#202020 100%)',
          filter: 'blur(1.5px)',
          transform: 'scale(1.02)',
        }}
      />
      <div className="fixed inset-0 bg-white/34 backdrop-blur-[22px]" aria-hidden="true" />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.16),rgba(10,10,10,.26))]" aria-hidden="true" />

      <button type="button" onClick={profilesVisible ? onClose : skipToProfiles} className="fixed right-5 top-5 z-10 rounded-full border border-white/50 bg-white/35 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[#262626] backdrop-blur-xl transition-colors hover:bg-white/60">
        {profilesVisible ? 'Back' : 'Skip introduction'}
      </button>

      <div className="relative z-[1] mx-auto flex min-h-full w-full max-w-[1180px] items-center justify-center px-5 py-20 sm:px-8">
        <AnimatePresence mode="wait">
          {!profilesVisible ? (
            <motion.div
              key={`sentence-${lineIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
              className="flex min-h-[240px] max-w-[980px] items-center justify-center text-center"
            >
              <h1 className={`${lineIndex === 0 ? 'text-[clamp(2.2rem,6vw,6.4rem)] tracking-[-0.04em]' : 'text-[clamp(1.85rem,4.7vw,5rem)] tracking-[-0.035em]'} font-semibold leading-[1.04] text-[#0a0a0a] font-['Space_Grotesk'] drop-shadow-[0_1px_0_rgba(255,255,255,.7)]`}>
                {activeSentence.slice(0, characterIndex)}
                <span className="ml-1 inline-block w-[0.08em] animate-pulse bg-[#0a0a0a] align-[-0.08em]">&nbsp;</span>
              </h1>
            </motion.div>
          ) : (
            <motion.div key="agents" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <div className="text-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#3f3d39]">HIVEMIND · HyperAgents online</div>
                <h1 className="mt-3 text-[clamp(2rem,4vw,4.6rem)] font-semibold leading-none tracking-[-0.04em] text-[#0a0a0a] font-['Space_Grotesk']">Your company brain is alive.</h1>
                <p className="mx-auto mt-3 max-w-[620px] text-[13px] leading-6 text-[#3f3d39]">Three specialists were hired from your onboarding assignments. Each one is briefed with {company}’s context and ready to work.</p>
              </div>
              <div className="mt-9 grid grid-cols-1 divide-y divide-white/50 border-y border-white/60 bg-white/22 backdrop-blur-2xl md:grid-cols-3 md:divide-x md:divide-y-0">
                {team.slice(0, 3).map((member, index) => (
                  <motion.div key={member.id || member.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.14 }} className="min-h-[220px] p-6 text-center sm:p-8">
                    <div className="mx-auto w-fit rounded-full border border-white/70 bg-white/35 p-1.5 shadow-[0_12px_35px_rgba(0,0,0,.1)] backdrop-blur-xl"><AgentAvatar agent={member} size={64} /></div>
                    <h2 className="mt-4 text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{member.name}</h2>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[#3f3d39]">{member.roleArchetype || member.role || 'HyperAgent'}</div>
                    <p className="mt-3 text-[11.5px] leading-5 text-[#525252]">{agentAssignment(member)}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.13em] text-[#176b43]"><span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" /> Online</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <p className="text-[clamp(1.2rem,2vw,1.75rem)] font-medium tracking-[-0.02em] text-[#0a0a0a] font-['Space_Grotesk']">Let’s make {company} an AI company.</p>
                <button type="button" onClick={onContinue} className="mt-5 inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#0a0a0a] px-7 text-[12px] font-semibold text-white transition-all hover:bg-[#262626] hover:px-8">
                  Begin the first move <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function HyperOnboarding({ onComplete, onSkip }) {
  const { t } = useTranslation('dashboard');
  const [phase, setPhase] = useState('input'); // input | running | done
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [goal, setGoal] = useState('');
  const [lines, setLines] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [awakeningOpen, setAwakeningOpen] = useState(false);
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
          if (s.error) setError(s.error);
          else {
            setResult(s.result);
            setPhase('done');
            if (!s.result?.screenshot_pending) stopPolling();
          }
        }
      } catch { /* transient */ }
    }, 1100);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await apiClient.hyperOnboardingStatus();
        if (s.running) { setPhase('running'); setLines(s.lines || []); poll(); }
        else if (s.done && !s.error && s.result) {
          setResult(s.result); setLines(s.lines || []); setPhase('done');
          if (s.result?.screenshot_pending) poll();
        }
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

  const requestWorkspaceEntry = () => {
    setCompanyLocation(result?.profile?.location || result?.company_location || '');
    setLocationError('');
    setLocationPromptOpen(true);
  };

  const beginWorkspaceEntry = () => {
    setAwakeningOpen(false);
    requestWorkspaceEntry();
  };

  const confirmWorkspaceLocation = async (event) => {
    event?.preventDefault();
    const location = companyLocation.trim();
    if (!location || savingLocation) return;
    setSavingLocation(true);
    setLocationError('');
    try {
      const updated = await apiClient.updateHyperCompanyLocation(location);
      const nextResult = updated?.company || {
        ...result,
        company_location: location,
        profile: { ...(result?.profile || {}), location, location_source: 'user_claim' },
      };
      setResult(nextResult);
      setLocationPromptOpen(false);
      // Entering the completed workspace is the authoritative Day-0 moment.
      // The server owns the idempotent claim; CompanyDashboard repeats the
      // same safe call as a recovery path if navigation/network timing races.
      await apiClient.claimHyperCompanyDayZeroReport().catch(() => null);
      onComplete?.(nextResult);
    } catch (err) {
      setLocationError(err.response?.data?.error || err.message);
    } finally {
      setSavingLocation(false);
    }
  };

  // ── Phase: input ──────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div className="max-w-[640px] mx-auto pt-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#a3a3a3] mb-3">
            <span className="text-violet-500">〉</span> HYPERAGENTS <span className="text-[#d4d0ca]">· ONBOARDING</span>
          </div>
          <SingulanceMark size={30} className="mb-3" />
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
    <div className="flex flex-col gap-3 h-[calc(100vh-6.5rem)] min-h-[560px] overflow-hidden">
      {/* ── Top build-log strip (Polsia position, day-mode styling) ── */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1.5 px-0.5">
          <Sparkles size={12} className="text-violet-500" />
          <span className="text-[11px] font-semibold text-[#525252] font-['Space_Grotesk']">{t('hyperOnboarding.buildLog', 'Build log')}</span>
          <span className="text-[10px] font-mono text-[#a3a3a3] ml-auto">{lines.length} steps</span>
        </div>
        <div className={done ? 'h-[58px]' : 'h-[128px]'}>
          <OnboardingTerminal lines={lines} done={done} error={error} />
        </div>
      </div>

      {/* ── Dashboard ── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:overflow-hidden pr-1">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-start gap-2.5">
            <SingulanceMark size={26} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#a3a3a3]">
                <span className="text-violet-500">〉</span> HYPERAGENTS · {done ? 'READY' : 'BUILDING'}
              </div>
              <h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-0.5">{companyName}</h1>
              {p.tagline ? <p className="text-[12.5px] text-[#525252]">{p.tagline}</p> : null}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg ${done ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-violet-500/10 text-violet-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-[#16a34a]' : 'bg-violet-500 animate-pulse'}`} />
            {done ? t('hyperOnboarding.completed', 'Completed') : t('hyperOnboarding.building', 'Building…')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2 lg:col-span-1 lg:row-span-2 min-w-0 self-start">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#a3a3a3] uppercase mb-2">
              <Globe size={11} /> {t('hyperOnboarding.websitePreview', 'Website preview')}
            </div>
            <WebsitePreview
              image={result?.screenshot}
              source={result?.website_visual_source}
              website={result?.website || websiteUrl}
              company={companyName}
              tagline={p.tagline}
              loading={Boolean(result?.screenshot_pending) || (!done && !result?.screenshot)}
              compact
              className="w-full shadow-[0_12px_36px_rgba(10,10,10,0.06)]"
            />
          </div>

          <Panel icon={Building2} title={t('hyperOnboarding.company', 'Company')} lit={lit.company} complete={Boolean(p.what_it_does) || done} className="min-h-[142px]">
            <p className="text-[12px] text-[#0a0a0a] leading-snug line-clamp-2">{p.what_it_does || '—'}</p>
            {p.location ? <p className="text-[11px] text-[#525252] mt-1 truncate"><span className="text-[#a3a3a3]">HQ:</span> {p.location}</p> : null}
            {p.icp ? <p className="text-[11px] text-[#525252] mt-1 line-clamp-1"><span className="text-[#a3a3a3]">ICP:</span> {p.icp}</p> : null}
            {(p.social_profiles || []).length ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {p.social_profiles.map((social) => (
                  <a key={social.url} href={social.url} target="_blank" rel="noreferrer" className="text-[9.5px] font-mono uppercase border border-[#d9dee5] rounded px-1.5 py-0.5 text-[#117dff] hover:border-[#117dff]">
                    {social.platform}
                  </a>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel icon={Target} title={t('hyperOnboarding.mission', 'Mission')} lit={lit.mission} complete={Boolean(result?.mission) || done} className="min-h-[142px]">
            <p className="text-[12px] text-[#0a0a0a] leading-snug line-clamp-4">{result?.mission || '—'}</p>
          </Panel>

          <Panel icon={Users} title={t('hyperOnboarding.team', 'Your team')} lit={lit.team} complete={(result?.team || []).length > 0 || done} className="h-[116px]">
            <div className="flex flex-wrap gap-1.5">
              {(result?.team || []).map((m, i) => (
                <motion.span
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="text-[12px] pl-1 pr-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 font-medium inline-flex items-center gap-1.5"
                >
                  <AgentAvatar agent={m} size={22} />
                  {m.name}
                </motion.span>
              ))}
            </div>
          </Panel>

          <Panel icon={ListChecks} title={t('hyperOnboarding.firstTasks', 'First tasks')} lit={lit.tasks} complete={(result?.tasks || []).length > 0 || done} className="h-[122px]">
            <ul className="grid grid-cols-3 gap-1">
              {(result?.tasks || []).map((task, i) => (
                <li key={task.id || i} title={typeof task === 'object' ? task.detail : ''} className="h-6 min-w-0 border border-[#ece9e3] rounded-md px-1.5 text-[9.5px] text-[#0a0a0a] flex items-center gap-1">
                  <span className="text-[#117dff] font-mono text-[8.5px] uppercase shrink-0">{task.room_name || task.room_tag || String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate font-medium">{typeof task === 'string' ? task : task.title}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="col-span-2">
            <Panel icon={FileText} title={t('hyperOnboarding.documents', 'Documents filed to HIVEMIND memory')} lit={lit.company} className="h-[58px]">
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
              onClick={() => setAwakeningOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors">
              {t('hyperOnboarding.enterHivemind', 'Enter your HIVEMIND')} <ArrowRight size={15} />
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

      <AnimatePresence>
        {awakeningOpen && (
          <AwakeningOverlay
            company={companyName}
            team={result?.team || []}
            onContinue={beginWorkspaceEntry}
            onClose={() => setAwakeningOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {locationPromptOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.form initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} onSubmit={confirmWorkspaceLocation} className="w-full max-w-[430px] bg-white border border-[#d9dee5] rounded-lg shadow-2xl p-5">
              <div className="w-9 h-9 rounded-lg bg-[#117dff]/10 text-[#117dff] grid place-items-center mb-4"><MapPin size={17} /></div>
              <h2 className="text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Where is your headquarters?</h2>
              <p className="text-[12.5px] text-[#525252] mt-1.5">We use your company HQ to find relevant leads, prospects, regulations, and market evidence around you. This is company context, not your home address.</p>
              <label className="block text-[10px] font-mono uppercase text-[#77716a] mt-5 mb-1.5">Headquarters location</label>
              <input autoFocus value={companyLocation} onChange={(event) => setCompanyLocation(event.target.value)} placeholder="City, region, country" className="w-full h-11 border border-[#d9dee5] rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15" />
              {locationError ? <p className="text-[11px] text-[#dc2626] mt-2">{locationError}</p> : null}
              <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={() => setLocationPromptOpen(false)} className="h-9 px-3 border border-[#d9dee5] rounded-lg text-[12px] font-medium text-[#525252] hover:bg-[#faf9f4]">Back</button>
                <button type="submit" disabled={!companyLocation.trim() || savingLocation} className="h-9 px-4 bg-[#0a0a0a] text-white rounded-lg text-[12px] font-semibold disabled:opacity-40 inline-flex items-center gap-2">
                  {savingLocation ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  Enter your HIVEMIND
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
