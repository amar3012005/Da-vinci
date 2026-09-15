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
    const seedParticles = () => {
      // The grid is calculated from the rectangle itself so its visual weight
      // stays stable from the onboarding card through the full dashboard.
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
      const columns = Math.max(22, Math.floor(width / 28));
      const rows = Math.max(8, Math.floor(height / 20));
      const stepX = width / (columns + 1);
      const stepY = height / (rows + 1);
      const breathe = reduceMotion ? 1 : 0.92 + Math.sin(time / 1250) * 0.08;
      for (let row = 1; row <= rows; row += 1) {
        for (let column = 1; column <= columns; column += 1) {
          const x = column * stepX;
          const y = row * stepY;
          const dx = (x - cx) / (width * 0.34);
          const dy = (y - cy) / (height * 0.72);
          const field = Math.exp(-((dx * dx) + (dy * dy)) * 2.4) * breathe;
          const size = 0.45 + field * 2.35;
          const alpha = 0.08 + field * 0.42;
          context.fillStyle = `rgba(82, 86, 90, ${alpha})`;
          context.beginPath();
          context.arc(x, y, size, 0, Math.PI * 2);
          context.fill();
        }
      }

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

// Real captures are full-page browser screenshots (a tall, ~16:10-and-up
// viewport ratio) — object-cover into a caller-fixed pixel height (the old
// `h-[180px]`) crops mid-row and reads as a broken/misaligned capture.
// object-contain inside a proper aspect box shows the WHOLE capture at its
// real proportions, at any column width, with no crop artifacts.
// A desktop browser viewport, not a banner. Both onboarding and My Company
// use this same contained ratio so captures never stretch across the page.
const PREVIEW_ASPECT = 'aspect-[16/10]';

export default function WebsitePreview({ image, source, website, company, tagline, loading = false, compact = false, className = '', contentClassName = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const src = useMemo(() => previewSrc(image), [image]);
  const domain = websiteLabel(website);
  const hasRealImage = Boolean(src && !failed);
  const dimensions = `${compact ? PREVIEW_ASPECT : 'aspect-video'} ${contentClassName}`;
  const content = loading && !hasRealImage ? (
    <div className={`relative w-full ${dimensions} overflow-hidden bg-[#eef0f2]`}>
      <WebsiteAnalysisParticles />
      <div className="absolute inset-0 grid place-items-center">
        <span className="rounded-[6px] border border-[#cfd3d7] bg-white/85 px-2.5 py-1 text-[9.5px] font-mono uppercase text-[#52565a] backdrop-blur-sm">
          Capturing website
        </span>
      </div>
    </div>
  ) : hasRealImage ? (
    <img
      src={src}
      alt={`${company || domain || 'Company'} website preview`}
      className={`w-full ${dimensions} object-contain bg-white`}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`relative w-full ${dimensions} overflow-hidden bg-[#f4f6f8] px-5 py-4 flex flex-col justify-between`}>
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

  // Mini browser-chrome header — traffic lights + address bar — so the
  // capture below reads unambiguously as "a real page at its real
  // resolution", the way the app's own CodeBlock frames a terminal.
  const chrome = (
    <div className="h-7 px-2.5 flex items-center gap-1.5 bg-[#f4f2ed] border-b border-[#e3e0db] shrink-0">
      <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
      <span className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
      <span className="w-2 h-2 rounded-full bg-[#28C840]" />
      <span className="ml-1.5 flex-1 min-w-0 h-4 rounded-[4px] bg-white border border-[#e3e0db] px-2 flex items-center">
        <span className="text-[9px] font-mono text-[#a3a3a3] truncate">{domain || websiteHref(website)}</span>
      </span>
    </div>
  );

  const frame = `overflow-hidden rounded-[8px] border border-[#d9dee5] bg-white transition-colors ${compact ? 'flex flex-col' : 'block'} ${className}`;
  if (!website) return <div className={frame}>{content}</div>;
  return (
    <a href={websiteHref(website)} target="_blank" rel="noreferrer" className={`${frame} group hover:border-[#0a0a0a]`}>
      {chrome}
      <div className={compact ? 'min-h-0' : ''}>{content}</div>
      <div className="h-8 px-3 flex items-center gap-2 text-[10.5px] text-[#525252] bg-white border-t border-[#ece9e3] mt-auto">
        <span className="font-mono truncate">{domain}</span>
        <ExternalLink size={11} className="ml-auto shrink-0 text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
      </div>
    </a>
  );
}
