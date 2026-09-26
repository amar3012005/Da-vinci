import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Blocks,
  BriefcaseBusiness,
  Headphones,
  MessageSquare,
  Network,
  Plug,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import SingulanceMark from './SingulanceMark';

/**
 * WelcomeFlow — the two full-screen moments around sign-in:
 *
 *   <WelcomeSlides />  — capability deck shown ONCE to brand-new users
 *                        (blueprint aesthetic: dot-grid canvas, mono eyebrows,
 *                        numbered [n/N] counters, big Space Grotesk headline)
 *   <ActivationGate /> — the ~5s "wiring up your HIVEMIND" checklist shown
 *                        after every sign-in, before the workspace reveals.
 *
 * Both are pure presentation — AppShell owns when they mount.
 */

/* ─── Shared blueprint canvas ──────────────────────────────────────────── */
function BlueprintCanvas({ children }) {
  return (
    <div className="fixed inset-0 z-[130] bg-[#faf9f4] overflow-hidden">
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: 'radial-gradient(rgba(17,125,255,0.13) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* soft blue wash, corners */}
      <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-[#117dff]/[0.05] blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-[#117dff]/[0.05] blur-[100px]" />
      <div className="relative z-10 h-full min-h-0 flex flex-col">{children}</div>
    </div>
  );
}

/* ─── Capability slides (new users, once) ──────────────────────────────── */

export const SLIDES = [
  {
    icon: Blocks,
    eyebrow: 'HIVEMIND OPERATING SYSTEM',
    title: 'Your company, running as one intelligent system',
    body: 'BRAIN, OS, HYPERAGENTS, and VOICE operate as one connected layer — company knowledge becomes coordinated work, digital employees, and customer conversations.',
    stats: [['MEMORY', 'brain'], ['EXECUTION', 'operating system'], ['EMPLOYEES · VOICE', 'action']],
    visual: 'system',
  },
  {
    icon: Brain,
    eyebrow: 'MEMORY ENGINE',
    title: 'A brain that never forgets',
    body: 'Company knowledge, meetings, documents, decisions, and connected tools become durable memory with semantic recall — grounded in the context your organization owns.',
    stats: [['PERSISTENT', 'memory'], ['GROUNDED', 'recall'], ['GOVERNED', 'access']],
    visual: 'memory',
  },
  {
    icon: BriefcaseBusiness,
    eyebrow: 'OPERATING SYSTEM',
    title: 'Turn knowledge into coordinated work',
    body: 'Rooms, tasks, projects, workflows, approvals, and organizational context run from the same memory, carrying an objective from plan through execution and evidence.',
    stats: [['PLAN', 'objectives'], ['EXECUTE', 'workflows'], ['TRACK', 'evidence']],
    visual: 'operating',
  },
  {
    icon: Sparkles,
    eyebrow: 'HYPERAGENTS',
    title: 'Digital employees that know your company',
    body: 'Specialized employees for research, strategy, operations, risk, content, and customer work collaborate from the same company memory with inspectable work and outcomes.',
    stats: [['SPECIALIZED', 'roles'], ['COLLABORATIVE', 'teams'], ['ACCOUNTABLE', 'work']],
    visual: 'agents',
  },
  {
    icon: Headphones,
    eyebrow: 'VOICE',
    title: 'Your AI team, in every conversation',
    body: 'TARA can speak with customers and users, qualify leads, support sales, answer questions, and retain conversation context in the company’s shared intelligence.',
    stats: [['REAL-TIME', 'conversation'], ['MULTILINGUAL', 'reach'], ['CUSTOMER-FACING', 'sales']],
    visual: 'voice',
  },
];

/** Minimal line-art visual per slide — blueprint style, no images. */
export function SlideVisual({ kind }) {
  const ink = '#117dff';
  if (kind === 'system') {
    const modules = [
      { x: 14, y: 20, label: 'BRAIN' }, { x: 58, y: 20, label: 'OS' },
      { x: 14, y: 62, label: 'AGENTS' }, { x: 58, y: 62, label: 'VOICE' },
    ];
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <motion.path d="M36 30 H58 M36 72 H58 M25 40 V62 M69 40 V62" fill="none" stroke={ink} strokeWidth="0.6" strokeOpacity="0.4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
        {modules.map((module, i) => (
          <motion.g key={module.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 + i * 0.1 }}>
            <rect x={module.x} y={module.y} width="28" height="18" rx="3" fill={i === 0 ? ink : '#fff'} stroke={ink} strokeWidth="0.7" />
            <text x={module.x + 14} y={module.y + 11} textAnchor="middle" fontSize="4" fontFamily="monospace" fill={i === 0 ? '#fff' : ink}>{module.label}</text>
          </motion.g>
        ))}
        <motion.circle cx="50" cy="51" r="4" fill={ink} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55, type: 'spring' }} />
      </svg>
    );
  }
  if (kind === 'operating') {
    const stages = [['OBJECTIVE', 10], ['PLAN', 34], ['EXECUTE', 58], ['EVIDENCE', 82]];
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <motion.line x1="14" y1="50" x2="86" y2="50" stroke={ink} strokeWidth="0.7" strokeOpacity="0.45"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
        {stages.map(([label, x], i) => (
          <motion.g key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + i * 0.12 }}>
            <circle cx={x + 4} cy="50" r={i === 3 ? 5 : 3.2} fill={i === 3 ? ink : '#fff'} stroke={ink} strokeWidth="0.8" />
            <text x={x + 4} y="63" textAnchor="middle" fontSize="3.2" fontFamily="monospace" fill={ink}>{label}</text>
          </motion.g>
        ))}
      </svg>
    );
  }
  if (kind === 'graph' || kind === 'memory') {
    // node constellation
    const nodes = kind === 'graph'
      ? [[30, 30], [70, 22], [55, 55], [25, 72], [78, 68], [50, 85]]
      : [[50, 50], [25, 30], [75, 30], [25, 70], [75, 70], [50, 15]];
    const edges = [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [0, 1]];
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
            stroke={ink} strokeWidth="0.4" strokeOpacity="0.35"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
          />
        ))}
        {nodes.map(([x, y], i) => (
          <motion.circle
            key={i} cx={x} cy={y} r={i === (kind === 'graph' ? 2 : 0) ? 3.4 : 2.2}
            fill={i === (kind === 'graph' ? 2 : 0) ? ink : '#ffffff'}
            stroke={ink} strokeWidth="0.7"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 300, damping: 18 }}
          />
        ))}
      </svg>
    );
  }
  if (kind === 'connectors') {
    // hub + spokes
    const spokes = [0, 60, 120, 180, 240, 300];
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {spokes.map((deg, i) => {
          const x = 50 + 34 * Math.cos((deg * Math.PI) / 180);
          const y = 50 + 34 * Math.sin((deg * Math.PI) / 180);
          return (
            <g key={deg}>
              <motion.line x1="50" y1="50" x2={x} y2={y} stroke={ink} strokeWidth="0.4" strokeOpacity="0.35"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.07 }} />
              <motion.rect x={x - 4.5} y={y - 4.5} width="9" height="9" rx="1.6"
                fill="#ffffff" stroke={ink} strokeWidth="0.7"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 280, damping: 16 }} />
            </g>
          );
        })}
        <motion.circle cx="50" cy="50" r="7" fill={ink}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} />
      </svg>
    );
  }
  if (kind === 'voice') {
    // waveform
    const bars = [14, 30, 52, 74, 60, 38, 68, 84, 56, 34, 62, 44, 22, 48, 70, 40, 26, 54, 36, 18];
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {bars.map((h, i) => (
          <motion.rect key={i} x={6 + i * 4.5} width="2.2" rx="1.1" fill={ink} fillOpacity={0.75}
            initial={{ height: 2, y: 49 }}
            animate={{ height: h * 0.5, y: 50 - (h * 0.5) / 2 }}
            transition={{ delay: 0.15 + i * 0.035, type: 'spring', stiffness: 220, damping: 16 }} />
        ))}
      </svg>
    );
  }
  // agents — chat bubbles
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {[[14, 22, 46], [40, 40, 42], [22, 58, 52]].map(([x, y, w], i) => (
        <motion.g key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.16 }}>
          <rect x={x} y={y} width={w} height="12" rx="3.5" fill={i === 1 ? ink : '#ffffff'} stroke={ink} strokeWidth="0.7" />
          <line x1={x + 5} y1={y + 4.5} x2={x + w - 8} y2={y + 4.5} stroke={i === 1 ? '#ffffff' : ink} strokeWidth="0.8" strokeOpacity="0.6" />
          <line x1={x + 5} y1={y + 7.8} x2={x + w - 16} y2={y + 7.8} stroke={i === 1 ? '#ffffff' : ink} strokeWidth="0.8" strokeOpacity="0.35" />
        </motion.g>
      ))}
    </svg>
  );
}

