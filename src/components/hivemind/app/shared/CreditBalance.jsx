import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCopy, useLocaleFormat } from '../layout/sidebar-copy';

export default function CreditBalance({ credits, compact = false, collapsed = false, inline = false, className = '' }) {
  const cr = useCopy('sidebar.credits');
  const format = useLocaleFormat();
  const fmt = format.number;
  // The inline sidebar meter keeps its height before credits load so the
  // account footer does not jump upward when they arrive.
  if (!credits) return inline ? <span aria-hidden="true" className={`block h-[26px] ${className}`} /> : null;
  const unlimited = credits.unlimited || Number(credits.included) < 0;
  const remainingPct = unlimited ? 100 : Math.max(0, Number(credits.percent_remaining || 0));
  const color = remainingPct <= 5 ? '#dc2626' : remainingPct <= 20 ? '#d97706' : '#117dff';
  if (collapsed) {
    return (
      <NavLink to="/hivemind/app/usage" title={cr('remainingTitle', '{{amount}} credits remaining', { amount: unlimited ? cr('unlimited', 'Unlimited') : fmt(credits.remaining) })}
        className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full border border-[#e3e0db] bg-white ${className}`}
        style={{ background: `conic-gradient(${color} ${remainingPct * 3.6}deg, #eceae4 0)` }}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[8px] font-bold" style={{ color }}>
          {unlimited ? '∞' : format.percent(remainingPct)}
        </span>
      </NavLink>
    );
  }
  if (inline) {
    const usedPct = unlimited ? 0 : Math.min(100, Math.max(0, Number(credits.percent_used || 0)));
    const usedColor = usedPct >= 95 ? '#dc2626' : usedPct >= 80 ? '#d97706' : '#117dff';
    return (
      <NavLink
        to="/hivemind/app/usage"
        aria-label={unlimited ? cr('viewUnlimited', 'View unlimited monthly credits') : cr('viewUsage', 'View credit usage: {{used}} used, {{remaining}} of {{included}} remaining', { used: format.percent(usedPct), remaining: fmt(credits.remaining), included: fmt(credits.included) })}
        className={`block pt-2 ${className}`}
      >
        <div className="h-1 overflow-hidden rounded-full bg-[#e3e0db]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: unlimited ? '100%' : `${usedPct}%`, background: usedColor }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-mono leading-none">
          <span style={{ color: usedColor }}>{unlimited ? cr('unlimited', 'Unlimited') : usedPct === 0 && Number(credits.remaining) < Number(credits.included) ? cr('usedUnderOne', '<1% used') : cr('used', '{{pct}} used', { pct: format.percent(usedPct) })}</span>
          <span className="text-[#8b8b86]">{unlimited ? cr('noCap', 'No monthly cap') : cr('left', '{{remaining}}/{{included}} left', { remaining: fmt(credits.remaining), included: fmt(credits.included) })}</span>
        </div>
      </NavLink>
    );
  }
  return (
    <NavLink to="/hivemind/app/usage" className={`block rounded-xl border border-[#e3e0db] bg-white ${compact ? 'p-2.5' : 'p-4'} ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#777]">{cr('monthly', 'Monthly credits')}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{cr('used', '{{pct}} used', { pct: format.percent(credits.percent_used || 0) })}</span>
      </div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <strong className={`${compact ? 'text-base' : 'text-2xl'} text-[#0a0a0a]`}>{unlimited ? cr('unlimited', 'Unlimited') : fmt(credits.remaining)}</strong>
        {!unlimited && <span className="text-[10px] text-[#999]">{cr('ofLeft', 'of {{included}} left', { included: fmt(credits.included) })}</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eceae4]">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${remainingPct}%`, background: color }} />
      </div>
      {!compact && <p className="mt-2 text-[10px] text-[#888]">{cr('resets', 'Resets {{when}} · Existing service limits still apply.', { when: credits.reset_at ? format.date(credits.reset_at) : cr('monthlyWord', 'monthly') })}</p>}
    </NavLink>
  );
}
