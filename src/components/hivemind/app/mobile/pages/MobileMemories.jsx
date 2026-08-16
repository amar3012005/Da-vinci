import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, GitFork, Lock } from 'lucide-react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';
import { useAuth } from '../../auth/AuthProvider';
import { filterUserVisibleMemories } from '../../shared/memory-filters';

const TYPES = ['all', 'fact', 'decision', 'preference', 'procedure', 'experience', 'synthesis'];

// Staggered entrance — ported from the desktop Memories.jsx cardVariants.
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: Math.min(i * 0.035, 0.4), duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

const TYPE_TONE = {
  fact: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  decision: 'bg-blue-50 text-[#117dff] border-blue-200',
  preference: 'bg-violet-50 text-violet-700 border-violet-200',
  event: 'bg-orange-50 text-orange-700 border-orange-200',
  goal: 'bg-amber-50 text-amber-700 border-amber-200',
  lesson: 'bg-teal-50 text-teal-700 border-teal-200',
  synthesis: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  summary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function ago(iso) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function titleOf(memory) {
  return memory?.title || memory?.summary || memory?.content?.slice(0, 72) || memory?.text?.slice(0, 72) || 'Untitled memory';
}

// Ported compact chips from desktop Memories.jsx (EntityChips / RelationshipIndicator).
function EntityChips({ memory }) {
  const ents = (Array.isArray(memory?.tags) ? memory.tags : [])
    .filter((t) => typeof t === 'string' && t.startsWith('entity:'))
    .map((t) => t.slice(7).replace(/_/g, ' '));
  if (!ents.length) return null;
  const visible = ents.slice(0, 3);
  const overflow = ents.length - visible.length;
  return (
    <>
      {visible.map((e) => (
        <span key={`ent-${e}`} className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider">
          @{String(e).slice(0, 18)}
        </span>
      ))}
      {overflow > 0 && <span className="text-[9px] font-mono px-1 py-0.5 text-violet-500">+{overflow}</span>}
    </>
  );
}

function RelationshipIndicator({ memory }) {
  const chips = [];
  if (memory.is_latest === false || memory.superseded_by) {
    chips.push(<span key="sup" className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#a3a3a3] uppercase tracking-wider"><GitFork size={8} /> superseded</span>);
  }
  const total = (memory.edges_in_count || 0) + (memory.edges_out_count || 0);
  if (total > 0) {
    chips.push(<span key="lk" className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#0a5fcc] uppercase tracking-wider"><GitFork size={8} /> linked {total}</span>);
  }
  return chips.length ? <>{chips}</> : null;
}

function MemoryCard({ memory, index, onSelect }) {
  const type = memory.memory_type || memory.type;
  const scope = memory.scope || memory.visibility || 'personal';
  const importance = Number(memory.importance_score ?? memory.importance ?? 0);
  return (
    <motion.button
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={() => onSelect(memory)}
      className="w-full text-left rounded-2xl border border-[#e3e0db] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-[0.99] active:border-[#d4d0ca] transition"
    >
      <div className="flex items-start justify-between gap-2.5">
        <h3 className="text-[14px] font-bold font-['Space_Grotesk'] leading-tight line-clamp-1 flex-1">{titleOf(memory)}</h3>
        <span className="text-[10.5px] text-[#a8a49c] flex-shrink-0 mt-0.5">{ago(memory.created_at || memory.updated_at)}</span>
      </div>

      {/* chip row: type · scope · relationships · entities */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {type && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${TYPE_TONE[type] || 'bg-[#f3f1ec] text-[#6f6b63] border-[#ebe6dc]'}`}>{type}</span>
        )}
        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f8f6f1] text-[#8b857d] border border-[#ebe6dc] uppercase tracking-wider">
          <Lock size={8} /> {scope}
        </span>
        <RelationshipIndicator memory={memory} />
        <EntityChips memory={memory} />
      </div>

      <p className="mt-2 text-[12px] text-[#5f5c55] leading-snug line-clamp-2">
        {memory.content || memory.text || memory.summary || 'No preview available.'}
      </p>

      {/* footer: importance meter + chevron */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1 w-14 rounded-full bg-[#ebe6dc] overflow-hidden">
          <div className="h-full rounded-full bg-[#117dff]" style={{ width: `${Math.round(Math.min(1, Math.max(0, importance)) * 100)}%` }} />
        </div>
        <span className="text-[9.5px] font-mono text-[#b1aca4]">{importance ? `${Math.round(importance * 100)}%` : '—'}</span>
        <ChevronRight size={14} className="ml-auto text-[#d4d0ca]" />
      </div>
    </motion.button>
  );
}

// ─── First-paint cache ──────────────────────────────────────────────────────
// The first PAGE_SIZE memories are cached per user+org so a revisit paints
// instantly (no spinner), then fresh data replaces it in the background. The
// key includes BOTH ids — switching accounts in the same browser can never
// surface another account's memories from cache.
const PAGE_SIZE = 15;
const _memCacheKey = (userId, orgId) => `hm_m_memcache:${userId || 'anon'}:${orgId || 'noorg'}`;
function loadMemCache(userId, orgId) {
  try {
    const raw = window.localStorage.getItem(_memCacheKey(userId, orgId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveMemCache(userId, orgId, memories) {
  try {
    window.localStorage.setItem(_memCacheKey(userId, orgId), JSON.stringify((memories || []).slice(0, PAGE_SIZE)));
  } catch { /* storage full/private — cache is best-effort */ }
}

export default function MobileMemories() {
  const { user, org } = useAuth() || {};
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const _cached = useMemo(() => loadMemCache(user?.id, org?.id), [user?.id, org?.id]);
  const [memories, setMemories] = useState(_cached);
  const [loading, setLoading] = useState(_cached.length === 0); // cache hit → instant paint, no spinner
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(null); // backend total (pagination.total), not the loaded page
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = { limit: PAGE_SIZE, offset: 0, hide_noise: 'true', is_latest: 'all' };
        if (type !== 'all') params.memory_type = type;
        const data = query.trim()
          ? await apiClient.searchMemories(query.trim(), { ...params, limit: 40 })
          : await apiClient.listMemories(params);
        const rawRows = data?.memories || data?.results || data || [];
        const sourceRows = Array.isArray(rawRows) ? rawRows : [];
        const rows = filterUserVisibleMemories(sourceRows);
        if (!cancelled) {
          setMemories(rows);
          setTotalCount(null);
          offsetRef.current = sourceRows.length;
          setHasMore(!query.trim() && sourceRows.length >= PAGE_SIZE);
          // Refresh the instant-paint cache only for the default view.
          if (!query.trim() && type === 'all') saveMemCache(user?.id, org?.id, rows);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Could not load memories.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, type, user?.id, org?.id]);

  // Page in the remaining memories as the sentinel enters the viewport.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || query.trim()) return;
    setLoadingMore(true);
    try {
      const params = { limit: PAGE_SIZE, offset: offsetRef.current, hide_noise: 'true', is_latest: 'all' };
      if (type !== 'all') params.memory_type = type;
      const data = await apiClient.listMemories(params);
      const rawRows = data?.memories || data?.results || data || [];
      const sourceRows = Array.isArray(rawRows) ? rawRows : [];
      const rows = filterUserVisibleMemories(sourceRows);
      setMemories((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...rows.filter((m) => !seen.has(m.id))];
      });
      offsetRef.current += sourceRows.length;
      if (sourceRows.length < PAGE_SIZE) setHasMore(false);
    } catch { setHasMore(false); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, query, type]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, loading]);

  const stats = useMemo(() => {
    const scopes = new Set(memories.map((m) => m.scope || m.visibility).filter(Boolean));
    return { count: totalCount ?? memories.length, scopes: scopes.size };
  }, [memories, totalCount]);

  return (
    <MobileShell>
      <div className="px-5 pt-1 pb-24">
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Memories</h1>

        {/* Inline counts — no boxed widgets */}
        <div className="mt-2 flex items-baseline gap-5">
          <span className="text-[13px] text-[#737373]"><span className="text-[#0a0a0a] font-semibold">{stats.count}</span> {stats.count === 1 ? 'memory' : 'memories'}</span>
          <span className="text-[13px] text-[#737373]"><span className="text-[#0a0a0a] font-semibold">{stats.scopes || 1}</span> {(stats.scopes || 1) === 1 ? 'scope' : 'scopes'}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 h-11 px-4 rounded-full border border-[#dcd8d0] focus-within:border-[#b6b1a7]">
          <Search size={17} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories" className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[#a8a49c]" />
          {query && <button onClick={() => setQuery('')} className="text-[#a3a3a3]"><X size={16} /></button>}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TYPES.map((item) => (
            <button
              key={item}
              onClick={() => setType(item)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium capitalize whitespace-nowrap border ${
                type === item ? 'bg-[#1a1a17] text-white border-[#1a1a17]' : 'bg-transparent text-[#525252] border-[#dcd8d0]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Desktop-style stacked cards */}
        <div className="mt-4 space-y-2.5">
          {loading && memories.length === 0 && <div className="py-12 text-center text-[13px] text-[#737373]">Loading…</div>}
          {error && <div className="py-3 text-[13px] text-red-700">{error}</div>}
          {!loading && !error && memories.length === 0 && <div className="py-16 text-center text-[13px] text-[#737373]">No memories match this filter.</div>}
          <AnimatePresence>
            {memories.map((memory, index) => (
              <MemoryCard key={memory.id || `${titleOf(memory)}-${index}`} memory={memory} index={index} onSelect={setSelected} />
            ))}
          </AnimatePresence>
          {/* Infinite scroll — the rest loads as the user scrolls */}
          {hasMore && !loading && !query.trim() && (
            <div ref={sentinelRef} className="py-4 text-center">
              {loadingMore && <span className="text-[12px] text-[#a3a3a3]">Loading more…</span>}
            </div>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} onClick={(e) => e.stopPropagation()} className="w-full max-h-[78vh] overflow-y-auto bg-white rounded-t-[28px] p-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
              <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
              <div className="text-[19px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{titleOf(selected)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.memory_type && <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${TYPE_TONE[selected.memory_type] || 'bg-[#f3f1ec] text-[#6f6b63] border-[#ebe6dc]'}`}>{selected.memory_type}</span>}
                {(selected.tags || []).slice(0, 8).map((tag) => <span key={tag} className="px-2 py-1 rounded-full bg-[#f3f1ec] text-[10.5px] text-[#525252]">{tag}</span>)}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed whitespace-pre-wrap text-[#262626]">{selected.content || selected.text || selected.summary || 'No content available.'}</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
