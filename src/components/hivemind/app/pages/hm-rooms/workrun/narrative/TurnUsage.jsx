import React, { useState } from 'react';
import { Clock3, Database, X } from 'lucide-react';

function formatTokens(value) {
  if (!Number.isFinite(value)) return null;
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K tok` : `${Math.round(value)} tok`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return null;
  const seconds = Math.max(0, Math.round(value / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

function Detail({ label, value }) {
  if (value == null || value === '') return null;
  return <div className="flex items-start justify-between gap-5 py-1.5 text-[12px]"><span className="text-[#737373]">{label}</span><span className="max-w-[65%] break-words text-right tabular-nums text-[#525252]">{value}</span></div>;
}

export default function TurnUsage({ usage }) {
  const [open, setOpen] = useState(false);
  const hasUsage = usage && [
    usage.totalTokens,
    usage.inputTokens,
    usage.outputTokens,
    usage.cachedInputTokens,
    usage.model,
    usage.provider,
    usage.durationMs,
  ].some((value) => value != null);
  if (!hasUsage) return null;
  const total = formatTokens(usage.totalTokens);
  const duration = formatDuration(usage.durationMs);
  const providerModel = [usage.provider, usage.model].filter(Boolean).join(' / ');
  return (
    <div className="relative flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#737373]">
      {total ? <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[#737373] transition-colors hover:bg-[#f3f1ec] hover:text-[#0a0a0a]" aria-expanded={open}><Database size={14} />Usage {total}</button> : null}
      {duration ? <span className="inline-flex items-center gap-1.5 px-1 tabular-nums"><Clock3 size={14} />Ran for {duration}</span> : null}
      {open ? <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(360px,calc(100vw-3rem))] rounded-[10px] border border-[#e3e0db] bg-white p-4 shadow-sm" role="dialog" aria-label="Turn usage">
        <div className="mb-2 flex items-center justify-between border-b border-[#eae7e1] pb-2"><span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#0a0a0a]"><Database size={17} />Turn usage</span><button type="button" onClick={() => setOpen(false)} className="rounded-[6px] p-1 text-[#737373] hover:bg-[#f3f1ec] hover:text-[#0a0a0a]" aria-label="Close usage"><X size={14} /></button></div>
        <Detail label="Total" value={total} />
        <Detail label="Provider / model" value={providerModel || null} />
        <Detail label="Uncached input" value={formatTokens(usage.uncachedInputTokens)} />
        <Detail label="Cached input" value={formatTokens(usage.cachedInputTokens)} />
        <Detail label="Output" value={formatTokens(usage.outputTokens)} />
        <Detail label="Cache hit" value={Number.isFinite(usage.cacheHitPercent) ? `${usage.cacheHitPercent.toFixed(1)}%` : null} />
        <Detail label="TTFT" value={Number.isFinite(usage.ttftMs) ? `${Math.round(usage.ttftMs)} ms` : null} />
      </div> : null}
    </div>
  );
}
