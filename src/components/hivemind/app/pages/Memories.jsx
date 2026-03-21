import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Brain,
  Trash2,
  ChevronRight,
  X,
  Clock,
  Tag,
  Layers,
  Monitor,
  AlertTriangle,
  Loader2,
  GitFork,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useDebounce } from '../shared/hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_TYPES = [
  { key: 'experience', label: 'Experience', color: '#3b82f6' },
  { key: 'decision', label: 'Decision', color: '#f59e0b' },
  { key: 'fact', label: 'Fact', color: '#22c55e' },
  { key: 'preference', label: 'Preference', color: '#a855f7' },
  { key: 'procedure', label: 'Procedure', color: '#ec4899' },
];

const TYPE_COLOR_MAP = Object.fromEntries(MEMORY_TYPES.map((t) => [t.key, t.color]));

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `${diffMon}mo ago`;
  return `${Math.floor(diffMon / 12)}y ago`;
}

function truncate(text, maxLen = 180) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '...' : text;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const color = TYPE_COLOR_MAP[type] || '#666';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-['Space_Grotesk'] uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {type}
    </span>
  );
}

function TagPill({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 text-[10px] font-mono">
      <Tag size={9} />
      {label}
    </span>
  );
}

function ImportanceBar({ score }) {
  const pct = Math.min(Math.max((score ?? 0) * 100, 0), 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 70 ? '#bdf213' : pct > 40 ? '#f59e0b' : '#666',
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/30">{score != null ? score.toFixed(2) : '--'}</span>
    </div>
  );
}

// ─── Source Provenance Badge ──────────────────────────────────────────────────

const SOURCE_BADGE_STYLES = {
  vector:  { label: 'Vector',  color: 'text-purple-400/70', bg: 'bg-purple-500/10' },
  keyword: { label: 'Keyword', color: 'text-blue-400/70',   bg: 'bg-blue-500/10' },
  graph:   { label: 'Graph',   color: 'text-amber-400/70',  bg: 'bg-amber-500/10' },
};

