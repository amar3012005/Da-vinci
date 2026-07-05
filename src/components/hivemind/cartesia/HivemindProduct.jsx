import React, { useEffect, useRef, useState } from 'react';
import {
  motion, useInView, useScroll, useTransform, useSpring,
  useMotionValue, animate,
} from 'framer-motion';
import {
  ArrowRight, Mail, MessageSquare, FileText, Github, Database, Calendar,
  HardDrive, Briefcase, Layers, Globe, ShieldCheck, Check, Search, Zap,
} from 'lucide-react';
import Lenis from 'lenis';
import Navbar from './Navbar';
import Features from './Features';
import Developers from './Developers';
import Pricing from './Pricing';
import DownloadMacButton from './DownloadMacButton';
import ChatDemoCard from './ChatDemoCard';
import MinimalGraphIcon from './MinimalGraphIcon';

/**
 * HIVEMIND product cover — singulancelabs.com/hivemind
 * Supermemory-grade, scroll-driven: parallax halftone fields, word-by-word
 * headline reveal, numbered chapters (MEMORY ENGINE · 01), scroll-scrubbed
 * demo cards, velocity type bands, animated counters, page progress bar.
 */

const BLUE = '#117dff';
const INK = '#0a0a0a';
const PAPER = '#FBFBF8';
const ease = [0.16, 1, 0.3, 1];

/* ───────── scroll progress bar ───────── */
const ProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  return (
    <motion.div className="fixed inset-x-0 top-0 z-[120] h-[2px] origin-left" style={{ scaleX, background: BLUE }} />
  );
};

/* ───────── word-by-word headline reveal ───────── */
const WordReveal = ({ text, className, delay = 0 }) => (
  <span className={className}>
    {text.split(' ').map((w, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
        <motion.span
          className="inline-block"
          initial={{ y: '110%' }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: delay + i * 0.09, ease }}
        >
          {w}&nbsp;
        </motion.span>
      </span>
    ))}
  </span>
);

/* ───────── animated counter ───────── */
const Counter = ({ to, prefix = '', suffix = '', className }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(mv, to, { duration: 1.6, ease: 'easeOut' });
    const unsub = mv.on('change', (v) => setVal(Math.round(v)));
    return () => { controls.stop(); unsub(); };
  }, [inView, mv, to]);
  return <span ref={ref} className={className}>{prefix}{val}{suffix}</span>;
};

/* ───────── shared atoms ───────── */

const Eyebrow = ({ children, n }) => (
  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em]">
    <span className="text-[#c9c4b8]">⟩&nbsp;&nbsp;</span>
    <span style={{ color: BLUE }}>{children}</span>
    {n && <span className="text-[#c9c4b8]">&nbsp;&nbsp;·&nbsp;&nbsp;{n}</span>}
  </p>
);

const Body = ({ children }) => (
  <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#6b6b6b]">{children}</p>
);

