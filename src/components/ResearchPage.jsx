import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu, X, ArrowRight, ArrowLeft, Brain, Network, Route, Fingerprint,
  RefreshCw, Target, Layers, GitBranch, Shield, BarChart3, Zap,
  BookOpen, ChevronDown, ExternalLink
} from 'lucide-react';

/* ─── Cartesia Navbar (reused pattern) ─── */
const ResearchNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const sections = [
    { label: 'Thesis', id: 'thesis' },
    { label: 'Architecture', id: 'architecture' },
    { label: 'Key Concepts', id: 'concepts' },
    { label: 'Why It Matters', id: 'why' },
    { label: 'Future', id: 'future' },
  ];

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${
        scrolled ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]' : 'bg-transparent'
      }`}>
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
              <img src="/images/davinci-logo.svg" alt="Da Vinci" className="h-5" />
              <span className="text-[#0a0a0a]/30 text-lg font-light">|</span>
              <span className="text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">Research</span>
            </button>

            <div className="hidden md:flex items-center gap-8">
              {sections.map((s) => (
                <button key={s.id} onClick={() => scrollTo(s.id)}
                  className="text-sm font-medium text-[#525252] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">
                  {s.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-4 py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer">
                <ArrowLeft size={14} /> Home
              </button>
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#525252] hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99] bg-[#faf9f4]/95 backdrop-blur-xl md:hidden">
          <div className="pt-24 px-8 flex flex-col gap-2">
            {sections.map((s, i) => (
              <motion.button key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(s.id)}
                className="text-left text-2xl font-medium text-[#0a0a0a] hover:text-[#117dff] py-3 border-b border-[#e3e0db] bg-transparent border-x-0 border-t-0 cursor-pointer">
                {s.label}
              </motion.button>
            ))}
            <button onClick={() => { setMobileOpen(false); navigate('/'); }}
              className="mt-8 w-full py-3.5 rounded-lg border border-[#e3e0db] text-[#0a0a0a] font-medium text-base bg-white cursor-pointer flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
};

/* ─── Reusable Section Wrapper ─── */
const Section = ({ id, children, className = '', border = true }) => (
  <section id={id} className={`${border ? 'border-b border-[#e3e0db]' : ''} ${className}`}>
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 md:px-10 lg:px-20">
      {children}
    </div>
  </section>
);

/* ─── Fade-up animation wrapper ─── */
const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.35, ease: 'easeOut', delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─── Concept Card ─── */
const ConceptCard = ({ icon: Icon, title, description, number, delay = 0 }) => (
  <FadeUp delay={delay}>
    <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#d4d0ca] transition-colors h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
          <Icon size={18} className="text-[#117dff]" />
        </div>
        <span className="text-xs font-mono text-[#a3a3a3]">[{number}]</span>
      </div>
      <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">{title}</h3>
      <p className="text-sm text-[#525252] leading-relaxed">{description}</p>
    </div>
  </FadeUp>
);

/* ─── Claim Row ─── */
const ClaimRow = ({ number, title, description, delay = 0 }) => (
  <FadeUp delay={delay}>
    <div className="flex gap-6 py-6 border-b border-[#e3e0db] last:border-b-0">
      <span className="text-sm font-mono text-[#117dff] mt-0.5 shrink-0">3.{number}</span>
      <div>
        <h4 className="text-base font-semibold text-[#0a0a0a] mb-1">{title}</h4>
        <p className="text-sm text-[#525252] leading-relaxed">{description}</p>
      </div>
    </div>
  </FadeUp>
);

/* ─── Force Item ─── */
const ForceItem = ({ label, description, type }) => (
  <div className="flex items-start gap-3 py-2">
    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${type === 'attract' ? 'bg-[#117dff]' : 'bg-[#e3513a]'}`} />
    <div>
      <span className="text-sm font-semibold text-[#0a0a0a]">{label}</span>
      <span className="text-sm text-[#525252]"> — {description}</span>
    </div>
  </div>
);