function SourceBadge({ source }) {
  if (!source || !SOURCE_BADGE_STYLES[source]) return null;
  const s = SOURCE_BADGE_STYLES[source];
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded ${s.bg} ${s.color} uppercase tracking-wider`}>
      {s.label}
    </span>
  );
}

function RelationshipIndicator({ memory }) {
  if (!memory.is_latest && memory.supersedes_id) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25 uppercase tracking-wider">
        <GitFork size={8} />
        superseded
      </span>
    );
  }
  if (memory.graph_expanded) {
    const relType = memory.expansion_metadata?.relationship_type || 'related';
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70 uppercase tracking-wider">
        <GitFork size={8} />
        {relType}
      </span>
    );
  }
  return null;
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function MemoryCard({ memory, index, onSelect, isSelected }) {
  return (
    <motion.button
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={() => onSelect(memory)}
      className={`w-full text-left rounded-xl border transition-all duration-200 p-4 group cursor-pointer ${
        isSelected
          ? 'bg-[#bdf213]/[0.06] border-[#bdf213]/20 shadow-[0_0_20px_rgba(189,242,19,0.08)]'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#161616]/80'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-white text-sm font-bold font-['Space_Grotesk'] leading-tight line-clamp-1 flex-1">
          {memory.title || memory.content?.slice(0, 60) || 'Untitled Memory'}
        </h3>
        <ChevronRight
          size={14}
          className={`mt-0.5 shrink-0 transition-transform ${
            isSelected ? 'text-[#bdf213] rotate-90' : 'text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5'
          }`}
        />
      </div>

      {/* Type + Source + Provenance */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {memory.memory_type && <TypeBadge type={memory.memory_type} />}
        {memory.source && <SourceBadge source={memory.source} />}
        <RelationshipIndicator memory={memory} />
        {memory.source_platform && (
          <span className="inline-flex items-center gap-1 text-[11px] text-white/30 font-mono">
            <Monitor size={10} />
            {memory.source_platform}
          </span>
        )}
        {memory.document_date && (
          <span className="text-[10px] font-mono text-white/20">
            {new Date(memory.document_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Content preview */}
      <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-3 font-['Space_Grotesk']">
        {truncate(memory.content)}
      </p>

      {/* Footer: tags + date + importance */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {(memory.tags || []).slice(0, 3).map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
          {(memory.tags || []).length > 3 && (
            <span className="text-[10px] text-white/20 font-mono">+{memory.tags.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ImportanceBar score={memory.importance} />
          <span className="text-[10px] font-mono text-white/25 flex items-center gap-1">
            <Clock size={9} />
            {relativeTime(memory.created_at)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function MemoryDetailPanel({ memory, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await apiClient.deleteMemory(memory.id);
      onDelete(memory.id);
    } catch {
      // Swallow — parent will refetch
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10 lg:hidden" onClick={onClose} />

      <div className="h-full bg-[#0e0e0e] border-l border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[#bdf213]" />
            <span className="text-white text-sm font-bold font-['Space_Grotesk']">Memory Detail</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <h2 className="text-white text-lg font-bold font-['Space_Grotesk'] leading-snug">
            {memory.title || 'Untitled Memory'}
          </h2>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {memory.memory_type && <TypeBadge type={memory.memory_type} />}
            {memory.source && <SourceBadge source={memory.source} />}
            <RelationshipIndicator memory={memory} />
            {memory.source_platform && (
              <span className="inline-flex items-center gap-1 text-xs text-white/30 font-mono">
                <Monitor size={11} />
                {memory.source_platform}
              </span>
            )}
            <span className="text-xs font-mono text-white/25 flex items-center gap-1">
              <Clock size={10} />
              {relativeTime(memory.created_at)}
            </span>
            {memory.is_latest === false && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20 uppercase">
                superseded
              </span>
            )}
            {memory.document_date && (
              <span className="text-[10px] font-mono text-white/20 flex items-center gap-1">
                doc: {new Date(memory.document_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Importance */}
          {memory.importance != null && (
            <div>
              <label className="block text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1">
                Importance
              </label>
              <ImportanceBar score={memory.importance} />
            </div>
          )}

          {/* Full content */}
          <div>
            <label className="block text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              Content
            </label>
            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-4 text-white/70 text-sm font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
              {memory.content || 'No content'}
            </div>
          </div>

          {/* Tags */}
          {memory.tags?.length > 0 && (
            <div>
              <label className="block text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <TagPill key={tag} label={tag} />
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {memory.relationships?.length > 0 && (
            <div>
              <label className="block text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                Relationships
              </label>
              <div className="space-y-1.5">
                {memory.relationships.map((rel, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2"
                  >
                    <Layers size={11} className="text-[#bdf213]/60 shrink-0" />
                    <span className="text-white/50 font-mono">{rel.type || rel.relation_type || 'related'}</span>
                    <span className="text-white/25">-&gt;</span>
                    <span className="text-white/60 font-['Space_Grotesk'] truncate">
                      {rel.target_title || rel.target_id || rel.related_memory_id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <label className="block text-white/30 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              Metadata
            </label>
            <div className="bg-[#09090b] border border-white/[0.06] rounded-xl p-3 space-y-1.5 text-[11px] font-mono">
              {memory.id && (
                <div className="flex justify-between">
                  <span className="text-white/25">ID</span>
                  <span className="text-white/50 truncate ml-4 max-w-[240px]">{memory.id}</span>
                </div>
              )}
              {memory.project && (
                <div className="flex justify-between">
                  <span className="text-white/25">Project</span>
                  <span className="text-white/50">{memory.project}</span>
                </div>
              )}
              {memory.version != null && (
                <div className="flex justify-between">
                  <span className="text-white/25">Version</span>
                  <span className="text-white/50">{memory.version}</span>
                </div>
              )}
              {memory.created_at && (
                <div className="flex justify-between">
                  <span className="text-white/25">Created</span>
                  <span className="text-white/50">{new Date(memory.created_at).toLocaleString()}</span>
                </div>
              )}
              {memory.updated_at && (
                <div className="flex justify-between">
                  <span className="text-white/25">Updated</span>
                  <span className="text-white/50">{new Date(memory.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Delete */}
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] transition-all ${
              confirmDelete
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/[0.06]'
            }`}
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : confirmDelete ? (
              <>
                <AlertTriangle size={14} />
                Confirm Delete
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Memory
              </>
            )}
          </button>
          {confirmDelete && !deleting && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full mt-2 text-center text-xs text-white/30 hover:text-white/50 transition-colors font-['Space_Grotesk']"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-[#bdf213]/[0.06] border border-[#bdf213]/10 flex items-center justify-center mb-6">
        <Brain size={36} className="text-[#bdf213]/40" />
      </div>
      <h3 className="text-white text-lg font-bold font-['Space_Grotesk'] mb-2">
        {hasFilters ? 'No memories match' : 'No memories yet'}
      </h3>
      <p className="text-white/30 text-sm font-['Space_Grotesk'] text-center max-w-sm leading-relaxed">
        {hasFilters
          ? 'Try adjusting your search or filters to find what you are looking for.'
          : 'Memories will appear here as your AI agents interact and learn. Connect a data source or create your first memory to get started.'}
      </p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Memories() {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [allMemories, setAllMemories] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Detail
  const [selectedMemory, setSelectedMemory] = useState(null);

  const debouncedQuery = useDebounce(searchQuery, 350);

  // ─── Data fetching ──────────────────────────────────────────────

  const isSearching = debouncedQuery.trim().length > 0;

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: 0,
      ...(activeType ? { memory_type: activeType } : {}),
      ...(activeTag ? { tags: activeTag } : {}),
    }),
    [activeType, activeTag],
  );

  // List-mode fetch
  const {
    data: listData,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useApiQuery(
    () => apiClient.listMemories(listParams),
    [listParams],
  );

  // Search-mode fetch
  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
  } = useApiQuery(
    () => (isSearching ? apiClient.searchMemories(debouncedQuery) : Promise.resolve(null)),
    [debouncedQuery, isSearching],
  );

  // Resolve which dataset to show
  const resolvedList = useMemo(() => {
    if (isSearching) {
      const results = searchData?.results || searchData?.memories || searchData || [];
      return Array.isArray(results) ? results : [];
    }
    const base = listData?.memories || listData?.results || listData || [];
    const arr = Array.isArray(base) ? base : [];
    // Merge for "load more"
    if (allMemories.length > 0 && offset > 0) {
      const ids = new Set(allMemories.map((m) => m.id));
      const merged = [...allMemories];
      arr.forEach((m) => {
        if (!ids.has(m.id)) merged.push(m);
      });
      return merged;
    }
    return arr;
  }, [isSearching, searchData, listData, allMemories, offset]);

  const loading = isSearching ? searchLoading : listLoading;
  const error = isSearching ? searchError : listError;

  // Collect all unique tags for the filter bar
  const availableTags = useMemo(() => {
    const tags = new Set();
    resolvedList.forEach((m) => (m.tags || []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [resolvedList]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    try {
      const data = await apiClient.listMemories({ ...listParams, offset: nextOffset, limit: PAGE_SIZE });
      const arr = data?.memories || data?.results || data || [];
      const items = Array.isArray(arr) ? arr : [];
      if (items.length < PAGE_SIZE) setHasMore(false);
      setAllMemories((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        items.forEach((m) => {
          if (!ids.has(m.id)) merged.push(m);
        });
        return merged;
      });
      setOffset(nextOffset);
    } catch {
      // silently fail
    }
  };

  const handleSelectMemory = useCallback(
    async (memory) => {
      if (selectedMemory?.id === memory.id) {
        setSelectedMemory(null);
        return;
      }
      // Fetch full detail
      try {
        const full = await apiClient.getMemory(memory.id);
        setSelectedMemory(full?.memory || full);
      } catch {
        setSelectedMemory(memory);
      }
    },
    [selectedMemory],
  );

  const handleDeleteMemory = useCallback(
    (id) => {
      setSelectedMemory(null);
      setAllMemories((prev) => prev.filter((m) => m.id !== id));
      refetchList();
    },
    [refetchList],
  );

  const clearFilters = () => {
    setActiveType(null);
    setActiveTag(null);
    setSearchQuery('');
    setOffset(0);
    setAllMemories([]);
    setHasMore(true);
  };

  const hasFilters = isSearching || activeType || activeTag;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090b] font-['Space_Grotesk']">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#bdf213]/[0.012] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
              <Brain size={22} className="text-[#bdf213]" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Memories</h1>
              <p className="text-white/30 text-xs">Browse and manage stored knowledge</p>
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>

        {/* ── Search Bar ── */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
              setAllMemories([]);
              setHasMore(true);
            }}
            placeholder="Search memories semantically..."
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3.5 pl-11 pr-10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#bdf213]/30 focus:ring-1 focus:ring-[#bdf213]/20 transition-all"
          />
        </div>

        {/* Search mode indicator */}
        {isSearching && !searchLoading && searchData && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] font-mono text-white/20">
            <span className={`w-1 h-1 rounded-full ${searchData?.metadata?.fallbackApplied ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {searchData?.metadata?.fallbackApplied
              ? 'Keyword search (vector unavailable)'
              : 'Semantic search (vector + keyword)'}
            {searchData?.metadata?.durationMs != null && (
              <span className="ml-1">· {searchData.metadata.durationMs}ms</span>
            )}
            {searchData?.search_method && (
              <span className="ml-1">· {searchData.search_method}</span>
            )}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-mono mb-3 transition-colors ${
              showFilters ? 'text-[#bdf213]' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <Filter size={12} />
            Filters
            {(activeType || activeTag) && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#bdf213]" />
            )}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Type filters */}
                <div className="mb-3">
                  <label className="block text-white/20 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEMORY_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setActiveType(activeType === t.key ? null : t.key);
                          setOffset(0);
                          setAllMemories([]);
                          setHasMore(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          activeType === t.key
                            ? 'border-current'
                            : 'border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.12]'
                        }`}
                        style={activeType === t.key ? { color: t.color, backgroundColor: `${t.color}15`, borderColor: `${t.color}40` } : {}}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag filters */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-white/20 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.slice(0, 20).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setActiveTag(activeTag === tag ? null : tag);
                            setOffset(0);
                            setAllMemories([]);
                            setHasMore(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                            activeTag === tag
                              ? 'border-[#bdf213]/40 bg-[#bdf213]/10 text-[#bdf213]'
                              : 'border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.12]'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={14} />
            <span className="font-mono text-xs">{error}</span>
          </div>
        )}

        {/* ── Content ── */}
        <div className="relative">
          {loading && resolvedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={28} className="text-[#bdf213]/50 animate-spin mb-4" />
              <span className="text-white/20 text-sm">Loading memories...</span>
            </div>
          ) : resolvedList.length === 0 ? (
            <EmptyState hasFilters={!!hasFilters} />
          ) : (
            <>
              {/* Count */}
              <p className="text-white/20 text-[11px] font-mono mb-3">
                {isSearching ? 'Search results' : `${resolvedList.length} memories`}
                {loading && <Loader2 size={10} className="inline-block ml-2 animate-spin" />}
              </p>

              {/* Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {resolvedList.map((memory, i) => (
                    <MemoryCard
                      key={memory.id || i}
                      memory={memory}
                      index={i}
                      onSelect={handleSelectMemory}
                      isSelected={selectedMemory?.id === memory.id}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load more */}
              {!isSearching && hasMore && resolvedList.length >= PAGE_SIZE && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-sm font-semibold hover:text-white/60 hover:border-white/[0.12] transition-all"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail Slide-over ── */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetailPanel
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            onDelete={handleDeleteMemory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
