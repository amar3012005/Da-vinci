import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  BookOpen,
  Brain,
  Building2,
  Cable,
  CreditCard,
  Cpu,
  FlaskConical,
  Globe,
  Hexagon,
  Key,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Network,
  Server,
  User,
  X,
} from 'lucide-react';

/**
 * OverviewTour — first-visit guided tour for the Overview page.
 *
 * Renders a glass-morphism backdrop, a centered explainer card carousel, and
 * an SVG overlay that draws a faint connector from the card to EVERY sidebar
 * nav item. Only the connector for the active step glows (animated draw +
 * arrowhead + spotlight ring on the target). Advancing walks the sidebar from
 * Overview all the way down to Billing, one card per page.
 *
 * Targets are anchored via `data-tour-id="<route path>"` on each sidebar
 * NavLink, measured live with getBoundingClientRect so the arrows track the
 * real layout (and re-measure on resize / scroll-into-view).
 */

const STORAGE_KEY = 'hm.walkthrough.overview-tour';
const STORAGE_VERSION = 1;

/** Tour steps — sidebar order, Overview → Billing. */
const STEPS = [
  { to: '/hivemind/app/overview', icon: LayoutDashboard, title: 'Overview', desc: 'Your memory engine at a glance — health, totals, recent memories and quick actions.' },
  { to: '/hivemind/app/connectors', icon: Cable, title: 'Connectors', desc: 'Plug in Slack, Gmail, Drive and more. Connected tools stream securely into your cortex.' },
  { to: '/hivemind/app/memories', icon: Brain, title: 'Memories', desc: 'Every durable fact, decision and document — searchable by meaning, not keywords.' },
  { to: '/hivemind/app/graph', icon: Network, title: 'Memory Graph', desc: 'See it all connect in 3D. Nodes are memories; lines are relationships HIVEMIND inferred.' },
  { to: '/hivemind/app/knowledge', icon: BookOpen, title: 'Knowledge Base', desc: 'Upload documents. HIVEMIND parses and promotes them into recallable memories.' },
  { to: '/hivemind/app/workspace', icon: Building2, title: 'Workspace Admin', desc: 'Govern members, teams, projects and access — scoped recall with an audit trail.' },
  { to: '/hivemind/app/employees', icon: Bot, title: 'Hyper Agents', desc: 'Digital employees that collaborate in rooms, debate when roles clash, and self-evolve.' },
  { to: '/hivemind/app/web', icon: Globe, title: 'Web Intel', desc: 'Search and crawl the live web — results land straight in your memory.' },
  { to: '/hivemind/app/tara', icon: Mic, title: 'TARA × HIVE', desc: 'Talk to your cortex by voice — ask, recall and let agents act on what they know.' },
  { to: '/hivemind/app/swarm', icon: Bot, title: 'Agent Swarm', desc: 'Orchestrate multi-agent runs across your knowledge for deeper, parallel work.' },
  { to: '/hivemind/app/engine', icon: Cpu, title: 'Engine', desc: 'Tune the memory engine — ingestion, models and relationship thresholds.' },
  { to: '/hivemind/app/mcp', icon: Server, title: 'MCP Server', desc: 'Connect Claude, Cursor and custom clients to your cortex over MCP.' },
  { to: '/hivemind/app/keys', icon: Key, title: 'API Keys', desc: 'Mint and revoke keys for agents and MCP clients — instant control.' },
  { to: '/hivemind/app/evaluation', icon: FlaskConical, title: 'Evaluation', desc: 'Run golden-case evals to gate quality before you ship changes.' },
  { to: '/hivemind/app/profile', icon: User, title: 'Profile', desc: 'Your account, identity and preferences.' },
  { to: '/hivemind/app/billing', icon: CreditCard, title: 'Billing', desc: 'Plans, usage and upgrades — unlock Pro limits and advanced connectors.' },
  { to: 'talk-to-hive', icon: MessageSquare, title: 'Talk to HIVE', desc: 'Chat with your cortex from anywhere — ask questions, recall context, and let agents act on what they know.' },
];

/** Gate: show once per (key, version). */
export function useOverviewTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      setOpen(seen !== String(STORAGE_VERSION));
    } catch {
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(STORAGE_VERSION));
    } catch {
      /* best effort */
    }
    setOpen(false);
  }, []);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, close, reopen };
}

