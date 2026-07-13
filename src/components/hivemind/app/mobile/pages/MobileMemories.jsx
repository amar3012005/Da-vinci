import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';

const TYPES = ['all', 'fact', 'decision', 'preference', 'procedure', 'experience', 'synthesis'];

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

export default function MobileMemories() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = { limit: 40, offset: 0, hide_noise: 'true', is_latest: 'all' };
        if (type !== 'all') params.memory_type = type;
        const data = query.trim()
          ? await apiClient.searchMemories(query.trim(), { ...params, limit: 40 })
          : await apiClient.listMemories(params);
        if (!cancelled) setMemories(data?.memories || data?.results || data || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Could not load memories.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, type]);

  const stats = useMemo(() => {
    const scopes = new Set(memories.map((m) => m.scope || m.visibility).filter(Boolean));
    return { count: memories.length, scopes: scopes.size };
  }, [memories]);

  return (
    <MobileShell>
      <div className="px-6 pt-1 pb-24">
        {/* Large serif header */}
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Memories</h1>

        {/* Inline counts — NOT boxed widgets: just number + label as text */}
        <div className="mt-2 flex items-baseline gap-5">
          <span className="text-[13px] text-[#737373]"><span className="text-[#0a0a0a] font-semibold">{stats.count}</span> {stats.count === 1 ? 'memory' : 'memories'}</span>
          <span className="text-[13px] text-[#737373]"><span className="text-[#0a0a0a] font-semibold">{stats.scopes || 1}</span> {(stats.scopes || 1) === 1 ? 'scope' : 'scopes'}</span>
        </div>

        {/* Rounded-full search */}
        <div className="mt-4 flex items-center gap-2 h-11 px-4 rounded-full border border-[#dcd8d0] bg-transparent focus-within:border-[#b6b1a7]">
          <Search size={17} className="text-[#a3a3a3]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories"
            className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[#a8a49c]"
          />
          {query && <button onClick={() => setQuery('')} className="text-[#a3a3a3]"><X size={16} /></button>}
        </div>

        {/* Type filter — pill scroller */}
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

        {/* Flat rows — no cards/borders/shadows; a thin divider between them */}
        <div className="mt-4 divide-y divide-[#ece9e2]">
          {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading…</div>}
          {error && <div className="py-3 text-[13px] text-red-700">{error}</div>}
          {!loading && !error && memories.length === 0 && <div className="py-16 text-center text-[13px] text-[#737373]">No memories match this filter.</div>}
          {memories.map((memory, index) => (
            <motion.button
              key={memory.id || `${titleOf(memory)}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(index * 0.012, 0.15) }}
              onClick={() => setSelected(memory)}
              className="w-full text-left py-3.5 active:opacity-60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] leading-snug line-clamp-1 flex-1">{titleOf(memory)}</h3>
                <span className="text-[11px] text-[#a8a49c] flex-shrink-0">{ago(memory.created_at || memory.updated_at)}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-[#8a857c] leading-snug line-clamp-2">
                {memory.content || memory.text || memory.summary || ''}
              </p>
            </motion.button>
          ))}
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
