import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Cable,
  CheckCircle2,
  ChevronLeft,
  Chrome,
  Cloud,
  FileText,
  Github,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { CONNECTOR_CATALOG } from '../shared/connectors-catalog';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'productivity', label: 'Workspace' },
  { key: 'comms', label: 'Comms' },
  { key: 'docs', label: 'Docs' },
  { key: 'project', label: 'Projects' },
  { key: 'code', label: 'Code' },
];

function iconFor(id = '', category = '') {
  const key = `${id} ${category}`.toLowerCase();
  if (key.includes('gmail') || key.includes('mail') || key.includes('microsoft')) return Mail;
  if (key.includes('slack') || key.includes('chat') || key.includes('discord')) return MessageSquare;
  if (key.includes('github')) return Github;
  if (key.includes('drive') || key.includes('cloud')) return Cloud;
  if (key.includes('docs') || key.includes('notion') || key.includes('confluence')) return FileText;
  return Cable;
}

export default function MobileConnectors() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.listOAuthConnectors().catch(() => ({ connectors: [] }));
        if (!cancelled) setConnections(data?.connectors || data || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Could not load connectors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const byId = new Map((connections || []).map((c) => [String(c.provider || c.id || '').toLowerCase(), c]));
    return CONNECTOR_CATALOG.map((item) => {
      const live = byId.get(String(item.id).toLowerCase()) || {};
      return {
        ...item,
        connected: Boolean(live.connected || live.connection || live.status === 'connected'),
        liveStatus: live.status || item.status || 'available',
        scope: live.scope || live.target_scope || 'my space',
      };
    });
  }, [connections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      const categoryMatch = category === 'all' || item.category === category;
      const queryMatch = !q || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [category, query, rows]);

  const connectedCount = rows.filter((r) => r.connected).length;

  return (
    <div className="fixed inset-0 bg-[#faf9f4] text-[#0a0a0a] overflow-hidden flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="h-14 px-3 bg-white/90 backdrop-blur-xl border-b border-[#ece9e2] flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hivemind/m/chat')} className="w-10 h-10 rounded-full grid place-items-center active:bg-[#ece9e2]" aria-label="Back to chat">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">Connectors</div>
          <div className="text-[10.5px] text-[#8b857d]">Apps, browsers, and data sources for your memory engine</div>
        </div>
        <button onClick={() => navigate('/hivemind/app/connectors')} className="h-9 px-3 rounded-full bg-[#117dff] text-white text-[12px] font-semibold">
          Desktop
        </button>
      </header>

      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <label className="flex items-center gap-2 h-11 px-3 rounded-[18px] bg-white border border-[#ece9e2] focus-within:border-[#9fc7ff]">
          <Search size={16} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search connectors..." className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#b9b5ae]" />
        </label>
      </div>

      <main className="flex-1 overflow-y-auto px-3 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        <section className="mb-3 rounded-[22px] bg-white border border-[#e3e0db] p-3.5 shadow-[0_12px_34px_rgba(26,24,20,0.045)]">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-[17px] bg-[#117dff] text-white shadow-[0_12px_28px_rgba(17,125,255,0.28)] grid place-items-center flex-shrink-0">
              <Chrome size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold">Browser Intelligence</h2>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-mono text-emerald-700">OFFICIAL</span>
                <span className="ml-auto rounded-full border border-[#e3e0db] bg-[#faf9f4] px-2 py-0.5 text-[9px] font-mono uppercase text-[#8b857d]">{connectedCount} live</span>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-[#6f6b63]">Save selections, pages, and AI chats directly into memory.</p>
              <button onClick={() => navigate('/hivemind/app/connectors')} className="mt-3 h-8 rounded-xl bg-[#117dff] px-3.5 text-[11px] font-bold text-white">
                Add to Chrome
              </button>
            </div>
          </div>
        </section>

        <section className="mb-3 grid grid-cols-2 gap-2">
          {[
            { name: 'ChatGPT', sub: 'GPT Actions OAuth', Icon: Bot, tone: 'bg-[#f5f8f7]' },
            { name: 'Claude', sub: 'Remote MCP server', Icon: SparkIcon, tone: 'bg-orange-50' },
          ].map(({ name, sub, Icon, tone }) => (
            <div key={name} className="rounded-[18px] border border-[#e3e0db] bg-white p-3 shadow-[0_10px_28px_rgba(26,24,20,0.04)]">
              <div className={`mb-2.5 h-9 w-9 rounded-[13px] ${tone} grid place-items-center`}><Icon size={16} /></div>
              <div className="text-[12.5px] font-bold">{name}</div>
              <div className="mt-0.5 text-[10px] text-[#9a958d] line-clamp-1">{sub}</div>
              <button onClick={() => navigate('/hivemind/app/connectors')} className="mt-2.5 inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-[#117dff] px-2.5 text-[10.5px] font-bold text-white">
                <Plus size={13} /> Connect
              </button>
            </div>
          ))}
        </section>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              onClick={() => setCategory(item.key)}
              className={`px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold whitespace-nowrap ${
                category === item.key ? 'bg-white border-[#d8d2c6] text-[#0a0a0a] shadow-sm' : 'bg-transparent text-[#6f6b63] border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading connectors...</div>}
        {error && <div className="p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        <div className="space-y-1.5">
          {filtered.slice(0, 24).map((connector, index) => {
            const Icon = iconFor(connector.id, connector.category);
            return (
              <motion.button
                key={connector.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.014, 0.18) }}
                onClick={() => navigate('/hivemind/app/connectors')}
                className="w-full rounded-[18px] border border-[#e3e0db] bg-white p-2.5 text-left shadow-[0_10px_22px_rgba(26,24,20,0.035)] active:scale-[0.99]"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] ${connector.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-[#edf5ff] text-[#117dff]'}`}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-bold leading-tight line-clamp-1">{connector.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-mono uppercase ${connector.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f3f1ec] text-[#9a958d]'}`}>
                        {connector.connected ? connector.scope : 'available'}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8b857d] line-clamp-2">{connector.description}</span>
                    <span className="mt-1.5 flex items-center gap-1.5">
                      {(connector.mode || []).slice(0, 2).map((mode) => (
                        <span key={mode} className="rounded-md border border-[#cfe2ff] bg-[#edf5ff] px-1.5 py-0.5 text-[9px] font-mono text-[#117dff] capitalize">{mode}</span>
                      ))}
                      {connector.connected && <CheckCircle2 size={12} className="ml-auto text-emerald-500" />}
                      {!connector.connected && <Settings size={12} className="ml-auto text-[#a3a3a3]" />}
                    </span>
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function SparkIcon(props) {
  return <RefreshCw {...props} className="text-orange-500" />;
}
