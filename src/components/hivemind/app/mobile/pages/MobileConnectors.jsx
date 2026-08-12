// Mobile Connectors — Composio only. Nango's popup SDK, the Browser
// Intelligence promo, and the ChatGPT/Claude featured tiles are gone (not
// used any more); this page is purely Composio's toolkit catalog, styled
// as the same compact row cards the old curated list used (small logo,
// name, Connect/Disconnect pill) instead of desktop's boxy grid cards.
// Same backend calls as desktop's ComposioToolkitBrowser — listComposioToolkits,
// getComposioToolkitTools, createComposioConnectLink, createComposioApiKeyConnection,
// disconnectComposioToolkit, plus native-Slack's own OAuth (see NATIVE_SLACK_TOOLKIT
// in the desktop browser for why Slack isn't routed through Composio's connect flow).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Cable, Check, Loader2, Plug, Search, Wrench, X, Zap } from 'lucide-react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';

const NATIVE_SLACK_TOOLKIT = 'slack';
const REDUNDANT_TOOLKITS = new Set(['slackbot']);

function isSelfServeConnectable(toolkit) {
  if (toolkit.noAuth) return true;
  if (toolkit.authSchemes?.includes('API_KEY')) return true;
  if (toolkit.composioManagedAuthSchemes?.length > 0) return true;
  return false;
}

