import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Brain, Workflow, ShieldCheck } from 'lucide-react';

/*
 * RuntimeWaitlistModal — the real "Runtime is coming soon" popup.
 * Compact, centered card: badge, a real ASCII-density horse traced from the
 * reference clip (frame data in public/runtime-horse-frames.json, same
 * technique as the design exploration), a one-line tagline, and a centered
 * CTA that splits the card into a one-question email capture + a capability
 * slideshow. Submits to the real backend (POST /auth/runtime-waitlist),
 * which sends the branded confirmation email via the existing Cloudflare
 * Email Sending pipeline (core/src/email/email-service.js) — no second
 * fetch path, no invented backend.
 */

const RAMP = ' .:-=+*#%@';
const SHADES = ['#a9c3f2', '#7ea6ec', '#4f83e0', '#2f5fd0', '#1c3fd6', '#12297a'];
const COLS = 90, ROWS = 42;
const FRAME_DUR = 95;

const SLIDES = [
  { icon: Brain, label: "Understands your company's context" },
  { icon: Workflow, label: 'Coordinates the work across agents' },
  { icon: ShieldCheck, label: 'Acts only with your approval' },
];

function shadeFor(v) {
  return SHADES[Math.min(SHADES.length - 1, Math.floor(v * SHADES.length))];
}

