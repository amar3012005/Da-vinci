import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, Database, FileText,
  Mic2, ShieldCheck, Sparkles, Users, Workflow,
} from 'lucide-react';
import AgentAvatar from '../app/hyperagents/AgentAvatar';

const BLUE = '#117DFF';
const PAPER = '#FBFBF8';
const INK = '#0A0A0A';
const EASE = [0.16, 1, 0.3, 1];

const agents = [
  { id: 'priya', name: 'Priya', lane: 'Strategist', role: 'Strategy lead' },
  { id: 'lena', name: 'Lena', lane: 'Builder', role: 'Operations lead' },
  { id: 'omar', name: 'Omar', lane: 'Researcher', role: 'Research lead' },
  { id: 'tara', name: 'TARA', lane: 'Communicator', role: 'Voice lead' },
];

const layers = [
  {
    id: 'brain', label: 'BRAIN', number: '01', icon: Brain,
    title: 'One memory for every decision.',
    copy: 'Meetings, documents, messages and connected tools become durable company context — recalled with their evidence intact.',
    points: ['Semantic company memory', 'Source-grounded recall', 'EU-hosted and governed'],
    accent: '#117DFF', tint: '#EEF6FF',
  },
  {
    id: 'agents', label: 'HYPERAGENTS', number: '02', icon: Users,
    title: 'Digital employees that know the company.',
    copy: 'A coordinated team researches, plans, challenges and executes from the same memory — with visible ownership and evidence.',
    points: ['Specialized Humation agents', 'Rooms for coordinated work', 'Approval-ready deliverables'],
    accent: '#7C5CFC', tint: '#F3F0FF',
  },
  {
    id: 'voice', label: 'VOICE', number: '03', icon: Mic2,
    title: 'Your company, present in every conversation.',
    copy: 'TARA speaks with customers, supports sales and retains the conversation as context for the team that follows.',
    points: ['Real-time conversations', 'Multilingual customer work', 'Every call returns to memory'],
    accent: '#178A62', tint: '#ECF8F3',
  },
];

const research = [
  {
    href: '/research/icarus', label: 'SYSTEM PAPER · 01',
    title: 'ICARUS memory architecture',
    copy: 'How bi-temporal memory, hybrid retrieval and tenant-isolated boxes create durable organizational recall.',
    icon: Database,
  },
  {
    href: '/research/cognitive-swarm-intelligence', label: 'RESEARCH · 02',
    title: 'Cognitive Swarm Intelligence',
    copy: 'The operating model behind specialist agents that debate, coordinate and converge on grounded work.',
    icon: Workflow,
  },
  {
    href: '/hivemind/docs', label: 'DOCUMENTATION · 03',
    title: 'Build with HIVEMIND',
    copy: 'APIs, MCP tools, memory contracts and the technical surface for bringing company context into your stack.',
    icon: FileText,
  },
];

