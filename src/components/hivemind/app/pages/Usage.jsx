import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge, Brain, Search, Upload, Network, Mic, Zap, Globe, Database,
  RefreshCw, AlertTriangle, Infinity as InfinityIcon, Info,
  Plug, Bot, UserPlus,
} from 'lucide-react';
import { useApiQuery } from '../shared/hooks';
import apiClient from '../shared/api-client';

// One screen, whole-platform, high-level usage. Cards = current month (DB-sourced,
// accurate across replicas). Graphs = per-day series from OrgUsageDaily.
// Tokens are metered at chat + TARA today (tokensScope) — labelled honestly.

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(v));
};
const isUnlimited = (lim) => lim == null || lim === -1;

const METRICS = [
  { key: 'tokens',       label: 'LLM Tokens',    icon: Brain,    accent: '#117dff', sub: 'chat + TARA metered' },
  { key: 'memories',     label: 'Memories',      icon: Database, accent: '#16a34a', sub: 'ingested' },
  { key: 'searches',     label: 'Recall / Chat', icon: Search,   accent: '#9333ea', sub: 'agent queries' },
  { key: 'graphQueries', label: 'Graph Queries', icon: Network,  accent: '#0891b2', sub: 'graph loads' },
  { key: 'uploads',      label: 'KB Uploads',    icon: Upload,   accent: '#d97706', sub: 'documents' },
  { key: 'kbPages',      label: 'KB Pages',      icon: Database, accent: '#ca8a04', sub: 'pages + slides + images' },
  { key: 'deepResearch', label: 'Deep Research', icon: Zap,      accent: '#dc2626', sub: 'jobs' },
  { key: 'webIntel',     label: 'Web Intel',     icon: Globe,    accent: '#0d9488', sub: 'search + crawl' },
  { key: 'tara',         label: 'TARA Voice',    icon: Mic,      accent: '#db2777', sub: 'turns' },
  { key: 'connectors',  label: 'Connectors',    icon: Plug,     accent: '#7c3aed', sub: 'active sources' },
  { key: 'hyperRooms',  label: 'HyperAgents',   icon: Bot,      accent: '#0f766e', sub: 'rooms' },
  { key: 'users',       label: 'Seats',         icon: UserPlus, accent: '#b45309', sub: 'org members' },
];

const DAILY_METRICS = METRICS.filter((metric) =>
  ['tokens', 'searches', 'uploads', 'kbPages', 'deepResearch', 'webIntel'].includes(metric.key),
);

// last N day strings (YYYY-MM-DD), oldest→newest
function lastNDays(n) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

// Bar chart — renders cleanly with ANY number of points (incl. a single day),
// unlike an area line which is invisible at 1 point. Gradient bars + hover.
function BarChart({ values, days, accent }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = 220, padL = 8, padR = 8, padT = 16, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length);
  const slot = innerW / n;
  const bw = Math.max(2, Math.min(slot * 0.7, 40)); // bar width capped (so 1 bar isn't huge)
  const gid = `bargrad-${accent.replace('#', '')}`;
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(0, ...values);
  const hasData = total > 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}
           onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padL} x2={W - padR} y1={padT + innerH * g} y2={padT + innerH * g}
                stroke="#eceae4" strokeWidth="1" />
        ))}
        {values.map((v, i) => {
          const h = Math.max(v > 0 ? 3 : 0, (v / max) * innerH);
          const x = padL + i * slot + (slot - bw) / 2;
          const y = padT + innerH - h;
          const isH = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              {/* invisible hit area spanning the slot */}
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
              <rect x={x} y={y} width={bw} height={h} rx={Math.min(4, bw / 2)}
                    fill={`url(#${gid})`} opacity={hover == null || isH ? 1 : 0.55} />
            </g>
          );
        })}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => days[i] && (
          <text key={i} x={Math.min(W - padR - 26, Math.max(padL, padL + i * slot))} y={H - 5}
                fontSize="10" fill="#aaa">{days[i]?.slice(5)}</text>
        ))}
        {!hasData && (
          <text x={W / 2} y={padT + innerH / 2} textAnchor="middle" fontSize="12" fill="#bbb">
            No activity yet in this window
          </text>
        )}
      </svg>
      {hover != null && days[hover] && (
        <div className="absolute top-1 right-2 bg-white border border-[#e3e0db] rounded-lg px-2.5 py-1 shadow-sm pointer-events-none">
          <div className="text-[10px] text-[#999]">{days[hover]}</div>
          <div className="text-sm font-bold font-['Space_Grotesk']" style={{ color: accent }}>{fmt(values[hover])}</div>
        </div>
      )}
      <div className="flex items-center gap-4 mt-1 px-1 text-[11px] text-[#888]">
        <span>Σ {fmt(total)} this period</span>
        <span>peak {fmt(peak)}/day</span>
      </div>
    </div>
  );
}

function Sparkline({ values, accent }) {
  const W = 120, H = 28, n = Math.max(1, values.length);
  const max = Math.max(1, ...values);
  if (!values.length) return null;
  const slot = W / n, bw = Math.max(1.5, slot * 0.7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 28 }} preserveAspectRatio="none">
      {values.map((v, i) => {
        const h = Math.max(v > 0 ? 2 : 0, (v / max) * (H - 3));
        return <rect key={i} x={i * slot + (slot - bw) / 2} y={H - h} width={bw} height={h} rx="1" fill={accent} opacity="0.55" />;
      })}
    </svg>
  );
}

