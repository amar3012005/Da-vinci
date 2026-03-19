import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Brain,
  GitFork,
  Plug,
  Search,
  Tag,
  Clock,
  KeyRound,
  Cable,
  BookOpen,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  MessageSquare,
  Globe,
  Bookmark,
  Hexagon,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useDebounce, useHealthStatus } from '../shared/hooks';

// ─── Animation variants ──────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Type badge color map ────────────────────────────────────────

const TYPE_STYLES = {
  note:         { bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: FileText },
  conversation: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: MessageSquare },
  web:          { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   icon: Globe },
  bookmark:     { bg: 'bg-amber-500/10',  text: 'text-amber-400',  icon: Bookmark },
  document:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: FileText },
};

function getTypeStyle(type) {
  return TYPE_STYLES[type?.toLowerCase()] || { bg: 'bg-white/5', text: 'text-white/50', icon: FileText };
}

// ─── Sub-components ──────────────────────────────────────────────

function HealthCard({ healthy, onRefresh }) {
  const isUnknown = healthy === null;
  const label = isUnknown ? 'Checking...' : healthy ? 'All Systems Operational' : 'Service Degraded';
  const dotColor = isUnknown
    ? 'bg-white/20'
    : healthy
      ? 'bg-green-400'
      : 'bg-red-400';
  const glowColor = isUnknown
    ? ''
    : healthy
      ? 'shadow-[0_0_8px_rgba(74,222,128,0.6)]'
      : 'shadow-[0_0_8px_rgba(248,113,113,0.6)]';

  return (
    <motion.div variants={fadeUp} className="col-span-full">
      <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
            <Activity size={20} className="text-[#bdf213]" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-0.5">Core API Health</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${glowColor}`} />
              <span className="text-white text-sm font-['Space_Grotesk'] font-medium">{label}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/30 hover:text-white/60"
          title="Refresh health"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <motion.div variants={fadeUp}>
      <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 h-full hover:border-white/[0.1] transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-[#bdf213]/10 border border-[#bdf213]/20' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
            <Icon size={16} className={accent ? 'text-[#bdf213]' : 'text-white/40'} />
          </div>
          <span className="text-white/40 text-xs font-mono uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-white text-2xl font-mono font-semibold tabular-nums">
          {value !== null && value !== undefined ? value.toLocaleString() : (
            <span className="inline-block w-12 h-6 bg-white/[0.04] rounded animate-pulse" />
          )}
        </p>
      </div>
    </motion.div>
  );
}

function RecentMemoryRow({ memory, index }) {
  const style = getTypeStyle(memory.type || memory.source_platform);
  const TypeIcon = style.icon;
  const title = memory.title || memory.content?.slice(0, 50) || 'Untitled';
  const preview = memory.content
    ? memory.content.length > 120 ? memory.content.slice(0, 120) + '...' : memory.content
    : null;
  const date = memory.created_at
    ? new Date(memory.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg}`}>
        <TypeIcon size={14} className={style.text} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-['Space_Grotesk'] font-medium truncate">{title}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${style.bg} ${style.text} uppercase flex-shrink-0`}>
            {memory.type || memory.source_platform || 'memory'}
          </span>
        </div>
        {preview && (
          <p className="text-white/30 text-xs leading-relaxed line-clamp-2">{preview}</p>
        )}
        {date && (
          <p className="text-white/20 text-[10px] font-mono mt-1">{date}</p>
        )}
      </div>
    </motion.div>
  );
}

