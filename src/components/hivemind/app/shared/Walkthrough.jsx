import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Filter,
  Hexagon,
  Key,
  LifeBuoy,
  Maximize2,
  MessageSquare,
  Network,
  Plug,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

/**
 * Walkthrough — aesthetic, theme-matched popup card carousel for HIVEMIND.
 *
 * Shows on first use (onboarding) or for a new-feature announcement. Each step
 * renders as a soft rounded card with a large gradient "visual" panel, a big
 * bottom-left label, and a signature circular arrow CTA (bottom-right) that
 * advances the flow — inspired by modern product cards, tuned to the
 * warm-cream / blue HIVEMIND console aesthetic.
 *
 * Usage:
 *   const wt = useWalkthrough('onboarding', { version: 1 });
 *   {wt.open && (
 *     <Walkthrough
 *       steps={DEFAULT_STEPS}
 *       onClose={wt.dismiss}
 *       onComplete={wt.complete}
 *     />
 *   )}
 *
 * For a feature announcement, use a distinct key + bumped version:
 *   const wt = useWalkthrough('feature:deep-research', { version: 2 });
 */

/**
 * Gating hook. Persists "seen" state in localStorage so the walkthrough shows
 * once per (key, version). Bump `version` to re-announce a new feature.
 *
 * @param {string} key - unique storage key (e.g. 'onboarding' or 'feature:x')
 * @param {{ version?: number }} [opts]
 * @returns {{ open: boolean, dismiss: () => void, complete: () => void, reopen: () => void }}
 */
