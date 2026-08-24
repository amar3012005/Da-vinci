import React from 'react';
import { NavLink } from 'react-router-dom';

const fmt = (value) => Number(value || 0).toLocaleString();

export default function CreditBalance({ credits, compact = false, collapsed = false, className = '' }) {
  if (!credits) return null;
  const unlimited = credits.unlimited || Number(credits.included) < 0;
  const remainingPct = unlimited ? 100 : Math.max(0, Number(credits.percent_remaining || 0));
  const color = remainingPct <= 5 ? '#dc2626' : remainingPct <= 20 ? '#d97706' : '#117dff';
  if (collapsed) {
    return (
      <NavLink to="/hivemind/app/usage" title={`${unlimited ? 'Unlimited' : fmt(credits.remaining)} credits remaining`}
        className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full border border-[#e3e0db] bg-white ${className}`}
        style={{ background: `conic-gradient(${color} ${remainingPct * 3.6}deg, #eceae4 0)` }}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[8px] font-bold" style={{ color }}>
          {unlimited ? '∞' : `${remainingPct}%`}
        </span>
      </NavLink>
    );
  }
  return (
    <NavLink to="/hivemind/app/usage" className={`block rounded-xl border border-[#e3e0db] bg-white ${compact ? 'p-2.5' : 'p-4'} ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#777]">Monthly credits</span>
        <span className="text-[10px] font-mono" style={{ color }}>{credits.percent_used || 0}% used</span>
      </div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <strong className={`${compact ? 'text-base' : 'text-2xl'} text-[#0a0a0a]`}>{unlimited ? 'Unlimited' : fmt(credits.remaining)}</strong>
        {!unlimited && <span className="text-[10px] text-[#999]">of {fmt(credits.included)} left</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eceae4]">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${remainingPct}%`, background: color }} />
      </div>
      {!compact && <p className="mt-2 text-[10px] text-[#888]">Resets {credits.reset_at ? new Date(credits.reset_at).toLocaleDateString() : 'monthly'} · Existing service limits still apply.</p>}
    </NavLink>
  );
}
