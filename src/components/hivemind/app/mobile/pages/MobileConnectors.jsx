import McpClientSetup from '../../shared/McpClientSetup';
import { toolkitConnectionState } from '../../shared/toolkit-connection';
// Mobile Connectors — Composio catalog and remote MCP client setup. Nango's popup SDK, the Browser
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
import { glassHeader } from '../MobileGlassHeader';
import '../mobile-tools.css';
import { connectClient, connectReturnUrl } from '../../shared/connect-return';

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
    <span className={`mg-icon-tile ${connected ? 'ring-2 ring-emerald-300/70' : ''}`}>
      {toolkit.logo && !failed ? (
        <img src={toolkit.logo} alt={toolkit.name} loading="lazy" onError={() => setFailed(true)} className="h-[24px] w-[24px] object-contain" />
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
        role="dialog" aria-modal="true" aria-label={`Tools for ${toolkit.name}`}
        data-mobile-sheet className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
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
          <button onClick={onClose} className="w-11 h-11 rounded-full grid place-items-center bg-[#f3f1ec] flex-shrink-0" aria-label="Close"><X size={16} /></button>
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
  const requestRevision = useRef(0);
  useEffect(() => () => { requestRevision.current += 1; }, []);

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
    const revision = ++requestRevision.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.listComposioToolkits({ search, cursor: appendCursor || null, limit: 40 });
      if (revision !== requestRevision.current) return;
      setToolkits((prev) => (appendCursor ? [...prev, ...(data.toolkits || [])] : (data.toolkits || [])));
      setCursor(data.next_cursor || null);
      setTotalItems(data.total_items || 0);
    } catch (err) {
      if (revision !== requestRevision.current) return;
      setError(err?.response?.data?.error || err?.message || 'Failed to load connectors');
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestRevision.current += 1;
    debounceRef.current = setTimeout(() => load(query, null), query ? 180 : 0);
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
      const callbackUrl = connectReturnUrl({ origin: window.location.origin, toolkit: toolkit.slug, returnPath: window.location.pathname, client: connectClient() });
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
      setToolkits((prev) => prev.map((t) => (t.slug === toolkit.slug ? { ...t, connected: false, connection_status: 'available', connection_origin: null } : t)));
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
    const aConnected = toolkitConnectionState(a, connectedSlugs[a.slug]) === 'connected';
    const bConnected = toolkitConnectionState(b, connectedSlugs[b.slug]) === 'connected';
    return (bConnected ? 1 : 0) - (aConnected ? 1 : 0);
  }), [filtered, connectedSlugs]);

  const connectedCount = toolkits.filter((tk) => toolkitConnectionState(tk, connectedSlugs[tk.slug]) === 'connected').length;
  const liveCount = <span className="whitespace-nowrap">{connectedCount} live</span>;

  return (
    <MobileShell title="Connectors" renderHeader={glassHeader({ icon: <Cable size={17} strokeWidth={1.9} />, title: 'Connectors', right: liveCount })}>
      <div data-mobile-tools data-mobile-glass>
      <div className="mg-hero">
        <h1 className="mg-title">Connectors</h1>
        <p className="mg-subtitle">Connect your apps so HIVEMIND keeps their context and can work in them for you.</p>
      </div>

      <details className="mg-card overflow-hidden">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 text-[15px] font-semibold"><span className="mg-icon-tile !h-9 !w-9 !rounded-[12px]"><Zap size={16} /></span>Connect ChatGPT, Claude or another AI client</summary>
        <McpClientSetup selectable />
      </details>

      <div className="mt-4">
        <label className="mg-search">
          <Search size={17} className="text-[#a3a3a3]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps"
            aria-label="Search connectors" autoCapitalize="none" autoCorrect="off"
            className="placeholder:text-[#b9b5ae]"
          />
        </label>
      </div>

      <div className="mg-section">
        <div className="mg-seg mb-4" role="group" aria-label="Connector categories">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className="capitalize"
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        <p className="mg-section-title">
          {totalItems ? `${totalItems.toLocaleString()} apps available` : ' '}
        </p>

        {error && <div role="alert" className="mb-2 p-3 rounded-[18px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        {loading && toolkits.length === 0 && <div role="status" className="py-12 text-center text-[14px] text-[#737373]">Loading connectors…</div>}

        <div>
          {sorted.map((toolkit, index) => {
            const state = toolkitConnectionState(toolkit, connectedSlugs[toolkit.slug]);
            const connected = state === 'connected';
            const reconnect = state === 'reconnect';
            const isNativeSlack = toolkit.slug === NATIVE_SLACK_TOOLKIT;
            const redundant = REDUNDANT_TOOLKITS.has(toolkit.slug);
            const available = (isSelfServeConnectable(toolkit) || isNativeSlack) && !redundant;
            const connecting = connectingSlug === toolkit.slug;
            const disconnecting = disconnectingSlug === toolkit.slug;
            return (
              <motion.div
                key={toolkit.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.012, 0.16) }}
                className="mg-card w-full text-left"
              >
                <div className="mg-row">
                  <button type="button" aria-label={`Details for ${toolkit.name}`} onClick={() => setDetailToolkit(toolkit)} className="mg-press min-w-0 flex-1 flex items-center gap-3 text-left"><LogoMark toolkit={toolkit} connected={connected} />
                  <div className="min-w-0 flex-1">
                    <div className="mg-row-title line-clamp-1">{toolkit.name}</div>
                    <div className="mg-row-meta mt-0.5 flex items-center gap-1">
                      <Wrench size={11} /> {toolkit.toolsCount} tools
                      {toolkit.triggersCount > 0 && <><span aria-hidden="true">·</span><Zap size={11} />{toolkit.triggersCount} triggers</>}
                    </div>
                  </div>
                  </button>
                  {connected ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDisconnect(toolkit); }}
                      disabled={disconnecting}
                      className="mg-pill flex-shrink-0 !px-3.5 text-[13px]"
                    >
                      {disconnecting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-emerald-500" />} Connected
                    </button>
                  ) : redundant ? (
                    <span className="mg-chip flex-shrink-0">Via Slack</span>
                  ) : available ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(toolkit); }}
                      disabled={connecting}
                      className="mg-pill-primary flex-shrink-0 !min-h-[40px] !px-4 text-[14px]"
                    >
                      {connecting ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />} {reconnect ? 'Reconnect' : 'Connect'}
                    </button>
                  ) : (
                    <span className="mg-chip flex-shrink-0">Request access</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {cursor && !loading && (
          <div className="flex justify-center mt-4">
            <button type="button" onClick={() => load(query, cursor)} className="mg-pill">
              Load more
            </button>
          </div>
        )}
        {loading && toolkits.length > 0 && <div className="flex justify-center mt-4"><Loader2 size={16} className="animate-spin text-[#a3a3a3]" /></div>}
      </div>

      {detailToolkit && <ToolkitDetailSheet toolkit={detailToolkit} onClose={() => setDetailToolkit(null)} />}
      </div>
    </MobileShell>
  );
}