function RuntimeHorse() {
  const preRef = useRef(null);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let raf = null;
    fetch('/runtime-horse-frames.json')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const frames = data.frames.map((b64) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          return arr;
        });
        dataRef.current = { cols: data.cols, rows: data.rows, frames };
        setReady(true);
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const render = (i0, i1, mix) => {
          const { cols: hCols, rows: hRows, frames: hFrames } = dataRef.current;
          let html = '';
          for (let r = 0; r < ROWS; r++) {
            const sr = Math.min(hRows - 1, Math.floor((r * hRows) / ROWS));
            let runColor = null, run = '';
            for (let c = 0; c < COLS; c++) {
              const sc = Math.min(hCols - 1, Math.floor((c * hCols) / COLS));
              const a = hFrames[i0][sr * hCols + sc] / 255;
              const b = hFrames[i1][sr * hCols + sc] / 255;
              const v = a + (b - a) * mix;
              const ci = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
              const ch = RAMP[ci];
              const color = ch === ' ' ? null : shadeFor(v);
              if (color !== runColor) {
                html += runColor ? `<span style="color:${runColor}">${run}</span>` : run;
                run = ''; runColor = color;
              }
              run += ch;
            }
            html += runColor ? `<span style="color:${runColor}">${run}</span>` : run;
            html += '\n';
          }
          if (preRef.current) preRef.current.innerHTML = html;
        };
        if (reduced) { render(0, 0, 0); return; }
        let t0 = null;
        const loop = (ts) => {
          if (!t0) t0 = ts;
          const total = frames.length * FRAME_DUR;
          const pos = ((ts - t0) % total) / FRAME_DUR;
          const i0 = Math.floor(pos) % frames.length;
          const i1 = (i0 + 1) % frames.length;
          render(i0, i1, pos - Math.floor(pos));
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {});
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="flex h-[180px] w-full items-center justify-center overflow-hidden">
      <pre
        ref={preRef}
        aria-label="An animated running horse rendered as ASCII, previewing HIVEMIND Runtime"
        className="m-0 whitespace-pre font-mono leading-[1.08]"
        style={{ fontSize: '4.4px', letterSpacing: '0.2px', visibility: ready ? 'visible' : 'hidden' }}
      />
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RuntimeWaitlistModal({ onClose }) {
  const [split, setSplit] = useState(false);
  const [email, setEmail] = useState('');
  const [useCase, setUseCase] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!split) return;
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % SLIDES.length), 2800);
    return () => clearInterval(id);
  }, [split]);

  const canSubmit = EMAIL_RE.test(email.trim()) && status !== 'sending';

  const submit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    try {
      const res = await fetch('https://api.singulancelabs.com/auth/runtime-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), use_case: useCase.trim() }),
      });
      if (!res.ok) throw new Error('request_failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <motion.section
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="runtime-waitlist-title"
        className="relative w-full max-w-[520px] overflow-hidden rounded-[14px] border border-[#e3e0db] bg-white shadow-[0_28px_90px_rgba(12,38,84,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-[#a3a3a3] hover:bg-[#faf9f4] hover:text-[#0a0a0a]"
        >
          <X size={16} />
        </button>

        <div className="relative" style={{ height: 420 }}>
          {/* ---- Screen A: intro ---- */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-start px-10 pb-8 pt-7 text-center transition-opacity duration-300"
            style={{ opacity: split ? 0 : 1, pointerEvents: split ? 'none' : 'auto' }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span id="runtime-waitlist-title" className="font-['Space_Grotesk'] text-[18px] font-semibold text-[#0a0a0a]">HIVEMIND RUNTIME</span>
              <span className="rounded-full border border-[#117dff]/25 bg-[#117dff]/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#117dff]">A beta feature</span>
            </div>
            <RuntimeHorse />
            <p className="mt-4 text-[13.5px] text-[#737373]">Let Runtime handle your whole company, even while you sleep.</p>
            <button
              type="button"
              onClick={() => setSplit(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-[7px] bg-[#117dff] px-[18px] py-2.5 font-['Space_Grotesk'] text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0066e0]"
            >
              Request early access <ArrowRight size={14} />
            </button>
          </div>

          {/* ---- Screen B: split (question + slideshow) ---- */}
          <div
            className="absolute inset-0 grid grid-cols-2 transition-opacity duration-300"
            style={{ opacity: split ? 1 : 0, pointerEvents: split ? 'auto' : 'none' }}
          >
            <div className="flex flex-col border-r border-[#e3e0db] p-6">
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#117dff]">
                <span>&rsaquo;</span> One quick question
              </div>
              <h2 className="mb-4 font-['Space_Grotesk'] text-[21px] font-semibold leading-tight text-[#0a0a0a]">
                {status === 'done' ? "You're on the list" : 'How do you want to use Runtime?'}
              </h2>

              {status === 'done' ? (
                <p className="text-[13px] leading-relaxed text-[#737373]">We'll email <strong className="text-[#0a0a0a]">{email.trim()}</strong> the moment your beta seat opens up.</p>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="mb-2.5 h-11 w-full rounded-[9px] border border-[#e3e0db] px-3.5 text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15"
                  />
                  <textarea
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    placeholder="e.g. automating renewals, triaging support tickets… (optional)"
                    rows={2}
                    className="mb-auto w-full resize-none rounded-[9px] border border-[#e3e0db] px-3.5 py-2.5 text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15"
                  />
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <span className="mr-auto text-[12px] text-[#a3a3a3]">
                      {status === 'error' ? 'Something went wrong — try again.' : 'Tell us your email to join.'}
                    </span>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!canSubmit}
                      className="inline-flex items-center gap-1.5 rounded-[7px] bg-[#117dff] px-4 py-2 font-['Space_Grotesk'] text-[13px] font-semibold text-white transition-opacity hover:bg-[#0066e0] disabled:pointer-events-none disabled:opacity-35"
                    >
                      {status === 'sending' ? 'Sending…' : 'Continue'} <ArrowRight size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col bg-[#faf9f4] p-6">
              <div className="relative mb-4 flex h-[150px] items-center justify-center overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white">
                {SLIDES.map((slide, i) => {
                  const Icon = slide.icon;
                  return (
                    <div
                      key={slide.label}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center transition-opacity duration-500"
                      style={{ opacity: i === slideIdx ? 1 : 0 }}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-[10px] border border-[#117dff]/20 bg-[#117dff]/10 text-[#117dff]">
                        <Icon size={22} />
                      </span>
                      <span className="font-['Space_Grotesk'] text-[13.5px] font-medium text-[#0a0a0a]">{slide.label}</span>
                    </div>
                  );
                })}
                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
                  {SLIDES.map((slide, i) => (
                    <span key={slide.label} className={`h-1.5 w-1.5 rounded-full transition-all ${i === slideIdx ? 'scale-125 bg-[#117dff]' : 'bg-[#e3e0db]'}`} />
                  ))}
                </div>
              </div>
              <h3 className="mb-3 font-['Space_Grotesk'] text-[16px] font-semibold text-[#0a0a0a]">Runs your company end to end.</h3>
              <div className="mt-auto flex gap-4">
                <div><b className="block font-['Space_Grotesk'] text-[14px] font-semibold text-[#0a0a0a]">3</b><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#a3a3a3]">stages</span></div>
                <div><b className="block font-['Space_Grotesk'] text-[14px] font-semibold text-[#0a0a0a]">Auto</b><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#a3a3a3]">routed</span></div>
                <div><b className="block font-['Space_Grotesk'] text-[14px] font-semibold text-[#0a0a0a]">Yours</b><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#a3a3a3]">approval</span></div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