/**
 * Build an orthogonal (90°) connector with rounded corners through a list of
 * right-angle points. Segments are axis-aligned; each bend is rounded with a
 * quadratic arc clamped to the shorter adjacent segment.
 */
function roundedElbow(pts, radius = 14) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const len1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const len2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(radius, len1 / 2, len2 / 2);
    const v1x = Math.sign(p1.x - p0.x);
    const v1y = Math.sign(p1.y - p0.y);
    const v2x = Math.sign(p2.x - p1.x);
    const v2y = Math.sign(p2.y - p1.y);
    const a = { x: p1.x - v1x * rr, y: p1.y - v1y * rr };
    const b = { x: p1.x + v2x * rr, y: p1.y + v2y * rr };
    d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Route a horizontal-vertical-horizontal (90°) elbow from the card anchor to a
 * target tip. A short vertical channel sits just card-side of the target so the
 * arrow always approaches the target horizontally. Works for targets on either
 * side of the card.
 */
function elbowPath(from, to) {
  const dir = Math.sign(from.x - to.x) || 1; // +1 target on left, -1 on right
  const channelX = to.x + 26 * dir;
  return roundedElbow([
    { x: from.x, y: from.y },
    { x: channelX, y: from.y },
    { x: channelX, y: to.y },
    { x: to.x, y: to.y },
  ]);
}

/**
 * Compute the connector endpoints between the card and a target rect. Picks the
 * card edge (left/right) facing the target and the target edge facing the card.
 */
function geomFor(cardRect, rect) {
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;
  const itemCenterX = rect.left + rect.width / 2;
  const itemCenterY = rect.top + rect.height / 2;
  const onLeft = itemCenterX < cardCenterX;
  const from = onLeft
    ? { x: cardRect.left + 8, y: cardCenterY }
    : { x: cardRect.left + cardRect.width - 8, y: cardCenterY };
  const to = onLeft
    ? { x: rect.right + 6, y: itemCenterY }
    : { x: rect.left - 6, y: itemCenterY };
  return { from, to };
}

