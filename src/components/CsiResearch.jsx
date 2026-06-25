import React from 'react';
import NewsArticleLayout, { H2, P, Table } from './research/NewsArticleLayout';

/**
 * Cognitive Swarm Intelligence (CSI) — the architecture behind HIVEMIND/HYPERAGENTS.
 * Mistral news-article style. Hero background swaps via HERO_IMG.
 */
const HERO_IMG = '/research-csi-hero.png'; // drop the background image here to swap

const CsiResearch = () => (
  <NewsArticleLayout
    badge="Research"
    title="Cognitive Swarm Intelligence"
    date="June 20, 2026"
    author="SINGULANCE Labs"
    heroImg={HERO_IMG}
    seo={{
      title: 'Cognitive Swarm Intelligence — Environment-Centric Agent Memory | SINGULANCE Research',
      description: 'CSI is the architecture behind HIVEMIND and HYPERAGENTS: memory, behavior, and policy externalized into a shared cognitive substrate so many agents act as one — the system remembers, the agents act.',
      canonical: 'https://singulancelabs.com/research/cognitive-swarm-intelligence',
    }}
    product={{ name: 'CSI', tag: 'Architecture', desc: 'Environment-centric intelligence — a shared cognitive substrate for a swarm of agents.' }}
    highlights={[
      'The system remembers. The agents act — cognition lives in the environment, not each model.',
      'Memory, behavior, and policy are externalized into one shared cognitive substrate.',
      'Many agents coordinate as one swarm, grounded in HIVEMIND memory.',
      'The architecture behind HIVEMIND and HYPERAGENTS, published.',
    ]}
  >
    <P>Most multi-agent systems put cognition <em>inside</em> each agent: every agent carries its own prompt, its own memory, its own policy. They coordinate by passing messages — and they forget the moment a run ends. Cognitive Swarm Intelligence (CSI) inverts this: cognition lives in the <strong>environment</strong>, not the agent. Memory, behavior, and policy are externalized into a shared substrate that every agent reads from and writes to. The result is a swarm that thinks as one and remembers across runs.</P>

    <H2>The thesis: externalize cognition</H2>
    <P>An agent is amnesiac by default — it restarts every session. A swarm of amnesiac agents is worse: they re-derive context, contradict each other, and lose the thread between runs. CSI moves the three things that must persist out of the agent and into the environment:</P>
    <Table head={['Layer', 'What it holds', 'Why externalize it']} rows={[
      ['Memory', 'Facts, decisions, entities, history', 'So any agent — and the next run — inherits the full context.'],
      ['Behavior', 'Playbooks, roles, learned patterns', 'So lessons compound across the swarm instead of dying with one agent.'],
      ['Policy', 'Goals, guardrails, governance', 'So the whole swarm stays aligned and auditable, not each agent separately.'],
    ]} />

    <H2>How the swarm acts as one</H2>
    <P>Agents in a CSI room don’t hold the state — they operate on it. A lead decomposes the goal; reactors gather, recon, and execute against the shared substrate; the environment records what was decided and why. Because the memory is shared and persistent, a later run continues the work instead of restarting it — and contradictions are surfaced against the ledger rather than silently repeated.</P>
    <Table head={['Stage', 'What happens']} rows={[
      ['Plan', 'A lead decomposes the goal into assignments grounded in shared memory.'],
      ['Gather + recon', 'Reactors pull the relevant context and prior decisions from the substrate.'],
      ['Execute', 'Agents act — drafting, deciding, moving — writing results back to the environment.'],
      ['Converge', 'The room reconciles against the ledger and records the rationale for the next run.'],
    ]} />

    <H2>Why it matters</H2>
    <P>When cognition is environment-centric, intelligence stops being a per-session feature and becomes an institutional capability. The swarm remembers every decision and why it was made; new agents inherit the full history; and the whole system stays governable from one place. This is the architecture beneath HIVEMIND (the shared memory substrate) and HYPERAGENTS (the swarm that acts on it) — sovereign, continuous, and coordinated.</P>

    <P className="text-[15px] text-[#737367]">The system remembers. The agents act.</P>
  </NewsArticleLayout>
);

export default CsiResearch;
