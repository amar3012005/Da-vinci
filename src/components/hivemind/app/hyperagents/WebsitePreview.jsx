import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { API_DEFAULTS } from '../shared/theme';

function previewSrc(value) {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http')) return value;
  return `${API_DEFAULTS.controlPlaneBase.replace(/\/$/, '')}${value}`;
}

function websiteLabel(value) {
  try { return new URL(/^https?:\/\//i.test(value || '') ? value : `https://${value}`).hostname.replace(/^www\./, ''); }
  catch { return String(value || '').replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0]; }
}

function websiteHref(value) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function WebsiteAnalysisParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frameId;
    let width = 1;
    let height = 1;
    let particles = [];

    const seedParticles = () => {
      const count = Math.max(24, Math.min(58, Math.round((width * height) / 9500)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: index % 7 === 0 ? 2.1 : 1.35,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      seedParticles();
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        if (!reduceMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < 0 || particle.x > width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > height) particle.vy *= -1;
        }
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt((dx * dx) + (dy * dy));
          if (distance < 105) {
            context.strokeStyle = `rgba(17, 125, 255, ${(1 - distance / 105) * 0.17})`;
            context.lineWidth = 0.75;
            context.beginPath();
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);
            context.stroke();
          }
        }
      }

      particles.forEach((particle, index) => {
        const pulse = reduceMotion ? 1 : 0.78 + Math.sin((time / 700) + particle.phase) * 0.22;
        context.fillStyle = index % 5 === 0
          ? `rgba(15, 118, 110, ${0.48 * pulse})`
          : `rgba(17, 125, 255, ${0.5 * pulse})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        context.fill();
      });

      if (!reduceMotion) frameId = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draw();
    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default function WebsitePreview({ image, source, website, company, tagline, loading = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const src = useMemo(() => previewSrc(image), [image]);
  const domain = websiteLabel(website);
  const content = src && !failed ? (
    <img
      src={src}
      alt={`${company || domain || 'Company'} website preview`}
      className={`w-full aspect-video ${source === 'official-site-image' ? 'object-contain bg-white p-3' : 'object-cover object-top bg-[#f4f6f8]'}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="relative w-full aspect-video overflow-hidden bg-[#f4f6f8] border-b border-[#d9dee5] px-5 py-4 flex flex-col justify-between">
      {loading && <WebsiteAnalysisParticles />}
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-[8px] bg-[#0a0a0a] text-white grid place-items-center">
          <Globe size={17} />
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#117dff]/20 bg-white/80 px-2 py-1 text-[9.5px] font-mono uppercase text-[#117dff] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#117dff] animate-pulse" /> Analyzing website
          </span>
        )}
      </div>
      <div className="relative z-[1] min-w-0">
        <div className="text-[18px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] break-words">
          {company || domain || 'Your company'}
        </div>
        {tagline ? <p className="text-[11.5px] text-[#525252] mt-1 line-clamp-2">{tagline}</p> : null}
        {domain ? <p className="text-[10.5px] text-[#117dff] font-mono mt-2 truncate">{domain}</p> : null}
      </div>
    </div>
  );

  const frame = `block overflow-hidden rounded-[8px] border border-[#d9dee5] bg-white transition-colors ${className}`;
  if (!website) return <div className={frame}>{content}</div>;
  return (
    <a href={websiteHref(website)} target="_blank" rel="noreferrer" className={`${frame} group hover:border-[#0a0a0a]`}>
      {content}
      <div className="h-8 px-3 flex items-center gap-2 text-[10.5px] text-[#525252] bg-white border-t border-[#ece9e3]">
        <span className="font-mono truncate">{domain}</span>
        <ExternalLink size={11} className="ml-auto shrink-0 text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
      </div>
    </a>
  );
}
