import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Scale, Banknote, Compass, Megaphone, Building2, HeartPulse, Shield } from 'lucide-react';
import Seo from './Seo';
import SingulanceFooter from './mobile/SingulanceFooter';

/**
 * SolutionPage — dedicated per-field walkthrough (top → bottom value proposition).
 * Driven by SOLUTIONS[field]. Cinematic SINGULANCE dark theme. Legal is fully
 * fleshed; the other fields share the same template with their own content.
 * Routed at /solutions/:field, opened from the homepage field picker.
 */
const ease = [0.16, 1, 0.3, 1];
const VOID = '#05070f';

const SOLUTIONS = {
  legal: {
    icon: Scale,
    label: 'Solutions · Legal',
    title: 'Run your legal function as an AI firm.',
    lead: 'Every matter, contract, and precedent — remembered, reasoned over, and acted on inside your walls. SINGULANCE turns your legal team into a sovereign AI workforce that never forgets a clause and never sends a document outside.',
    plate: '/sp-hivemind.webp',
    problem: {
      title: 'Legal runs on memory — and today’s AI has none.',
      body: 'A legal function is institutional memory: every matter, every redline, every precedent, every regulator interaction. Generic AI forgets the moment the session ends, and sending privileged documents to a US API is a non-starter. The result is brilliant tools no regulated firm can actually deploy.',
      points: [
        ['Context dies each session', 'A model that re-learns the matter every prompt cannot continue work — it restarts it.'],
        ['Privilege can’t leave the walls', 'Privileged and client-confidential material cannot be sent to an external, non-sovereign API.'],
        ['Knowledge walks out the door', 'When a senior associate leaves, the “why” behind every past decision leaves with them.'],
      ],
    },
    steps: [
      ['01', 'Ingest the matter', 'Connect your DMS, contracts, email, and case history. HIVEMIND builds a sovereign, graph-linked memory of every matter, clause, party, and decision — in-walls, EU-resident.'],
      ['02', 'Recall in sub-50ms', 'Ask “what did we agree with this counterparty in 2023, and is it still in force?” — answered across thousands of documents, bi-temporally (what was true vs what we knew), in milliseconds.'],
      ['03', 'Put agents to work', 'HYPERAGENTS draft, redline, and review against your own precedent — flagging the risk a regulator would, grounded in your firm’s actual positions, not the open web.'],
      ['04', 'Stay sovereign', 'Every byte stays inside your infrastructure. GDPR-native, auditable end-to-end, privilege preserved by design.'],
    ],
    stack: [
      ['HIVEMIND', 'Sovereign memory of every matter, clause, and decision — recalled in sub-50ms, never sent outside.'],
      ['TARA', 'Fields client and intake calls, qualifies matters, and books counsel — reasoning in real time, not reading a script.'],
      ['HYPERAGENTS', 'A swarm that drafts, redlines, and reviews — flagging risk and missing carve-outs, grounded in your firm’s history.'],
    ],
    value: [
      ['10×', 'faster matter recall vs manual DMS search'],
      ['100%', 'privilege kept in-walls — zero external data transfer'],
      ['24/7', 'intake and triage that never sleeps'],
      ['0', 'institutional knowledge lost to turnover'],
    ],
  },
  finance: {
    icon: Banknote, label: 'Solutions · Finance',
    title: 'Run your finance function as an AI desk.',
    lead: 'Every filing, model, and number — continuous, auditable, and compliant by design. A sovereign AI workforce that watches, reconciles, and forecasts inside your walls.',
    plate: '/sp-hivemind.webp',
    problem: { title: 'Finance is continuity — and AI keeps resetting.', body: 'Every model assumption, board decision, and filing is context that must persist and reconcile. Generic AI forgets it, and material non-public data cannot leave the building.', points: [['No continuity', 'A model that forgets last quarter cannot reconcile this one.'], ['MNPI can’t leave', 'Material non-public information cannot touch an external API.'], ['Audit trail gaps', 'Decisions without a remembered “why” fail audit.']] },
    steps: [['01','Ingest','Connect ERP, filings, models, and board decks into sovereign memory.'],['02','Recall','Query any assumption, filing, or decision across years in sub-50ms.'],['03','Automate','Agents reconcile, forecast, stress-test, and flag exposure.'],['04','Stay sovereign','EU-resident, auditable, MNPI never leaves.']],
    stack: [['HIVEMIND','Remembers every filing, model assumption, and board decision — one sovereign source of truth.'],['TARA','Handles reporting Q&A and stakeholder calls in real time, grounded in the actual numbers.'],['HYPERAGENTS','Reconcile, forecast, stress-test, and flag exposure — a desk that watches, decides, and moves.']],
    value: [['10×','faster close prep'],['100%','MNPI in-walls'],['24/7','continuous monitoring'],['0','audit-trail gaps']],
  },
  planning: {
    icon: Compass, label: 'Solutions · Planning',
    title: 'Run strategy with an AI war room.',
    lead: 'Continuity across every cycle — decisions that remember why they were made. A sovereign swarm that debates options and pressure-tests assumptions.',
    plate: '/sp-hyperagents.webp',
    problem: { title: 'Strategy forgets why it chose.', body: 'Plans are made, cycles pass, and the reasoning evaporates. Without a decision ledger, every cycle re-argues settled questions.', points: [['Lost rationale','The “why” behind past calls disappears.'],['Re-litigation','Each cycle re-argues what was already decided.'],['No dissent record','Rejected options and their reasons vanish.']] },
    steps: [['01','Ingest','Capture decisions, options, and rationale into memory.'],['02','Recall','Surface the full decision ledger on demand.'],['03','Debate','A swarm argues options and pressure-tests assumptions.'],['04','Converge','Reach a defensible, documented call.']],
    stack: [['HIVEMIND','Holds the full decision ledger — what was chosen, rejected, and why — across cycles.'],['TARA','Briefs and debriefs in natural language, surfacing the context behind each plan.'],['HYPERAGENTS','A swarm that debates options, pressure-tests assumptions, and converges on a defensible call.']],
    value: [['100%','decisions with remembered rationale'],['0','re-litigated questions'],['N','options weighed in parallel'],['24/7','always-on war room']],
  },
  marketing: {
    icon: Megaphone, label: 'Solutions · Marketing',
    title: 'Run marketing as an AI studio.',
    lead: 'Brand, campaigns, and audience memory that compounds instead of resetting. A sovereign workforce that produces, tests, and measures.',
    plate: '/singulance-cover.webp',
    problem: { title: 'Brand memory keeps resetting to zero.', body: 'Voice, campaigns, and what actually converted are institutional taste — generic AI forgets it and reverts to generic.', points: [['Off-brand drift','Every tool restarts without your voice.'],['Lost learnings','What converted last quarter is forgotten.'],['Fragmented context','Brand knowledge scattered across tools.']] },
    steps: [['01','Ingest','Connect brand guidelines, campaigns, and analytics.'],['02','Recall','Surface voice, assets, and what worked instantly.'],['03','Produce','A swarm ships creative and measures it.'],['04','Compound','Every campaign makes the next one smarter.']],
    stack: [['HIVEMIND','Remembers brand voice, every campaign, and what actually converted — institutional taste, kept.'],['TARA','Becomes your brand’s voice on calls and the web — on-message, multilingual, 24/7.'],['HYPERAGENTS','Produce, test, and measure — a swarm that ships creative and kills what doesn’t pay back.']],
    value: [['10×','faster campaign turnaround'],['100%','on-brand output'],['24/7','always-on studio'],['∞','compounding audience memory']],
  },
  public: {
    icon: Building2, label: 'Solutions · Public Sector',
    title: 'Run your institution, sovereign.',
    lead: 'GDPR-native AI that serves citizens without data ever leaving your jurisdiction. A compliant workforce inside your own infrastructure.',
    plate: '/sp-hivemind.webp',
    problem: { title: 'Public service can’t use non-sovereign AI.', body: 'Citizen data cannot leave the jurisdiction, and casework demands auditable continuity. That rules out generic cloud AI entirely.', points: [['Residency','Citizen data must stay in-jurisdiction.'],['Auditability','Every action must be traceable.'],['Continuity','Casework spans years and staff.']] },
    steps: [['01','Ingest','Policy, casework, and precedent into sovereign memory.'],['02','Recall','Surface precedent and context in sub-50ms.'],['03','Serve','Agents handle intake, routing, and casework.'],['04','Stay sovereign','EU-resident, auditable, in-walls.']],
    stack: [['HIVEMIND','Sovereign, EU-resident memory of policy, casework, and precedent — auditable end to end.'],['TARA','Answers citizen and caseworker queries in real time, in every language you serve.'],['HYPERAGENTS','A compliant swarm that handles intake, routing, and casework inside your own infrastructure.']],
    value: [['100%','in-jurisdiction data'],['24/7','citizen service'],['0','external data transfer'],['∞','auditable trail']],
  },
  health: {
    icon: HeartPulse, label: 'Solutions · Healthcare',
    title: 'Run care operations, sovereign.',
    lead: 'Protocol-grounded AI that never sends patient context outside the institution. A compliant workforce that frees clinicians from admin.',
    plate: '/sp-tara.webp',
    problem: { title: 'Patient context can’t leave — but admin is drowning teams.', body: 'Clinicians lose hours to coordination while patient data legally cannot touch an external API.', points: [['Confidentiality','Patient context must stay in-walls.'],['Admin overload','Coordination steals clinical time.'],['Protocol drift','Guidance scattered and forgotten.']] },
    steps: [['01','Ingest','Protocols, pathways, and prior context into sovereign memory.'],['02','Recall','Surface the right protocol in sub-50ms.'],['03','Automate','Agents handle scheduling, intake, and follow-up.'],['04','Stay sovereign','Compliant, in-walls, auditable.']],
    stack: [['HIVEMIND','Remembers protocols, pathways, and prior context — compliant, in-walls, sub-50ms.'],['TARA','Handles scheduling, triage intake, and follow-up calls with real-time reasoning.'],['HYPERAGENTS','A swarm that automates admin and coordination so clinicians stay with patients.']],
    value: [['100%','patient data in-walls'],['10×','less admin overhead'],['24/7','scheduling & follow-up'],['0','protocol drift']],
  },
};

