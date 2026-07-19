import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Nango from '@nangohq/frontend';
import {
  Bot,
  Cable,
  CheckCircle2,
  Chrome,
  Cloud,
  FileText,
  Github,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';
import { CONNECTOR_CATALOG, BRAND_LOGOS } from '../../shared/connectors-catalog';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'productivity', label: 'Workspace' },
  { key: 'comms', label: 'Comms' },
  { key: 'docs', label: 'Docs' },
  { key: 'project', label: 'Projects' },
  { key: 'code', label: 'Code' },
];

// Self-hosted Nango control plane lives inside singulance — same hosts the
// desktop Connectors page targets, overridable per environment.
const NANGO_CONNECT_URL = process.env.REACT_APP_NANGO_CONNECT_URL || 'https://api.hivemind.davinciai.eu:8043';
const NANGO_API_URL = process.env.REACT_APP_NANGO_HOST || 'https://api.hivemind.davinciai.eu:8042';

function iconFor(id = '', category = '') {
  const key = `${id} ${category}`.toLowerCase();
  if (key.includes('gmail') || key.includes('mail') || key.includes('microsoft')) return Mail;
  if (key.includes('slack') || key.includes('chat') || key.includes('discord')) return MessageSquare;
  if (key.includes('github')) return Github;
  if (key.includes('drive') || key.includes('cloud')) return Cloud;
  if (key.includes('docs') || key.includes('notion') || key.includes('confluence')) return FileText;
  return Cable;
}

