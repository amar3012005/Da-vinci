// Mobile Usage — same visual language as desktop Usage.jsx (today's plan
// limits grid, per-day hero bar chart with metric tabs, metric cards with
// sparklines) instead of the old plain Claude-style list, laid out for a
// phone: 2-column grids instead of 4/6-column, horizontal-scroll metric
// tabs instead of a wrapping button row, viewBox-responsive SVGs.
import React, { useMemo, useState } from 'react';
import {
  Gauge, Brain, Search, Network, Mic, Zap, Globe, Database,
  RefreshCw, AlertTriangle, Infinity as InfinityIcon, Info,
  Plug, Bot, UserPlus,
} from 'lucide-react';
import { useApiQuery } from '../../shared/hooks';
import apiClient from '../../shared/api-client';
import CreditBalance from '../../shared/CreditBalance';
import WorkspaceAccessCard from '../../shared/WorkspaceAccessCard';
import MobileShell from '../MobileShell';

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
  { key: 'kbPages',      label: 'KB Pages',      icon: Database, accent: '#ca8a04', sub: 'pages + slides + images' },
  { key: 'deepResearch', label: 'Deep Research', icon: Zap,      accent: '#dc2626', sub: 'jobs' },
  { key: 'webIntel',     label: 'Web Intel',     icon: Globe,    accent: '#0d9488', sub: 'search + crawl' },
  { key: 'taraSeconds',  label: 'TARA Talk Time', icon: Mic,     accent: '#db2777', sub: 'seconds' },
  { key: 'hyperAgentRuns', label: 'HyperAgents Runs', icon: Bot, accent: '#0f766e', sub: 'runs' },
  { key: 'connectors',  label: 'Connectors',    icon: Plug,     accent: '#7c3aed', sub: 'active sources' },
  { key: 'hyperRooms',  label: 'HyperAgents',   icon: Bot,      accent: '#0f766e', sub: 'rooms' },
  { key: 'users',       label: 'Seats',         icon: UserPlus, accent: '#b45309', sub: 'org members' },
];

const DAILY_METRICS = METRICS.filter((metric) =>
  ['tokens', 'searches', 'kbPages', 'deepResearch', 'webIntel', 'taraSeconds', 'hyperAgentRuns'].includes(metric.key),
);

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

function BarChart({ values, days, accent }) {
  const [hover, setHover] = useState(null);
  const W = 340, H = 160, padL = 6, padR = 6, padT = 12, padB = 18;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length);
  const slot = innerW / n;
  const bw = Math.max(1.5, Math.min(slot * 0.7, 24));
  const gid = `mn-bargrad-${accent.replace('#', '')}`;
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(0, ...values);
  const hasData = total > 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }} onTouchStart={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padL} x2={W - padR} y1={padT + innerH * g} y2={padT + innerH * g} stroke="#eceae4" strokeWidth="1" />
        ))}
        {values.map((v, i) => {
          const h = Math.max(v > 0 ? 2 : 0, (v / max) * innerH);
          const x = padL + i * slot + (slot - bw) / 2;
          const y = padT + innerH - h;
          return (
            <g key={i} onClick={() => setHover(i)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
              <rect x={x} y={y} width={bw} height={h} rx={Math.min(3, bw / 2)} fill={`url(#${gid})`} opacity={hover == null || hover === i ? 1 : 0.55} />
            </g>
          );
        })}
        {[0, n - 1].map((i) => days[i] && (
          <text key={i} x={Math.min(W - padR - 22, Math.max(padL, padL + i * slot))} y={H - 4} fontSize="9" fill="#aaa">{days[i]?.slice(5)}</text>
        ))}
        {!hasData && (
          <text x={W / 2} y={padT + innerH / 2} textAnchor="middle" fontSize="11" fill="#bbb">No activity yet in this window</text>
        )}
      </svg>
      {hover != null && days[hover] && (
        <div className="absolute top-1 right-2 bg-white border border-[#e3e0db] rounded-lg px-2 py-1 shadow-sm">
          <div className="text-[9px] text-[#999]">{days[hover]}</div>
          <div className="text-[13px] font-bold font-['Space_Grotesk']" style={{ color: accent }}>{fmt(values[hover])}</div>
        </div>
      )}
      <div className="flex items-center gap-3 mt-1 px-1 text-[10px] text-[#888]">
        <span>Σ {fmt(total)} this period</span>
        <span>peak {fmt(peak)}/day</span>
      </div>
    </div>
  );
}

