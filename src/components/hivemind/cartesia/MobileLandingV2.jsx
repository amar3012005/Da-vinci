import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Brain, CheckCircle2, Mic2, Users,
} from 'lucide-react';
import AgentAvatar from '../app/hyperagents/AgentAvatar';
import DownloadMacButton from './DownloadMacButton';

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

const Hero = ({ desktop = false }) => (
  <section className={`relative overflow-hidden px-5 pb-16 pt-28 ${desktop ? 'md:px-10 md:pb-24 md:pt-36' : ''}`} style={{ background: PAPER }}>
    <div className="pointer-events-none absolute inset-0 opacity-90" style={{
      backgroundImage: 'radial-gradient(rgba(17,125,255,.15) 1px, transparent 1px)',
      backgroundSize: '14px 14px',
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 72%)',
    }} />
    <div className={`relative mx-auto max-w-md text-center ${desktop ? 'md:max-w-3xl' : ''}`}>
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
        <h1 className={`mt-6 font-['Space_Grotesk'] text-[clamp(3.1rem,14vw,4.35rem)] font-semibold leading-[.9] tracking-[-.065em] text-[#0A0A0A] ${desktop ? 'md:text-[clamp(5.5rem,9vw,9rem)]' : ''}`}>
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

      <Rise delay={0.26} className={`mt-8 space-y-3 ${desktop ? 'md:mx-auto md:flex md:max-w-xl md:items-center md:justify-center md:gap-3 md:space-y-0' : ''}`}>
        <a href="/hivemind/login" className="group flex min-h-14 w-full items-center justify-between rounded-xl bg-[#117DFF] px-5 text-white no-underline shadow-[0_16px_34px_rgba(17,125,255,.24)] transition-transform active:scale-[.99]">
          <span className="font-['Space_Grotesk'] text-[16px] font-semibold">Start your workspace</span>
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </a>
        <DownloadMacButton className="!flex !min-h-12 !w-full !rounded-xl !border-[#0A0A0A] !bg-[#0A0A0A] !px-5 !text-[13px]" />
      </Rise>
    </div>

    <Rise delay={0.3} className={`relative mx-auto mt-12 max-w-md ${desktop ? 'md:mt-16 md:max-w-3xl' : ''}`}>
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

const OperatingSystem = ({ desktop = false }) => {
  const [active, setActive] = useState('brain');
  const reduceMotion = useReducedMotion();
  const current = layers.find((layer) => layer.id === active) || layers[0];
  const Icon = current.icon;

  return (
    <section id="solutions" className={`scroll-mt-20 px-5 py-20 ${desktop ? 'md:px-10 md:py-28' : ''}`} style={{ background: PAPER }}>
      <div className={`mx-auto max-w-md ${desktop ? 'md:max-w-5xl' : ''}`}>
        <Rise>
          <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#117DFF]">The HIVEMIND operating system</p>
          <h2 className={`mt-4 font-['Space_Grotesk'] text-[42px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A] ${desktop ? 'md:text-7xl' : ''}`}>
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

        <div className={`mt-3 min-h-[445px] ${desktop ? 'md:min-h-[390px]' : ''}`}>
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

export default function MobileLandingV2({ desktop = false }) {
  return (
    <main className={desktop ? 'hidden md:block' : 'md:hidden'} style={{ background: PAPER, color: INK }}>
      <Hero desktop={desktop} />
      <ProofRail />
      <OperatingSystem desktop={desktop} />
    </main>
  );
}