const SolutionPage = () => {
  const { field } = useParams();
  const navigate = useNavigate();
  const s = SOLUTIONS[field] || SOLUTIONS.legal;
  const Icon = s.icon;

  return (
    <div style={{ background: VOID }} className="min-h-screen font-['Inter'] text-white">
      <Seo
        title={`${s.label.replace('Solutions · ', '')} — ${s.title} | SINGULANCE`}
        description={s.lead}
        canonical={`https://singulancelabs.com/solutions/${field || 'legal'}`}
      />

      {/* nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#05070f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-transparent text-[14px] font-medium text-white/70 hover:text-white">
            <ArrowLeft size={15} /> SINGULANCE
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">{s.label.replace('Solutions · ', '')}</span>
        </div>
      </nav>

      {/* hero */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_70%_0%,rgba(255,122,47,0.10),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-[1100px] items-center gap-10 px-6 py-20 md:grid-cols-[1fr_360px] md:py-28">
          <div>
            <div className="flex items-center gap-2 text-[#ff7a2f]">
              <Icon size={18} />
              <p className="font-mono text-[11px] uppercase tracking-[0.3em]">{s.label}</p>
            </div>
            <h1 className="font-['Space_Grotesk'] mt-6 text-4xl font-semibold leading-[1.04] tracking-tight md:text-6xl">{s.title}</h1>
            <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/65">{s.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/hivemind" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black no-underline transition-transform hover:scale-[1.02]">
                Enter SINGULANCE <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a href="mailto:enterprise@singulancelabs.com" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white no-underline transition-colors hover:bg-white/10">
                Talk to sales
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
            <img src={s.plate} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070f] via-transparent to-transparent" />
          </div>
        </div>
      </header>

      {/* the problem */}
      <section className="border-t border-white/8 py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="font-['Space_Grotesk'] max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{s.problem.title}</h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/60">{s.problem.body}</p>
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
            {s.problem.points.map(([t, d], i) => (
              <div key={i} className="bg-[#0a0d18] p-7">
                <p className="font-['Space_Grotesk'] text-base font-semibold text-white">{t}</p>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-white/55">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* walkthrough */}
      <section className="border-t border-white/8 py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/45">The walkthrough</p>
          <h2 className="font-['Space_Grotesk'] mt-4 text-3xl font-semibold tracking-tight md:text-4xl">From documents to a working AI function.</h2>
          <div className="mt-12 space-y-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
            {s.steps.map(([n, t, d], i) => (
              <motion.div
                key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: i * 0.06, ease }}
                className="grid grid-cols-[60px_1fr] gap-5 bg-[#0a0d18] p-7 md:grid-cols-[80px_240px_1fr] md:items-baseline"
              >
                <span className="font-mono text-[13px] text-[#ff7a2f]">{n}</span>
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold tracking-tight">{t}</h3>
                <p className="col-span-2 text-[15px] font-light leading-relaxed text-white/55 md:col-span-1">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* the stack mapped */}
      <section className="border-t border-white/8 py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/45">The stack, applied</p>
          <h2 className="font-['Space_Grotesk'] mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Three minds, one function.</h2>
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
            {s.stack.map(([name, desc], i) => (
              <div key={i} className="bg-[#0a0d18] p-7">
                <p className="font-['Space_Grotesk'] text-sm font-semibold tracking-wide">{name}</p>
                <p className="mt-3 text-[15px] font-light leading-relaxed text-white/55">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* value props */}
      <section className="border-t border-white/8 py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="font-['Space_Grotesk'] text-3xl font-semibold tracking-tight md:text-4xl">What you get.</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {s.value.map(([v, l], i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-[#0a0d18] p-6">
                <div className="font-['Space_Grotesk'] text-4xl font-semibold text-white">{v}</div>
                <div className="mt-2 text-[13px] leading-snug text-white/55">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* sovereignty band */}
      <section className="border-t border-white/8 py-20 md:py-24" style={{ background: '#070a14' }}>
        <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Shield size={28} className="mt-1 shrink-0 text-[#ff7a2f]" />
            <div>
              <h2 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight md:text-3xl">Sovereign by design.</h2>
              <p className="mt-2 max-w-xl text-[15px] font-light leading-relaxed text-white/60">EU-resident, GDPR-native, and run inside your own walls. Your data never leaves — that is the whole point.</p>
            </div>
          </div>
          <a href="/research" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white no-underline transition-colors hover:bg-white/10">
            See the research <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="px-6 py-24 md:py-28" style={{ background: '#ff5229' }}>
          <div className="mx-auto max-w-[1100px]">
            <h2 className="font-['Space_Grotesk'] text-3xl font-semibold leading-tight text-white md:text-5xl">{s.title}</h2>
            <p className="mt-4 max-w-xl text-[16px] text-white/85">Run your institution as an AI company — sovereign, GDPR-native, inside your walls.</p>
            <a href="/hivemind" className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-[14px] font-semibold text-white no-underline transition-transform hover:scale-[1.02]">
              Enter SINGULANCE <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <SingulanceFooter />
    </div>
  );
};

export default SolutionPage;
