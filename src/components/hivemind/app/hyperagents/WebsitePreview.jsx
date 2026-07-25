import React, { useEffect, useMemo, useState } from 'react';
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

export default function WebsitePreview({ image, source, website, company, tagline, className = '' }) {
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
    <div className="w-full aspect-video bg-[#f4f6f8] border-b border-[#d9dee5] px-5 py-4 flex flex-col justify-between">
      <div className="w-9 h-9 rounded-[8px] bg-[#0a0a0a] text-white grid place-items-center">
        <Globe size={17} />
      </div>
      <div className="min-w-0">
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