function SearchResult({ result }) {
  const title = result.title || result.content?.slice(0, 60) || 'Untitled';
  const snippet = result.content
    ? result.content.length > 100 ? result.content.slice(0, 100) + '...' : result.content
    : null;
  const score = result.score != null ? (result.score * 100).toFixed(0) : null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
      <Search size={14} className="text-white/20 mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-['Space_Grotesk'] truncate">{title}</span>
          {score && (
            <span className="text-[10px] font-mono text-[#bdf213]/70 bg-[#bdf213]/10 px-1.5 py-0.5 rounded flex-shrink-0">
              {score}%
            </span>
          )}
        </div>
        {snippet && <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{snippet}</p>}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function Overview() {
  const navigate = useNavigate();
  const healthy = useHealthStatus(30000);

  // Profile / stats
  const { data: profile, refetch: refetchProfile } = useApiQuery(
    () => apiClient.getProfile(),
    []
  );

  // Recent memories
  const { data: recentMemories, loading: memoriesLoading } = useApiQuery(
    () => apiClient.listMemories({ limit: 5 }),
    []
  );

  // Connector status
  const { data: connectors } = useApiQuery(
    () => apiClient.getConnectorStatus().catch(() => null),
    []
  );

  // Quick search
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, 350);

  const { data: searchResults, loading: searchLoading } = useApiQuery(
    () => debouncedQuery.trim().length >= 2
      ? apiClient.quickSearch(debouncedQuery.trim())
      : Promise.resolve(null),
    [debouncedQuery]
  );

  // Derived stats
  const memoryCount = profile?.memory_count ?? null;
  const relationshipCount = profile?.relationship_count ?? null;
  const activeConnectors = useMemo(() => {
    if (!connectors) return null;
    if (Array.isArray(connectors)) return connectors.filter(c => c.status === 'connected' || c.healthy).length;
    if (typeof connectors === 'object' && connectors.count != null) return connectors.count;
    return 0;
  }, [connectors]);
  const topTags = profile?.top_tags ?? [];

  const memories = useMemo(() => {
    if (!recentMemories) return [];
    return Array.isArray(recentMemories) ? recentMemories : (recentMemories.memories || recentMemories.data || []);
  }, [recentMemories]);

  const results = useMemo(() => {
    if (!searchResults) return [];
    return Array.isArray(searchResults) ? searchResults : (searchResults.results || searchResults.data || []);
  }, [searchResults]);

  return (
    <div className="max-w-6xl mx-auto font-['Space_Grotesk']">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <Hexagon size={20} className="text-[#bdf213]" />
          <h1 className="text-white text-2xl font-bold tracking-tight">Overview</h1>
        </div>
        <p className="text-white/40 text-sm ml-8">Your HIVEMIND memory engine at a glance.</p>
      </motion.div>

      {/* Grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Health */}
        <HealthCard
          healthy={healthy}
          onRefresh={refetchProfile}
        />

        {/* Stats row */}
        <StatCard icon={Brain}   label="Total Memories"   value={memoryCount}      accent />
        <StatCard icon={GitFork} label="Relationships"     value={relationshipCount} />
        <StatCard icon={Plug}    label="Active Connectors" value={activeConnectors}  />
        <StatCard
          icon={Tag}
          label="Top Tags"
          value={topTags.length > 0 ? topTags.length : 0}
        />
      </motion.div>

      {/* Bottom section: Recent + Search + Actions */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4"
      >
        {/* Recent Memories */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-white/30" />
                <h2 className="text-white text-sm font-semibold uppercase tracking-wider">Recent Memories</h2>
              </div>
              <button
                onClick={() => navigate('../memories')}
                className="text-xs text-white/30 hover:text-[#bdf213] transition-colors flex items-center gap-1 font-mono"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {memoriesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/[0.04] rounded w-3/4 animate-pulse" />
                      <div className="h-2 bg-white/[0.04] rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Brain size={28} className="text-white/10 mb-3" />
                <p className="text-white/30 text-sm">No memories yet.</p>
                <p className="text-white/15 text-xs mt-1">Connect an MCP client to start ingesting memories.</p>
              </div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-1">
                {memories.slice(0, 5).map((mem, i) => (
                  <RecentMemoryRow key={mem.id || i} memory={mem} index={i} />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right column: Search + Quick Actions */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          {/* Quick Search */}
          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-white/30" />
              <h2 className="text-white text-sm font-semibold uppercase tracking-wider">Quick Search</h2>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search memories..."
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl py-2.5 pl-9 pr-4 text-white text-sm font-['Space_Grotesk'] placeholder:text-white/20 focus:outline-none focus:border-[#bdf213]/30 transition-colors"
              />
              {searchLoading && debouncedQuery.trim().length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-[#bdf213]/40 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search results */}
            {debouncedQuery.trim().length >= 2 && (
              <div className="mt-3 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {results.length > 0 ? (
                  <div className="space-y-0.5">
                    {results.slice(0, 6).map((r, i) => (
                      <SearchResult key={r.id || i} result={r} />
                    ))}
                  </div>
                ) : !searchLoading ? (
                  <div className="flex items-center gap-2 p-3 text-white/20 text-xs">
                    <AlertCircle size={12} />
                    <span>No results for &quot;{debouncedQuery}&quot;</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('../keys')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-[#bdf213]/20 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={14} className="text-[#bdf213]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">Create API Key</p>
                  <p className="text-white/25 text-[11px]">Generate keys for MCP clients</p>
                </div>
                <ArrowRight size={14} className="text-white/10 group-hover:text-[#bdf213]/50 ml-auto transition-colors" />
              </button>

              <button
                onClick={() => navigate('../connectors')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-[#bdf213]/20 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Cable size={14} className="text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">Connect MCP Client</p>
                  <p className="text-white/25 text-[11px]">Link Claude, Cursor, or custom clients</p>
                </div>
                <ArrowRight size={14} className="text-white/10 group-hover:text-[#bdf213]/50 ml-auto transition-colors" />
              </button>

              <button
                onClick={() => navigate('../memories')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-[#bdf213]/20 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">Browse Memories</p>
                  <p className="text-white/25 text-[11px]">Explore and manage stored memories</p>
                </div>
                <ArrowRight size={14} className="text-white/10 group-hover:text-[#bdf213]/50 ml-auto transition-colors" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
