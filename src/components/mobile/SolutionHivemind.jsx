import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { Link } from 'react-router-dom';
import { getMobileCopy } from './mobileCopy';

const ease = [0.16, 1, 0.3, 1];
const fade = (delay) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, delay, ease },
});

function DashboardHiveMindStructure({
  width = '100%',
  height = 360,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const initializeParticles = (canvasWidth, canvasHeight) => {
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const clusterRadius = Math.min(canvasWidth, canvasHeight) * 0.42;
      const particleCount = 220;
      const seeded = [];

      for (let i = 0; i < particleCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.7) * clusterRadius;
        seeded.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          baseR: r,
          baseAngle: angle,
          angleOffset: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.0016,
          size: Math.random() * 1.1 + 0.35,
          twinkle: Math.random() * Math.PI * 2,
          primary: i % 16 === 0,
        });
      }

      particlesRef.current = seeded;
      sizeRef.current = { width: canvasWidth, height: canvasHeight };
    };

    const render = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) {
        animationRef.current = window.requestAnimationFrame(render);
        return;
      }

      if (
        particlesRef.current.length === 0 ||
        Math.abs(sizeRef.current.width - w) > 2 ||
        Math.abs(sizeRef.current.height - h) > 2
      ) {
        initializeParticles(w, h);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const time = Date.now() * 0.001;
      const centerX = w / 2;
      const centerY = h / 2;

      particlesRef.current.forEach((particle) => {
        particle.baseAngle += particle.rotationSpeed;
        const dynamicR = particle.baseR + Math.sin(time * 0.5 + particle.angleOffset) * 4;
        particle.x = centerX + Math.cos(particle.baseAngle) * dynamicR;
        particle.y = centerY + Math.sin(particle.baseAngle) * dynamicR;
        particle.twinkle += 0.03;
      });

      for (let i = 0; i < particlesRef.current.length; i += 1) {
        const p1 = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j += 1) {
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          const maxDist = 70;

          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxDist) * 0.25;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      particlesRef.current.forEach((particle, index) => {
        const mouseDist = Math.sqrt(
          Math.pow(mouseRef.current.x - particle.x, 2) +
          Math.pow(mouseRef.current.y - particle.y, 2)
        );
        const isPrimary = particle.primary || index % 16 === 0;
        const brightness = mouseDist < 120
          ? (isPrimary ? 0.95 : 0.7)
          : (isPrimary ? 0.58 : 0.3) + Math.sin(particle.twinkle) * (isPrimary ? 0.22 : 0.18);
        const size = particle.size * (mouseDist < 80 ? 1.2 : 1) * (isPrimary ? 1.55 : 1);

        if (isPrimary) {
          const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size * 3.2);
          glow.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0.18, brightness * 0.45)})`);
          glow.addColorStop(0.5, `rgba(255, 255, 255, ${Math.max(0.08, brightness * 0.18)})`);
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.fillStyle = glow;
          ctx.arc(particle.x, particle.y, size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.12, Math.min(1, brightness))})`;
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = window.requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: '320px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={(event) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          mouseRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
        }}
        onMouseLeave={() => {
          mouseRef.current = { x: -1000, y: -1000 };
        }}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HIVEMIND — Your Second Brain
   Editorial layout matching MobileHero style
   ═══════════════════════════════════════════════════════════ */