function Sparkline({ values, accent }) {
  const W = 100, H = 24, n = Math.max(1, values.length);
  const max = Math.max(1, ...values);
  if (!values.length) return null;
  const slot = W / n, bw = Math.max(1.2, slot * 0.7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 24 }} preserveAspectRatio="none">
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
    <button onClick={onClick} aria-pressed={active}
      className="min-h-[128px] text-left rounded-[12px] border border-[#e6e3dd] bg-white px-3 py-3 flex flex-col gap-2"
      style={active ? { borderColor: metric.accent, borderWidth: 1.5 } : undefined}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 flex-shrink-0 rounded-[8px] flex items-center justify-center" style={{ background: `${metric.accent}14` }}>
            <Icon size={13} style={{ color: metric.accent }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{metric.label}</div>
          </div>
        </div>
        {(warn || danger) && <AlertTriangle size={13} className="flex-shrink-0" style={{ color: barColor }} />}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-[19px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-none">{fmt(used)}</span>
        <span className="text-[10px] text-[#999] mb-0.5">
          {unlimited ? <span className="inline-flex items-center gap-0.5">/<InfinityIcon size={10} /></span> : `/ ${fmt(limit)}`}
        </span>
      </div>
      <Sparkline values={spark} accent={metric.accent} />
      <div className="text-[9px] text-[#999]">{unlimited ? 'Unlimited on plan' : `${pct}% of limit`}</div>
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
    <div className="rounded-[12px] border border-[#e3e0db] bg-white px-2.5 py-2.5">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#525252] truncate"><Icon size={11} style={{ color }} className="flex-shrink-0" />{metric.label}</span>
      </div>
      <div className="text-[9.5px] text-[#888] mb-1.5">{fmt(used)} / {unlimited ? '∞' : fmt(limit)}</div>
      <div className="h-1.5 rounded-full bg-[#eceae4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MobileUsage() {
  const [metricKey, setMetricKey] = useState('tokens');
  const [days, setDays] = useState(30);

  const { data, loading, refetch } = useApiQuery(() => apiClient.getUsage().catch(() => null), []);
  const { data: billing, refetch: refetchBilling } = useApiQuery(() => apiClient.getBillingPlan().catch(() => null), []);
  const { data: daily, refetch: refetchDaily } = useApiQuery(() => apiClient.getDailyUsage(days).catch(() => null), [days]);

  const planName = data?.planName || data?.plan || '—';
  const month = data?.period?.month || '';
  const reminders = Array.isArray(data?.reminders) ? data.reminders : [];

  const axis = useMemo(() => lastNDays(days), [days]);
  const seriesByKey = useMemo(() => {
    const map = {}; for (const k of METRICS.map((m) => m.key)) map[k] = {};
    for (const row of (daily?.series || [])) for (const k of Object.keys(map)) map[k][row.day] = Number(row[k]) || 0;
    const out = {};
    for (const k of Object.keys(map)) out[k] = axis.map((d) => map[k][d] || 0);
    return out;
  }, [daily, axis]);

  const heroMetric = METRICS.find((m) => m.key === metricKey) || METRICS[0];

  return (
    <MobileShell title="Usage">
      <div className="px-4 pt-2 pb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-[10px] bg-[#117dff14] flex items-center justify-center flex-shrink-0">
            <Gauge size={17} className="text-[#117dff]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[17px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Usage</h1>
            <p className="text-[11px] text-[#666] truncate">
              {month ? `${month} · ` : ''}<span className="font-medium text-[#117dff]">{planName}</span> plan
            </p>
          </div>
          <button onClick={() => { refetch(); refetchDaily(); refetchBilling(); }}
            className="ml-auto w-9 h-9 rounded-full border border-[#e3e0db] flex items-center justify-center flex-shrink-0">
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#525252]' : 'text-[#525252]'} />
          </button>
        </div>

        {data?.credits && <div className="mb-4"><CreditBalance credits={data.credits} /></div>}

        {reminders.length > 0 && (
          <div className="mb-4 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1">
            {reminders.map((reminder) => (
              <div key={`${reminder.resource}-${reminder.period}`} className="flex items-start gap-2 text-[11px] text-amber-900">
                <AlertTriangle size={13} className="mt-px shrink-0" />
                <span>{reminder.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Hero graph — LLM token usage (or whichever metric is selected) up top */}
        <section className="mb-5 border-y border-[#e6e3dd] py-4">
          <div className="flex items-center gap-2 mb-1">
            <heroMetric.icon size={15} style={{ color: heroMetric.accent }} />
            <span className="text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{heroMetric.label} · per day</span>
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2 py-1 rounded-md text-[10.5px] font-medium ${days === d ? 'bg-[#117dff] text-white' : 'text-[#525252] border border-[#e3e0db]'}`}>{d}d</button>
            ))}
          </div>
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto pb-1 px-1 [-ms-overflow-style:none] [scrollbar-width:none]">
            {METRICS.map((m) => (
              <button key={m.key} onClick={() => setMetricKey(m.key)}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium whitespace-nowrap ${metricKey === m.key ? 'text-white' : 'text-[#666] border border-[#e3e0db]'}`}
                style={metricKey === m.key ? { background: m.accent } : undefined}>{m.label}</button>
            ))}
          </div>
          <BarChart values={seriesByKey[metricKey] || []} days={axis} accent={heroMetric.accent} />
        </section>

        {/* Per-day plan-limit boxes — right below the hero graph */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Today's plan limits</h2>
            <span className="text-[9.5px] text-[#999]">Resets daily</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DAILY_METRICS.map((metric) => <DailyBudget key={metric.key} metric={metric} data={data?.daily?.[metric.key]} />)}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-2">
          {METRICS.map((m) => (
            <MetricCard key={m.key} metric={m} data={data?.[m.key]} spark={(seriesByKey[m.key] || []).slice(-14)}
              active={metricKey === m.key} onClick={() => setMetricKey(m.key)} />
          ))}
        </div>

        <div className="flex items-start gap-1.5 text-[9.5px] text-[#aaa] mt-5 mb-5">
          <Info size={11} className="mt-px shrink-0" />
          <span>High-level usage. Tokens are metered at chat + TARA + HyperAgents background LLM ({data?.tokensScope || 'chat+tara+hyperagents'}); embeddings, vision &amp; ingest are not yet in the token count.</span>
        </div>

        {/* Current workspace access — bottom-most */}
        <div>
          <h2 className="text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mb-2">Current workspace access</h2>
          <WorkspaceAccessCard billing={billing} compact />
        </div>
      </div>
    </MobileShell>
  );
}