const Rise = ({ children, delay = 0, className = '' }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

const AgentStack = ({ large = false }) => (
  <div className="flex items-center" aria-label="HIVEMIND digital employee team">
    {agents.map((agent, index) => (
      <div key={agent.id} className={index ? '-ml-3' : ''} style={{ zIndex: agents.length - index }}>
        <span className="inline-flex rounded-full border-[3px] border-[#FBFBF8] bg-[#FBFBF8]">
          <AgentAvatar agent={agent} size={large ? 58 : 44} ring active={index === 0} />
        </span>
      </div>
    ))}
  </div>
);

const Hero = () => (
  <section className="relative overflow-hidden px-5 pb-16 pt-28" style={{ background: PAPER }}>
    <div className="pointer-events-none absolute inset-0 opacity-90" style={{
      backgroundImage: 'radial-gradient(rgba(17,125,255,.15) 1px, transparent 1px)',
      backgroundSize: '14px 14px',
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 72%)',
    }} />
    <div className="relative mx-auto max-w-md text-center">
      <Rise>
        <div className="flex justify-center"><AgentStack large /></div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[.22em] text-[#77736b]">
          Your AI company · one shared memory
        </p>
      </Rise>

      <Rise delay={0.08}>
        <div className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#DEDAD1] bg-white/90 px-4 font-mono text-[10px] uppercase tracking-[.2em] text-[#55524c] shadow-[0_8px_28px_rgba(30,30,30,.05)]">
          <span className="h-2 w-2 rounded-full bg-[#117DFF]" /> HIVEMIND operating system
        </div>
      </Rise>

      <Rise delay={0.14}>
        <h1 className="mt-6 font-['Space_Grotesk'] text-[clamp(3.1rem,14vw,4.35rem)] font-semibold leading-[.9] tracking-[-.065em] text-[#0A0A0A]">
          Your company,<br />working as one.
        </h1>
      </Rise>

      <Rise delay={0.2}>
        <p className="mx-auto mt-6 max-w-[22rem] text-[18px] leading-[1.55] text-[#5F5D57]">
          <strong className="font-semibold text-[#0A0A0A]">BRAIN</strong> remembers.{' '}
          <strong className="font-semibold text-[#0A0A0A]">HYPERAGENTS</strong> execute.{' '}
          <strong className="font-semibold text-[#0A0A0A]">VOICE</strong> represents you.
        </p>
      </Rise>

      <Rise delay={0.26} className="mt-8 space-y-3">
        <a href="/hivemind/login" className="group flex min-h-14 w-full items-center justify-between rounded-xl bg-[#117DFF] px-5 text-white no-underline shadow-[0_16px_34px_rgba(17,125,255,.24)] transition-transform active:scale-[.99]">
          <span className="font-['Space_Grotesk'] text-[16px] font-semibold">Start your workspace</span>
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </a>
        <a href="#solutions" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#DEDAD1] bg-white text-[15px] font-medium text-[#242321] no-underline">
          See the system at work
        </a>
      </Rise>
    </div>

    <Rise delay={0.3} className="relative mx-auto mt-12 max-w-md">
      <div className="overflow-hidden rounded-2xl border border-[#DEDAD1] bg-white shadow-[0_28px_70px_-34px_rgba(20,20,20,.34)]">
        <div className="flex h-11 items-center gap-2 border-b border-[#ECE9E2] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E96E64]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#EAB64D]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#5DBB63]" />
          <span className="ml-2 font-mono text-[10px] tracking-[.16em] text-[#9C988E]">hivemind — operating · live</span>
        </div>
        <div className="p-5 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#117DFF]">Objective received</p>
          <p className="mt-3 font-['Space_Grotesk'] text-[22px] font-semibold leading-tight tracking-[-.03em] text-[#0A0A0A]">
            Prepare our next market move.
          </p>
          <div className="mt-5 space-y-3">
            {[
              ['BRAIN', 'Recalling company context', 'ready'],
              ['HYPERAGENTS', 'Omar and Priya are researching', 'working'],
              ['VOICE', 'TARA is ready for customer follow-up', 'queued'],
            ].map(([label, task, status], index) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-[#ECE9E2] bg-[#FCFCFA] p-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${index === 1 ? 'bg-[#F3F0FF] text-[#7C5CFC]' : index === 2 ? 'bg-[#ECF8F3] text-[#178A62]' : 'bg-[#EEF6FF] text-[#117DFF]'}`}>
                  {index === 0 ? <Brain size={16} /> : index === 1 ? <Users size={16} /> : <Mic2 size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] font-semibold tracking-[.14em] text-[#77736B]">{label}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium text-[#242321]">{task}</span>
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[.1em] text-[#9C988E]">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Rise>
  </section>
);

const ProofRail = () => (
  <section className="overflow-hidden border-y border-[#E7E4DD] bg-white py-6">
    <p className="px-5 text-center font-mono text-[9px] uppercase tracking-[.2em] text-[#9C988E]">Built for governed company work</p>
    <div className="mt-4 flex min-w-max animate-[marquee_24s_linear_infinite] items-center gap-8 px-5 font-mono text-[10px] uppercase tracking-[.16em] text-[#56534C] motion-reduce:animate-none">
      {['EU HOSTED', 'BYOK READY', 'SELF-HOSTABLE', 'POST-QUANTUM', 'TENANT ISOLATED', 'AUDITABLE', 'EU HOSTED', 'BYOK READY'].map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex items-center gap-2"><CheckCircle2 size={13} className="text-[#178A62]" />{item}</span>
      ))}
    </div>
  </section>
);

const OperatingSystem = () => {
  const [active, setActive] = useState('brain');
  const reduceMotion = useReducedMotion();
  const current = layers.find((layer) => layer.id === active) || layers[0];
  const Icon = current.icon;

  return (
    <section id="solutions" className="scroll-mt-20 px-5 py-20" style={{ background: PAPER }}>
      <div className="mx-auto max-w-md">
        <Rise>
          <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#117DFF]">Operating system · 01</p>
          <h2 className="mt-4 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A]">
            One system.<br />Three working layers.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[#66635D]">
            OS is not another product beside them. It is the operating layer created when BRAIN, HYPERAGENTS and VOICE work from the same company context.
          </p>
        </Rise>

        <Rise delay={0.08} className="mt-8">
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="HIVEMIND operating system layers">
            {layers.map((layer) => {
              const LayerIcon = layer.icon;
              const selected = layer.id === active;
              return (
                <button
                  key={layer.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(layer.id)}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-1 transition-colors ${selected ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#DEDAD1] bg-white text-[#5F5D57]'}`}
                >
                  <LayerIcon size={18} />
                  <span className="font-mono text-[8px] font-semibold tracking-[.08em]">{layer.label}</span>
                </button>
              );
            })}
          </div>
        </Rise>

        <div className="mt-3 min-h-[445px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={current.id}
              role="tabpanel"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden rounded-2xl border border-[#DEDAD1] bg-white"
            >
              <div className="relative min-h-[176px] overflow-hidden p-5" style={{ background: current.tint }}>
                <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border" style={{ borderColor: `${current.accent}2b` }} />
                <div className="absolute right-3 top-9 h-24 w-24 rounded-full border" style={{ borderColor: `${current.accent}43` }} />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: current.accent }}><Icon size={22} /></span>
                <div className="mt-8 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.18em]" style={{ color: current.accent }}>
                  <span>{current.label}</span><span>{current.number}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-['Space_Grotesk'] text-[29px] font-semibold leading-[1.02] tracking-[-.045em] text-[#0A0A0A]">{current.title}</h3>
                <p className="mt-4 text-[14px] leading-relaxed text-[#66635D]">{current.copy}</p>
                <ul className="mt-5 space-y-3">
                  {current.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-[13px] font-medium text-[#35332F]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: current.accent }} />{point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

const HumationTeam = () => (
  <section className="bg-[#0A0A0A] px-5 py-20 text-white">
    <div className="mx-auto max-w-md">
      <Rise>
        <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#75B7FF]">Humation employees · 02</p>
        <h2 className="mt-4 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.98] tracking-[-.055em]">Meet the company<br />that works for you.</h2>
        <p className="mt-5 text-[16px] leading-relaxed text-[#AAA8A3]">Not anonymous bots. Named digital employees with a specialty, shared context, visible work and accountable outputs.</p>
      </Rise>

      <div className="mt-9 space-y-3">
        {agents.map((agent, index) => (
          <Rise key={agent.id} delay={index * 0.05}>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.055] p-4">
              <AgentAvatar agent={agent} size={58} ring active={index === 1} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-['Space_Grotesk'] text-[18px] font-semibold">{agent.name}</h3>
                  <span className={`h-2 w-2 rounded-full ${index === 1 ? 'bg-[#5DE29A] shadow-[0_0_0_5px_rgba(93,226,154,.12)]' : 'bg-[#777]'}`} />
                </div>
                <p className="mt-0.5 text-[12px] text-[#AAA8A3]">{agent.role}</p>
                <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[.12em] text-[#77746E]">{index === 1 ? 'working · launch plan' : index === 3 ? 'ready · customer calls' : 'ready · company context loaded'}</p>
              </div>
            </div>
          </Rise>
        ))}
      </div>

      <Rise className="mt-8 rounded-2xl border border-white/10 bg-[#141414] p-5">
        <div className="flex items-center gap-3"><Sparkles size={18} className="text-[#75B7FF]" /><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#AAA8A3]">One objective · coordinated work</span></div>
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-4">
          {[
            ['Context assembled', 'BRAIN'],
            ['Research challenged', 'OMAR + PRIYA'],
            ['Operating brief sealed', 'LENA'],
            ['Customer follow-up ready', 'TARA'],
          ].map(([task, owner], index) => (
            <React.Fragment key={task}>
              <div className="flex items-center gap-3 text-[13px]"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 font-mono text-[9px] text-[#75B7FF]">{index + 1}</span>{task}</div>
              <span className="self-center text-right font-mono text-[8px] tracking-[.1em] text-[#77746E]">{owner}</span>
            </React.Fragment>
          ))}
        </div>
      </Rise>
    </div>
  </section>
);

const ResearchLibrary = () => (
  <section id="developers" className="scroll-mt-20 px-5 py-20" style={{ background: PAPER }}>
    <div className="mx-auto max-w-md">
      <Rise>
        <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#117DFF]">Research + documentation · 03</p>
        <h2 className="mt-4 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A]">See what the system<br />is built on.</h2>
        <p className="mt-5 text-[16px] leading-relaxed text-[#66635D]">The architecture, agent science and developer contracts behind HIVEMIND are open for inspection.</p>
      </Rise>

      <div className="mt-9 overflow-hidden rounded-2xl border border-[#DEDAD1] bg-white">
        {research.map((item, index) => {
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href} className={`group block p-5 text-[#0A0A0A] no-underline ${index ? 'border-t border-[#E7E4DD]' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF6FF] text-[#117DFF]"><Icon size={19} /></span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DEDAD1] transition-colors group-hover:border-[#0A0A0A] group-hover:bg-[#0A0A0A] group-hover:text-white"><ArrowRight size={17} /></span>
              </div>
              <p className="mt-7 font-mono text-[9px] uppercase tracking-[.18em] text-[#8B877F]">{item.label}</p>
              <h3 className="mt-2 font-['Space_Grotesk'] text-[23px] font-semibold tracking-[-.035em]">{item.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-[#66635D]">{item.copy}</p>
            </a>
          );
        })}
      </div>
      <a href="/research" className="mt-4 flex min-h-12 items-center justify-between rounded-xl border border-[#DEDAD1] bg-white px-4 text-[14px] font-medium text-[#242321] no-underline">
        Explore all research <BookOpen size={17} />
      </a>
    </div>
  </section>
);

const SovereignClose = () => (
  <section className="border-y border-[#E7E4DD] bg-white px-5 py-20">
    <div className="mx-auto max-w-md">
      <Rise>
        <ShieldCheck size={34} className="text-[#178A62]" />
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[.24em] text-[#178A62]">Sovereign by design · 04</p>
        <h2 className="mt-4 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A]">Your company context<br />stays yours.</h2>
        <p className="mt-5 text-[16px] leading-relaxed text-[#66635D]">EU infrastructure, tenant isolation, BYOK and a self-host path — designed for institutions that cannot outsource trust.</p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#DEDAD1] bg-[#DEDAD1]">
          {[
            ['EU', 'data residency'], ['BYOK', 'key control'], ['PQC', 'future-ready'], ['100%', 'portable'],
          ].map(([value, label]) => (
            <div key={value} className="bg-[#FBFBF8] p-4">
              <p className="font-['Space_Grotesk'] text-[25px] font-semibold tracking-[-.04em] text-[#0A0A0A]">{value}</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[.14em] text-[#8B877F]">{label}</p>
            </div>
          ))}
        </div>
      </Rise>
    </div>
  </section>
);

const FinalCta = () => (
  <section id="pricing" className="scroll-mt-20 px-5 py-20" style={{ background: PAPER }}>
    <Rise className="mx-auto max-w-md overflow-hidden rounded-[26px] bg-[#117DFF] p-7 text-white shadow-[0_28px_60px_-30px_rgba(17,125,255,.7)]">
      <div className="flex items-center justify-between"><AgentStack /><span className="font-mono text-[9px] uppercase tracking-[.16em] text-white/70">team ready</span></div>
      <h2 className="mt-9 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.94] tracking-[-.055em]">Give your company<br />a working memory.</h2>
      <p className="mt-5 text-[15px] leading-relaxed text-white/80">Start with BRAIN. Put HYPERAGENTS to work. Bring TARA into the conversation.</p>
      <a href="/hivemind/login" className="mt-8 flex min-h-14 items-center justify-between rounded-xl bg-white px-5 font-['Space_Grotesk'] text-[15px] font-semibold text-[#0A0A0A] no-underline">
        Start your workspace <ArrowRight size={19} />
      </a>
    </Rise>
  </section>
);

export default function MobileLandingV2() {
  return (
    <main className="md:hidden" style={{ background: PAPER, color: INK }}>
      <Hero />
      <ProofRail />
      <OperatingSystem />
      <HumationTeam />
      <ResearchLibrary />
      <SovereignClose />
      <FinalCta />
    </main>
  );
}
