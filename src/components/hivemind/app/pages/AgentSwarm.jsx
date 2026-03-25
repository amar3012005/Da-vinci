import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Brain,
  Network,
  Zap,
  Shield,
  GitBranch,
  Clock,
  MessageSquare,
  Target,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const features = [
  {
    icon: Brain,
    title: 'Stigmergic Coordination',
    description: 'Agents communicate through shared memory traces — affordance and disturbance signals that guide the swarm without centralized control.',
    color: '#117dff',
  },
  {
    icon: Network,
    title: 'Multi-Agent Reasoning Chains',
    description: 'Chain-of-thought traces link across agents via Extends relationships, building collaborative reasoning paths through the knowledge graph.',
    color: '#8b5cf6',
  },
  {
    icon: Shield,
    title: 'Byzantine Fault Tolerance',
    description: 'Weiszfeld geometric median consensus ensures reliable outputs even when individual agents hallucinate or produce conflicting evaluations.',
    color: '#22c55e',
  },
  {
    icon: Zap,
    title: 'Predict-Calibrate Memory',
    description: 'Delta extraction prevents redundant storage — only novel information enters the shared memory graph, keeping the swarm context clean.',
    color: '#f59e0b',
  },
  {
    icon: GitBranch,
    title: 'Bi-Temporal Knowledge Graph',
    description: 'Agents can query what was known at any point in time. Transaction time vs valid time enables temporal reasoning across the swarm.',
    color: '#ef4444',
  },
  {
    icon: Target,
    title: 'Operator Layer Intelligence',
    description: 'Intent detection routes queries to the right agent. Dynamic scorer weights adapt based on temporal, factual, or exploratory context.',
    color: '#06b6d4',
  },
];

const useCases = [
  {
    title: 'Research Synthesis',
    description: 'Multiple agents crawl, extract, and synthesize information from different sources into a unified knowledge base.',
    icon: MessageSquare,
  },
  {
    title: 'Automated Code Review',
    description: 'Parallel agents analyze code quality, security, performance, and style — consensus filters false positives.',
    icon: Shield,
  },
  {
    title: 'Enterprise Knowledge Worker',
    description: 'Agents monitor email, Slack, docs, and meetings — building a living organizational memory that any team member can query.',
    icon: Brain,
  },
];

export default function AgentSwarm() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#117dff]/20 to-[#8b5cf6]/20 border border-[#117dff]/20 flex items-center justify-center">
            <Bot size={24} className="text-[#117dff]" />
          </div>
          <div>
            <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk']">Agent Swarm</h1>
            <p className="text-[#525252] text-sm font-['Space_Grotesk']">
              Coordinated multi-agent intelligence powered by shared memory
            </p>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon Banner */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-2xl border border-[#117dff]/20 bg-gradient-to-r from-[#117dff]/[0.06] via-[#8b5cf6]/[0.04] to-[#117dff]/[0.06] p-8 mb-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#117dff]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 mb-4">
              <Clock size={12} className="text-[#117dff]" />
              <span className="text-[#117dff] text-xs font-semibold font-['Space_Grotesk'] uppercase tracking-wider">Coming Soon</span>
            </div>
            <h2 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] mb-2">
              Deploy autonomous agent swarms with persistent memory
            </h2>
            <p className="text-[#525252] text-sm font-['Space_Grotesk'] leading-relaxed max-w-lg">
              Launch coordinated AI agents that share a knowledge graph, communicate through stigmergic traces,
              and build collective intelligence over time. Powered by HIVEMIND's 6 SOTA memory engine features.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-white border border-[#e3e0db] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-center">
              <Bot size={32} className="text-[#117dff]/40" />
            </div>
            <span className="text-[#a3a3a3] text-[10px] font-mono">v2.0</span>
          </div>
        </div>
      </motion.div>

      {/* Core Capabilities */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-4">Core Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#117dff]/20 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${feature.color}15` }}
              >
                <feature.icon size={18} style={{ color: feature.color }} />
              </div>
              <h4 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] mb-1.5">
                {feature.title}
              </h4>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Use Cases */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-4">Use Cases</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-2 mb-3">
                <uc.icon size={16} className="text-[#525252]" />
                <h4 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">{uc.title}</h4>
              </div>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] leading-relaxed">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* API Preview */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-4">API Preview</h3>
        <div className="bg-[#0a0a0a] rounded-xl p-5 overflow-x-auto">
          <pre className="text-[#a3a3a3] text-xs font-mono leading-relaxed">
            <span className="text-[#22c55e]">{'// Deploy a research swarm'}</span>{'\n'}
            <span className="text-[#f59e0b]">const</span> swarm = <span className="text-[#f59e0b]">await</span> hivemind.swarm.create({'{\n'}
            {'  '}name: <span className="text-[#22c55e]">'research-team'</span>,{'\n'}
            {'  '}agents: [{'\n'}
            {'    '}{'{ '}role: <span className="text-[#22c55e]">'crawler'</span>, model: <span className="text-[#22c55e]">'mistral-large'</span>{' }'},{'\n'}
            {'    '}{'{ '}role: <span className="text-[#22c55e]">'analyst'</span>, model: <span className="text-[#22c55e]">'claude-opus'</span>{' }'},{'\n'}
            {'    '}{'{ '}role: <span className="text-[#22c55e]">'synthesizer'</span>, model: <span className="text-[#22c55e]">'claude-sonnet'</span>{' }'},{'\n'}
            {'  '}],{'\n'}
            {'  '}memory: {'{ '}shared: <span className="text-[#f59e0b]">true</span>, consensus: <span className="text-[#22c55e]">'byzantine'</span>{' }'},{'\n'}
            {'  '}coordination: <span className="text-[#22c55e]">'stigmergic'</span>,{'\n'}
            {'}'});{'\n\n'}
            <span className="text-[#22c55e]">{'// Agents share traces through HIVEMIND memory'}</span>{'\n'}
            <span className="text-[#f59e0b]">const</span> result = <span className="text-[#f59e0b]">await</span> swarm.run(<span className="text-[#22c55e]">'Research EU AI Act implications for SaaS'</span>);
          </pre>
        </div>
      </motion.div>
    </div>
  );
}
