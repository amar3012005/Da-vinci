/**
 * UsageTracker — compact per-page usage meter.
 *
 * Reads the shared usage cache (useUsage) and renders ONE resource's
 * "used / limit" with a thin progress bar. The LIMIT is never hardcoded —
 * it comes straight from usage[resource].limit, which the backend derives
 * from core/src/billing/plans.js (single source of truth).
 *
 * Props:
 *   resource   {string}  one of: memories | kbPages | connectors | hyperRooms |
 *                        deepResearch | webIntel | searches | tokens | uploads
 *   compact    {boolean} tighter layout (default false)
 *   className  {string}  extra classes on the root
 *
 * Theme (shared/theme.js): accent #117dff, warm-light surfaces, #e3e0db
 * borders, Space Grotesk numerals. Bar turns amber (#f59e0b) at ~80% and
 * red (#dc2626) at 100%. Unlimited (limit === -1) shows '∞', no bar, no
 * upgrade link. When used >= limit (finite), a tiny 'Upgrade' link routes
 * to /hivemind/app/billing.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useUsage } from '../shared/useUsage';

// Friendly labels — display only; the resource key drives everything else.
const LABELS = {
  memories: 'Memories',
  kbPages: 'Pages',
  connectors: 'Connectors',
  hyperRooms: 'Rooms',
  deepResearch: 'Deep research',
  webIntel: 'Web intel',
  searches: 'Searches',
  tokens: 'Tokens',
  uploads: 'Uploads',
};

const BILLING_PATH = '/hivemind/app/billing';

// Threshold ratios for the bar colour ramp.
const AMBER_AT = 0.8; // >= 80% used
const RED_AT = 1.0; // >= 100% used

export default function UsageTracker({ resource, compact = false, className = '' }) {
  const { usage, loading } = useUsage();
  const entry = usage && resource ? usage[resource] : null;

  // No data yet → tiny skeleton (first paint / cold cache).
  if (!entry) {
    if (loading) {
      return (
        <div
          className={`inline-flex items-center gap-2 h-[26px] ${className}`}
          aria-hidden="true"
        >
          <div className="h-3 w-24 rounded bg-[#eae7e1] animate-pulse" />
        </div>
      );
    }
    return null; // usage unavailable and not loading → render nothing
  }

  const used = Number(entry.used) || 0;
  const limit = typeof entry.limit === 'number' ? entry.limit : -1;
  const isDaily = entry.isDaily === true;
  const unlimited = limit === -1;

  const label = LABELS[resource] || resource;
  const usedStr = used.toLocaleString();
  const limitStr = unlimited ? '∞' : limit.toLocaleString();

  // Ratio only meaningful for finite limits.
  const ratio = !unlimited && limit > 0 ? used / limit : 0;
  const atLimit = !unlimited && used >= limit;

  let barColor = '#117dff'; // accent
  if (!unlimited) {
    if (ratio >= RED_AT) barColor = '#dc2626';
    else if (ratio >= AMBER_AT) barColor = '#f59e0b';
  }
  const fillPct = unlimited ? 0 : Math.min(100, Math.max(0, ratio * 100));

  const barWidth = compact ? 40 : 56;

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={`${label}: ${usedStr} / ${limitStr}${isDaily ? ' (today)' : ''}`}
    >
      <span
        className={`text-[#737373] uppercase tracking-wider ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {label}
        {isDaily ? ' · today' : ''}
      </span>

      <span
        className={`font-semibold ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#0a0a0a' }}
      >
        {usedStr}
        <span className="text-[#a3a3a3] font-normal"> / {limitStr}</span>
      </span>

      {!unlimited && (
        <div
          className="h-1.5 rounded-full overflow-hidden bg-[#eae7e1]"
          style={{ width: barWidth }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${fillPct}%`, backgroundColor: barColor }}
          />
        </div>
      )}

      {atLimit && (
        <Link
          to={BILLING_PATH}
          className="text-[10px] font-semibold text-[#117dff] hover:text-[#0066e0] hover:underline"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
