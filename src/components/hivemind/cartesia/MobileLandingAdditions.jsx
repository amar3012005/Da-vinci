import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Briefcase, Calendar, Database, FileText,
  Github, HardDrive, Layers, Mail, MessageSquare, ShieldCheck,
} from 'lucide-react';
import AgentAvatar from '../app/hyperagents/AgentAvatar';

const PAPER = '#FBFBF8';

const connectors = [
  { name: 'Gmail', icon: Mail, color: '#EA4335' },
  { name: 'Slack', icon: MessageSquare, color: '#611F69' },
  { name: 'Notion', icon: FileText, color: '#111111' },
  { name: 'GitHub', icon: Github, color: '#111111' },
  { name: 'Drive', icon: HardDrive, color: '#4285F4' },
  { name: 'Calendar', icon: Calendar, color: '#4285F4' },
  { name: 'Salesforce', icon: Briefcase, color: '#00A1E0' },
  { name: 'HubSpot', icon: Database, color: '#FF7A59' },
  { name: 'Linear', icon: Layers, color: '#5E6AD2' },
];

const agents = [
  { id: 'priya', name: 'Priya', lane: 'Strategist', role: 'Strategy lead', state: 'company strategy loaded' },
  { id: 'lena', name: 'Lena', lane: 'Builder', role: 'Operations lead', state: 'coordinating active work' },
  { id: 'omar', name: 'Omar', lane: 'Researcher', role: 'Research lead', state: 'evidence and market context ready' },
  { id: 'tara', name: 'TARA', lane: 'Communicator', role: 'Voice lead', state: 'ready for customer conversations' },
];

const research = [
  {
    href: '/research/icarus',
    label: 'System paper',
    title: 'ICARUS memory architecture',
    copy: 'Bi-temporal memory, hybrid retrieval and tenant-isolated memory boxes.',
    icon: Database,
  },
  {
    href: '/research/cognitive-swarm-intelligence',
    label: 'Agent research',
    title: 'Cognitive Swarm Intelligence',
    copy: 'How specialist agents challenge, coordinate and converge on grounded work.',
    icon: Layers,
  },
  {
    href: '/research/post-quantum-cryptography',
    label: 'Security research',
    title: 'Post-quantum memory',
    copy: 'The cryptographic model protecting durable company context for the long term.',
    icon: ShieldCheck,
  },
  {
    href: '/hivemind/docs',
    label: 'Technical reference',
    title: 'Build with HIVEMIND',
    copy: 'APIs, MCP tools, memory contracts and the developer surface.',
    icon: FileText,
  },
];

export const ConnectorConveyorDetail = () => {
  const reduceMotion = useReducedMotion();
  const rail = [...connectors, ...connectors];
  return (
    <section className="md:hidden overflow-hidden border-b border-[#E7E4DD] bg-[#FBFBF8] pb-20" aria-label="Connected applications">
      <div className="mx-auto max-w-md px-5">
        <p className="font-['Space_Grotesk'] text-[22px] font-semibold tracking-[-.035em] text-[#0A0A0A]">Your tools keep moving. Memory keeps up.</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B6862]">Two-way context flows from the apps your team already uses into one governed company record.</p>
      </div>
      <div className="relative mt-7 py-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[#FBFBF8] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#FBFBF8] to-transparent" />
        {[0, 1].map((row) => (
          <motion.div
            key={row}
            className={`flex w-max items-center gap-3 px-2 ${row ? 'mt-3' : ''}`}
            animate={reduceMotion ? undefined : { x: row ? ['-45%', '0%'] : ['0%', '-45%'] }}
            transition={{ duration: row ? 36 : 32, repeat: Infinity, ease: 'linear' }}
          >
            {rail.map((connector, index) => {
              const Icon = connector.icon;
              return (
                <span key={`${row}-${connector.name}-${index}`} className="flex min-h-12 items-center gap-2.5 rounded-full border border-[#DEDAD1] bg-white px-4 shadow-[0_8px_20px_rgba(20,20,20,.04)]">
                  <Icon size={16} style={{ color: connector.color }} />
                  <span className="text-[12px] font-semibold text-[#3B3935]">{connector.name}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3CB985]" />
                </span>
              );
            })}
          </motion.div>
        ))}
      </div>
      <div className="mx-auto mt-7 flex w-fit items-center gap-3 rounded-full bg-[#0A0A0A] px-4 py-2 text-white">
        <Database size={14} className="text-[#75B7FF]" />
        <span className="font-mono text-[9px] tracking-[.15em]">40+ SOURCES → ONE MEMORY</span>
      </div>
    </section>
  );
};