/* ════════════════════════════════════════ */
/*              RESEARCH PAGE               */
/* ════════════════════════════════════════ */

const ResearchPage = () => {
  return (
    <div className="min-h-screen bg-[#faf9f4]">
      <ResearchNavbar />

      {/* ── HERO ── */}
      <Section id="hero" className="pt-28 pb-20 lg:pt-36 lg:pb-28 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#117dff]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <FadeUp>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 text-xs font-mono uppercase tracking-widest text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-full">
                Research Paper
              </span>
              <span className="text-xs font-mono text-[#a3a3a3]">DavinciAI Labs / 2026</span>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-[#0a0a0a] font-['Space_Grotesk'] mb-6">
              Cognitive Swarm{' '}
              <span className="text-[#117dff]">Intelligence</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.15}>
            <p className="text-xl md:text-2xl font-medium text-[#525252] leading-relaxed mb-4">
              An Environment-Centric Architecture for Persistent, Collective, Self-Improving AI
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-base text-[#525252] leading-relaxed mb-8 max-w-2xl">
              Intelligence doesn't have to live inside agents. CSI proposes a shared cognitive environment where memory is active, behavior is traceable, repeated success becomes procedure, and the system improves through controlled feedback.
            </p>
          </FadeUp>

          <FadeUp delay={0.25}>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => document.getElementById('thesis')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1.5 px-7 py-3 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none uppercase tracking-[0.075em]">
                Read the Paper <ChevronDown size={14} />
              </button>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── ABSTRACT ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-6 block">Abstract</span>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="max-w-3xl">
              <p className="text-lg md:text-xl text-[#525252] leading-relaxed mb-6">
                Artificial intelligence systems today are overwhelmingly model-centric. Intelligence is assumed to live inside a model or an agent, while memory, tools, and workflows remain auxiliary attachments.
              </p>
              <p className="text-lg md:text-xl text-[#525252] leading-relaxed mb-6">
                At DavinciAI Labs, we propose <strong className="text-[#0a0a0a]">Cognitive Swarm Intelligence (CSI)</strong>: an environment-centric architecture in which intelligence is not treated as a property of any single agent, but as an emergent property of a shared, persistent, structured cognitive environment.
              </p>
              <p className="text-base text-[#525252] leading-relaxed">
                CSI combines structured memory, stigmergic coordination, adaptive routing, procedural consolidation, agent identity, and a controlled meta-loop into a single architecture. The result is a system designed not merely to answer questions, but to remember, coordinate, execute, improve, and accumulate operational intelligence over time.
              </p>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── THE PROBLEM ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[01] The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              Why agent-centric AI has <span className="text-[#117dff]">structural limits</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Brain, title: 'Transient Knowledge', desc: 'Even when external memory exists, it is treated as static retrieval context rather than an active medium for cognition.' },
              { icon: Network, title: 'Brittle Coordination', desc: 'Multi-agent systems coordinate through explicit communication, which is costly, brittle, and difficult to scale.' },
              { icon: RefreshCw, title: 'No Procedural Learning', desc: 'Repeated successes do not automatically harden into reusable behavior. Every session starts from scratch.' },
              { icon: Layers, title: 'Lost Reasoning', desc: 'Organizations lose decision rationale and execution intelligence because systems store outputs but not the pathways that produced them.' },
            ].map((item, i) => (
              <ConceptCard key={item.title} icon={item.icon} title={item.title} description={item.desc} number={`0${i + 1}`} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── CORE THESIS ── */}
      <Section id="thesis">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[02] Core Thesis</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              The central claim
            </h2>
          </FadeUp>

          <FadeUp delay={0.05}>
            <div className="bg-white border-2 border-[#117dff] rounded-xl p-8 md:p-10 mb-10 shadow-[0_0_20px_rgba(17,125,255,0.08)]">
              <p className="text-lg md:text-xl font-semibold text-[#0a0a0a] leading-relaxed">
                "Persistent shared cognition can outperform isolated agent reasoning when memory, behavior, and policy are all externalized into a structured environment."
              </p>
            </div>
          </FadeUp>

          <div className="max-w-2xl">
            <ClaimRow number="1" title="Intelligence can be externalized" delay={0.08}
              description="Instead of storing competence only in model weights or prompt history, CSI stores operationally useful structures in the environment: decisions, facts, execution trails, blueprints, confidence signals, and reputation-linked outcomes." />
            <ClaimRow number="2" title="Coordination can emerge without heavy messaging" delay={0.12}
              description="Agents can cooperate through shared state rather than explicit communication. Trails, observations, graph relationships, and operational updates become the coordination medium." />
            <ClaimRow number="3" title="Learning can occur without retraining" delay={0.16}
              description="CSI improves by changing structure rather than model weights. Successful paths gain strength. Repeated action sequences become blueprints. Weak paths decay. Routing parameters adapt." />
            <ClaimRow number="4" title="Identity can remain local while intelligence stays global" delay={0.2}
              description="Agents may differ by role, skill, or reputation, but the competence of the system remains shared. Agents are specialized access points into a common intelligence substrate." />
            <ClaimRow number="5" title="Self-improvement requires control, not chaos" delay={0.24}
              description="CSI uses a bounded meta-loop: observe the system, evaluate performance, recommend changes, and apply them through a controlled parameter registry with rollback." />
          </div>
        </div>
      </Section>

      {/* ── ARCHITECTURE ── */}
      <Section id="architecture">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[03] Architecture</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              Three-layer <span className="text-[#117dff]">cognitive runtime</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            <FadeUp delay={0}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">kg/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Canonical Knowledge</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  Stores durable, validated knowledge — entities, relationships, procedures, decisions, and structured memories treated as stable organizational intelligence. The long-lived source of truth.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">op/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Operational Cognition</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  The active life of the system — agent goals, trails, execution events, observations, attempts, and decision candidates. Where intelligence is exercised in motion.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.16}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">meta/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Control & Learning</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  Evaluative and adaptive signals — reputation, trail weights, decay schedules, blueprint mining thresholds, routing parameters. The control plane shaping future behavior.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </Section>

      {/* ── KEY CONCEPTS ── */}
      <Section id="concepts">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[04] Key Concepts</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              How CSI works
            </h2>
            <p className="text-base text-[#525252] leading-relaxed mb-10 max-w-2xl">
              Five interconnected mechanisms enable intelligence to emerge from the environment rather than reside in any single agent.
            </p>
          </FadeUp>

          {/* Trails */}
          <FadeUp delay={0.05}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <Route size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Trails</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">Behavior as first-class structure</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-4">
                A trail is a compact, structured representation of how progress toward a goal can be made. Unlike raw message logs, trails are directly actionable — they connect goal context to possible next steps. They are shaped by success, failure, cost, latency, conflict, congestion, and agent reputation.
              </p>
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg px-6 py-4">
                <p className="text-sm font-mono text-[#525252] italic">
                  "Given this context and this goal, what path has proven useful?"
                </p>
              </div>
            </div>
          </FadeUp>

          {/* Blueprints */}
          <FadeUp delay={0.1}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <GitBranch size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Blueprints</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">From repetition to procedure</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed">
                When the system detects repeated successful patterns across execution traces, it promotes them into reusable composite trails. These blueprints represent the system's emerging habits — repeated, validated operational sequences that can be reused instead of rediscovered. This is how the system learns <strong className="text-[#0a0a0a]">how to act</strong>, not merely remember what happened.
              </p>
            </div>
          </FadeUp>

          {/* Force-Based Routing */}
          <FadeUp delay={0.15}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <Target size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Force-Based Routing</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">Cognitive physics for action selection</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-4">
                Instead of hard-coding path selection, the system computes a force profile over candidate trails — combined via softmax to preserve exploration while exploiting strong pathways.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <div>
                  <ForceItem label="Goal attraction" description="how strongly the trail advances the current goal" type="attract" />
                  <ForceItem label="Affordance attraction" description="how executable the trail is right now" type="attract" />
                  <ForceItem label="Blueprint prior" description="whether a proven procedure is available" type="attract" />
                  <ForceItem label="Social attraction" description="trusted agents have succeeded with this trail" type="attract" />
                  <ForceItem label="Momentum" description="the trail continues a productive current path" type="attract" />
                </div>
                <div>
                  <ForceItem label="Conflict repulsion" description="the path conflicts with known outcomes" type="repel" />
                  <ForceItem label="Congestion repulsion" description="too many agents already pursuing it" type="repel" />
                  <ForceItem label="Cost repulsion" description="the path is too expensive or inefficient" type="repel" />
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Agent Identity */}
          <div className="grid md:grid-cols-2 gap-6">
            <FadeUp delay={0.2}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                    <Fingerprint size={18} className="text-[#117dff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Agent Identity</h3>
                    <span className="text-xs font-mono text-[#a3a3a3]">Without agent-centric intelligence</span>
                  </div>
                </div>
                <p className="text-sm text-[#525252] leading-relaxed mb-4">
                  Each agent has an identity, role, declared skills, observed competence, reputation, and specialization confidence. But intelligence remains shared.
                </p>
                <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg px-5 py-3">
                  <p className="text-sm font-medium text-[#0a0a0a] italic">
                    "Agents have roles. The environment has memory. Intelligence emerges from their interaction."
                  </p>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.25}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-[#117dff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">The Meta-Loop</h3>
                    <span className="text-xs font-mono text-[#a3a3a3]">Safe self-improvement</span>
                  </div>
                </div>
                <p className="text-sm text-[#525252] leading-relaxed mb-3">
                  A bounded three-part loop transforms self-improvement from uncontrolled self-editing into policy evolution through configuration:
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Dashboard', desc: 'Read-only analytics — success rates, blueprint usage, force contributions' },
                    { label: 'MetaEvaluator', desc: 'Batch evaluator that detects patterns and produces recommendations' },
                    { label: 'Parameter Registry', desc: 'Auditable config store with rollback for routing weights and thresholds' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <span className="text-xs font-mono text-[#117dff] mt-0.5 shrink-0">{item.label}</span>
                      <span className="text-xs text-[#525252]">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </Section>

      {/* ── NOT JUST ANOTHER... ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[05] Differentiation</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              What CSI is <span className="text-[#117dff]">not</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#e3e0db]">
            {[
              { title: 'Not just RAG', desc: 'RAG retrieves text. CSI stores structured outcomes, execution traces, and reusable behavior. Retrieval is only one component.' },
              { title: 'Not just a memory system', desc: 'Memory systems preserve data. CSI preserves data and behavior. It turns repeated success into procedures and uses outcomes to shape future policy.' },
              { title: 'Not just orchestration', desc: 'Workflow orchestrators move tasks between components. CSI evolves how those paths are chosen and reused over time.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="p-6 md:px-8">
                  <h3 className="text-base font-semibold text-[#0a0a0a] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── WHY IT MATTERS ── */}
      <Section id="why">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[06] Why This Matters</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              From isolated agents to <span className="text-[#117dff]">persistent cognitive ecosystems</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Competence survives replacement', desc: 'Replacing the agent does not destroy intelligence — it has been externalized into the environment.' },
              { icon: BarChart3, title: 'Operational intelligence accumulates', desc: 'Organizations build compound knowledge rather than losing it when sessions end or teams change.' },
              { icon: RefreshCw, title: 'Improvement without retraining', desc: 'AI systems improve through usage by evolving policies, procedures, and routing — not model weights.' },
              { icon: BookOpen, title: 'Auditable reasoning', desc: 'Reasoning becomes persistent and traceable through structured trails and decision provenance.' },
              { icon: Network, title: 'Structural coordination', desc: 'Coordination emerges through shared environment modifications rather than expensive message overhead.' },
              { icon: Layers, title: 'Policy evolution', desc: 'Learning is achieved by evolving policies and procedures instead of constantly re-running costly reasoning loops.' },
            ].map((item, i) => (
              <ConceptCard key={item.title} icon={item.icon} title={item.title} description={item.desc} number={`0${i + 1}`} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── DECISION INTELLIGENCE WEDGE ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[07] Commercial Wedge</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              Decision Intelligence
            </h2>
            <p className="text-base text-[#525252] leading-relaxed mb-8 max-w-2xl">
              Organizations lose decisions constantly. The rationale lives in Slack. The approval appears in Gmail. The implementation is encoded in GitHub. Weeks later, nobody knows why something was done.
            </p>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { label: 'Statement & Type', desc: 'What was decided and its classification' },
                  { label: 'Rationale & Alternatives', desc: 'Why it was chosen and what was rejected' },
                  { label: 'Provenance & Scope', desc: 'Evidence, participants, and applicability' },
                ].map((item, i) => (
                  <div key={item.label}>
                    <h4 className="text-sm font-semibold text-[#0a0a0a] mb-1">{item.label}</h4>
                    <p className="text-xs text-[#525252]">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[#e3e0db]">
                <p className="text-sm text-[#525252] leading-relaxed">
                  CSI treats decisions as structured objects — not just memory retrieval, but <strong className="text-[#0a0a0a]">structured reconstruction of organizational reasoning</strong>.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── FUTURE DIRECTIONS ── */}
      <Section id="future">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[08] Future Directions</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              What comes next
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Long-term memory benchmarks', desc: 'Evaluating environment-centric memory against long-horizon recall tasks to test whether externalized memory structures outperform context-bound systems.' },
              { title: 'Agent transfer benchmarks', desc: 'A benchmark measuring whether competence survives agent replacement — directly testing CSI\'s central thesis.' },
              { title: 'Procedural learning studies', desc: 'Blueprint formation and policy adaptation offer a new path toward learning without retraining.' },
              { title: 'Research intelligence', desc: 'Extending CSI to support hypothesis tracking, evidence graphs, experimental workflows, and scientific reasoning over time.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="flex gap-4 p-6 bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <span className="text-sm font-mono text-[#117dff] mt-0.5 shrink-0">14.{i + 1}</span>
                  <div>
                    <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CONCLUSION / CTA ── */}
      <Section border={false}>
        <div className="py-24 lg:py-32 text-center">
          <FadeUp>
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-xl px-8 py-10 mb-8">
                <p className="text-2xl md:text-3xl font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">
                  "The system remembers.<br />The agents just act."
                </p>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-8">
                DavinciAI Labs is developing Cognitive Swarm Intelligence as a new architecture for persistent, structured, self-improving AI systems. Our work focuses on memory-native cognition, stigmergic coordination, procedural learning, and operational intelligence that compounds over time.
              </p>
              <a href="https://hivemind.davinciai.eu"
                className="inline-flex items-center gap-2 px-7 py-3 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors no-underline uppercase tracking-[0.075em]">
                Explore HIVEMIND <ExternalLink size={14} />
              </a>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#e3e0db]">
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/davinci-logo.svg" alt="Da Vinci" className="h-4" />
            <span className="text-xs font-mono text-[#a3a3a3]">DavinciAI Labs / 2026</span>
          </div>
          <span className="text-xs font-mono text-[#a3a3a3]">Cognitive Swarm Intelligence (CSI)</span>
        </div>
      </footer>
    </div>
  );
};

export default ResearchPage;