const Stat = ({ v, k }) => (
  <div>
    <p className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-[#0a0a0a]">{v}</p>
    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#a39e92]">{k}</p>
  </div>
);

const reveal = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const Reveal = ({ children, className = '', delay = 0 }) => (
  <motion.div variants={reveal} initial="hidden" whileInView="show"
    viewport={{ once: true, margin: '-70px' }}
    transition={{ duration: 0.85, ease, delay }} className={className}>
    {children}
  </motion.div>
);

/* browser-chrome card + hover tilt */
const Chrome = ({ title, children, className = '' }) => {
  const ref = useRef(null);
  const rx = useSpring(0, { stiffness: 160, damping: 18 });
  const ry = useSpring(0, { stiffness: 160, damping: 18 });
  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 7);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 7);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div
      ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      className={`overflow-hidden rounded-xl border border-[#e7e4dd] bg-white shadow-[0_40px_90px_-40px_rgba(20,20,20,0.3)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[#efece5] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[10px] tracking-[0.14em] text-[#b5b0a4]">{title}</span>
      </div>
      {children}
    </motion.div>
  );
};

const dotField = {
  backgroundImage: 'radial-gradient(rgba(17,125,255,0.13) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

/* hero card — interactive recall terminal (typing demo, tabs, live results) */
const GraphCard = () => (
  <Chrome title="hivemind — recall · live" className="w-full">
    <ChatDemoCard />
  </Chrome>
);

/* ───────── hero ───────── */

const Hero = () => {
  const secRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: secRef, offset: ['start start', 'end start'] });
  const dotsY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const cardScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.96]);
  const headY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section ref={secRef} className="relative overflow-hidden" style={{ background: PAPER }}>
      <motion.div className="pointer-events-none absolute inset-[-140px]" style={{ ...dotField, y: dotsY }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 65% at 50% 42%, rgba(251,251,248,0) 40%, #FBFBF8 92%)' }} />

      <div className="relative mx-auto max-w-[1200px] px-6 pb-28 pt-40 text-center md:pt-48">
        <motion.div style={{ y: headY }}>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e4dd] bg-white px-4 py-1.5 font-mono text-[11px] tracking-[0.18em] text-[#6b6b6b]">
              <motion.span className="h-1.5 w-1.5 rounded-full" style={{ background: BLUE }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              SOVEREIGN MEMORY ENGINE · EU
            </span>
          </Reveal>

          <h1 className="mx-auto mt-8 max-w-4xl font-['Space_Grotesk'] text-6xl font-semibold leading-[0.98] tracking-tight text-[#0a0a0a] md:text-8xl">
            <WordReveal text="A brain that" delay={0.1} />
            <br />
            <WordReveal text="never forgets" delay={0.34} />
          </h1>

          <Reveal delay={0.46}>
            <p className="mx-auto mt-4 max-w-lg font-mono text-[12px] uppercase tracking-[0.22em]" style={{ color: BLUE }}>
              A Cognitive Sovereign Memory Engine
            </p>
          </Reveal>

          <Reveal delay={0.5}>
            <p className="mx-auto mt-5 max-w-xl text-[17px] font-light leading-relaxed text-[#6b6b6b]">
              HIVEMIND turns email, chat, docs, meetings and code into one persistent,
              self-organizing memory — then lets AI recall and act on it. Inside your walls.
            </p>
          </Reveal>

          <Reveal delay={0.6}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <motion.a href="/hivemind/app" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[13px] font-semibold text-white no-underline"
                style={{ background: INK }}>
                Start remembering
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </motion.a>
              <DownloadMacButton />
              <a href="#chapter-1" className="inline-flex items-center gap-3 text-[13px] font-semibold text-[#0a0a0a] no-underline">
                <span className="font-mono text-[#b5b0a4]">[</span> Explore the engine <span className="font-mono text-[#b5b0a4]">]</span>
              </a>
            </div>
          </Reveal>
        </motion.div>

        <motion.div style={{ y: cardY, scale: cardScale }} className="mx-auto mt-20 max-w-3xl">
          <Reveal delay={0.3}><GraphCard /></Reveal>
        </motion.div>

        <Reveal delay={0.35}>
          <div className="mx-auto mt-14 flex max-w-md items-center justify-center gap-12">
            <div>
              <p className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-[#0a0a0a]">
                &lt;<Counter to={50} suffix="ms" />
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#a39e92]">recall</p>
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-[#0a0a0a]">
                <Counter to={100} suffix="%" />
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#a39e92]">yours</p>
            </div>
            <Stat v="∞" k="retention" />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────── connector marquee ───────── */

/* Same brand-logo CDN map as the live app's Connectors.jsx (connectors-catalog.js
   BRAND_LOGOS) — real app logos, not generic lucide glyphs. */
const CONNECTORS = [
  { logo: 'https://cdn.simpleicons.org/gmail', fallback: Mail, name: 'Gmail' },
  { logo: 'https://api.iconify.design/logos/slack-icon.svg', fallback: MessageSquare, name: 'Slack' },
  { logo: 'https://cdn.simpleicons.org/notion/000000', fallback: FileText, name: 'Notion' },
  { logo: 'https://cdn.simpleicons.org/github/181717', fallback: Github, name: 'GitHub' },
  { logo: 'https://cdn.simpleicons.org/googledrive', fallback: HardDrive, name: 'Drive' },
  { logo: 'https://cdn.simpleicons.org/googlecalendar', fallback: Calendar, name: 'Calendar' },
  { logo: 'https://api.iconify.design/logos/salesforce.svg', fallback: Briefcase, name: 'Salesforce' },
  { logo: 'https://cdn.simpleicons.org/hubspot/ff7a59', fallback: Database, name: 'HubSpot' },
  { logo: 'https://cdn.simpleicons.org/linear', fallback: Layers, name: 'Linear' },
  { logo: 'https://cdn.simpleicons.org/jira', fallback: FileText, name: 'Jira' },
];

/* connector chip icon — real brand logo <img>, lucide fallback on load error */
const ConnectorIcon = ({ c, size = 15 }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !c.logo) { const Fallback = c.fallback; return <Fallback size={size} style={{ color: BLUE }} />; }
  return <img src={c.logo} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} />;
};

const MarqueeRow = () => (
  <section className="border-y border-[#e7e4dd] bg-white py-6">
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-white to-transparent" />
      <motion.div className="flex w-max items-center gap-12 px-6"
        animate={{ x: ['0%', '-50%'] }} transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}>
        {[...CONNECTORS, ...CONNECTORS].map((c, i) => (
          <span key={i} className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[#8d887c]">
            <ConnectorIcon c={c} size={15} /> {c.name}
          </span>
        ))}
      </motion.div>
    </div>
    <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#b5b0a4]">
      40+ connectors · one unified graph
    </p>
  </section>
);

/* ───────── velocity type band ───────── */

const VelocityBand = ({ text, dark = false }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['4%', '-24%']);
  return (
    <div ref={ref} className={`overflow-hidden border-y py-8 ${dark ? 'border-white/10 bg-[#0a0a0a]' : 'border-[#e7e4dd] bg-white'}`}>
      <motion.p style={{ x }}
        className="whitespace-nowrap font-['Space_Grotesk'] text-6xl font-bold uppercase tracking-tight md:text-8xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i}>
            <span style={{ color: dark ? 'white' : INK }}>{text}</span>
            <span className="mx-6" style={{ WebkitTextStroke: `1.5px ${dark ? 'rgba(255,255,255,0.35)' : '#c9c4b8'}`, color: 'transparent' }}>{text}</span>
          </span>
        ))}
      </motion.p>
    </div>
  );
};

/* ───────── demo cards ───────── */

const RecallCard = () => (
  <Chrome title="hivemind — recall">
    <div className="space-y-3 bg-white p-6">
      <div className="flex items-center gap-2 rounded-lg border border-[#e7e4dd] px-4 py-3">
        <Search size={14} className="text-[#b5b0a4]" />
        <span className="text-[13px] text-[#0a0a0a]">what did we decide about the Q3 pricing?</span>
        <motion.span className="ml-auto font-mono text-[10px]" style={{ color: BLUE }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}>
          41ms
        </motion.span>
      </div>
      {[
        ['decision', 'Q3 pricing locked at €49/seat — board sign-off Jun 12'],
        ['evidence', 'thread: “pricing v4 final” · slack #revenue · 14 msgs'],
        ['contradiction resolved', 'supersedes €59 draft from May 28'],
      ].map(([tag, line], i) => (
        <motion.div key={tag}
          initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.5 + i * 0.35, duration: 0.5, ease }}
          className="flex items-start gap-3 rounded-lg bg-[#f7f5f0] px-4 py-3">
          <span className="mt-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white"
            style={{ background: i === 2 ? '#0fa36b' : BLUE }}>{tag}</span>
          <span className="text-[13px] leading-relaxed text-[#3d3b36]">{line}</span>
        </motion.div>
      ))}
    </div>
  </Chrome>
);

const ConnectorCard = () => (
  <Chrome title="hivemind — connectors">
    <div className="grid grid-cols-3 gap-3 bg-white p-6">
      {CONNECTORS.slice(0, 9).map((c, i) => (
        <motion.div key={c.name}
          initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.4, ease }}
          className="flex flex-col items-center gap-2 rounded-lg border border-[#efece5] py-4">
          <ConnectorIcon c={c} size={18} />
          <span className="text-[11px] font-medium text-[#3d3b36]">{c.name}</span>
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wide text-[#0fa36b]">
            <motion.span className="h-1 w-1 rounded-full bg-[#0fa36b]"
              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }} />
            synced
          </span>
        </motion.div>
      ))}
    </div>
  </Chrome>
);

const MeetingCard = () => (
  <Chrome title="hivemind — ai meeting notes">
    <div className="bg-white p-6">
      <div className="flex items-end gap-[3px]">
        {Array.from({ length: 36 }).map((_, i) => (
          <motion.span key={i} className="w-[5px] rounded-sm" style={{ background: BLUE, opacity: 0.75 }}
            animate={{ height: [4, 6 + ((i * 7) % 22), 4] }}
            transition={{ duration: 1.2 + (i % 5) * 0.16, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
        <span className="ml-3 font-mono text-[10px] text-[#b5b0a4]">recording · 00:41:22</span>
      </div>
      <div className="mt-5 space-y-2.5">
        {[
          ['ACTION', 'Elena → ship pricing page by Friday'],
          ['DECISION', 'Self-host tier launches with Q3 release'],
          ['OPEN', 'Legal review of DPA — owner unassigned'],
        ].map(([tag, line], i) => (
          <motion.div key={tag}
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.3, duration: 0.45, ease }}
            className="flex items-center gap-3 rounded-lg border border-[#efece5] px-4 py-2.5">
            <Check size={13} style={{ color: BLUE }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#9a958a]">{tag}</span>
            <span className="text-[13px] text-[#3d3b36]">{line}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </Chrome>
);

const AgentsCard = () => (
  <Chrome title="hivemind — hyper agents">
    <div className="space-y-3 bg-white p-6">
      {[
        ['Strategist', 'Positioning: lead with sovereignty — US clouds can’t follow us there.', false],
        ['Skeptic', 'Challenge: prove sub-50ms at 10M memories or drop the claim.', false],
        ['Builder', 'Drafted the one-pager → Google Doc created ✓', true],
      ].map(([who, msg, act], i) => (
        <motion.div key={who}
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.4, duration: 0.5, ease }}
          className={`max-w-[92%] rounded-xl px-4 py-3 ${act ? 'ml-auto text-white' : 'bg-[#f7f5f0]'}`}
          style={act ? { background: BLUE } : {}}>
          <p className={`font-mono text-[9px] uppercase tracking-[0.18em] ${act ? 'text-white/70' : 'text-[#9a958a]'}`}>{who}</p>
          <p className={`mt-1 text-[13px] leading-relaxed ${act ? 'text-white' : 'text-[#3d3b36]'}`}>{msg}</p>
        </motion.div>
      ))}
    </div>
  </Chrome>
);

const McpCard = () => (
  <Chrome title="terminal — mcp install">
    <div className="bg-[#0d0f14] p-6 font-mono text-[12.5px] leading-loose">
      <p className="text-[#6b7280]"># wire HIVEMIND into Claude, Cursor, VS Code</p>
      <p className="text-[#e5e7eb]"><span className="text-[#0fa36b]">$</span> curl -fsSL hivemind.sh/mcp | bash</p>
      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.7 }} className="text-[#9ca3af]">
        ✓ detected: Claude Code · Cursor
      </motion.p>
      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.1 }} className="text-[#9ca3af]">
        ✓ 22 tools live — memory · web · code · time-travel
      </motion.p>
      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.5 }} style={{ color: BLUE }}>
        → your editor now remembers everything
      </motion.p>
    </div>
  </Chrome>
);

const VoiceCard = () => (
  <Chrome title="tara × hive — voice">
    <div className="bg-white p-6">
      <div className="flex items-center justify-center gap-[4px] py-6">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span key={i} className="w-[6px] rounded-full" style={{ background: BLUE }}
            animate={{ height: [8, 12 + ((i * 11) % 34), 8] }}
            transition={{ duration: 0.9 + (i % 4) * 0.22, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
      </div>
      <p className="text-center text-[13px] italic leading-relaxed text-[#3d3b36]">
        “Your last call with Meridian flagged churn risk — want the summary before you dial?”
      </p>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#9a958a]">
        live stt → grounded recall → tts · self-hosted
      </p>
    </div>
  </Chrome>
);

const GraphAtlasCard = () => (
  <Chrome title="hivemind — memory graph">
    <div className="relative bg-white p-6">
      <MinimalGraphIcon height={280} />
      <motion.div
        className="absolute bottom-4 left-6 rounded border border-[#e7e4dd] bg-white/90 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6b6b6b] backdrop-blur"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }}>
        temporal slider · rewind memory ⏪
      </motion.div>
    </div>
  </Chrome>
);

/* ───────── numbered feature chapter, scroll-parallax card ───────── */

const Chapter = ({ n, id, eyebrow, title, body, stats, bullets, card, flip = false }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const cardY = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const numOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 0.08]);
  return (
    <section id={id} ref={ref} className="relative overflow-hidden border-t border-[#e7e4dd]" style={{ background: PAPER }}>
      {/* giant watermark number */}
      <motion.span
        className={`pointer-events-none absolute top-10 select-none font-['Space_Grotesk'] text-[24rem] font-bold leading-none text-[#0a0a0a] ${flip ? 'left-4' : 'right-4'}`}
        style={{ opacity: numOpacity }}>
        {n}
      </motion.span>
      <div className={`relative mx-auto grid max-w-[1200px] items-center gap-14 px-6 py-28 md:grid-cols-2 ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <Reveal>
          <Eyebrow n={n}>{eyebrow}</Eyebrow>
          <h2 className="mt-5 font-['Space_Grotesk'] text-4xl font-semibold leading-[1.04] tracking-tight text-[#0a0a0a] md:text-5xl">
            {title}
          </h2>
          <Body>{body}</Body>
          {bullets && (
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b, i) => (
                <motion.li key={b}
                  initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: 0.25 + i * 0.12, duration: 0.5, ease }}
                  className="flex items-start gap-2.5 text-[13.5px] text-[#3d3b36]">
                  <Check size={14} className="mt-0.5 shrink-0" style={{ color: BLUE }} /> {b}
                </motion.li>
              ))}
            </ul>
          )}
          {stats && <div className="mt-8 flex gap-10">{stats.map((s) => <Stat key={s.k} v={s.v} k={s.k} />)}</div>}
        </Reveal>
        <motion.div style={{ y: cardY }}>
          <Reveal delay={0.1}>{card}</Reveal>
        </motion.div>
      </div>
    </section>
  );
};

/* ───────── sovereignty band ───────── */

/* ScrollScrubFilm — the "Sovereign Descent" cinematic FPV film (GPT-Image-2
 * diorama keyframes → Seedance image-to-video), scrubbed frame-for-frame by
 * scroll. Desktop = scrub; touch / reduced-motion = static poster (iOS throttles
 * video seeking). Static asset in /public/media, no runtime network. */
function ScrollScrubFilm({ children }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [canScrub] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia('(pointer: coarse)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (!canScrub) return undefined;
    const v = videoRef.current, wrap = wrapRef.current;
    if (!v || !wrap) return undefined;
    let target = 0, cur = 0, dur = 0, raf = 0, alive = true;
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const onMeta = () => { dur = v.duration || 0; };
    v.addEventListener('loadedmetadata', onMeta);
    if (v.readyState >= 1) onMeta();
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      target = total > 0 ? clamp(-r.top / total) : 0;
    };
    const tick = () => {
      if (!alive) return;
      cur += (target - cur) * 0.18;
      if (dur) { const t = cur * (dur - 0.05); if (Math.abs(v.currentTime - t) > 0.02) { try { v.currentTime = t; } catch { /* seeking */ } } }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll(); tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); v.removeEventListener('loadedmetadata', onMeta); };
  }, [canScrub]);

  return (
    <div ref={wrapRef} className="relative" style={{ height: canScrub ? '300vh' : 'auto' }}>
      <div className={`${canScrub ? 'sticky top-0 h-screen' : 'relative min-h-[80vh]'} w-full overflow-hidden`}>
        <video
          ref={videoRef}
          src="/media/sovereign-descent.mp4"
          poster="/media/sovereign-descent-poster.jpg"
          muted playsInline preload="auto" tabIndex={-1} aria-hidden="true"
          autoPlay={!canScrub} loop={!canScrub}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* melt the warm-white film into the paper page above + below */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: `linear-gradient(${PAPER}, rgba(251,251,248,0))` }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(rgba(251,251,248,0), ${PAPER})` }} />
        {children}
      </div>
    </div>
  );
}

