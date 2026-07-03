import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, ArrowLeft, ArrowRight, Hexagon } from 'lucide-react';
import { SLIDES, SlideVisual } from '../hivemind/app/shared/WelcomeFlow';

/*
 * WaitlistModal — standalone singulancelabs.com waitlist capture.
 * NOT wired to HIVEMIND. Posts to same-origin /api/waitlist (a tiny relay that
 * writes one row per person into Notion).
 *
 * Rectangular split modal (like the Cal "Talk to us" surface):
 *   left  = one question per step (Name → Email → Use → Niche → Company/notes)
 *   right = auto-rotating showcase of the HIVEMIND feature visuals (reused from
 *           WelcomeFlow so the deck stays in one place).
 * Dark cinematic theme, sharp edges (no rounding).
 */
const ease = [0.22, 1, 0.36, 1];

const NICHES = [
  'SaaS / Software', 'Finance / Banking', 'Healthcare', 'Legal', 'Consulting',
  'Research / Academia', 'Manufacturing', 'Media / Creative', 'Government / Public', 'Other',
];

const FIELD = 'w-full h-12 px-4 bg-white/[0.04] border border-white/15 text-white text-[14px] placeholder-white/35 focus:outline-none focus:border-white/55 transition-colors';
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');

/* ── Right pane: auto-playing feature showcase (dark) ── */
function FeatureShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 3800);
    return () => clearInterval(id);
  }, []);
  const s = SLIDES[i];
  const Icon = s.icon;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'linear-gradient(160deg,#0a1120 0%,#05070f 60%)' }}>
      {/* dot grid */}
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(rgba(17,125,255,0.18) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#117dff]/10 blur-[90px]" />
      <div className="relative h-full flex flex-col p-8">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-white/45">
          <Hexagon size={12} className="text-[#117dff]" /> INSIDE HIVEMIND
        </div>

        {/* animated visual */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease }}
              className="w-full max-w-[300px] aspect-square">
              <SlideVisual kind={s.visual} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* caption */}
        <AnimatePresence mode="wait">
          <motion.div key={`c-${i}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#7cb7ff] mb-2">
              <Icon size={13} /> {s.eyebrow}
            </div>
            <h3 className="text-[22px] leading-tight font-medium text-white tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</h3>
            <div className="flex items-center gap-5 mt-4">
              {s.stats.map(([v, l]) => (
                <div key={l}>
                  <div className="text-[16px] font-semibold text-white tabular-nums leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v}</div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* progress dots */}
        <div className="flex items-center gap-1.5 mt-6">
          {SLIDES.map((sl, j) => (
            <button key={sl.eyebrow} onClick={() => setI(j)} aria-label={sl.eyebrow}
              className="h-1 transition-all duration-300"
              style={{ width: j === i ? 24 : 8, background: j === i ? '#117dff' : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WaitlistModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', use: '', niche: '', company: '', message: '' });
  const [step, setStep] = useState(0);
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');

  // Reset when re-opened
  useEffect(() => {
    if (open) { setStep(0); setState('idle'); setErr(''); }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const STEPS = [
    { key: 'name', label: 'Your name', eyebrow: 'WHO ARE YOU', valid: () => form.name.trim().length > 1 },
    { key: 'email', label: 'Work email', eyebrow: 'WHERE TO REACH YOU', valid: () => emailOk(form.email) },
    { key: 'use', label: 'How will you use HIVEMIND?', eyebrow: 'YOUR WORKSPACE', valid: () => !!form.use },
    { key: 'niche', label: 'Which niche do you belong to?', eyebrow: 'YOUR DOMAIN', valid: () => !!form.niche },
    { key: 'more', label: 'Anything else?', eyebrow: 'ALMOST THERE', valid: () => true },
  ];
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = async () => {
    if (!cur.valid()) { setErr('Please complete this step.'); return; }
    setErr('');
    if (!isLast) { setStep((s) => s + 1); return; }
    // submit
    setState('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'singulancelabs.com/hero' }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setState('done');
    } catch { setErr('Could not submit — please try again.'); setState('error'); }
  };
  const back = () => { setErr(''); if (step > 0) setStep((s) => s - 1); };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,5,12,0.74)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.42, ease }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#05070f] border border-white/12 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] overflow-hidden flex"
            style={{ minHeight: 520 }}
          >
            {/* close */}
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>

            {/* ── LEFT: stepped form ── */}
            <div className="w-full md:w-1/2 flex flex-col p-7 md:p-9">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-8 h-8 bg-[#117dff]/12 border border-[#117dff]/30 flex items-center justify-center">
                  <Hexagon size={16} className="text-[#117dff]" />
                </div>
                <span className="text-[12px] font-bold tracking-[0.2em] text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SINGULANCE</span>
                <span className="text-white/25">/</span>
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/45">Waitlist</span>
              </div>

              {state === 'done' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-white/10 border border-white/20 flex items-center justify-center">
                    <Check size={26} className="text-white" />
                  </div>
                  <h3 className="text-[20px] font-semibold text-white mt-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>You’re on the list</h3>
                  <p className="text-[13px] text-white/55 mt-2 leading-relaxed max-w-[34ch]">Thanks, {form.name.split(' ')[0] || 'there'}. We’ll reach out at <span className="text-white/80">{form.email}</span> as spots open.</p>
                  <button onClick={onClose} className="mt-6 h-11 px-7 bg-white text-[#05070f] text-[11px] font-semibold uppercase tracking-[0.22em] hover:bg-white/90 transition-colors">Done</button>
                </div>
              ) : (
                <>
                  {/* progress */}
                  <div className="flex items-center gap-1.5 mb-6">
                    {STEPS.map((s, j) => (
                      <span key={s.key} className="h-1 flex-1 transition-all duration-300" style={{ background: j <= step ? '#117dff' : 'rgba(255,255,255,0.14)' }} />
                    ))}
                    <span className="ml-2 text-[10px] font-mono text-white/40 tabular-nums">{step + 1}/{STEPS.length}</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                    <AnimatePresence mode="wait">
                      <motion.div key={cur.key}
                        initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.28, ease }}>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#7cb7ff] mb-2.5">
                          <span className="text-white/30">〉</span> {cur.eyebrow}
                        </div>
                        <h2 className="text-[24px] leading-tight font-medium text-white tracking-tight mb-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{cur.label}</h2>

                        {cur.key === 'name' && (
                          <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') next(); }} placeholder="Amar Sai" className={FIELD} />
                        )}
                        {cur.key === 'email' && (
                          <input autoFocus type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') next(); }} placeholder="you@company.com" className={FIELD} />
                        )}
                        {cur.key === 'use' && (
                          <div className="grid grid-cols-2 gap-2.5">
                            {['Personal', 'Enterprise'].map((u) => (
                              <button key={u} type="button" onClick={() => { set('use', u); }}
                                className={`h-16 flex flex-col items-center justify-center gap-1 border text-[13px] font-semibold uppercase tracking-[0.14em] transition-all ${form.use === u ? 'bg-white text-[#05070f] border-white' : 'bg-white/[0.04] text-white/70 border-white/15 hover:border-white/45'}`}>
                                {u}
                              </button>
                            ))}
                          </div>
                        )}
                        {cur.key === 'niche' && (
                          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {NICHES.map((n) => (
                              <button key={n} type="button" onClick={() => set('niche', n)}
                                className={`h-11 px-3 text-left text-[12px] font-medium border transition-all ${form.niche === n ? 'bg-white text-[#05070f] border-white' : 'bg-white/[0.04] text-white/65 border-white/12 hover:border-white/40'}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                        {cur.key === 'more' && (
                          <div className="space-y-3">
                            <input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Company (optional)" className={FIELD} />
                            <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={3}
                              placeholder="What are you hoping to solve? (optional)"
                              className="w-full px-4 py-3 bg-white/[0.04] border border-white/15 text-white text-[14px] placeholder-white/35 focus:outline-none focus:border-white/55 transition-colors resize-none" />
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {err && <p className="text-[12px] text-red-400 mt-3">{err}</p>}

                  {/* nav */}
                  <div className="flex items-center justify-between mt-6">
                    <button onClick={back} disabled={step === 0}
                      className="h-11 px-4 flex items-center gap-1.5 text-[12px] font-medium text-white/55 hover:text-white disabled:opacity-0 transition-colors">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button onClick={next} disabled={state === 'sending'}
                      className="h-11 px-6 bg-white text-[#05070f] text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-white/90 disabled:opacity-60 transition-colors flex items-center gap-2">
                      {state === 'sending' ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                        : isLast ? 'Request access' : <>Continue <ArrowRight size={15} /></>}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── RIGHT: feature showcase (desktop only) ── */}
            <div className="hidden md:block md:w-1/2 border-l border-white/8">
              <FeatureShowcase />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