// Brand mark — real app logo (simple-icons / iconify) exactly like the desktop
// Connectors page, with a graceful fallback to a category glyph if the CDN img
// fails (CSP allows https: img-src).
function LogoMark({ id, category, name, connected }) {
  const [failed, setFailed] = useState(false);
  const url = BRAND_LOGOS[id];
  const Icon = iconFor(id, category);
  return (
    <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] border ${connected ? 'border-emerald-200 bg-emerald-50' : 'border-[#ece9e2] bg-white'}`}>
      {url && !failed ? (
        <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-[22px] w-[22px] object-contain" />
      ) : (
        <Icon size={17} className={connected ? 'text-emerald-600' : 'text-[#117dff]'} />
      )}
    </span>
  );
}

export default function MobileConnectors() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionErr, setActionErr] = useState('');

  const loadConnections = useCallback(async () => {
    try {
      const data = await apiClient.listOAuthConnectors().catch(() => ({ connectors: [] }));
      setConnections(data?.connectors || data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Could not load connectors.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      await loadConnections();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadConnections]);

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

  // In-app Nango popup — for connectors with a nangoProvider (personio, datev,
  // sap…). Opens the Nango Connect UI SYNCHRONOUSLY in the tap gesture (else
  // mobile Safari blocks it), fetches the session token after, hands it in.
  // Stays entirely inside /m/ — never bounces to the desktop connectors page.
  const connectNango = useCallback(async (connector) => {
    const providerKey = connector.nangoProvider;
    setActionErr(''); setBusyId(connector.id);
    const nango = new Nango();
    try {
      await new Promise((resolve, reject) => {
        const ui = nango.openConnectUI({
          baseURL: NANGO_CONNECT_URL,
          apiURL: NANGO_API_URL,
          onEvent: async (event) => {
            try {
              if (event?.type === 'connect') {
                const p = event.payload || {};
                const pKey = p.providerConfigKey || p.provider_config_key || providerKey;
                const connectionId = p.connectionId || p.connection_id;
                if (!connectionId) throw new Error('Nango did not return a connection id');
                await apiClient.finalizeNangoConnection(pKey, connectionId);
                await loadConnections();
                resolve();
              } else if (event?.type === 'close') {
                resolve();
              } else if (event?.type === 'error') {
                reject(new Error(event?.payload?.error || 'Nango connect error'));
              }
            } catch (e) { reject(e); }
          },
        });
        apiClient.getNangoConnectSession(connector.id)
          .then(({ connect_session_token }) => {
            if (ui && typeof ui.setSessionToken === 'function') ui.setSessionToken(connect_session_token);
            else reject(new Error('Nango Connect UI unavailable'));
          })
          .catch((e) => { try { ui && ui.close && ui.close(); } catch { /* noop */ } reject(e); });
      });
    } catch (err) {
      setActionErr(err?.response?.data?.error || err?.message || 'Nango connect failed.');
    } finally {
      setBusyId(null);
    }
  }, [loadConnections]);

  // OAuth redirect connectors (Google/Gmail/etc) — start the flow, redirect
  // THIS window to the provider auth URL, return to /m/connectors after.
  const connectOAuth = useCallback(async (provider) => {
    if (!provider) return;
    setActionErr(''); setBusyId(provider);
    try {
      const res = await apiClient.startConnectorOAuth(provider, '/hivemind/m/connectors', { target_scope: 'personal' });
      const url = res?.url || res?.redirect_url || res?.authorization_url;
      if (url) { window.location.href = url; return; }
      setActionErr('Could not start the connection.');
    } catch (e) {
      setActionErr(e?.response?.data?.detail || e?.message || 'Could not start the connection.');
    } finally { setBusyId(null); }
  }, []);

  const onConnect = useCallback((connector) => {
    if (connector.nangoProvider) return connectNango(connector);
    return connectOAuth(connector.oauthProvider || connector.id);
  }, [connectNango, connectOAuth]);

  const disconnect = useCallback(async (provider) => {
    if (!provider) return;
    setActionErr(''); setBusyId(provider);
    try { await apiClient.disconnectConnector(provider); await loadConnections(); }
    catch (e) { setActionErr(e?.response?.data?.detail || e?.message || 'Could not disconnect.'); }
    finally { setBusyId(null); }
  }, [loadConnections]);

  const liveCount = <span className="text-[11px] text-[#a8a49c] whitespace-nowrap pr-1">{connectedCount} live</span>;
  return (
    <MobileShell title="Connectors" rightAction={liveCount}>
      <div className="px-3 pt-3 pb-2">
        <label className="flex items-center gap-2 h-11 px-3 rounded-[18px] bg-white border border-[#ece9e2] focus-within:border-[#9fc7ff]">
          <Search size={16} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search connectors..." className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#b9b5ae]" />
        </label>
      </div>

      <div className="px-3 pb-6">
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
            { id: 'chatgpt', name: 'ChatGPT', sub: 'GPT Actions OAuth', Icon: Bot, tone: 'bg-[#f5f8f7]' },
            { id: 'claude', name: 'Claude', sub: 'Remote MCP server', Icon: SparkIcon, tone: 'bg-orange-50' },
          ].map(({ id, name, sub, Icon, tone }) => {
            const logo = BRAND_LOGOS[id];
            return (
              <div key={id} className="rounded-[18px] border border-[#e3e0db] bg-white p-3 shadow-[0_10px_28px_rgba(26,24,20,0.04)]">
                <div className={`mb-2.5 h-9 w-9 rounded-[13px] ${tone} grid place-items-center`}>
                  {logo ? <img src={logo} alt={name} loading="lazy" className="h-[18px] w-[18px] object-contain" /> : <Icon size={16} />}
                </div>
                <div className="text-[12.5px] font-bold">{name}</div>
                <div className="mt-0.5 text-[10px] text-[#9a958d] line-clamp-1">{sub}</div>
                <button onClick={() => connectOAuth(id)} disabled={busyId === id} className="mt-2.5 inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-[#1a1a17] px-2.5 text-[10.5px] font-bold text-white disabled:opacity-50">
                  {busyId === id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Connect
                </button>
              </div>
            );
          })}
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
        {actionErr && <div className="mb-2 p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{actionErr}</div>}
        <div className="space-y-1.5">
          {filtered.slice(0, 24).map((connector, index) => {
            const busy = busyId === connector.id || busyId === connector.oauthProvider;
            return (
              <motion.div
                key={connector.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.014, 0.18) }}
                className="w-full rounded-[18px] border border-[#e3e0db] bg-white p-2.5 text-left shadow-[0_10px_22px_rgba(26,24,20,0.035)]"
              >
                <div className="flex items-start gap-2.5">
                  <LogoMark id={connector.id} category={connector.category} name={connector.name} connected={connector.connected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-bold leading-tight line-clamp-1">{connector.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-mono uppercase ${connector.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f3f1ec] text-[#9a958d]'}`}>
                        {connector.connected ? connector.scope : 'available'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-[#8b857d] line-clamp-2">{connector.description}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {(connector.mode || []).slice(0, 2).map((mode) => (
                        <span key={mode} className="rounded-md border border-[#cfe2ff] bg-[#edf5ff] px-1.5 py-0.5 text-[9px] font-mono text-[#117dff] capitalize">{mode}</span>
                      ))}
                      {connector.nangoProvider && (
                        <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-mono text-violet-700">nango</span>
                      )}
                      {connector.connected ? (
                        <button
                          onClick={() => disconnect(connector.id)}
                          disabled={busy}
                          className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-[#e3e0db] bg-white px-2.5 text-[10.5px] font-bold text-[#6f6b63] active:scale-[0.97] disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} className="text-emerald-500" />} Connected
                        </button>
                      ) : (
                        <button
                          onClick={() => onConnect(connector)}
                          disabled={busy}
                          className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg bg-[#1a1a17] px-2.5 text-[10.5px] font-bold text-white active:scale-[0.97] disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}

function SparkIcon(props) {
  return <RefreshCw {...props} className="text-orange-500" />;
}
