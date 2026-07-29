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

    let randomSeed = 421337;
    const random = () => {
      randomSeed = (randomSeed * 16807) % 2147483647;
      return (randomSeed - 1) / 2147483646;
    };

    const seedParticles = () => {
      randomSeed = 421337;
      const count = Math.max(260, Math.min(620, Math.round((width * height) / 310)));
      particles = Array.from({ length: count }, (_, index) => {
        const angle = random() * Math.PI * 2;
        const radius = 0.18 + Math.pow(random(), 0.72) * 0.82;
        const ringBias = index % 3 === 0 ? 0.68 + random() * 0.2 : radius;
        return {
          angle,
          radius: ringBias,
          drift: (random() - 0.5) * 0.00022,
          wobble: random() * Math.PI * 2,
          size: 0.45 + random() * 1.15,
          alpha: 0.16 + random() * 0.5,
        };
      });
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
      context.fillStyle = '#eef0f2';
      context.fillRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const rx = Math.min(width * 0.29, 235);
      const ry = Math.min(height * 0.38, 58);
      particles.forEach((particle) => {
        const movement = reduceMotion ? 0 : time * particle.drift;
        const pulse = reduceMotion ? 1 : 0.96 + Math.sin((time / 950) + particle.wobble) * 0.045;
        const angle = particle.angle + movement;
        const radius = particle.radius * pulse;
        const x = cx + Math.cos(angle) * rx * radius + Math.sin(particle.wobble) * 4;
        const y = cy + Math.sin(angle) * ry * radius + Math.cos(particle.wobble) * 2;
        context.fillStyle = `rgba(52, 58, 64, ${particle.alpha})`;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
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

export default function WebsitePreview({ image, source, website, company, tagline, loading = false, compact = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const src = useMemo(() => previewSrc(image), [image]);
  const domain = websiteLabel(website);
  const content = loading && (!src || failed) ? (
    <div className={`relative w-full ${compact ? 'h-full min-h-0' : 'aspect-video'} overflow-hidden bg-[#eef0f2]`}>
      <WebsiteAnalysisParticles />
      <div className="absolute inset-0 grid place-items-center">
        <span className="rounded-[6px] border border-[#cfd3d7] bg-white/85 px-2.5 py-1 text-[9.5px] font-mono uppercase text-[#52565a] backdrop-blur-sm">
          Capturing website
        </span>
      </div>
    </div>
  ) : src && !failed ? (
    <img
      src={src}
      alt={`${company || domain || 'Company'} website preview`}
      className={`w-full ${compact ? 'h-full min-h-0' : 'aspect-video'} ${source === 'official-site-image' ? 'object-contain bg-white p-3' : 'object-cover object-top bg-[#f4f6f8]'}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`relative w-full ${compact ? 'h-full min-h-0' : 'aspect-video'} overflow-hidden bg-[#f4f6f8] border-b border-[#d9dee5] px-5 py-4 flex flex-col justify-between`}>
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-[8px] bg-[#0a0a0a] text-white grid place-items-center">
          <Globe size={17} />
        </div>
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

  const frame = `overflow-hidden rounded-[8px] border border-[#d9dee5] bg-white transition-colors ${compact ? 'flex flex-col' : 'block'} ${className}`;
  if (!website) return <div className={frame}>{content}</div>;
  return (
    <a href={websiteHref(website)} target="_blank" rel="noreferrer" className={`${frame} group hover:border-[#0a0a0a]`}>
      <div className={compact ? 'min-h-0 flex-1' : ''}>{content}</div>
      <div className="h-8 px-3 flex items-center gap-2 text-[10.5px] text-[#525252] bg-white border-t border-[#ece9e3]">
        <span className="font-mono truncate">{domain}</span>
        <ExternalLink size={11} className="ml-auto shrink-0 text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
      </div>
    </a>
  );
}
