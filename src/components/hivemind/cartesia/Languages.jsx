import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Server, FileText } from 'lucide-react';
import { GlobeCdn } from '../../ui/cobe-globe-cdn';

/**
 * ScrollScrubGlobe — the "Sovereign Descent" cinematic FPV film (Higgsfield /
 * Seedance, GPT-Image-2 keyframes), scrubbed frame-for-frame by scroll.
 *
 *   • A tall track pins the video full-bleed; scroll progress → video.currentTime
 *     with a snappy rAF lerp (fast + cinematic, not laggy).
 *   • Desktop = scrub. Touch / reduced-motion = the live cobe globe (fallback),
 *     since iOS Safari throttles video seeking.
 *   • Self-contained static asset in /public/media — no network at runtime.
 */
function ScrollScrubGlobe() {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [canScrub] = useState(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !coarse && !reduced;
  });

  useEffect(() => {
    if (!canScrub) return undefined;
    const v = videoRef.current;
    const wrap = wrapRef.current;
    if (!v || !wrap) return undefined;
    let target = 0, cur = 0, dur = 0, raf = 0, alive = true;
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const onMeta = () => { dur = v.duration || 0; };
    v.addEventListener('loadedmetadata', onMeta);
    if (v.readyState >= 1) onMeta();
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      target = total > 0 ? clamp(-r.top / total) : 0;
    };
    const tick = () => {
      if (!alive) return;
      cur += (target - cur) * 0.18;                 // snappy, weighted scrub
      if (dur) { const t = cur * (dur - 0.05); if (Math.abs(v.currentTime - t) > 0.02) { try { v.currentTime = t; } catch { /* seeking */ } } }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll(); tick();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); v.removeEventListener('loadedmetadata', onMeta); };
  }, [canScrub]);

  if (!canScrub) {
    return <GlobeCdn className="w-full max-w-[500px] sm:max-w-[620px] mx-auto" />;
  }
  return (
    <div ref={wrapRef} style={{ height: '220vh' }} className="relative w-full">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/media/sovereign-descent.mp4"
          poster="/media/sovereign-descent-poster.jpg"
          muted playsInline preload="auto"
          tabIndex={-1} aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ maxHeight: '100vh' }}
        />
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#0a0a0a]/40">
          <span className="w-6 h-px bg-[#0a0a0a]/25" /> scroll to descend <span className="w-6 h-px bg-[#0a0a0a]/25" />
        </div>
      </div>
    </div>
  );
}

const Languages = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Hosting');

  const categories = ['Hosting', 'Compliance', 'Security'];

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

  const datacenters = [
    { name: 'Frankfurt', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Paris', provider: 'Scaleway', region: 'Western Europe' },
    { name: 'Roubaix', provider: 'OVH', region: 'Western Europe' },
    { name: 'Falkenstein', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Amsterdam', provider: 'Scaleway', region: 'Western Europe' },
    { name: 'Gravelines', provider: 'OVH', region: 'Western Europe' },
    { name: 'Nuremberg', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Warsaw', provider: 'Scaleway', region: 'Eastern Europe' },
  ];

  const categoryIcons = {
    'Hosting': Server,
    'Compliance': FileText,
    'Security': Shield
  };

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

        {/* Cinematic scroll-scrubbed FPV descent (falls back to live globe on touch) */}
        <div className="mb-8 sm:mb-12">
          <ScrollScrubGlobe />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10 border-b border-[#e3e0db] pb-4 sm:pb-6">
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            return (
              <motion.button
                key={category}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  activeCategory === category
                    ? 'text-[#117dff] bg-[#117dff]/[0.08] border border-[#117dff]/25 shadow-[0_2px_8px_rgba(17,125,255,0.15)]'
                    : 'text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] border border-transparent'
                }`}
              >
                <Icon size={14} className="sm:w-[15px] sm:h-[15px]" />
                {category}
              </motion.button>
            );
          })}
        </div>

        {/* Infrastructure grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-10">
          {items[activeCategory]?.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors cursor-pointer group rounded-lg"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="text-xl sm:text-2xl">{item.icon}</span>
                <span className="text-xs sm:text-sm font-medium text-[#0a0a0a]">{item.name}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4d0ca] group-hover:text-[#117dff] group-hover:translate-x-0.5 transition-all" />
            </motion.div>
          ))}
        </div>

        {/* Datacenters section */}
        <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-[#e3e0db]">
          <div className="text-center mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-2 font-['Space_Grotesk']">The Sovereign Trust.</h3>
              <p className="text-[#525252] text-sm sm:text-base">The European Edge.</p>
            </motion.div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-3xl mx-auto">
            {datacenters.map((dc, idx) => (
              <motion.div
                key={dc.name}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, duration: 0.4 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-[#e3e0db] bg-white text-xs sm:text-sm font-medium hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[#0a0a0a]"
              >
                <span className="hidden sm:inline">{dc.name}</span>
                <span className="sm:hidden">{dc.name.split(',')[0]}</span>
                <span className="text-[#a3a3a3] text-[10px] sm:text-xs">({dc.provider})</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: datacenters.length * 0.04 + 0.2, duration: 0.4 }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-[#117dff]/20 bg-[#117dff]/[0.08] text-xs sm:text-sm font-medium text-[#117dff] cursor-default flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse" />
              <span className="hidden sm:inline">HYOK Encryption Enabled</span>
              <span className="sm:hidden">HYOK Enabled</span>
            </motion.div>
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