export function useWalkthrough(key, opts = {}) {
  const version = opts.version ?? 1;
  const storageKey = `hm.walkthrough.${key}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(storageKey);
      setOpen(seen !== String(version));
    } catch {
      // localStorage unavailable (private mode / SSR snapshot) — show once.
      setOpen(true);
    }
  }, [storageKey, version]);

  const mark = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, String(version));
    } catch {
      // best effort — non-fatal if storage is blocked
    }
    setOpen(false);
  }, [storageKey, version]);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, dismiss: mark, complete: mark, reopen };
}

/** Default HIVEMIND onboarding steps. Each `accent` pair drives the panel gradient. */
export const DEFAULT_STEPS = [
  {
    icon: Hexagon,
    label: 'Welcome',
    title: 'Welcome to HIVEMIND',
    description:
      'Your sovereign memory cortex. Capture knowledge, connect tools, and let your AI agents remember everything across sessions.',
    accent: ['#117dff', '#7db4ff'],
  },
  {
    icon: Brain,
    label: 'Memories',
    title: 'A brain that never forgets',
    description:
      'Every fact, decision, and document becomes a durable memory with semantic recall — searchable by meaning, not keywords.',
    accent: ['#6d4bff', '#b39bff'],
  },
  {
    icon: Network,
    label: 'Graph',
    title: 'See how it all connects',
    description:
      'Explore your knowledge as a living graph. Entities and relationships link automatically into one shared cortex.',
    accent: ['#0ea5a4', '#67e8d8'],
  },
  {
    icon: Plug,
    label: 'Connectors',
    title: 'Plug in your world',
    description:
      'Sync Slack, Gmail, Drive, and more. HIVEMIND ingests securely with GDPR-compliant, sovereign data residency.',
    accent: ['#d97706', '#f9c97c'],
  },
  {
    icon: MessageSquare,
    label: 'Talk to Hive',
    title: 'Just ask',
    description:
      'Chat with your memory. Ask questions, recall context, and let agents act on what they know — in any language.',
    accent: ['#117dff', '#7db4ff'],
  },
];

/** Connectors page tour. */
export const CONNECTORS_STEPS = [
  {
    icon: Plug,
    label: 'Connectors',
    title: 'Plug in your stack',
    description:
      'Each card is a tool HIVEMIND can sync — Slack, Gmail, Drive, Notion and more. Connected cards stream data into your memory cortex automatically.',
    accent: ['#117dff', '#7db4ff'],
  },
  {
    icon: Zap,
    label: 'Connect',
    title: 'One-click OAuth',
    description:
      'Hit Connect and a secure popup handles sign-in. No tokens to paste — HIVEMIND stores credentials encrypted and refreshes them for you.',
    accent: ['#d97706', '#f9c97c'],
  },
  {
    icon: Shield,
    label: 'Scope',
    title: 'You control reach',
    description:
      'Choose org-wide or a specific team before connecting. Data lands only in the scope you pick — sovereign, GDPR-compliant residency.',
    accent: ['#6d4bff', '#b39bff'],
  },
  {
    icon: RefreshCw,
    label: 'Sync',
    title: 'Live + on-demand',
    description:
      'Connected tools sync in the background. Use Resync any time to pull the latest, and watch ingest status in the endpoints table below.',
    accent: ['#0ea5a4', '#67e8d8'],
  },
];

/** Memory Graph 3D page tour. */
export const GRAPH_STEPS = [
  {
    icon: Network,
    label: 'Atlas',
    title: 'Your memory, in 3D',
    description:
      'Every node is a memory or entity; every line is a real relationship HIVEMIND inferred. Drag to orbit, scroll to zoom, click a node to inspect it.',
    accent: ['#0ea5a4', '#67e8d8'],
  },
  {
    icon: Brain,
    label: 'Nodes',
    title: 'Click to dive in',
    description:
      'Select any node to see its content, connected memories, and the entities it mentions. Follow edges to trace how knowledge links together.',
    accent: ['#6d4bff', '#b39bff'],
  },
  {
    icon: Filter,
    label: 'Scope',
    title: 'Focus the view',
    description:
      'Filter by project to render just that workspace’s graph, or view your whole org cortex at once. The scope chip shows what you are looking at.',
    accent: ['#117dff', '#7db4ff'],
  },
  {
    icon: Maximize2,
    label: 'Explore',
    title: 'Full-screen cinema',
    description:
      'The graph runs full-screen for deep exploration. Let it settle as the physics simulation untangles clusters into a readable map.',
    accent: ['#d97706', '#f9c97c'],
  },
];

/** Workspace Admin page tour. */
export const WORKSPACE_ADMIN_STEPS = [
  {
    icon: Users,
    label: 'Members',
    title: 'Your workspace, governed',
    description:
      'See everyone in your org and the projects they belong to. Membership decides who can recall which memories — access is scoped, not shared blindly.',
    accent: ['#117dff', '#7db4ff'],
  },
  {
    icon: Shield,
    label: 'Roles',
    title: 'Roles & access',
    description:
      'Owners and admins manage connectors, projects, and people. Members get scoped recall. Every sensitive action is logged to the audit trail.',
    accent: ['#6d4bff', '#b39bff'],
  },
  {
    icon: Key,
    label: 'Keys',
    title: 'API keys & SSO',
    description:
      'Mint API keys for the MCP server and agents, and wire up SSO so your team signs in with one identity. Revoke any key instantly.',
    accent: ['#d97706', '#f9c97c'],
  },
  {
    icon: Settings,
    label: 'Control',
    title: 'One control plane',
    description:
      'Projects, teams, invitations, and data residency — all governed here. Changes apply across the whole cortex in real time.',
    accent: ['#0ea5a4', '#67e8d8'],
  },
];

/** Hyper Agents page tour. */
export const HYPER_AGENTS_STEPS = [
  {
    icon: Sparkles,
    label: 'Swarm',
    title: 'A swarm that thinks',
    description:
      'Hyper Agents are your digital employees working as a team. Spin up a room and they collaborate on it together, sharing your memory cortex.',
    accent: ['#6d4bff', '#b39bff'],
  },
  {
    icon: MessageSquare,
    label: 'Rooms',
    title: 'WhatsApp-style threads',
    description:
      'Each room is a thread where agents talk to each other. Drop in a goal and watch them split work, hand off, and report back.',
    accent: ['#117dff', '#7db4ff'],
  },
  {
    icon: Users,
    label: 'Roles',
    title: 'Roles that debate',
    description:
      'Agents hold distinct roles. When their views clash they debate across rounds — surfacing sharper answers than any single agent.',
    accent: ['#d97706', '#f9c97c'],
  },
  {
    icon: Brain,
    label: 'Evolve',
    title: 'They self-evolve',
    description:
      'Every conversation is remembered. Agents learn your context over time and get better at acting on what they know.',
    accent: ['#0ea5a4', '#67e8d8'],
  },
];

/**
 * @param {{
 *   steps?: Array<{icon: any, label: string, title: string, description: string, accent: [string,string]}>,
 *   onClose?: () => void,
 *   onComplete?: () => void,
 *   brand?: string,
 * }} props
 */
export default function Walkthrough({
  steps = DEFAULT_STEPS,
  onClose,
  onComplete,
  brand = 'HIVEMIND',
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const total = steps.length;
  const isLast = index === total - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setDir(1);
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onComplete, total]);

  const goPrev = useCallback(() => {
    setDir(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const close = useCallback(() => onClose?.(), [onClose]);

  // Keyboard nav: arrows advance, Escape dismisses.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, close]);

  // Cards visible in the deck: front (depth 0) + up to 2 peeking behind.
  const VISIBLE = 3;
  const deck = [];
  for (let d = 0; d < VISIBLE; d++) {
    const i = index + d;
    if (i < total) deck.push({ i, d, s: steps[i] });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="absolute inset-0 bg-[#1a1814]/40 backdrop-blur-md"
      />

      {/* Stacked deck — horizontal cards; front slides down on Next, revealing behind */}
      <div className="relative z-10 w-full max-w-[640px]" style={{ height: 360 }}>
        <AnimatePresence initial={false} custom={dir}>
          {deck.map(({ i, d, s }) => {
            const StepIcon = s.icon || Sparkles;
            const front = d === 0;
            return (
              <motion.div
                key={i}
                custom={dir}
                initial={{ y: 28 + d * 14, scale: 0.94, opacity: 0 }}
                animate={{
                  y: -d * 18,                       // peek upward behind the front
                  scale: 1 - d * 0.05,
                  opacity: d === 0 ? 1 : 0.55 - (d - 1) * 0.18,
                  zIndex: 30 - d,
                }}
                exit={{ y: 200, opacity: 0, rotate: dir > 0 ? 3 : -3, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="absolute inset-x-0 top-0"
                style={{ transformOrigin: 'top center', pointerEvents: front ? 'auto' : 'none' }}
              >
                {(() => {
                  const ink = s.accent[0];
                  const num = String(i + 1).padStart(2, '0');
                  // Blueprint card — white canvas, dot grid, terminal header,
                  // mono eyebrow + big Space Grotesk copy (supermemory-style).
                  return (
                <div className="relative rounded-[10px] overflow-hidden bg-white border border-[#e3e0db] shadow-[0_24px_70px_-20px_rgba(11,59,134,0.22),0_8px_30px_rgba(0,0,0,0.08)]">
                  {/* dot grid wash */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.5]"
                    style={{ backgroundImage: `radial-gradient(${ink}22 1px, transparent 1px)`, backgroundSize: '18px 18px' }} />
                  {/* ghost watermark glyph */}
                  <StepIcon className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none"
                    size={240} strokeWidth={0.6} style={{ color: ink }} aria-hidden="true" />

                  {/* terminal header */}
                  <div className="relative flex items-center gap-1.5 px-4 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-2 text-[10px] font-mono text-[#a3a3a3] lowercase">{brand.toLowerCase()} · {s.label.toLowerCase()}</span>
                    <span className="ml-auto text-[10px] font-mono text-[#a3a3a3] tabular-nums">[{i + 1}/{total}]</span>
                    {front && (
                      <button type="button" onClick={close} aria-label="Skip walkthrough"
                        className="ml-2 w-6 h-6 rounded-[4px] flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-black/5 transition-colors">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* content */}
                  <div className="relative flex items-stretch gap-5 px-7 pt-6 pb-5 min-h-[168px]">
                    {/* number + icon column */}
                    <div className="shrink-0 w-[120px] flex flex-col justify-center">
                      <span className="text-[44px] leading-[0.85] font-medium font-['Space_Grotesk'] tabular-nums" style={{ color: ink }}>{num}</span>
                      <div className="mt-3 w-9 h-9 rounded-[8px] flex items-center justify-center" style={{ background: `${ink}12`, border: `1px solid ${ink}30` }}>
                        <StepIcon size={17} style={{ color: ink }} />
                      </div>
                      <div className="mt-2.5 text-[9px] font-mono uppercase tracking-[0.24em] text-[#a3a3a3]">Step {i + 1} of {total}</div>
                    </div>

                    {/* copy */}
                    <div className="flex-1 min-w-0 border-l border-[#eae7e1] pl-5 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] mb-1.5" style={{ color: ink }}>
                        <span className="text-[#c8c4be]">〉</span> {s.label}
                      </div>
                      <h2 className="text-[20px] leading-tight font-medium font-['Space_Grotesk'] text-[#0a0a0a] mb-1.5 tracking-tight">{s.title}</h2>
                      <p className="text-[13px] leading-relaxed text-[#525252]">{s.description}</p>
                    </div>
                  </div>

                  {/* Footer: dots + nav (front only) */}
                  {front && (
                    <div className="relative flex items-center justify-between px-7 pb-4 pt-0">
                      <div className="flex items-center gap-1.5">
                        {steps.map((st, j) => (
                          <button key={st.label + j} type="button"
                            onClick={() => { setDir(j > index ? 1 : -1); setIndex(j); }}
                            aria-label={`Go to step ${j + 1}`}
                            className="h-1 rounded-full transition-all duration-300"
                            style={{ width: j === index ? 24 : 7, background: j === index ? ink : '#d4d0ca' }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <button type="button" onClick={goPrev} aria-label="Back"
                            className="h-9 w-9 rounded-[6px] flex items-center justify-center transition-colors border border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca] hover:text-[#0a0a0a]">
                            <ArrowLeft size={15} />
                          </button>
                        )}
                        <button type="button" onClick={goNext}
                          className="h-9 px-5 rounded-[6px] text-white text-[12px] font-semibold font-['Space_Grotesk'] uppercase tracking-[0.08em] active:scale-95 transition-all"
                          style={{ background: ink }}>
                          {isLast ? 'Get started' : 'Next'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  );
                })()}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * PageWalkthrough — drop-in per-page walkthrough.
 *
 * Renders the gated popup carousel on first visit to a page AND a slim
 * right-edge "Guide" tab that re-opens it on demand. One line per page:
 *
 *   <PageWalkthrough pageKey="connectors" steps={CONNECTORS_STEPS} />
 *
 * The popup auto-shows once per (pageKey, version) via localStorage. The side
 * button is always available so users can replay the tour any time.
 *
 * @param {{
 *   pageKey: string,
 *   steps: Array<object>,
 *   version?: number,
 *   brand?: string,
 *   buttonLabel?: string,
 * }} props
 */
export function PageWalkthrough({
  pageKey,
  steps = DEFAULT_STEPS,
  version = 1,
  brand = 'HIVEMIND',
  buttonLabel = 'Guide',
}) {
  const wt = useWalkthrough(`page:${pageKey}`, { version });

  return (
    <>
      {/* Right-edge replay tab — vertical pill, out of the way of the chat FAB */}
      <motion.button
        type="button"
        onClick={wt.reopen}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 320, damping: 26 }}
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.96 }}
        aria-label={`Open ${brand} walkthrough`}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 pl-2 pr-2.5 py-3 rounded-l-2xl border border-r-0 border-[#117dff]/30 text-white shadow-[0_8px_24px_-8px_rgba(17,125,255,0.5)]"
        style={{
          background: 'linear-gradient(135deg, rgba(17,125,255,0.96) 0%, rgba(8,98,222,0.96) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <LifeBuoy size={16} strokeWidth={2.2} />
        <span
          className="text-[11px] font-semibold tracking-wide font-['Space_Grotesk']"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {buttonLabel}
        </span>
      </motion.button>

      <AnimatePresence>
        {wt.open && (
          <Walkthrough
            steps={steps}
            brand={brand}
            onClose={wt.dismiss}
            onComplete={wt.complete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
