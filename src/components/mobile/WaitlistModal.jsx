import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';

/*
 * WaitlistModal — standalone singulancelabs.com waitlist capture.
 * NOT wired to HIVEMIND. Posts to same-origin /api/waitlist (a tiny relay that
 * writes one row per person into Notion). Dark cinematic hero theme, sharp edges.
 */
const ease = [0.22, 1, 0.36, 1];

const NICHES = [
  'SaaS / Software', 'Finance / Banking', 'Healthcare', 'Legal', 'Consulting',
  'Research / Academia', 'Manufacturing', 'Media / Creative', 'Government / Public', 'Other',
];

const FIELD = 'w-full h-11 px-3.5 bg-white/[0.04] border border-white/15 text-white text-[13px] placeholder-white/35 focus:outline-none focus:border-white/50 transition-colors';
const LABEL = 'block text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 mb-1.5';

export default function WaitlistModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', use: 'Personal', niche: '', company: '', message: '' });
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setErr('Enter your name and a valid email.'); setState('error'); return;
    }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'singulancelabs.com/hero' }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setState('done');
    } catch (e2) {
      setErr('Could not submit — please try again.'); setState('error');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,5,12,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#05070f] border border-white/12 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40">〉 JOIN THE WAITLIST</div>
                <h2 className="text-[19px] font-semibold text-white mt-1 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Get early access</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center text-white/45 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {state === 'done' ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <Check size={26} className="text-white" />
                </div>
                <h3 className="text-[18px] font-semibold text-white mt-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>You’re on the list</h3>
                <p className="text-[13px] text-white/55 mt-2 leading-relaxed">Thanks, {form.name.split(' ')[0] || 'there'}. We’ll reach out at <span className="text-white/80">{form.email}</span> as spots open.</p>
                <button onClick={onClose} className="mt-6 h-11 px-6 bg-white text-[#05070f] text-[11px] font-semibold uppercase tracking-[0.22em] hover:bg-white/90 transition-colors">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className={LABEL}>Name</label>
                  <input value={form.name} onChange={set('name')} placeholder="Amar Sai" className={FIELD} autoFocus />
                </div>
                <div>
                  <label className={LABEL}>Work email</label>
                  <input value={form.email} onChange={set('email')} type="email" placeholder="you@company.com" className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>How will you use HIVEMIND?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Personal', 'Enterprise'].map((u) => (
                      <button key={u} type="button" onClick={() => setForm((f) => ({ ...f, use: u }))}
                        className={`h-11 text-[12px] font-semibold uppercase tracking-[0.14em] border transition-all ${form.use === u ? 'bg-white text-[#05070f] border-white' : 'bg-white/[0.04] text-white/70 border-white/15 hover:border-white/40'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Which niche do you belong to?</label>
                  <select value={form.niche} onChange={set('niche')} className={`${FIELD} appearance-none cursor-pointer`} style={{ backgroundImage: 'none' }}>
                    <option value="" className="bg-[#05070f]">Select…</option>
                    {NICHES.map((n) => <option key={n} value={n} className="bg-[#05070f]">{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Company <span className="text-white/25 normal-case tracking-normal">(optional)</span></label>
                  <input value={form.company} onChange={set('company')} placeholder="SINGULANCE Labs" className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>Anything else? <span className="text-white/25 normal-case tracking-normal">(optional)</span></label>
                  <textarea value={form.message} onChange={set('message')} rows={2} placeholder="What are you hoping to solve?"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 text-white text-[13px] placeholder-white/35 focus:outline-none focus:border-white/50 transition-colors resize-none" />
                </div>

                {state === 'error' && <p className="text-[12px] text-red-400">{err}</p>}

                <button type="submit" disabled={state === 'sending'}
                  className="w-full h-12 bg-white text-[#05070f] text-[11px] font-semibold uppercase tracking-[0.24em] hover:bg-white/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {state === 'sending' ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : 'Request access'}
                </button>
                <p className="text-[10px] text-white/30 text-center font-mono">EU-sovereign · your details are never shared</p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