export const HumationTeamDetail = () => (
  <section className="md:hidden relative overflow-hidden bg-[#0A0A0A] px-5 py-20 text-white">
    <span aria-hidden className="pointer-events-none absolute -right-8 top-5 select-none font-['Space_Grotesk'] text-[13rem] font-semibold leading-none tracking-[-.1em] text-white/[.05]">05</span>
    <div className="relative mx-auto max-w-md">
      <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#75B7FF]">Inside the employee layer</p>
      <h2 className="mt-4 font-['Space_Grotesk'] text-[40px] font-semibold leading-[.98] tracking-[-.055em]">The people inside<br />your AI company.</h2>
      <p className="mt-5 text-[15px] leading-relaxed text-[#AAA8A3]">Named Humation employees bring a specialty, shared memory, visible ownership and accountable output to every room.</p>

      <div className="mt-9 divide-y divide-white/10 border-y border-white/10">
        {agents.map((agent, index) => (
          <div key={agent.id} className="flex items-center gap-4 py-4">
            <AgentAvatar agent={agent} size={58} ring active={index === 1} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-['Space_Grotesk'] text-[18px] font-semibold">{agent.name}</h3>
                <span className={`h-2 w-2 rounded-full ${index === 1 ? 'bg-[#5DE29A] shadow-[0_0_0_5px_rgba(93,226,154,.12)]' : 'bg-[#777]'}`} />
              </div>
              <p className="mt-0.5 text-[12px] text-[#AAA8A3]">{agent.role}</p>
              <p className="mt-2 truncate font-mono text-[8px] uppercase tracking-[.11em] text-[#77746E]">{agent.state}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-[auto_1fr] gap-x-3 gap-y-4 border-l border-[#117DFF]/45 pl-4">
        {[
          ['01', 'Context assembled from company memory'],
          ['02', 'Specialists research and challenge'],
          ['03', 'Work is executed with evidence'],
          ['04', 'The outcome returns to memory'],
        ].map(([step, task]) => (
          <React.Fragment key={step}>
            <span className="font-mono text-[9px] text-[#75B7FF]">{step}</span>
            <span className="text-[13px] text-[#D4D1CB]">{task}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  </section>
);

export const QuantumChapter = () => (
  <section id="chapter-9" className="md:hidden relative scroll-mt-20 overflow-hidden border-t border-[#E7E4DD] bg-[#FBFBF8] px-5 py-20">
    <span aria-hidden className="pointer-events-none absolute -right-8 top-7 select-none font-['Space_Grotesk'] text-[13rem] font-semibold leading-none tracking-[-.1em] text-[#0A0A0A]/[.05]">09</span>
    <div className="relative mx-auto max-w-md">
      <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#117DFF]">Post-quantum security · 09</p>
      <h2 className="mt-4 font-['Space_Grotesk'] text-[40px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A]">Encryption that outlives<br />the quantum threat.</h2>
      <p className="mt-5 text-[15px] leading-relaxed text-[#66635D]">Classical and NIST-standardized post-quantum protection keep long-lived company memory from becoming tomorrow’s readable archive.</p>
      <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden border-y border-[#D9E9FF] bg-[#D9E9FF]">
        {[
          ['ML-KEM-768', 'key encapsulation'], ['ML-DSA-65', 'signed memory'],
          ['X25519', 'hybrid handshake'], ['AES-256-GCM', 'data at rest'],
        ].map(([name, use], index) => (
          <div key={name} className="min-h-32 bg-[#FBFBF8] p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#BBD8FF] font-mono text-[9px] text-[#117DFF]">{index + 1}</span>
            <p className="mt-5 font-['Space_Grotesk'] text-[14px] font-semibold text-[#0A0A0A]">{name}</p>
            <p className="mt-1 font-mono text-[8px] tracking-[.11em] text-[#8B877F]">{use}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ResearchRequestsChapter = () => (
  <section id="research-library" className="md:hidden relative scroll-mt-20 overflow-hidden border-t border-[#E7E4DD] px-5 py-20" style={{ background: PAPER }}>
    <span aria-hidden className="pointer-events-none absolute -right-8 top-7 select-none font-['Space_Grotesk'] text-[13rem] font-semibold leading-none tracking-[-.1em] text-[#0A0A0A]/[.05]">10</span>
    <div className="relative mx-auto max-w-md">
      <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#117DFF]">Research + requests · 10</p>
      <h2 className="mt-4 font-['Space_Grotesk'] text-[40px] font-semibold leading-[.98] tracking-[-.055em] text-[#0A0A0A]">Inspect the system.<br />Ask for the evidence.</h2>
      <p className="mt-5 text-[15px] leading-relaxed text-[#66635D]">Read the architecture, agent science and security model—or request a focused technical briefing for your organization.</p>

      <div className="mt-9 divide-y divide-[#E7E4DD] border-y border-[#E7E4DD]">
        {research.map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href} className="group grid grid-cols-[42px_1fr_auto] items-start gap-3 py-5 text-[#0A0A0A] no-underline">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9E9FF] bg-[#EEF6FF] text-[#117DFF]"><Icon size={18} /></span>
              <span>
                <span className="block font-mono text-[8px] uppercase tracking-[.16em] text-[#8B877F]">{item.label}</span>
                <span className="mt-1.5 block font-['Space_Grotesk'] text-[18px] font-semibold tracking-[-.025em]">{item.title}</span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[#66635D]">{item.copy}</span>
              </span>
              <ArrowRight size={17} className="mt-2 text-[#9C988E] transition-transform group-hover:translate-x-1 group-hover:text-[#117DFF]" />
            </a>
          );
        })}
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl bg-[#0A0A0A] p-5 text-white">
        <BookOpen size={22} className="text-[#75B7FF]" />
        <h3 className="mt-6 font-['Space_Grotesk'] text-[24px] font-semibold tracking-[-.035em]">Request a research briefing.</h3>
        <p className="mt-3 text-[13px] leading-relaxed text-white/60">Tell us the architecture, compliance or deployment question your team needs answered.</p>
        <a href="mailto:research@singulancelabs.com?subject=HIVEMIND%20research%20request" className="mt-6 flex min-h-12 items-center justify-between rounded-xl bg-white px-4 text-[13px] font-semibold text-[#0A0A0A] no-underline">
          Send a research request <ArrowRight size={17} />
        </a>
      </div>
    </div>
  </section>
);
