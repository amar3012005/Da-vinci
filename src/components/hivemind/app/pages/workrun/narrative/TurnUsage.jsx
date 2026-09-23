import React from 'react';
import { Database, Gauge, Timer } from 'lucide-react';

function number(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat().format(value) : null;
}

function duration(value) {
  if (!Number.isFinite(value)) return null;
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`;
}

export default function TurnUsage({ usage }) {
  if (!usage) return null;
  const cache = usage.cacheHitPercent == null ? null : `${Math.round(usage.cacheHitPercent)}% cache`;
  const tokens = usage.totalTokens != null ? `${number(usage.totalTokens)} tok` : null;
  const timing = usage.durationMs != null ? duration(usage.durationMs) : null;
  const ttft = usage.ttftMs != null ? `first token ${duration(usage.ttftMs)}` : null;
  const provider = [usage.provider, usage.model].filter(Boolean).join(' · ');
  const details = [
    usage.inputTokens != null ? `Input ${number(usage.inputTokens)}` : null,
    usage.cachedInputTokens != null ? `Cached ${number(usage.cachedInputTokens)}` : null,
    usage.uncachedInputTokens != null ? `Uncached ${number(usage.uncachedInputTokens)}` : null,
    usage.outputTokens != null ? `Output ${number(usage.outputTokens)}` : null,
    cache,
    timing ? `Turn ${timing}` : null,
    ttft,
    usage.tokenPerSecond != null ? `${Number(usage.tokenPerSecond).toFixed(1)} tok/s` : null,
    provider || null,
  ].filter(Boolean);
  if (!details.length) return null;
  return (
    <details className="group mt-2 text-[11px] text-[#737373]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
        {tokens ? <span className="inline-flex items-center gap-1"><Database size={12} />{tokens}</span> : null}
        {timing ? <span className="inline-flex items-center gap-1"><Timer size={12} />{timing}</span> : null}
        {usage.tokenPerSecond != null ? <span className="inline-flex items-center gap-1"><Gauge size={12} />{Number(usage.tokenPerSecond).toFixed(1)} tok/s</span> : null}
        <span className="text-[#a3a3a3]">Usage details</span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-l border-[#e3e0db] pl-3 font-mono text-[10px]" aria-label="Turn token usage">
        {details.map((detail) => <span key={detail}>{detail}</span>)}
      </div>
    </details>
  );
}
