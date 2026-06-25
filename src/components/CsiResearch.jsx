import React, { Suspense, lazy, useEffect, useState } from 'react';
import NewsArticleLayout, { H2, P, Table } from './research/NewsArticleLayout';

const CsiHeroScene = lazy(() => import('./research/three/CsiHeroScene'));

const useMotionOk = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOk(window.matchMedia('(min-width: 768px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  return ok;
};

/**
 * Cognitive Swarm Intelligence (CSI) — the full SINGULANCE Labs paper in the
 * Mistral news-article style. Content ported from the /research page.
 * Hero background swaps via HERO_IMG.
 */
const HERO_IMG = '/research-csi-hero.png'; // drop the background image here to swap

const CsiResearch = () => {
  const motionOk = useMotionOk();
  return (
  <NewsArticleLayout
    badge="Research"
    title="Cognitive Swarm Intelligence"
    date="2026"
    author="SINGULANCE Labs"
    heroImg={HERO_IMG}
    heroScene={motionOk ? <Suspense fallback={null}><CsiHeroScene /></Suspense> : null}
    seo={{
      title: 'Cognitive Swarm Intelligence (CSI) — Environment-Centric AI | SINGULANCE Research',
      description: 'CSI: an environment-centric architecture where intelligence is an emergent property of a shared, persistent, structured cognitive environment — combining structured memory, stigmergic coordination, adaptive routing, procedural consolidation, agent identity, and a controlled meta-loop.',
      canonical: 'https://singulancelabs.com/research/cognitive-swarm-intelligence',
    }}
    product={{ name: 'CSI', tag: 'Architecture', desc: 'Environment-centric intelligence — a shared cognitive substrate behind HIVEMIND and HYPERAGENTS.' }}
    highlights={[
      'Externalized — intelligence lives in the environment, not any single agent.',
      'Emergent — coordination without explicit messaging, via shared state.',
      'Structural — learning without retraining; structure changes, weights don’t.',
      'Shared — local identity, global intelligence.',
      'Controlled — safe self-improvement through a bounded meta-loop.',
    ]}
  >
    <H2>Abstract</H2>
    <P>Artificial intelligence systems today are overwhelmingly model-centric. Intelligence is assumed to live inside a model or an agent, while memory, tools, and workflows remain auxiliary attachments.</P>
    <P>At SINGULANCE Labs, we propose <strong>Cognitive Swarm Intelligence (CSI)</strong>: an environment-centric architecture in which intelligence is not treated as a property of any single agent, but as an emergent property of a shared, persistent, structured cognitive environment.</P>
    <P>CSI combines structured memory, stigmergic coordination, adaptive routing, procedural consolidation, agent identity, and a controlled meta-loop into a single architecture. The result is a system designed not merely to answer questions, but to remember, coordinate, execute, improve, and accumulate operational intelligence over time.</P>

    <H2>[01] The problem — why agent-centric AI has structural limits</H2>
    <Table head={['Limit', 'Why it bites']} rows={[
      ['Transient knowledge', 'Even when external memory exists, it is treated as static retrieval context rather than an active medium for cognition.'],
      ['Brittle coordination', 'Multi-agent systems coordinate through explicit communication — costly, brittle, and hard to scale.'],
      ['No procedural learning', 'Repeated successes do not harden into reusable behavior. Every session starts from scratch.'],
      ['Lost reasoning', 'Systems store outputs but not the pathways that produced them — decision rationale is lost.'],
    ]} />

    <H2>[02] Core thesis — the central claim</H2>
    <P><strong>“Persistent shared cognition can outperform isolated agent reasoning when memory, behavior, and policy are all externalized into a structured environment.”</strong></P>
    <Table head={['#', 'Claim', 'What it means']} rows={[
      ['1', 'Intelligence can be externalized', 'Store competence in the environment — decisions, facts, execution trails, blueprints, confidence signals — not only in weights or prompt history.'],
      ['2', 'Coordination emerges without heavy messaging', 'Agents cooperate through shared state — trails, observations, graph relationships — not explicit communication.'],
      ['3', 'Learning occurs without retraining', 'The system improves by changing structure: successful paths strengthen, repeated sequences become blueprints, weak paths decay, routing adapts.'],
      ['4', 'Identity stays local, intelligence stays global', 'Agents differ by role, skill, and reputation, but competence is shared — agents are access points into a common substrate.'],
      ['5', 'Self-improvement requires control, not chaos', 'A bounded meta-loop: observe, evaluate, recommend, apply — through a controlled parameter registry with rollback.'],
    ]} />

    <H2>[03] Architecture — a three-layer cognitive runtime</H2>
    <Table head={['Layer', 'Namespace', 'Role']} rows={[
      ['Canonical Knowledge', 'kg/*', 'Durable, validated knowledge — entities, relationships, procedures, decisions. The long-lived source of truth.'],
      ['Operational Cognition', 'op/*', 'The active life of the system — goals, trails, execution events, observations, attempts, decision candidates.'],
      ['Control & Learning', 'meta/*', 'Evaluative signals — reputation, trail weights, decay schedules, blueprint thresholds, routing parameters. The control plane.'],
    ]} />

    <H2>[04] Key concepts — how CSI works</H2>
    <P>Five interconnected mechanisms let intelligence emerge from the environment rather than reside in any single agent.</P>
    <P><strong>Trails — behavior as first-class structure.</strong> A trail is a compact, structured representation of how progress toward a goal can be made. Unlike raw logs, trails are directly actionable — connecting goal context to next steps, shaped by success, failure, cost, latency, conflict, congestion, and reputation. <em>“Given this context and this goal, what path has proven useful?”</em></P>
    <P><strong>Blueprints — from repetition to procedure.</strong> When the system detects repeated successful patterns across execution traces, it promotes them into reusable composite trails — its emerging habits. This is how the system learns <strong>how to act</strong>, not merely remember what happened.</P>
    <P><strong>Force-Based Routing — cognitive physics for action selection.</strong> Instead of hard-coded path selection, the system computes a force profile over candidate trails, combined via softmax to preserve exploration while exploiting strong pathways.</P>
    <Table head={['Attractive forces', 'Repulsive forces']} rows={[
      ['Goal attraction · Affordance · Blueprint prior · Social · Momentum', 'Conflict · Congestion · Cost'],
    ]} />
    <P><strong>Agent Identity — without agent-centric intelligence.</strong> Each agent has an identity, role, declared skills, observed competence, reputation, and specialization confidence — yet intelligence remains shared. <em>“Agents have roles. The environment has memory. Intelligence emerges from their interaction.”</em></P>
    <P><strong>The Meta-Loop — safe self-improvement.</strong> A bounded three-part loop turns self-improvement from uncontrolled self-editing into policy evolution through configuration: a read-only <strong>Dashboard</strong> (success rates, blueprint usage, force contributions), a batch <strong>MetaEvaluator</strong> (detects patterns, produces recommendations), and an auditable <strong>Parameter Registry</strong> with rollback.</P>

    <H2>[05] What CSI is not</H2>
    <Table head={['Not…', 'Because']} rows={[
      ['Not just RAG', 'RAG retrieves text. CSI stores structured outcomes, execution traces, and reusable behavior. Retrieval is one component.'],
      ['Not just a memory system', 'Memory preserves data. CSI preserves data and behavior — turning repeated success into procedures and shaping future policy.'],
      ['Not just orchestration', 'Orchestrators move tasks. CSI evolves how those paths are chosen and reused over time.'],
    ]} />

    <H2>[06] Why it matters</H2>
    <Table head={['Outcome', 'What changes']} rows={[
      ['Competence survives replacement', 'Replacing the agent does not destroy intelligence — it has been externalized into the environment.'],
      ['Operational intelligence accumulates', 'Organizations build compound knowledge rather than losing it when sessions end or teams change.'],
      ['Improvement without retraining', 'Systems improve through usage by evolving policies, procedures, and routing — not model weights.'],
      ['Auditable reasoning', 'Reasoning becomes persistent and traceable through structured trails and decision provenance.'],
      ['Structural coordination', 'Coordination emerges through shared-environment modifications rather than expensive message overhead.'],
      ['Policy evolution', 'Learning by evolving policies and procedures instead of re-running costly reasoning loops.'],
    ]} />

    <H2>Future work</H2>
    <Table head={['Direction', 'Goal']} rows={[
      ['Long-term memory benchmarks', 'Evaluate environment-centric memory against long-horizon recall — does externalized memory beat context-bound systems?'],
      ['Agent transfer benchmarks', 'Measure whether competence survives agent replacement — testing CSI’s central thesis directly.'],
      ['Procedural learning studies', 'Blueprint formation and policy adaptation as a path to learning without retraining.'],
      ['Research intelligence', 'Extend CSI to hypothesis tracking, evidence graphs, and scientific reasoning over time.'],
    ]} />
    <P className="text-[15px] text-[#737367]">The system remembers. The agents act. Licensed CC BY 4.0 · SINGULANCE Labs.</P>
  </NewsArticleLayout>
  );
};

export default CsiResearch;
