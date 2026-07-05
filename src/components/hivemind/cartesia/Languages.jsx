import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Server, FileText } from 'lucide-react';
import { GlobeCdn } from './GlobeCdn';

/**
 * ScrollScrubGlobe — the "Sovereign Descent" film, scrubbed frame-for-frame on a
 * pinned <canvas> from a preloaded high-quality webp sequence (crisper than
 * seeking a <video>). Scroll drives the frame index via a snappy rAF lerp.
 * The site navbar is fixed z-[100] and stays visible above this (canvas z-0).
 * Touch / reduced-motion → the live cobe globe fallback.
 */
const DESCENT_FRAMES = 161;
const descentFrame = (i) => `/sovereign-descent-frames/f_${String(i + 1).padStart(3, '0')}.webp`;

function ScrollScrubGlobe() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [canScrub] = useState(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !coarse && !reduced;
  });

  useEffect(() => {
    if (!canScrub) return undefined;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    const imgs = new Array(DESCENT_FRAMES);
    let loaded = 0;
    const state = { frame: 0 };
    let target = 0, raf = 0, alive = true;
    const clamp = (x) => Math.max(0, Math.min(1, x));

    const draw = () => {
      const img = imgs[Math.round(state.frame)];
      if (!img || !img.complete || !img.naturalWidth) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let w, h, x, y;
      if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
      else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, w, h);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const onImgLoad = (i) => () => { loaded += 1; if (loaded === 1 || Math.round(state.frame) === i) draw(); };
    for (let i = 0; i < DESCENT_FRAMES; i += 1) {
      const im = new Image();
      im.src = descentFrame(i);
      im.onload = onImgLoad(i);
      imgs[i] = im;
    }
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      target = total > 0 ? clamp(-r.top / total) : 0;
    };
    const tick = () => {
      if (!alive) return;
      state.frame += (target * (DESCENT_FRAMES - 1) - state.frame) * 0.2;  // snappy lerp
      draw();
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    resize(); onScroll(); tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('scroll', onScroll); };
  }, [canScrub]);

  if (!canScrub) {
    return <GlobeCdn className="w-full max-w-[500px] sm:max-w-[620px] mx-auto" />;
  }
  return (
    <div ref={wrapRef} style={{ height: '260vh' }} className="relative w-full">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" style={{ maxHeight: '100vh' }} />
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#0a0a0a]/40">
          <span className="w-6 h-px bg-[#0a0a0a]/25" /> scroll to descend <span className="w-6 h-px bg-[#0a0a0a]/25" />
        </div>
      </div>
    </div>
  );
}

/* One deployment item — slides in from the side as it enters the viewport,
   staggered so the list assembles line-by-line while you scroll. No boxes. */
function DeployRow({ item, i, fromRight }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: fromRight ? 26 : -26 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 py-3 border-b border-[#e3e0db]/80"
    >
      <span className="text-lg sm:text-xl w-6 text-center shrink-0">{item.icon}</span>
      <span className="text-xs sm:text-[13px] leading-relaxed text-[#0a0a0a]">{item.name}</span>
    </motion.div>
  );
}