export default function OverviewTour({ onClose }) {
  const [index, setIndex] = useState(0);
  const [cardRect, setCardRect] = useState(null);
  const [targets, setTargets] = useState([]); // [{ to, x, y, rect }]
  const cardRef = useRef(null);
  const cleanupRef = useRef(null);

  const total = STEPS.length;
  const step = STEPS[index];
  const isLast = index === total - 1;
  const Icon = step.icon || Hexagon;

  // Measure card anchor + every sidebar target rect.
  const measure = useCallback(() => {
    const card = cardRef.current?.getBoundingClientRect?.();
    if (card) {
      setCardRect({ left: card.left, top: card.top, width: card.width, height: card.height });
    }
    const next = [];
    for (const s of STEPS) {
      const el = document.querySelector(`[data-tour-id="${s.to}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // Anchor the arrow tip just right of the nav item.
      next.push({
        to: s.to,
        x: r.right + 6,
        y: r.top + r.height / 2,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      });
    }
    setTargets(next);
  }, []);

  // Re-measure on mount, resize, and whenever the step changes (after the
  // active item is scrolled into view).
  useLayoutEffect(() => {
    const el = document.querySelector(`[data-tour-id="${step.to}"]`);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    // Let smooth-scroll settle before measuring.
    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(measure);
      cleanupRef.current = raf2;
    });
    const t = window.setTimeout(measure, 320);
    return () => {
      window.cancelAnimationFrame(raf1);
      if (cleanupRef.current) window.cancelAnimationFrame(cleanupRef.current);
      window.clearTimeout(t);
    };
  }, [index, measure, step.to]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const goNext = useCallback(() => {
    if (isLast) {
      onClose?.();
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onClose, total]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  const activeTarget = targets.find((t) => t.to === step.to) || null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Spotlight hole around the active target so it stays crisp (un-blurred)
  // while everything else is glass. Four panels carry the blur + tint around
  // the clear rectangle.
  const PAD = 6;
  const hole = activeTarget
    ? {
        x: Math.max(0, activeTarget.rect.left - PAD),
        y: Math.max(0, activeTarget.rect.top - PAD),
        w: activeTarget.rect.width + PAD * 2,
        h: activeTarget.rect.height + PAD * 2,
      }
    : null;

  const GLASS = {
    background: 'rgba(26,24,20,0.30)',
    backdropFilter: 'blur(7px) saturate(120%)',
    WebkitBackdropFilter: 'blur(7px) saturate(120%)',
  };

  const panels = hole
    ? [
        { key: 't', left: 0, top: 0, width: vw, height: hole.y },
        { key: 'b', left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - (hole.y + hole.h)) },
        { key: 'l', left: 0, top: hole.y, width: hole.x, height: hole.h },
        { key: 'r', left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - (hole.x + hole.w)), height: hole.h },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[130]">
      {/* Glass-morphism backdrop with a crisp spotlight cutout */}
      {hole ? (
        panels.map((p) => (
          <motion.div
            key={p.key}
            className="absolute"
            initial={false}
            animate={{ left: p.left, top: p.top, width: p.width, height: p.height }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            style={GLASS}
          />
        ))
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={GLASS}
        />
      )}

      {/* SVG connector overlay */}
      {cardRect && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <marker
              id="ovt-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" />
            </marker>
            <filter id="ovt-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Faint connectors to every target */}
          {targets.map((t) => {
            const { from, to } = geomFor(cardRect, t.rect);
            return (
              <path
                key={t.to}
                d={elbowPath(from, to)}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}

          {/* Active connector — white, glowing, animated draw + arrowhead */}
          {activeTarget && (() => {
            const { from, to } = geomFor(cardRect, activeTarget.rect);
            return (
              <motion.path
                key={`active-${step.to}`}
                d={elbowPath(from, to)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#ovt-arrow)"
                filter="url(#ovt-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })()}

          {/* Spotlight ring around the active target (white glow) */}
          {activeTarget && (
            <motion.rect
              key={`ring-${step.to}`}
              x={activeTarget.rect.left - PAD}
              y={activeTarget.rect.top - PAD}
              width={activeTarget.rect.width + PAD * 2}
              height={activeTarget.rect.height + PAD * 2}
              rx="10"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              filter="url(#ovt-glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </svg>
      )}

      {/* Centered explainer card */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative pointer-events-auto w-full max-w-[400px]"
        >
          <div
            className="rounded-[24px] border border-white/40 p-5"
            style={{
              background: 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(18px) saturate(160%)',
              WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              boxShadow:
                '0 24px 70px -20px rgba(17,125,255,0.35), 0 8px 30px rgba(0,0,0,0.14)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
                  <Hexagon size={16} className="text-[#117dff]" />
                </div>
                <span className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk'] tracking-tight">
                  HIVEMIND tour
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Skip tour"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#525252] hover:bg-black/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.26 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        'radial-gradient(120% 120% at 30% 20%, #7db4ff 0%, #117dff 60%, #0b3b86 120%)',
                      boxShadow: '0 6px 18px rgba(17,125,255,0.35)',
                    }}
                  >
                    <Icon size={22} className="text-white" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#a3a3a3]">
                      {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                    </div>
                    <h2 className="text-[#0a0a0a] text-[20px] leading-tight font-bold font-['Space_Grotesk']">
                      {step.title}
                    </h2>
                  </div>
                </div>
                <p className="text-[#525252] text-sm leading-relaxed min-h-[60px]">
                  {step.desc}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5">
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <button
                    key={s.to}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to ${s.title}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index ? 'w-5 bg-[#117dff]' : 'w-1.5 bg-[#d4d0ca] hover:bg-[#a3a3a3]'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="h-9 px-3 rounded-full border border-[#e3e0db] text-[#525252] text-sm hover:bg-black/5 transition-colors font-['Space_Grotesk']"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="h-9 pl-4 pr-3 rounded-full bg-[#117dff] text-white text-sm font-medium font-['Space_Grotesk'] hover:bg-[#0066e0] active:scale-95 transition-all shadow-[0_4px_16px_rgba(17,125,255,0.3)] flex items-center gap-1.5"
                >
                  {isLast ? 'Done' : 'Next'}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
