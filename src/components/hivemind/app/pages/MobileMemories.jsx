import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, ChevronLeft, Clock, Filter, Link2, Lock, Monitor, Search, Tag, X } from 'lucide-react';
import apiClient from '../shared/api-client';

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

function chipTone(value = '') {
  const v = String(value).toLowerCase();
  if (v.includes('fact')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (v.includes('decision')) return 'bg-blue-50 text-[#117dff] border-blue-100';
  if (v.includes('event')) return 'bg-orange-50 text-orange-700 border-orange-100';
  if (v.includes('project')) return 'bg-violet-50 text-violet-700 border-violet-100';
  return 'bg-[#f3f1ec] text-[#6f6b63] border-[#ebe6dc]';
}

export default function MobileMemories() {
  const navigate = useNavigate();
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
        const rows = data?.memories || data?.results || data?.items || [];
        if (!cancelled) setMemories(rows.filter(Boolean));
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
    <div className="fixed inset-0 bg-[#faf9f4] text-[#0a0a0a] overflow-hidden flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="h-14 px-3 bg-white/90 backdrop-blur-xl border-b border-[#ece9e2] flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hivemind/m/chat')} className="w-10 h-10 rounded-full grid place-items-center active:bg-[#ece9e2]" aria-label="Back to chat">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">Memories</div>
          <div className="text-[10.5px] text-[#737373]">{stats.count} visible rows · {stats.scopes || 1} scopes</div>
        </div>
        <div className="w-9 h-9 rounded-[13px] bg-[#edf5ff] text-[#117dff] grid place-items-center border border-[#cfe2ff]">
          <Brain size={17} />
        </div>
      </header>

      <div className="px-4 pt-3 pb-2 bg-[#faf9f4] flex-shrink-0">
        <label className="flex items-center gap-2 h-11 px-3 rounded-[18px] bg-white border border-[#ece9e2] focus-within:border-[#9fc7ff]">
          <Search size={16} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search semantic memory..." className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#b9b5ae]" />
          {query && <button onClick={() => setQuery('')} className="text-[#a3a3a3]"><X size={15} /></button>}
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TYPES.map((item) => (
            <button
              key={item}
              onClick={() => setType(item)}
              className={`px-3 py-1.5 rounded-full border text-[11.5px] font-semibold capitalize whitespace-nowrap ${
                type === item ? 'bg-[#edf5ff] text-[#117dff] border-[#cfe2ff]' : 'bg-white text-[#525252] border-[#ece9e2]'
              }`}
            >
              {item === 'all' ? <Filter size={12} className="inline mr-1" /> : null}{item}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-3 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading memory rows...</div>}
        {error && <div className="m-3 p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        {!loading && !error && memories.length === 0 && <div className="py-16 text-center text-[13px] text-[#737373]">No memories match this filter.</div>}
        <div className="space-y-2">
          {memories.map((memory, index) => (
            <motion.button
              key={memory.id || `${titleOf(memory)}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.015, 0.18) }}
              onClick={() => setSelected(memory)}
              className="w-full text-left bg-white border border-[#e3e0db] rounded-[20px] px-3 py-3 shadow-[0_10px_28px_rgba(26,24,20,0.04)] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-bold leading-snug line-clamp-2">{titleOf(memory)}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase ${chipTone(memory.memory_type || memory.type)}`}>
                      {memory.memory_type || memory.type || 'memory'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#ebe6dc] bg-[#f8f6f1] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-[#8b857d]">
                      <Lock size={9} /> {memory.scope || memory.visibility || 'personal'}
                    </span>
                    {Boolean(memory.linked_count || memory.links?.length) && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#cfe2ff] bg-[#edf5ff] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-[#117dff]">
                        <Link2 size={9} /> linked {memory.linked_count || memory.links?.length}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft size={16} className="mt-0.5 rotate-180 text-[#c6c1b8]" />
              </div>
              <p className="mt-2 text-[12px] text-[#5f5c55] leading-snug line-clamp-3">
                {memory.content || memory.text || memory.summary || 'No preview available.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-[#ebe6dc] bg-white px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-[#6f6b63]">
                  <Monitor size={10} /> {memory.sourcePlatform || memory.source || 'AI-MEETING-NOTES'}
                </span>
                {(memory.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#f3f1ec] px-2 py-0.5 text-[10px] text-[#6f6b63]">
                    <Tag size={9} /> {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10.5px] text-[#b1aca4]">
                <div className="h-1.5 w-16 rounded-full bg-[#ebe6dc]" />
                <span>--</span>
                <Clock size={11} /> {ago(memory.created_at || memory.updated_at)}
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} onClick={(e) => e.stopPropagation()} className="w-full max-h-[78vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5">
              <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
              <div className="text-[18px] font-bold leading-tight">{titleOf(selected)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(selected.tags || []).slice(0, 8).map((tag) => <span key={tag} className="px-2 py-1 rounded-full bg-[#f3f1ec] text-[10.5px] text-[#525252]">{tag}</span>)}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed whitespace-pre-wrap text-[#262626]">{selected.content || selected.text || selected.summary || 'No content available.'}</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
