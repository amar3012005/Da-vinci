import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { PRODUCT_CATALOG } from './productCatalog';

/**
 * AudienceSection — the adaptive narration. Content swaps based on the field the
 * visitor picked in FieldPicker, mapping the three products (TARA / HIVEMIND /
 * HYPERAGENTS) onto that function. Falls back to a generic story if no choice.
 * Sits right after the sub-product stack.
 */
const ease = [0.16, 1, 0.3, 1];

const ROLE_LINES = PRODUCT_CATALOG.filter(product => product.name !== 'ICARUS').map(product => [product.name, product.text]);
const STORIES = {
  finance: { label: 'For finance teams', headline: 'Connect financial context to the next piece of work.', lead: 'For example, bring together planning assumptions and previous decisions, then coordinate research and reporting work for review.' },
  planning: { label: 'For planning teams', headline: 'Keep the reasoning connected to the plan.', lead: 'For example, connect earlier decisions to a new priority, then coordinate specialist research and track the questions that remain.' },
  marketing: { label: 'For marketing teams', headline: 'Carry company context into campaign work.', lead: 'For example, connect brand guidance and campaign decisions, then coordinate research, drafts and reviewed next steps.' },
  public: { label: 'For public-sector teams', headline: 'Keep shared context connected to the work.', lead: 'For example, connect authorized policy documents and previous decisions, then coordinate research and preparation for your team to review.' },
  health: { label: 'For healthcare operations', headline: 'Bring operational context into coordination.', lead: 'For example, connect authorized operational documents and meeting commitments, then prepare administrative work for your team to review.' },
};
const DEFAULT = {
  label: 'For every organization', headline: 'Company understanding. Coordinated specialist work.',
  lead: 'HIVEMIND develops the shared understanding. Runtime anticipates what needs attention and coordinates HyperAgents to carry the work forward.',
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
          {ROLE_LINES.map(([name, desc], i) => (
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

        <a href="#early-access" className="group mt-12 inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white no-underline backdrop-blur-md transition-colors hover:bg-white/20">
          Join early access <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
};

export default AudienceSection;
