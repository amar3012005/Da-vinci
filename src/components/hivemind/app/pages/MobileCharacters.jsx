import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';
import apiClient from '../shared/api-client';

function initials(name = 'AI') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'AI';
}

export default function MobileCharacters() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.listEmployees();
        if (!cancelled) setEmployees((data?.employees || data || []).filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Could not load characters.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => `${e.name || ''} ${e.role || ''} ${e.slug || ''}`.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <div className="fixed inset-0 bg-[#faf9f4] text-[#0a0a0a] overflow-hidden flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="h-14 px-3 bg-white/90 backdrop-blur-xl border-b border-[#ece9e2] flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hivemind/m/chat')} className="w-10 h-10 rounded-full grid place-items-center active:bg-[#ece9e2]" aria-label="Back to chat">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">Characters</div>
          <div className="text-[10.5px] text-[#737373]">{employees.length} agents in your roster</div>
        </div>
        <button onClick={() => navigate('/hivemind/app/employees/roster')} className="h-9 px-3 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold">
          Roster
        </button>
      </header>

      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <label className="flex items-center gap-2 h-11 px-3 rounded-[18px] bg-white border border-[#ece9e2]">
          <Search size={16} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a character..." className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#b9b5ae]" />
        </label>
      </div>

      <main className="flex-1 overflow-y-auto px-3 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        <section className="mb-3 rounded-[22px] bg-white border border-[#ece9e2] p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#737373]"><Users size={13} /> character layer</div>
          <div className="mt-2 text-[20px] font-bold leading-tight">Small cards, fast scan, one-tap handoff to your agents.</div>
        </section>
        {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading characters...</div>}
        {error && <div className="p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        {!loading && !error && filtered.length === 0 && <div className="py-12 text-center text-[13px] text-[#737373]">No characters match this search.</div>}
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((emp, index) => {
            const status = emp.status || emp.state || 'ready';
            const name = emp.name || emp.display_name || emp.slug || 'Unnamed character';
            return (
              <motion.button
                key={emp.id || emp.slug || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.018, 0.2) }}
                onClick={() => navigate('/hivemind/app/employees')}
                className="text-left min-h-[154px] rounded-[22px] bg-white border border-[#ece9e2] p-3 active:scale-[0.985] flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-11 h-11 rounded-[17px] bg-gradient-to-br from-[#117dff] to-[#8b5cf6] text-white grid place-items-center text-[13px] font-bold">
                    {initials(name)}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold uppercase ${status === 'running' || status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-[#f3f1ec] text-[#737373]'}`}>{status}</span>
                </div>
                <div className="mt-3 text-[14px] font-bold leading-tight line-clamp-2">{name}</div>
                <div className="mt-1 text-[11.5px] text-[#737373] line-clamp-2">{emp.role || emp.profession || emp.description || 'HIVEMIND character with persistent memory access.'}</div>
                <div className="mt-auto pt-3 flex items-center justify-between text-[10.5px] text-[#a3a3a3]">
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> scoped</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> open</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {!loading && !error && employees.length === 0 && (
          <button onClick={() => navigate('/hivemind/app/employees/roster')} className="mt-3 w-full h-12 rounded-[18px] bg-[#117dff] text-white text-[13px] font-semibold flex items-center justify-center gap-2">
            <Sparkles size={15} /> Create your first character
          </button>
        )}
      </main>
    </div>
  );
}
