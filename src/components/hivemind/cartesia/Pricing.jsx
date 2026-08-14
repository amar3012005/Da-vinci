import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

/**
 * Pricing — the SINGULANCE / HIVEMIND product ladder: persistent memory,
 * autonomous work, voice execution, and sovereign institutional deployment.
 */

const BLUE = '#117dff';
const ease = [0.16, 1, 0.3, 1];
// Keep the estimator implementation available for a later governed launch,
// but do not publish provisional custom pricing to customers yet.
const SHOW_SCOPE_ESTIMATOR = false;

const StripedSeparator = () => (
  <div className="h-6 sm:h-8" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #efece5 0, #efece5 1px, transparent 1px, transparent 8px)' }} />
);

const SELF_SERVE_TIERS = [
  {
    id: 'free', name: 'Free', product: 'BRAIN', tag: 'Build a Brain that remembers your work.',
    monthly: 0, annual: 0, cta: 'Start free', pop: false,
    pages: '100',
    features: [
      'Grounded recall from your own sources', 'PDF, DOCX, XLSX ingestion',
      'Up to 3 connected sources', 'Personal history preview', 'Community support',
    ],
  },
  {
    id: 'plus', name: 'Plus', product: 'BRAIN+', tag: 'Keep your work history permanently.',
    monthly: 39, annual: 390, annualSave: 78, cta: 'Get Plus', pop: false,
    pages: '1,000',
    features: [
      'Everything in Free', 'Permanent personal history',
      'More source types and connectors', 'Deeper recall across your own work',
      'No per-query credits',
    ],
  },
  {
    id: 'pro', name: 'Pro', product: 'BRAIN + HyperAgents', tag: 'Give your Brain work to carry out.',
    monthly: 79, annual: 790, annualSave: 158, cta: 'Get Pro', pop: true,
    pages: 'Higher capacity',
    features: [
      'Everything in Plus', 'Included HyperAgent runs each month',
      'Deep Research and Web Intelligence allowance',
      'Connected-app actions with your approval',
      'Optional HyperAgent Packs when included runs are used',
    ],
  },
  {
    id: 'scale', name: 'Scale', product: 'BRAIN + HyperAgents + TARA', tag: 'Operate with a small AI team.',
    monthly: 239, annual: 2390, annualSave: 478, cta: 'Get Scale', pop: false,
    pages: '10,000', circle: 'Up to 3 trusted collaborators',
    features: [
      'Everything in Pro', 'Larger HyperAgent allowance',
      'TARA voice agent with included talk time',
      'Up to 3 trusted collaborators', 'Priority support',
      'Optional HyperAgent and TARA Talk Packs',
    ],
  },
];

const ENTERPRISE_FEATURES = [
  'Sovereign institutional BRAIN',
  'Governed HyperAgents and TARA',
  'Dedicated, managed, or self-hosted deployment',
  'Organisation-wide identity, audit, and policy controls',
  'Contracted security, support, and service levels',
];

const fmtEUR = (n) => `€${n.toLocaleString('en-US')}`;

const PricingCard = ({ tier, annual, index }) => {
  const navigate = useNavigate();
  const price = tier.monthly === null
    ? 'Custom'
    : (annual ? Math.round(tier.annual / 12) : tier.monthly);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6, ease }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col rounded-xl border bg-white p-6 ${tier.pop ? 'border-[#117dff] shadow-[0_20px_60px_-24px_rgba(17,125,255,0.35)]' : 'border-[#e7e4dd]'}`}
    >
      {tier.pop && (
        <span className="absolute -top-3 left-6 rounded-full px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: BLUE }}>
          Most popular
        </span>
      )}
      <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: BLUE }}>
        {tier.product}
      </p>
      <p className="font-['Space_Grotesk'] text-lg font-semibold text-[#0a0a0a]">{tier.name}</p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6b6b]">{tier.tag}</p>

      <div className="mt-6 flex items-baseline gap-1">
        {price === 'Custom' ? (
          <span className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-[#0a0a0a]">Custom</span>
        ) : (
          <>
            <span className="font-['Space_Grotesk'] text-4xl font-bold tracking-tight text-[#0a0a0a]">{fmtEUR(price)}</span>
            <span className="font-mono text-[11px] text-[#a39e92]">/mo</span>
          </>
        )}
      </div>
      {annual && tier.annualSave && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0fa36b]">
          {fmtEUR(tier.annual)}/yr · save {fmtEUR(tier.annualSave)}
        </p>
      )}

      <div className={`mt-5 grid gap-2 border-t border-[#efece5] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a39e92] ${tier.circle ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <p className="text-[#0a0a0a]">{tier.pages}</p>
          <p className="mt-0.5">{tier.pages === 'Higher capacity' ? 'memory capacity' : 'pages included'}</p>
        </div>
        {tier.circle && <div>
          <p className="text-[#0a0a0a]">Private Circle</p>
          <p className="mt-0.5 normal-case tracking-normal">{tier.circle}</p>
        </div>}
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] text-[#3d3b36]">
            <Check size={13} className="mt-0.5 shrink-0" style={{ color: BLUE }} /> {f}
          </li>
        ))}
      </ul>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/hivemind/login')}
        className={`mt-6 w-full rounded-full py-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] transition-colors ${tier.pop ? 'text-white' : 'border border-[#e7e4dd] bg-white text-[#0a0a0a] hover:border-[#d4d0ca] hover:bg-[#f7f5f0]'}`}
        style={tier.pop ? { background: BLUE } : {}}
      >
        {tier.cta}
      </motion.button>
    </motion.div>
  );
};