export function WelcomeSlides({ onDone }) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;
  const isLast = index === total - 1;
  const s = SLIDES[index];
  const Icon = s.icon;

  const next = useCallback(() => {
    if (isLast) onDone?.();
    else setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onDone, total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onDone?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onDone]);

  return (
    <BlueprintCanvas>
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:px-10 md:pt-6">
        <div className="flex items-center gap-2.5">
          <SingulanceMark size={28} />
          <span className="text-[11px] font-bold font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight sm:text-[13px]">SINGULANCE <span className="mx-1 text-[#a3a3a3]">|</span> HIVEMIND</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-[#a3a3a3] tabular-nums">[{index + 1}/{total}]</span>
          <button onClick={onDone} aria-label="Skip walkthrough"
            className="w-8 h-8 flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* slide body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:flex md:items-center md:justify-center md:overflow-visible md:px-10 md:py-4">
        <div className="mx-auto grid w-full max-w-[980px] items-center gap-5 md:grid-cols-2 md:gap-14">
          <AnimatePresence mode="wait">
            <motion.div key={`copy-${index}`}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#117dff] sm:text-[11px] sm:tracking-[0.22em] md:mb-4">
                <span className="text-[#a3a3a3]">〉</span> {s.eyebrow}
                <span className="text-[#d4d0ca]">· 0{index + 1}</span>
              </div>
              <h1 className="text-[29px] leading-[1.02] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight sm:text-[34px] md:text-[44px] md:leading-[1.05]">
                {s.title}
              </h1>
              <p className="mt-3 max-w-[46ch] text-[13px] leading-[1.55] text-[#525252] sm:mt-4 sm:text-[14px] md:text-[15px]">{s.body}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:mt-6 sm:flex sm:items-center sm:gap-6">
                {s.stats.map(([v, l]) => (
                  <div key={l}>
                    <div className="text-[14px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a] tabular-nums leading-none sm:text-[20px]">{v}</div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#a3a3a3] sm:text-[10px]">{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* visual — terminal-window framed line art */}
          <AnimatePresence mode="wait">
            <motion.div key={`vis-${index}`}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="block">
              <div className="bg-white border border-[#e3e0db] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <span className="ml-2 text-[10px] font-mono text-[#a3a3a3] flex items-center gap-1.5">
                    <Icon size={11} className="text-[#117dff]" /> hivemind · {s.eyebrow.toLowerCase()}
                  </span>
                </div>
                <div className="h-[168px] p-3 sm:h-auto sm:aspect-[4/3] sm:p-6">
                  <SlideVisual kind={s.visual} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* bottom nav */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[#e3e0db]/70 bg-[#faf9f4]/95 px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 md:border-0 md:bg-transparent md:px-10 md:pb-7 md:pt-0">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((sl, j) => (
            <button key={sl.eyebrow} onClick={() => setIndex(j)} aria-label={`Slide ${j + 1}`}
              className="h-1 rounded-full transition-all duration-300"
              style={{ width: j === index ? 26 : 8, background: j === index ? '#117dff' : '#d4d0ca' }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button onClick={prev}
              className="h-10 px-3 sm:px-4 rounded-[6px] border border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca] hover:text-[#0a0a0a] text-[11px] sm:text-[12px] font-medium transition-all flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <button onClick={next}
            className="h-10 px-4 sm:px-5 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] text-white text-[10px] sm:text-[12px] font-semibold font-['Space_Grotesk'] uppercase tracking-[0.06em] sm:tracking-[0.08em] transition-all flex items-center gap-2 whitespace-nowrap">
            {isLast ? 'Enter your HIVEMIND' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </BlueprintCanvas>
  );
}

/* ─── Activation gate (every sign-in, ~5s) ─────────────────────────────── */

const ACTIVATION_STEPS = [
  { icon: Shield, label: 'Verifying identity', detail: 'session · EU-sovereign' },
  { icon: Brain, label: 'Mounting memory cortex', detail: 'vector + graph index' },
  { icon: Network, label: 'Linking knowledge graph', detail: 'entities · relationships' },
  { icon: Plug, label: 'Waking connectors', detail: 'sync channels' },
  { icon: MessageSquare, label: 'Priming recall', detail: 'chat · agents · voice' },
];

export function ActivationGate({ onDone, durationMs = 5000 }) {
  const stepMs = useMemo(() => durationMs / ACTIVATION_STEPS.length, [durationMs]);
  const [done, setDone] = useState(0); // how many steps completed

  useEffect(() => {
    const timers = ACTIVATION_STEPS.map((_, i) =>
      setTimeout(() => setDone(i + 1), Math.round(stepMs * (i + 1)))
    );
    const finish = setTimeout(() => onDone?.(), durationMs + 350);
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
  }, [stepMs, durationMs, onDone]);

  return (
    <BlueprintCanvas>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-[max(1.25rem,env(safe-area-inset-top))] sm:flex sm:items-center sm:justify-center sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-[#117dff] mb-3">
            <span className="text-[#a3a3a3]">〉</span> ACTIVATING
          </div>
          <h1 className="text-[23px] sm:text-[26px] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight">
            Setting up your HIVEMIND
          </h1>

          {/* checklist card */}
          <div className="mt-6 bg-white border border-[#e3e0db] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-2 text-[10px] font-mono text-[#a3a3a3]">boot · memory-engine</span>
            </div>
            <ul className="divide-y divide-[#eae7e1]">
              {ACTIVATION_STEPS.map((st, i) => {
                const isDone = done > i;
                const isActive = done === i;
                const StIcon = st.icon;
                return (
                  <li key={st.label} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                    <StIcon size={15} className={isDone ? 'text-[#117dff]' : 'text-[#d4d0ca]'} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-[13px] font-medium transition-colors ${isDone ? 'text-[#0a0a0a]' : isActive ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                        {st.label}
                      </span>
                      <span className="block text-[9px] font-mono text-[#c8c4be] sm:ml-2 sm:inline sm:text-[10px]">{st.detail}</span>
                    </div>
                    {isDone ? (
                      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-semibold uppercase tracking-wider">
                        <Check size={9} /> Active
                      </motion.span>
                    ) : isActive ? (
                      <span className="w-3.5 h-3.5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-[9px] font-mono text-[#d4d0ca] uppercase">queued</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* progress line */}
          <div className="mt-4 h-1 rounded-full bg-[#eae7e1] overflow-hidden">
            <motion.div className="h-full bg-[#117dff]"
              initial={{ width: '0%' }} animate={{ width: '100%' }}
              transition={{ duration: durationMs / 1000, ease: 'linear' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#a3a3a3]">
            <span className="flex items-center gap-1"><Zap size={10} className="text-[#117dff]" /> sub-50ms recall ready</span>
            <span className="tabular-nums">{done}/{ACTIVATION_STEPS.length} active</span>
          </div>
        </div>
      </div>
    </BlueprintCanvas>
  );
}