const Languages = () => {
  const navigate = useNavigate();

  const items = {
    'Hosting': [
      { name: 'Hetzner Cloud (Frankfurt, Falkenstein, Nuremberg)', icon: '🇩🇪' },
      { name: 'Scaleway (Paris, Amsterdam, Warsaw)', icon: '🇫🇷' },
      { name: 'OVHcloud (Roubaix, Gravelines)', icon: '🇫🇷' },
      { name: 'Zero US-owned infrastructure', icon: '🛡' },
      { name: 'All data encrypted at rest (AES-256)', icon: '🔒' },
      { name: 'No transatlantic data transfer', icon: '🇪🇺' },
    ],
    'Compliance': [
      { name: 'GDPR Article 28 compliant', icon: '🇪🇺' },
      { name: 'EU Data Residency guaranteed', icon: '🏛' },
      { name: 'Data Processing Agreement (DPA) available', icon: '📋' },
      { name: 'Right to erasure (Article 17)', icon: '🗑' },
      { name: 'Data portability (Article 20)', icon: '📦' },
      { name: 'ISO 27001 Ready', icon: '🛡' },
    ],
    'Security': [
      { name: 'Hold Your Own Key (HYOK) encryption', icon: '🔑' },
      { name: 'Dedicated Hardware Security Modules', icon: '🔒' },
      { name: 'TLS 1.3 in transit', icon: '🛡' },
      { name: 'Tenant-isolated memory stores', icon: '🏗' },
      { name: 'Audit logging & access controls', icon: '📝' },
      { name: 'SOC 2 Type II (in progress)', icon: '🔍' },
    ],
  };

  const categoryIcons = { 'Hosting': Server, 'Compliance': FileText, 'Security': Shield };
  const datacenters = ['Frankfurt', 'Falkenstein', 'Nuremberg', 'Paris', 'Amsterdam', 'Warsaw', 'Roubaix', 'Gravelines'];

  return (
    <section className="bg-[#faf9f4] text-[#0a0a0a] py-12 sm:py-16 lg:py-24 border-t border-[#e3e0db] relative">
      {/* Striped separator at top */}
      <div
        className="h-8 sm:h-12 w-full border-b border-[#e3e0db] absolute top-0"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 pt-10 sm:pt-14">
        <div className="text-center mb-10 sm:mb-14">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#117dff]/[0.08] border border-[#117dff]/20 mb-4"
          >
            <Shield size={12} className="text-[#117dff]" />
            <span className="text-[10px] font-mono text-[#117dff] uppercase tracking-wider">100% EU Owned</span>
          </motion.div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-6 font-['Space_Grotesk']">
            EU Sovereign<br />
            Infrastructure
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-[#525252] max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Your data never leaves the European Union. HIVEMIND runs exclusively on EU-owned infrastructure — Hetzner, OVHcloud, and Scaleway — with full GDPR compliance and zero US data transfer.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/hivemind/login')}
            className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_12px_rgba(17,125,255,0.2)]"
          >
            Explore Our Infrastructure
          </motion.button>
        </div>

        {/* Crisp scroll-scrubbed FPV descent (frame sequence; live globe on touch) */}
        <div className="mb-10 sm:mb-16">
          <ScrollScrubGlobe />
        </div>

        {/* Deployment ledger — three columns, items slide in one-by-one on scroll.
            Exact provider/compliance/security tag names + icons, no boxes. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-10">
          {Object.entries(items).map(([category, rows], colIdx) => {
            const Icon = categoryIcons[category];
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={13} className="text-[#117dff]" />
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-[#117dff]">
                    〉 {category} · {String(colIdx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-px w-full bg-[#0a0a0a]/15 mb-1" />
                {rows.map((item, idx) => (
                  <DeployRow key={item.name} item={item} i={idx} fromRight={colIdx === 2} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Sovereign Trust footer — datacenter names + icons, sliding in */}
        <div className="mt-14 sm:mt-16 pt-8 sm:pt-10 border-t border-[#e3e0db] text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2 font-['Space_Grotesk']">The Sovereign Trust.</h3>
          <p className="text-[#525252] text-sm sm:text-base mb-6">The European Edge.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-3xl mx-auto">
            {datacenters.map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono text-[#0a0a0a]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#117dff]" /> {name}
              </motion.span>
            ))}
          </div>
          <div className="mt-8 inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-[#117dff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#117dff] animate-pulse" />
            HYOK Encryption Enabled — you hold the key
          </div>
        </div>
      </div>

      {/* Striped separator at bottom */}
      <div
        className="h-8 sm:h-12 w-full border-t border-[#e3e0db] absolute bottom-0"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />
    </section>
  );
};

export default Languages;