const EnterpriseSection = () => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease }}
      className="mt-16 border-t border-[#e3e0db] pt-16"
    >
      <div className="overflow-hidden rounded-2xl border border-[#d9e8ff] bg-[linear-gradient(135deg,#ffffff_0%,#f3f8ff_100%)] p-7 sm:p-9 lg:p-11">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: BLUE }}>For organisations</p>
            <h3 className="mt-3 max-w-xl font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#0a0a0a] sm:text-4xl">
              Bring a proven Brain into your organisation securely.
            </h3>
            <p className="mt-4 max-w-xl text-[14px] leading-7 text-[#5f625f]">
              Enterprise turns successful individual adoption into an institution-wide AI operating layer—with the governance, deployment, and contractual controls your organisation requires.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/hivemind/login')}
              className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-white"
              style={{ background: BLUE }}
            >
              Bring HIVEMIND to my organisation <ArrowRight size={13} />
            </motion.button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {ENTERPRISE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 rounded-lg border border-white/80 bg-white/75 px-4 py-3 text-[13px] text-[#343836]">
                <Check size={14} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

/* ───────── Sovereign scope estimator ───────── */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const Slider = ({ label, value, onChange, min, max, step, fmt }) => (
  <div>
    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#a39e92]">
      <span>{label}</span>
      <span className="text-[#0a0a0a]">{fmt(value)}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-2 w-full accent-[#117dff]"
    />
  </div>
);

const ScopeEstimator = () => {
  const [mode, setMode] = useState('managed');
  const [dataGb, setDataGb] = useState(500);
  const [seats, setSeats] = useState(10);
  const [tokens, setTokens] = useState(20);

  const calc = useMemo(() => {
    if (mode === 'managed') {
      const storage = Math.round(dataGb * 0.4);
      const seatCost = seats * 18;
      const tokenCost = tokens * 6;
      const total = storage + seatCost + tokenCost;
      return {
        rows: [
          ['Managed storage', `${dataGb}GB @ €0.40/GB`, storage],
          ['User seats', `${seats} @ €18/seat`, seatCost],
          ['Token processing', `${tokens}M @ €6/M`, tokenCost],
        ],
        total, setup: 0,
        note: 'Managed: we run the stack in our EU cloud. Zero ops on your side.',
      };
    }
    const license = 5500;
    const seatCost = seats * 18;
    const tokenCost = tokens * 6;
    const opsSurcharge = 2100;
    const total = license + seatCost + tokenCost + opsSurcharge;
    return {
      rows: [
        ['Sovereign license + remote support', 'flat', license],
        ['Storage: your own infrastructure', '—', 0],
        ['User seats', `${seats} @ €18/seat`, seatCost],
        ['Token processing', `${tokens}M @ €6/M`, tokenCost],
        ['Self-hosted ops surcharge', 'audits, deployment eng, air-gap mgmt', opsSurcharge],
      ],
      total, setup: 27500,
      note: 'Self-Hosted: you own the hardware, we deliver the stack. Your data never leaves your perimeter.',
    };
  }, [mode, dataGb, seats, tokens]);

  return (
    <div className="rounded-xl border border-[#e7e4dd] bg-white p-6 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#a39e92]">Sovereign scope estimator</p>
      <h3 className="mt-2 font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-[#0a0a0a]">
        Configure your deployment
      </h3>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#6b6b6b]">
        Pricing confirmed on a call — these are scoping anchors. Switch between deployment modes to compare.
      </p>

      <div className="mt-6 inline-flex rounded-full border border-[#e7e4dd] p-1">
        {[['managed', 'Managed'], ['self-hosted', 'Self-Hosted']].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)}
            className="relative rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
            style={{ color: mode === id ? 'white' : '#6b6b6b' }}>
            {mode === id && (
              <motion.span layoutId="scope-mode-pill" className="absolute inset-0 rounded-full" style={{ background: BLUE }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <Slider label="Data pack (GB)" value={dataGb} onChange={(v) => setDataGb(clamp(v, 50, 5000))}
            min={50} max={5000} step={50} fmt={(v) => `${v}GB`} />
          <Slider label="User seats" value={seats} onChange={(v) => setSeats(clamp(v, 1, 200))}
            min={1} max={200} step={1} fmt={(v) => `${v} seats`} />
          <Slider label="Token budget (M/mo)" value={tokens} onChange={(v) => setTokens(clamp(v, 1, 200))}
            min={1} max={200} step={1} fmt={(v) => `${v}M tokens`} />
        </div>

        <div className="rounded-lg bg-[#f7f5f0] p-5">
          {calc.rows.map(([label, sub, cost]) => (
            <div key={label} className="flex items-start justify-between border-b border-[#e7e4dd]/70 py-2.5 last:border-b-0">
              <div>
                <p className="text-[12.5px] font-medium text-[#0a0a0a]">{label}</p>
                <p className="font-mono text-[10px] text-[#a39e92]">{sub}</p>
              </div>
              <p className="font-mono text-[12.5px] text-[#0a0a0a]">{fmtEUR(cost)}</p>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t border-[#0a0a0a]/10 pt-3">
            <p className="font-['Space_Grotesk'] text-sm font-semibold text-[#0a0a0a]">Monthly total (ex. VAT)</p>
            <p className="font-['Space_Grotesk'] text-xl font-bold text-[#0a0a0a]">{fmtEUR(calc.total)}/mo</p>
          </div>
          {calc.setup > 0 && (
            <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[#a39e92]">
              + one-time deployment &amp; security setup {fmtEUR(calc.setup)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-[#6b6b6b]">{calc.note}</p>
      {mode === 'self-hosted' && (
        <p className="mt-1 text-[12px] leading-relaxed text-[#6b6b6b]">
          Includes air-gap deployment package, PQC key rotation tooling, and bi-annual security audit.
          Requires a dedicated DevOps contact on your side.
        </p>
      )}
    </div>
  );
};

const Pricing = () => {
  const [annual, setAnnual] = useState(false);
  return (
    <div id="pricing" className="scroll-mt-16 bg-[#faf9f4] text-[#0a0a0a]">
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
        <section className="relative">
          <StripedSeparator />
          <div className="px-4 sm:px-8 lg:px-16 py-14 sm:py-20 lg:py-24">
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: BLUE }}>⟩ pricing</p>
              <h2 className="mx-auto mt-4 max-w-2xl font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#0a0a0a] sm:text-4xl md:text-5xl">
                Start with memory.<br />Grow into an AI workforce.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-[#6b6b6b]">
                Your BRAIN remains yours. Upgrade when you want more capacity, autonomous work, voice, or institutional control.
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-[#e7e4dd] bg-white p-1">
                {[['monthly', false], ['annual', true]].map(([label, val]) => (
                  <button key={label} onClick={() => setAnnual(val)}
                    className="relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
                    style={{ color: annual === val ? 'white' : '#6b6b6b' }}>
                    {annual === val && (
                      <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full" style={{ background: BLUE }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    )}
                    <span className="relative">{label}</span>
                    {val && <span className="relative rounded-full bg-[#0fa36b]/15 px-1.5 py-0.5 text-[9px] text-[#0fa36b]">TWO MONTHS FREE · SAVE 17%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {SELF_SERVE_TIERS.map((tier, i) => <PricingCard key={tier.id} tier={tier} annual={annual} index={i} />)}
            </div>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#a39e92]">
              Your Brain remains accessible. Included agent and voice capacity resets monthly. Extra capacity is opt-in—never a surprise invoice.
            </p>

            {SHOW_SCOPE_ESTIMATOR && (
              <div className="mt-16">
                <ScopeEstimator />
              </div>
            )}

            <EnterpriseSection />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Pricing;
