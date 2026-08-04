import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { HIVEMIND_URL } from './hivemindLinks';

/**
 * AudienceSection — the adaptive narration. Content swaps based on the field the
 * visitor picked in FieldPicker, mapping the three products (TARA / HIVEMIND /
 * HYPERAGENTS) onto that function. Falls back to a generic story if no choice.
 * Sits right after the sub-product stack.
 */
const ease = [0.16, 1, 0.3, 1];

const STORIES = {
  finance: {
    label: 'For Finance',
    headline: 'Run your finance function as an AI desk.',
    lead: 'Every filing, model, and number — continuous, auditable, and compliant by design.',
    lines: [
      ['HIVEMIND', 'Remembers every filing, model assumption, and board decision — one sovereign source of truth.'],
      ['TARA', 'Handles reporting Q&A and stakeholder calls in real time, grounded in the actual numbers.'],
      ['HYPERAGENTS', 'Reconcile, forecast, stress-test and flag exposure — a desk that watches, decides, and moves.'],
    ],
  },
  planning: {
    label: 'For Planning',
    headline: 'Run strategy with an AI war room.',
    lead: 'Continuity across every cycle — decisions that remember why they were made.',
    lines: [
      ['HIVEMIND', 'Holds the full decision ledger — what was chosen, what was rejected, and why — across cycles.'],
      ['TARA', 'Briefs and debriefs in natural language, surfacing the context behind each plan.'],
      ['HYPERAGENTS', 'A swarm that debates options, pressure-tests assumptions, and converges on a defensible call.'],
    ],
  },
  marketing: {
    label: 'For Marketing',
    headline: 'Run marketing as an AI studio.',
    lead: 'Brand, campaigns, and audience memory that compounds instead of resetting.',
    lines: [
      ['HIVEMIND', 'Remembers brand voice, every campaign, and what actually converted — institutional taste, kept.'],
      ['TARA', 'Becomes your brand’s voice on calls and the web — on-message, multilingual, 24/7.'],
      ['HYPERAGENTS', 'Produce, test, and measure — a swarm that ships creative and kills what doesn’t pay back.'],
    ],
  },
  public: {
    label: 'For the Public Sector',
    headline: 'Run your institution, sovereign.',
    lead: 'GDPR-native AI that serves citizens without data ever leaving your jurisdiction.',
    lines: [
      ['HIVEMIND', 'Sovereign, EU-resident memory of policy, casework, and precedent — auditable end to end.'],
      ['TARA', 'Answers citizen and caseworker queries in real time, in every language you serve.'],
      ['HYPERAGENTS', 'A compliant swarm that handles intake, routing, and casework inside your own infrastructure.'],
    ],
  },
  health: {
    label: 'For Healthcare',
    headline: 'Run care operations, sovereign.',
    lead: 'Protocol-grounded AI that never sends patient context outside the institution.',
    lines: [
      ['HIVEMIND', 'Remembers protocols, pathways, and prior context — compliant, in-walls, sub-50ms.'],
      ['TARA', 'Handles scheduling, triage intake, and follow-up calls with real-time reasoning.'],
      ['HYPERAGENTS', 'A swarm that automates admin and coordination so clinicians stay with patients.'],
    ],
  },
};

const DEFAULT = {
  label: 'For every organization',
  headline: 'Run your company with an AI workforce.',
  lead: 'Your knowledge, decisions, and operations — remembered, reasoned over, and acted on inside your walls.',
  lines: [
    ['HIVEMIND', 'Sovereign memory of every document, decision, and customer context — recalled when work needs it, never sent outside.'],
    ['TARA', 'Fields calls, qualifies requests, and moves work forward — reasoning, not scripts.'],
    ['HYPERAGENTS', 'A swarm that researches, creates, reviews, and executes — grounded in your organization\'s history.'],
  ],
};

const AudienceSection = ({ field, onChange }) => {
  // Earlier homepage visits persisted `legal` as the default field. Treat it
  // as the general story so existing visitors no longer receive legal-only copy.
  const s = field === 'legal' ? DEFAULT : STORIES[field] || DEFAULT;
  return (
    <section className="relative overflow-hidden py-24 md:py-32" style={{ background: '#05070f' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,122,47,0.08),transparent_70%)]" />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <motion.div
          key={field || 'default'}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#ff7a2f]">{s.label}</p>
            {field && onChange && (
              <button onClick={onChange} className="inline-flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/80">
                <RefreshCw size={11} /> change
              </button>
            )}
          </div>
          <h2 className="font-['Space_Grotesk'] mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            {s.headline}
          </h2>
          <p className="mt-5 text-lg font-light leading-relaxed text-white/65">{s.lead}</p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
          {s.lines.map(([name, desc], i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay: i * 0.1, ease }}
              className="bg-[#0a0d18] p-7"
            >
              <p className="font-['Space_Grotesk'] text-sm font-semibold tracking-wide text-white">{name}</p>
              <p className="mt-3 text-[15px] font-light leading-relaxed text-white/55">{desc}</p>
            </motion.div>
          ))}
        </div>

        <a href={HIVEMIND_URL} className="group mt-12 inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white no-underline backdrop-blur-md transition-colors hover:bg-white/20">
          Enter SINGULANCE <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
};

export default AudienceSection;
