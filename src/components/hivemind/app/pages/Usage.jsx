import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge, Brain, Search, Upload, Network, Mic, Zap, Globe, Database,
  RefreshCw, AlertTriangle, Infinity as InfinityIcon,
} from 'lucide-react';
import { useApiQuery } from '../shared/hooks';
import apiClient from '../shared/api-client';

// One screen, whole-platform, high-level usage. Reads planEnforcer.getUsageSummary
// via apiClient.getUsage() → { plan, planName, period, tokens:{used,limit}, ... }.
// limit === -1 (or null) = unlimited.

const fmt = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return String(v);
};
const isUnlimited = (lim) => lim == null || lim === -1;

const METRICS = [
  { key: 'tokens',       label: 'LLM Tokens',     icon: Brain,    accent: '#117dff', sub: 'chat · ingest · cognition · vision · TARA' },
  { key: 'memories',     label: 'Memories',       icon: Database, accent: '#16a34a', sub: 'ingested this period' },
  { key: 'searches',     label: 'Recall / Chat',  icon: Search,   accent: '#9333ea', sub: 'agent queries' },
  { key: 'graphQueries', label: 'Graph Queries',  icon: Network,  accent: '#0891b2', sub: 'memory graph loads' },
  { key: 'uploads',      label: 'KB Uploads',     icon: Upload,   accent: '#d97706', sub: 'documents ingested' },
  { key: 'deepResearch', label: 'Deep Research',  icon: Zap,      accent: '#dc2626', sub: 'research jobs' },
  { key: 'webIntel',     label: 'Web Intel',      icon: Globe,    accent: '#0d9488', sub: 'search + crawl (daily)' },
  { key: 'tara',         label: 'TARA Voice',     icon: Mic,      accent: '#db2777', sub: 'voice turns' },
];

function MetricCard({ metric, data }) {
  const Icon = metric.icon;
  const used = Number(data?.used) || 0;
  const limit = data?.limit;
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const danger = pct >= 100;
  const warn = pct >= 80 && pct < 100;
  const barColor = danger ? '#dc2626' : warn ? '#d97706' : metric.accent;

  return (
    <div className="bg-white rounded-2xl border border-[#e3e0db] p-4 flex flex-col gap-3 shadow-sm">
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
          {unlimited ? <span className="inline-flex items-center gap-0.5">/ <InfinityIcon size={12} /></span> : `/ ${fmt(limit)}`}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-[#f0eee8] overflow-hidden">
        {!unlimited && (
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        )}
        {unlimited && <div className="h-full rounded-full opacity-30" style={{ width: '100%', background: metric.accent }} />}
      </div>
      <div className="text-[10px] text-[#999]">{unlimited ? 'Unlimited on this plan' : `${pct}% of limit`}</div>
    </div>
  );
}

export default function Usage() {
  const { data, loading, error, refetch } = useApiQuery(
    () => apiClient.getUsage().catch(() => null),
    [],
  );

  const planName = data?.planName || data?.plan || '—';
  const month = data?.period?.month || '';

  // Header KPIs
  const kpis = useMemo(() => ([
    { label: 'LLM Tokens', value: fmt(data?.tokens?.used), accent: '#117dff' },
    { label: 'Memories', value: fmt(data?.memories?.used), accent: '#16a34a' },
    { label: 'Chat / Recall', value: fmt(data?.searches?.used), accent: '#9333ea' },
    { label: 'Deep Research', value: fmt(data?.deepResearch?.used), accent: '#dc2626' },
  ]), [data]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#117dff14] flex items-center justify-center">
            <Gauge size={20} className="text-[#117dff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0a0a0a] font-['Space_Grotesk']">Usage</h1>
            <p className="text-xs text-[#666]">
              Platform-wide usage for your org{month ? ` · ${month}` : ''} ·{' '}
              <span className="font-medium text-[#117dff]">{planName}</span> plan
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3e0db] text-xs font-medium text-[#525252] hover:bg-[#faf9f4] transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          Couldn’t load usage. Try refresh.
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e3e0db] p-4 shadow-sm">
            <div className="text-[11px] text-[#999] mb-1">{k.label}</div>
            <div className="text-2xl font-bold font-['Space_Grotesk']" style={{ color: k.accent }}>
              {loading && !data ? '—' : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            <MetricCard metric={m} data={data?.[m.key]} />
          </motion.div>
        ))}
      </div>

      <p className="text-[10px] text-[#bbb] mt-6 text-center">
        High-level usage across the platform. Tokens cover chat, ingest, cognition, vision OCR and TARA.
        Limits + guardrails are set per plan.
      </p>
    </div>
  );
}