function MetricCard({ metric, data, spark, active, onClick }) {
  const Icon = metric.icon;
  const used = Number(data?.used) || 0;
  const limit = data?.limit;
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const danger = pct >= 100, warn = pct >= 80 && pct < 100;
  const barColor = danger ? '#dc2626' : warn ? '#d97706' : metric.accent;
  return (
    <button onClick={onClick}
      className={`text-left bg-white rounded-2xl border p-4 flex flex-col gap-2.5 shadow-sm transition-all hover:shadow-md ${active ? 'border-[2px]' : 'border-[#e3e0db]'}`}
      style={active ? { borderColor: metric.accent } : undefined}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${metric.accent}14` }}>
            <Icon size={16} style={{ color: metric.accent }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{metric.label}</div>
            <div className="text-[10px] text-[#999] leading-tight">{metric.sub}{data?.isDaily ? ' · today' : ''}</div>
          </div>
        </div>
        {(warn || danger) && <AlertTriangle size={15} style={{ color: barColor }} />}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-none">{fmt(used)}</span>
        <span className="text-xs text-[#999] mb-0.5">
          {unlimited ? <span className="inline-flex items-center gap-0.5">/<InfinityIcon size={12} /></span> : `/ ${fmt(limit)}`}
        </span>
      </div>
      <Sparkline values={spark} accent={metric.accent} />
      <div className="text-[10px] text-[#999]">{unlimited ? 'Unlimited on plan' : `${pct}% of limit`}</div>
    </button>
  );
}

function DailyBudget({ metric, data }) {
  const Icon = metric.icon;
  const used = Number(data?.used) || 0;
  const limit = data?.limit;
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : metric.accent;
  return (
    <div className="rounded-xl border border-[#e3e0db] bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#525252]"><Icon size={13} style={{ color }} />{metric.label}</span>
        <span className="text-[10px] text-[#888]">{fmt(used)} / {unlimited ? '∞' : fmt(limit)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#eceae4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Usage() {
  const [metricKey, setMetricKey] = useState('tokens');
  const [days, setDays] = useState(30);

  const { data, loading, refetch } = useApiQuery(() => apiClient.getUsage().catch(() => null), []);
  const { data: daily, refetch: refetchDaily } = useApiQuery(() => apiClient.getDailyUsage(days).catch(() => null), [days]);

  const planName = data?.planName || data?.plan || '—';
  const month = data?.period?.month || '';
  const reminders = Array.isArray(data?.reminders) ? data.reminders : [];

  // date-fill the series against a continuous last-N-day axis
  const axis = useMemo(() => lastNDays(days), [days]);
  const seriesByKey = useMemo(() => {
    const map = {}; for (const k of METRICS.map(m => m.key)) map[k] = {};
    for (const row of (daily?.series || [])) for (const k of Object.keys(map)) map[k][row.day] = Number(row[k]) || 0;
    const out = {};
    for (const k of Object.keys(map)) out[k] = axis.map(d => map[k][d] || 0);
    return out;
  }, [daily, axis]);

  const heroMetric = METRICS.find(m => m.key === metricKey) || METRICS[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#117dff14] flex items-center justify-center">
            <Gauge size={20} className="text-[#117dff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a0a0a] font-['Space_Grotesk']">Usage</h1>
            <p className="text-xs text-[#666]">
              Platform usage for your org{month ? ` · ${month}` : ''} ·{' '}
              <span className="font-medium text-[#117dff]">{planName}</span> plan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#e3e0db] overflow-hidden">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1.5 text-xs font-medium ${days === d ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:bg-[#faf9f4]'}`}>{d}d</button>
            ))}
          </div>
          <button onClick={() => { refetch(); refetchDaily(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e0db] text-xs font-medium text-[#525252] hover:bg-[#faf9f4]">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          {reminders.map((reminder) => (
            <div key={`${reminder.resource}-${reminder.period}`} className="flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              <span>{reminder.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Today’s plan limits</h2>
          <span className="text-[10px] text-[#999]">Resets daily · {data?.period?.day || 'UTC'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {DAILY_METRICS.map((metric) => <DailyBudget key={metric.key} metric={metric} data={data?.daily?.[metric.key]} />)}
        </div>
      </div>

      {/* Hero graph */}
      <div className="bg-white rounded-2xl border border-[#e3e0db] p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <heroMetric.icon size={17} style={{ color: heroMetric.accent }} />
            <span className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{heroMetric.label} · per day</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button key={m.key} onClick={() => setMetricKey(m.key)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${metricKey === m.key ? 'text-white' : 'text-[#666] hover:bg-[#faf9f4] border border-[#e3e0db]'}`}
                style={metricKey === m.key ? { background: m.accent } : undefined}>{m.label}</button>
            ))}
          </div>
        </div>
        <BarChart values={seriesByKey[metricKey] || []} days={axis} accent={heroMetric.accent} />
      </div>

      {/* Metric cards (click → set hero) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m, i) => (
          <motion.div key={m.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
            <MetricCard metric={m} data={data?.[m.key]} spark={(seriesByKey[m.key] || []).slice(-14)}
              active={metricKey === m.key} onClick={() => setMetricKey(m.key)} />
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-1.5 text-[10px] text-[#aaa] mt-5 justify-center">
        <Info size={12} className="mt-px shrink-0" />
        <span>High-level usage. Tokens are metered at chat + TARA + HyperAgents background LLM ({data?.tokensScope || 'chat+tara+hyperagents'}); embeddings, vision &amp; ingest are not yet in the token count. Limits + guardrails are per plan.</span>
      </div>
    </div>
  );
}
