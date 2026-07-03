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
 * Light / day-mode split surface (matches the Cal "Talk to us" modal + the
 * post-login WelcomeSlides blueprint aesthetic):
 *   left  = one question per step (Name → Email → Use → Niche → Company/notes)
 *   right = auto-rotating showcase of the HIVEMIND feature visuals (reused from
 *           WelcomeFlow) on the ivory dot-grid canvas with a white terminal card.
 * Sharp edges (no rounding).
 */
const ease = [0.22, 1, 0.36, 1];

const NICHES = [
  'SaaS / Software', 'Finance / Banking', 'Healthcare', 'Legal', 'Consulting',
  'Research / Academia', 'Manufacturing', 'Media / Creative', 'Government / Public', 'Other',
];

const FIELD = 'w-full h-12 px-4 bg-white border border-[#e3e0db] text-[#0a0a0a] text-[14px] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all';
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');

/* ── Right pane: day-mode feature showcase (blueprint, like WelcomeSlides) ── */
function FeatureShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 3800);
    return () => clearInterval(id);
  }, []);
  const s = SLIDES[i];
  const Icon = s.icon;
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#faf9f4]">
      {/* dot grid */}
      <div className="absolute inset-0 opacity-[0.55]" style={{ backgroundImage: 'radial-gradient(rgba(17,125,255,0.13) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-[#117dff]/[0.06] blur-[90px]" />
      <div className="relative h-full flex flex-col p-8">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#a3a3a3]">
          <Hexagon size={12} className="text-[#117dff]" /> INSIDE HIVEMIND
        </div>

        {/* animated visual inside a white terminal card */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4, ease }}
              className="w-full max-w-[300px]">
              <div className="bg-white border border-[#e3e0db] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <span className="ml-2 text-[9px] font-mono text-[#a3a3a3] flex items-center gap-1"><Icon size={10} className="text-[#117dff]" /> {s.eyebrow.toLowerCase()}</span>
                </div>
                <div className="aspect-[4/3] p-6"><SlideVisual kind={s.visual} /></div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* caption */}
        <AnimatePresence mode="wait">
          <motion.div key={`c-${i}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#117dff] mb-2">
              <span className="text-[#a3a3a3]">〉</span> {s.eyebrow}
            </div>
            <h3 className="text-[22px] leading-tight font-medium text-[#0a0a0a] tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</h3>
            <div className="flex items-center gap-5 mt-4">
              {s.stats.map(([v, l]) => (
                <div key={l}>
                  <div className="text-[16px] font-semibold text-[#0a0a0a] tabular-nums leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v}</div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] mt-1">{l}</div>
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
              style={{ width: j === i ? 24 : 8, background: j === i ? '#117dff' : '#d4d0ca' }} />
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

  useEffect(() => { if (open) { setStep(0); setState('idle'); setErr(''); } }, [open]);

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
          style={{ background: 'rgba(10,10,10,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.42, ease }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white border border-[#e3e0db] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.35)] overflow-hidden flex"
            style={{ minHeight: 520 }}
          >
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">
              <X size={18} />
            </button>

            {/* ── LEFT: stepped form (white) ── */}
            <div className="w-full md:w-1/2 flex flex-col p-7 md:p-9">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-8 h-8 bg-[#117dff]/10 border border-[#117dff]/25 flex items-center justify-center">
                  <Hexagon size={16} className="text-[#117dff]" />
                </div>
                <span className="text-[12px] font-bold tracking-[0.2em] text-[#0a0a0a]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SINGULANCE</span>
                <span className="text-[#d4d0ca]">/</span>
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#a3a3a3]">Waitlist</span>
              </div>

              {state === 'done' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-[#117dff]/10 border border-[#117dff]/25 flex items-center justify-center">
                    <Check size={26} className="text-[#117dff]" />
                  </div>
                  <h3 className="text-[20px] font-semibold text-[#0a0a0a] mt-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>You’re on the list</h3>
                  <p className="text-[13px] text-[#737373] mt-2 leading-relaxed max-w-[34ch]">Thanks, {form.name.split(' ')[0] || 'there'}. We’ll reach out at <span className="text-[#0a0a0a] font-medium">{form.email}</span> as spots open.</p>
                  <button onClick={onClose} className="mt-6 h-11 px-7 bg-[#0a0a0a] text-white text-[11px] font-semibold uppercase tracking-[0.22em] hover:bg-[#262626] transition-colors">Done</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-6">
                    {STEPS.map((s, j) => (
                      <span key={s.key} className="h-1 flex-1 transition-all duration-300" style={{ background: j <= step ? '#117dff' : '#e3e0db' }} />
                    ))}
                    <span className="ml-2 text-[10px] font-mono text-[#a3a3a3] tabular-nums">{step + 1}/{STEPS.length}</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                    <AnimatePresence mode="wait">
                      <motion.div key={cur.key}
                        initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.28, ease }}>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2.5">
                          <span className="text-[#a3a3a3]">〉</span> {cur.eyebrow}
                        </div>
                        <h2 className="text-[24px] leading-tight font-medium text-[#0a0a0a] tracking-tight mb-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{cur.label}</h2>

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
                              <button key={u} type="button" onClick={() => set('use', u)}
                                className={`h-16 flex items-center justify-center border text-[13px] font-semibold uppercase tracking-[0.14em] transition-all ${form.use === u ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#525252] border-[#e3e0db] hover:border-[#0a0a0a]'}`}>
                                {u}
                              </button>
                            ))}
                          </div>
                        )}
                        {cur.key === 'niche' && (
                          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {NICHES.map((n) => (
                              <button key={n} type="button" onClick={() => set('niche', n)}
                                className={`h-11 px-3 text-left text-[12px] font-medium border transition-all ${form.niche === n ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#525252] border-[#e3e0db] hover:border-[#0a0a0a]'}`}>
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
                              className="w-full px-4 py-3 bg-white border border-[#e3e0db] text-[#0a0a0a] text-[14px] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all resize-none" />
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {err && <p className="text-[12px] text-[#dc2626] mt-3">{err}</p>}

                  <div className="flex items-center justify-between mt-6">
                    <button onClick={back} disabled={step === 0}
                      className="h-11 px-4 flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0a0a0a] disabled:opacity-0 transition-colors">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button onClick={next} disabled={state === 'sending'}
                      className="h-11 px-6 bg-[#117dff] text-white text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-[#0066e0] disabled:opacity-60 transition-colors flex items-center gap-2">
                      {state === 'sending' ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                        : isLast ? 'Request access' : <>Continue <ArrowRight size={15} /></>}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── RIGHT: day-mode feature showcase (desktop only) ── */}
            <div className="hidden md:block md:w-1/2 border-l border-[#e3e0db]">
              <FeatureShowcase />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