const Sovereign = () => (
  <section id="sovereignty" className="relative" style={{ background: PAPER }}>
    <ScrollScrubFilm>
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl bg-[#FBFBF8]/70 px-6 py-8 backdrop-blur-[2px] md:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: BLUE }}>⟩ sovereignty · 08</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-['Space_Grotesk'] text-4xl font-semibold leading-tight tracking-tight md:text-6xl" style={{ color: INK }}>
            Your memory never<br />leaves your walls
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] font-light leading-relaxed text-[#4a4a4a]">
            EU-hosted in Frankfurt. GDPR-native. No US data transfer. Or take the engine
            inside your own infrastructure — full self-host, same sub-50ms recall.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [ShieldCheck, 'GDPR native'], [Globe, 'Frankfurt hosted'],
              [Database, 'Self-host option'], [Zap, 'Sub-50ms recall'],
            ].map(([Icon, label], i) => (
              <motion.div key={label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease }}
                className="flex flex-col items-center gap-2.5 rounded-xl border border-[#0a0a0a]/10 bg-white/80 px-3 py-4">
                <Icon size={19} style={{ color: BLUE }} />
                <span className="text-[12px] font-medium text-[#0a0a0a]/85">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#0a0a0a]/40">
          <span className="h-px w-6 bg-[#0a0a0a]/25" /> scroll to descend <span className="h-px w-6 bg-[#0a0a0a]/25" />
        </div>
      </div>
    </ScrollScrubFilm>
  </section>
);

/* ───────── final CTA ───────── */

const FinalCta = () => (
  <section className="relative overflow-hidden py-32 text-center" style={{ background: PAPER }}>
    <div className="pointer-events-none absolute inset-0" style={dotField} />
    <div className="pointer-events-none absolute inset-0"
      style={{ background: 'radial-gradient(80% 70% at 50% 50%, rgba(251,251,248,0) 30%, #FBFBF8 90%)' }} />
    <Reveal className="relative">
      <h2 className="mx-auto max-w-3xl font-['Space_Grotesk'] text-5xl font-semibold leading-[1.02] tracking-tight text-[#0a0a0a] md:text-7xl">
        <WordReveal text="Stop starting" />
        <br />
        <WordReveal text="from zero" delay={0.2} />
      </h2>
      <p className="mx-auto mt-6 max-w-md text-[15px] font-light text-[#6b6b6b]">
        Connect your first app in two minutes. Your organization starts compounding today.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
        <motion.a href="/hivemind/app" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          className="group inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[13px] font-semibold text-white no-underline"
          style={{ background: BLUE }}>
          Get HIVEMIND <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </motion.a>
        <DownloadMacButton />
        <a href="https://hivemind.davinciai.eu/benchmark" className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#6b6b6b] no-underline hover:text-[#0a0a0a]">
          see the benchmark →
        </a>
      </div>
    </Reveal>
  </section>
);

/* ───────── page ───────── */

const HivemindProduct = () => {
  // Deep-link to a section (e.g. /hivemind#pricing). The target only exists
  // once this lazy chunk mounts, so the browser's native hash-scroll fires
  // too early — retry until the element shows up (bounded), else scroll top.
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) { window.scrollTo(0, 0); return undefined; }
    let tries = 0;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) { el.scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
      if (++tries < 40) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
    return undefined;
  }, []);

  // Lenis smooth-scroll — buttery scrub for the parallax planes.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf;
    const loop = (time) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return (
    <div style={{ background: PAPER }} className="min-h-screen">
      <ProgressBar />
      <Navbar />
      <Hero />
      <MarqueeRow />

      <Chapter n="01" id="chapter-1" eyebrow="memory engine"
        title={<>A memory that<br />organizes itself</>}
        body="Every fact, decision and document becomes durable memory with semantic recall — searchable by meaning, not keywords. Knowledge updates, merges, and contradicts itself into truth."
        bullets={[
          'Updates · Extends · Derives · Contradicts — typed relationships',
          'Contradiction detection with evidence trail',
          'Dream synthesis: new insights while you sleep',
        ]}
        stats={[{ v: '<50ms', k: 'recall' }, { v: '100%', k: 'yours' }, { v: '∞', k: 'retention' }]}
        card={<RecallCard />} />

      <Chapter n="02" id="chapter-2" eyebrow="connectors"
        title={<>Connect once.<br />Remember forever.</>}
        body="40+ integrations turn the tools your team already lives in into a continuously-updating knowledge base. OAuth once — Gmail, Slack, Notion, GitHub, Salesforce and more sync on cadence, filtered to signal."
        bullets={[
          'Auto-sync cadence: 15m → daily, per connector',
          'Deep filters — no firehose, only signal',
          'Personal / Team / Org-wide scoping',
        ]}
        card={<ConnectorCard />} flip />

      <VelocityBand text="Remember everything ·" />

      {/* context-savvy accuracy + solutions carousel (restored) */}
      <Features />

      <Chapter n="03" id="chapter-3" eyebrow="memory graph"
        title={<>See your mind.<br />Rewind it.</>}
        body="A living, navigable 3D atlas of facts, decisions and people — clustered by topic, connected by meaning. Drag the temporal slider and watch your organization's memory form."
        bullets={[
          '3D force-graph · 2D canvas · organic Moss view',
          'Temporal slider — rewind history, play it back',
          'Click any node → relationships, evidence, importance',
        ]}
        card={<GraphAtlasCard />} />

      <Chapter n="04" id="chapter-4" eyebrow="ai meeting notes"
        title={<>Meetings become<br />permanent knowledge</>}
        body="Record, transcribe, diarize. Decisions, action items and open questions are auto-extracted, attributed to who said what, and filed into memory — searchable forever."
        bullets={[
          'Multi-speaker diarization — who said what',
          'Action items · decisions · open questions, auto-extracted',
          'Preview & approve before it enters memory',
        ]}
        card={<MeetingCard />} flip />

      <Chapter n="05" id="chapter-5" eyebrow="hyper agents"
        title={<>Digital employees<br />that actually act</>}
        body="Spin up a room, give it a goal. Role-based agents — Strategist, Builder, Skeptic — debate, decide, and produce real output: a Google Doc, a sheet, a sent email. Grounded in your memory."
        bullets={[
          '9+ formats: debate, council, swarm, standup…',
          'Room connectors: agents act on Gmail, Docs, GitHub, Slack',
          'Every room distills into permanent memory',
        ]}
        card={<AgentsCard />} />

      <VelocityBand text="Agents that act ·" dark />

      <Chapter n="06" id="chapter-6" eyebrow="tara × hive"
        title={<>A voice that<br />knows your business</>}
        body="Real-time voice AI that listens, recalls from your HIVEMIND, and speaks — with post-call sentiment, churn-risk and hot-lead intelligence. Self-hosted, 30+ languages."
        bullets={[
          'Live STT → grounded reasoning → TTS',
          'Skill personas for sales, support, scheduling',
          'Post-call analytics: sentiment, resolution, risk',
        ]}
        card={<VoiceCard />} flip />

      <Chapter n="07" id="chapter-7" eyebrow="mcp server"
        title={<>Your editor,<br />with total recall</>}
        body="One command wires HIVEMIND into Claude, Cursor and VS Code. 22 tools — save, recall, traverse, time-travel. Your AI coding tools stop forgetting what you built."
        bullets={[
          'Bi-temporal time-travel — “what did this look like in May?”',
          'Decision logging with rationale + alternatives',
          'Code version chains with auto-dedup',
        ]}
        card={<McpCard />} />

      <Sovereign />
      <FinalCta />

      {/* real SINGULANCE/HIVEMIND pricing — 4 tiers + sovereign scope estimator */}
      <Pricing />

      {/* developer-first + API/SDK/Playground/Security + footer (restored, ends page) */}
      <Developers />
    </div>
  );
};

export default HivemindProduct;