const SolutionHivemind = () => {
  const { isDark, locale } = useTheme();
  const c = t(isDark);
  const copy = getMobileCopy(locale).hivemind;
  const headingClass = locale === 'de'
    ? 'text-4xl md:text-5xl lg:text-[4.75rem] font-bold tracking-tight leading-[0.95]'
    : 'text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[0.95]';

  return (
    <section className={`${c.bg} border-t ${c.border} relative overflow-hidden`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border} relative`}>

        {/* Subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
          <div className={`absolute top-0 left-2/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
        </div>

        <div className="relative px-6 md:px-10 lg:px-20 pt-20 lg:pt-28 pb-0">

          {/* Top metadata row */}
          <motion.div className="flex items-center justify-between mb-8" {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>{copy.sectionLabel}</span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>{copy.topLabel}</span>
          </motion.div>

          {/* Two-column editorial layout */}
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-0 items-start relative">

            {/* ─── Left column — Text ─── */}
            <div className="relative z-10 pb-12 lg:pb-20">
              {/* Accent square */}
              <motion.div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} mb-8`} {...fade(0.05)} />

              {/* Label */}
              <motion.p className={`text-[10px] font-mono uppercase tracking-[0.3em] ${c.textMuted} mb-6`} {...fade(0.1)}>
                {copy.metaCode}
                <span className="ml-8">{copy.metaSuffix}</span>
              </motion.p>

              {/* Main headline */}
              <motion.h2
                className={`${headingClass} ${c.text} font-['Space_Grotesk']`}
                {...fade(0.15)}
              >
                <span className={`block ${c.accent}`}>{copy.headlineAccent}</span>
                <span className="block text-[0.6em]">{copy.headlineLines[0]}</span>
                <span className="block text-[0.6em]">{copy.headlineLines[1]}</span>
              </motion.h2>

              {/* Subtitle */}
              <motion.p className={`text-sm ${c.textSecondary} mt-8 max-w-md leading-relaxed`} {...fade(0.2)}>
                {copy.subtitle}
              </motion.p>

              {/* CTA row */}
              <motion.div className="flex items-center gap-6 mt-10" {...fade(0.25)}>
                <Link
                  to="/hivemind/login"
                  className={`flex items-center gap-3 ${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] pl-7 pr-5 py-3.5 text-xs transition-colors no-underline`}
                >
                  {copy.primaryCta}
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/benchmark"
                  className={`${c.text} font-medium text-sm transition-colors no-underline border-b ${c.border} pb-0.5 ${isDark ? 'hover:text-white/60' : 'hover:text-[#525252]'}`}
                >
                  {copy.secondaryCta}
                </Link>
              </motion.div>

              {/* Key numbers */}
              <motion.div className={`flex gap-8 mt-12 pt-8 border-t ${c.border}`} {...fade(0.3)}>
                {copy.stats.map((s) => (
                  <div key={s.label}>
                    <span className={`text-2xl font-bold font-mono ${c.text}`}>{s.val}</span>
                    <span className={`block text-[9px] font-mono uppercase tracking-widest ${c.textMuted} mt-1`}>{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ─── Right column — Interactive demo + graph ─── */}
            <motion.div
              className="relative lg:-mr-14"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease }}
            >
              <div className="relative">
                {/* Accent square overlay */}
                <div className={`absolute -top-4 -left-4 w-16 h-16 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />

                {/* Brain graph — raw, no bounding box */}
                <div className="flex items-center justify-center h-[380px] md:h-[460px] lg:h-[520px] relative">
                  <DashboardHiveMindStructure width="100%" height={500} />
                  {/* Subtle label on graph */}
                  <span className={`absolute bottom-4 right-4 text-[8px] font-mono uppercase tracking-[0.2em] ${c.textMuted}`}>
                    {copy.graphLabel}
                  </span>
                </div>

                {/* Bottom accent square */}
                <div className={`absolute -bottom-3 -right-3 w-10 h-10 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />
              </div>
            </motion.div>
          </div>

          {/* ─── Feature cards ─── */}
          <motion.div className={`py-16 border-t ${c.border}`} {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted} block mb-10`}>{copy.featuresLabel}</span>

            <div className="grid sm:grid-cols-2 gap-3">
              {copy.features.map((f, i) => (
                <motion.div
                  key={f.n}
                  {...fade(0.05 + i * 0.06)}
                  className={`${c.bgCard} border ${c.border} p-5 ${c.shadow}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-7 h-7 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                      <span className={`text-[9px] font-mono font-bold ${isDark ? 'text-[#080808]' : 'text-white'}`}>{f.n}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`text-sm font-semibold ${c.text} font-['Space_Grotesk']`}>{f.title}</h4>
                        <span className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 ${isDark ? 'bg-white/[0.05] text-white/40' : 'bg-black/[0.03] text-black/35'}`}>{f.tag}</span>
                      </div>
                      <p className={`text-xs ${c.textSecondary} leading-relaxed`}>{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── Use cases ─── */}
          <motion.div className={`pb-16 border-t ${c.border} pt-12`} {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted} block mb-3`}>{copy.useCasesLabel}</span>
            <h3 className={`text-2xl md:text-3xl font-bold ${c.text} font-['Space_Grotesk'] mb-8`}>
              {copy.useCasesTitle}
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {copy.useCases.map((u, i) => (
                <motion.div key={u.t} {...fade(0.05 + i * 0.04)} className={`${c.bgCard} border ${c.border} p-4 ${c.shadow}`}>
                  <span className="text-xl mb-2 block">{u.e}</span>
                  <h4 className={`text-xs font-semibold ${c.text} font-['Space_Grotesk'] mb-1`}>{u.t}</h4>
                  <p className={`text-[11px] ${c.textSecondary} leading-relaxed`}>{u.d}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom metadata row */}
          <motion.div className={`flex items-center justify-between py-6 border-t ${c.border}`} {...fade(0.3)}>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>{copy.footerLeft}</span>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>{copy.footerRight}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SolutionHivemind;