function LogoMark({ toolkit, connected }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] border overflow-hidden ${connected ? 'border-emerald-200 bg-emerald-50' : 'border-[#ece9e2] bg-white'}`}>
      {toolkit.logo && !failed ? (
        <img src={toolkit.logo} alt={toolkit.name} loading="lazy" onError={() => setFailed(true)} className="h-[22px] w-[22px] object-contain" />
      ) : (
        <Cable size={16} className={connected ? 'text-emerald-600' : 'text-[#117dff]'} />
      )}
    </span>
  );
}

// Compact bottom-sheet detail — what tools this toolkit actually exposes,
// same data as desktop's ToolkitDetailModal, mobile bottom-sheet chrome.
function ToolkitDetailSheet({ toolkit, onClose }) {
  const [tools, setTools] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setTools(null);
    setError('');
    apiClient.getComposioToolkitTools(toolkit.slug)
      .then((data) => { if (!cancelled) setTools(data.tools || []); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Failed to load tools'); });
    return () => { cancelled = true; };
  }, [toolkit.slug]);

  return (
    <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#faf9f4] border border-[#ece9e2] grid place-items-center overflow-hidden flex-shrink-0">
            {toolkit.logo ? <img src={toolkit.logo} alt="" width={22} height={22} /> : <span className="text-[13px] font-bold text-[#a3a3a3]">{toolkit.name.slice(0, 1)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-bold leading-tight">{toolkit.name}</div>
            <div className="text-[11px] text-[#a3a3a3]">{toolkit.toolsCount} tools{toolkit.triggersCount > 0 ? ` · ${toolkit.triggersCount} triggers` : ''}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec] flex-shrink-0" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mt-4">
          {error && <p className="text-[12.5px] text-red-600">{error}</p>}
          {!tools && !error && <div className="flex items-center justify-center py-10 text-[#a3a3a3]"><Loader2 size={18} className="animate-spin" /></div>}
          {tools && (
            <div className="divide-y divide-[#f0eee6]">
              {tools.map((tool) => (
                <div key={tool.slug} className="py-2.5">
                  <p className="text-[12.5px] font-semibold text-[#0a0a0a] capitalize">{tool.name.toLowerCase()}</p>
                  {tool.description && <p className="text-[11.5px] text-[#737373] mt-0.5 leading-snug">{tool.description}</p>}
                </div>
              ))}
              {tools.length === 0 && <p className="text-[12px] text-[#a3a3a3] py-6 text-center">No tools listed for this toolkit.</p>}
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

export default function MobileConnectors() {
  // Composio's real redirect-back after OAuth: ?status=success|failed&
  // connected_account_id=ca_xxx on top of our own ?composio_toolkit=<slug>.
  const [returnParams] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const toolkit = params.get('composio_toolkit');
    if (!toolkit) return null;
    return { toolkit, status: params.get('status') };
  });

  const [query, setQuery] = useState(() => returnParams?.toolkit || '');
  const [category, setCategory] = useState('all');
  const [toolkits, setToolkits] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectingSlug, setConnectingSlug] = useState(null);
  const [disconnectingSlug, setDisconnectingSlug] = useState(null);
  const [connectedSlugs, setConnectedSlugs] = useState(() => (
    returnParams?.status === 'success' ? { [returnParams.toolkit]: 'connected' } : {}
  ));
  const [detailToolkit, setDetailToolkit] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!returnParams) return;
    if (returnParams.status === 'failed') setError(`Connecting ${returnParams.toolkit} failed or was cancelled.`);
    const url = new URL(window.location.href);
    url.searchParams.delete('composio_toolkit');
    url.searchParams.delete('status');
    url.searchParams.delete('connected_account_id');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (search, appendCursor) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.listComposioToolkits({ search, cursor: appendCursor || null, limit: 40 });
      setToolkits((prev) => (appendCursor ? [...prev, ...(data.toolkits || [])] : (data.toolkits || [])));
      setCursor(data.next_cursor || null);
      setTotalItems(data.total_items || 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query, null), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Category chips derived from whatever's currently loaded (Composio's own
  // taxonomy, not a hardcoded list) — best-effort since only loaded pages
  // are known client-side, refines as more toolkits load.
  const categories = useMemo(() => {
    const counts = new Map();
    toolkits.forEach((tk) => (tk.categories || []).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    return ['all', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([c]) => c)];
  }, [toolkits]);

  const handleConnect = useCallback(async (toolkit) => {
    setConnectingSlug(toolkit.slug);
    try {
      if (toolkit.slug === NATIVE_SLACK_TOOLKIT) {
        const { auth_url } = await apiClient.startConnectorOAuth('slack', '/hivemind/m/connectors', { target_scope: 'personal' });
        if (auth_url) window.location.href = auth_url;
        else throw new Error('No auth URL returned');
        return;
      }
      const isApiKey = !toolkit.authSchemes?.includes('OAUTH2') && toolkit.authSchemes?.includes('API_KEY');
      if (isApiKey) {
        // eslint-disable-next-line no-alert
        const key = window.prompt(`${toolkit.name} API key`);
        if (!key) return;
        await apiClient.createComposioApiKeyConnection(toolkit.slug, key.trim());
        setConnectedSlugs((prev) => ({ ...prev, [toolkit.slug]: 'connected' }));
        return;
      }
      const callbackUrl = `${window.location.origin}${window.location.pathname}?composio_toolkit=${encodeURIComponent(toolkit.slug)}`;
      const { redirect_url } = await apiClient.createComposioConnectLink(toolkit.slug, {
        toolkitMeta: { composioManagedAuthSchemes: toolkit.composioManagedAuthSchemes, noAuth: toolkit.noAuth },
        callbackUrl,
      });
      if (redirect_url) window.location.href = redirect_url;
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `Failed to connect ${toolkit.name}`);
    } finally {
      setConnectingSlug(null);
    }
  }, []);

  const handleDisconnect = useCallback(async (toolkit) => {
    setDisconnectingSlug(toolkit.slug);
    try {
      if (toolkit.slug === NATIVE_SLACK_TOOLKIT) await apiClient.disconnectConnector('slack');
      else await apiClient.disconnectComposioToolkit(toolkit.slug);
      setConnectedSlugs((prev) => ({ ...prev, [toolkit.slug]: 'disconnected' }));
      setToolkits((prev) => prev.map((t) => (t.slug === toolkit.slug ? { ...t, connected: false } : t)));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `Failed to disconnect ${toolkit.name}`);
    } finally {
      setDisconnectingSlug(null);
    }
  }, []);

  const filtered = useMemo(() => {
    if (category === 'all') return toolkits;
    return toolkits.filter((tk) => (tk.categories || []).includes(category));
  }, [toolkits, category]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const aConnected = a.connected || connectedSlugs[a.slug] === 'connected';
    const bConnected = b.connected || connectedSlugs[b.slug] === 'connected';
    return (bConnected ? 1 : 0) - (aConnected ? 1 : 0);
  }), [filtered, connectedSlugs]);

  const connectedCount = toolkits.filter((tk) => tk.connected || connectedSlugs[tk.slug] === 'connected').length;
  const liveCount = <span className="text-[11px] text-[#a8a49c] whitespace-nowrap pr-1">{connectedCount} live</span>;

  return (
    <MobileShell title="Connectors" rightAction={liveCount}>
      <div className="px-3 pt-3 pb-2">
        <label className="flex items-center gap-2 h-11 px-3 rounded-[18px] bg-white border border-[#ece9e2] focus-within:border-[#9fc7ff]">
          <Search size={16} className="text-[#a3a3a3]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search connectors — Gmail, Slack, Airtable..."
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#b9b5ae]"
          />
        </label>
      </div>

      <div className="px-3 pb-6">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold whitespace-nowrap capitalize ${
                category === c ? 'bg-white border-[#d8d2c6] text-[#0a0a0a] shadow-sm' : 'bg-transparent text-[#6f6b63] border-transparent'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3]">
          {totalItems ? `${totalItems.toLocaleString()} apps available` : ' '}
        </div>

        {error && <div className="mb-2 p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        {loading && toolkits.length === 0 && <div className="py-12 text-center text-[13px] text-[#737373]">Loading connectors...</div>}

        <div className="space-y-1.5">
          {sorted.map((toolkit, index) => {
            const connected = connectedSlugs[toolkit.slug] === 'disconnected' ? false : (toolkit.connected || connectedSlugs[toolkit.slug] === 'connected');
            const isNativeSlack = toolkit.slug === NATIVE_SLACK_TOOLKIT;
            const redundant = REDUNDANT_TOOLKITS.has(toolkit.slug);
            const available = (isSelfServeConnectable(toolkit) || isNativeSlack) && !redundant;
            const connecting = connectingSlug === toolkit.slug;
            const disconnecting = disconnectingSlug === toolkit.slug;
            return (
              <motion.button
                key={toolkit.slug}
                type="button"
                onClick={() => setDetailToolkit(toolkit)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.012, 0.16) }}
                className="w-full rounded-[18px] border border-[#e3e0db] bg-white p-2.5 text-left shadow-[0_10px_22px_rgba(26,24,20,0.035)]"
              >
                <div className="flex items-center gap-2.5">
                  <LogoMark toolkit={toolkit} connected={connected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold leading-tight line-clamp-1">{toolkit.name}</span>
                      <span className="flex items-center gap-1 text-[9.5px] font-mono text-[#a3a3a3] flex-shrink-0">
                        <Wrench size={10} /> {toolkit.toolsCount}
                        {toolkit.triggersCount > 0 && <><Zap size={10} className="ml-1" />{toolkit.triggersCount}</>}
                      </span>
                    </div>
                  </div>
                  {connected ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(toolkit); }}
                      disabled={disconnecting}
                      className="ml-1 inline-flex h-7 items-center gap-1 rounded-lg border border-[#e3e0db] bg-white px-2.5 text-[10.5px] font-bold text-[#6f6b63] active:scale-[0.97] disabled:opacity-50 flex-shrink-0"
                    >
                      {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-emerald-500" />} Connected
                    </button>
                  ) : redundant ? (
                    <span className="ml-1 text-[10px] text-[#a3a3a3] flex-shrink-0">Via Slack</span>
                  ) : available ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(toolkit); }}
                      disabled={connecting}
                      className="ml-1 inline-flex h-7 items-center gap-1 rounded-lg bg-[#1a1a17] px-2.5 text-[10.5px] font-bold text-white active:scale-[0.97] disabled:opacity-50 flex-shrink-0"
                    >
                      {connecting ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />} Connect
                    </button>
                  ) : (
                    <span className="ml-1 text-[10px] text-[#a3a3a3] flex-shrink-0">Request access</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {cursor && !loading && (
          <div className="flex justify-center mt-4">
            <button onClick={() => load(query, cursor)} className="px-4 py-2 rounded-xl border border-[#e3e0db] bg-white text-[12.5px] font-semibold text-[#525252]">
              Load more
            </button>
          </div>
        )}
        {loading && toolkits.length > 0 && <div className="flex justify-center mt-4"><Loader2 size={16} className="animate-spin text-[#a3a3a3]" /></div>}
      </div>

      {detailToolkit && <ToolkitDetailSheet toolkit={detailToolkit} onClose={() => setDetailToolkit(null)} />}
    </MobileShell>
  );
}
