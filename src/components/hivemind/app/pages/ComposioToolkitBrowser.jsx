// Browse Composio's full ~1,100-toolkit catalog (Gmail, Perplexity, SerpApi,
// Airtable, Code Interpreter, ...) — not just the ~26 HIVEMIND curates in
// connectors-catalog.js. Same day-mode design system as the rest of
// Connectors.jsx (white cards, #e3e0db borders, #117dff accent), sharp
// squared corners, official brand logos. Sits below the existing curated
// grid + Browser Intelligence card — no duplicate chrome of its own.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wrench, Zap, ShieldCheck, Search, Loader2, Plug, Check, Mail, X } from 'lucide-react';
import apiClient from '../shared/api-client';

const AUTH_LABELS = {
  OAUTH2: 'OAuth2',
  API_KEY: 'API Key',
  NO_AUTH: 'No Auth',
  BASIC: 'Basic',
  BEARER_TOKEN: 'Bearer',
  OAUTH1: 'OAuth1',
  S2S_OAUTH2: 'S2S OAuth',
};

function authLabel(scheme) {
  return AUTH_LABELS[scheme] || scheme;
}

const AUTH_BADGE_TONE = {
  OAUTH2: 'bg-[#117dff]/[0.06] text-[#117dff] border-[#117dff]/20',
  OAUTH1: 'bg-[#117dff]/[0.06] text-[#117dff] border-[#117dff]/20',
  API_KEY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NO_AUTH: 'bg-[#f3f1ec] text-[#a3a3a3] border-[#e3e0db]',
  BASIC: 'bg-amber-50 text-amber-700 border-amber-200',
  S2S_OAUTH2: 'bg-sky-50 text-sky-700 border-sky-200',
};

// A toolkit is only self-serve connectable if Composio can broker the auth
// itself (its own managed OAuth app, a plain API key, or no auth at all).
// Anything else (a scheme Composio lists but doesn't manage — no
// composio-managed OAuth app available) needs a real custom OAuth app
// registered first, which is an ops step, not a click — "Request Access"
// instead of a Connect button that would just 400.
function isSelfServeConnectable(toolkit) {
  if (toolkit.noAuth) return true;
  if (toolkit.authSchemes.includes('API_KEY')) return true;
  if (toolkit.composioManagedAuthSchemes?.length > 0) return true;
  return false;
}

const REQUEST_ACCESS_EMAIL = 'connectors@singulancelabs.com';

// Slack connects through HIVEMIND's own native OAuth (real Slack app,
// real bot token) rather than Composio's connect flow — Composio's
// connected_accounts API masks the real bot token, which breaks @mention
// replies with invalid_auth. handleConnect/handleDisconnect below route
// 'slack' to the native /v1/connectors/slack/* endpoints; this card still
// renders it as a normal connectable toolkit, just wired differently.
// 'slackbot' is Composio's separate workspace-wide-read toolkit — redundant
// once native Slack is connected (oauth.js already requests the full bot
// scope set, including app_mentions:read), and its Composio connection is
// the same masked-token dead end, so it's blocked outright, not offered.
const NATIVE_SLACK_TOOLKIT = 'slack';
const REDUNDANT_TOOLKITS = new Set(['slackbot']);

function ToolkitCard({ toolkit, onConnect, onOpenDetail, onDisconnect, connecting, disconnecting, connectResult }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isNativeSlack = toolkit.slug === NATIVE_SLACK_TOOLKIT;
  const redundant = REDUNDANT_TOOLKITS.has(toolkit.slug);
  const available = (isSelfServeConnectable(toolkit) || isNativeSlack) && !redundant;
  const isApiKey = available && !toolkit.authSchemes.includes('OAUTH2') && toolkit.authSchemes.includes('API_KEY');
  const isNoAuth = toolkit.noAuth;
  // Real per-org state from the server (toolkit.connected) OR the optimistic
  // flip right after a successful redirect-back (connectResult) — either one
  // means the card should read as connected. An explicit 'disconnected'
  // override (right after clicking Disconnect) wins over the stale
  // toolkit.connected from the last fetch.
  const connected = connectResult === 'disconnected' ? false : (toolkit.connected || connectResult === 'connected');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(toolkit)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDetail(toolkit); }}
      title={`See all ${toolkit.toolsCount} ${toolkit.name} tools`}
      className={`rounded-md border overflow-hidden flex flex-col transition-colors cursor-pointer ${
        connected
          ? 'border-[#117dff]/30 bg-[#117dff]/[0.07] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
          : 'border-[#e3e0db] bg-white hover:border-[#c4c1bb]'
      }`}
    >
      <div className="p-4 flex-1">
        <div className="w-11 h-11 rounded-md bg-[#faf9f4] border border-[#e3e0db] flex items-center justify-center overflow-hidden mb-3">
          {toolkit.logo && !logoFailed ? (
            <img src={toolkit.logo} alt="" width={26} height={26} loading="lazy" onError={() => setLogoFailed(true)} />
          ) : (
            <span className="text-[14px] font-bold text-[#a3a3a3]">{toolkit.name.slice(0, 1)}</span>
          )}
        </div>

        <p className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate" title={toolkit.name}>
          {toolkit.name}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-[#737373] font-mono">
          <span className="flex items-center gap-1" title={`${toolkit.toolsCount} tools`}>
            <Wrench size={11} /> {toolkit.toolsCount}
          </span>
          <span className="flex items-center gap-1" title={`${toolkit.triggersCount} triggers`}>
            <Zap size={11} /> {toolkit.triggersCount > 0 ? toolkit.triggersCount : '–'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 mt-2.5">
          {toolkit.authSchemes.map((scheme) => (
            <span
              key={scheme}
              className={`text-[9.5px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${AUTH_BADGE_TONE[scheme] || AUTH_BADGE_TONE.NO_AUTH}`}
            >
              {authLabel(scheme)}
            </span>
          ))}
          {toolkit.composioManagedAuthSchemes.length > 0 && (
            <ShieldCheck size={13} className="text-[#117dff]" title="Composio-managed auth available" />
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between px-4 py-2.5 border-t ${connected ? 'border-[#117dff]/20 bg-[#117dff]/[0.05]' : 'border-[#e3e0db] bg-[#faf9f4]'}`}>
        <span className="text-[9px] font-mono text-[#c4c1bb]">{toolkit.version ? `v${toolkit.version.replace(/^v/, '')}` : ''}</span>
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#117dff]">
              <Check size={12} /> Connected
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDisconnect(toolkit); }}
              disabled={disconnecting}
              title="Disconnect"
              aria-label="Disconnect"
              className="text-[10.5px] font-medium text-[#dc2626]/70 hover:text-[#dc2626] disabled:opacity-50 transition-colors"
            >
              {disconnecting ? <Loader2 size={11} className="animate-spin" /> : 'Disconnect'}
            </button>
          </div>
        ) : redundant ? (
          <span className="text-[10.5px] text-[#a3a3a3] font-medium" title="Covered by the Slack toolkit — connect that instead">
            Covered by Slack
          </span>
        ) : isNoAuth ? (
          <span className="text-[10.5px] text-[#a3a3a3] font-medium">No auth</span>
        ) : available ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(toolkit); }}
            disabled={connecting}
            title={isApiKey ? 'Add API key' : 'Connect'}
            aria-label={isApiKey ? 'Add API key' : 'Connect'}
            className="flex items-center gap-1.5 rounded-md bg-[#117dff] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50 transition-colors"
          >
            {connecting ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
            {isApiKey ? 'Add key' : 'Connect'}
          </button>
        ) : (
          <a
            href={`mailto:${REQUEST_ACCESS_EMAIL}?subject=${encodeURIComponent(`Request access — ${toolkit.name} connector`)}&body=${encodeURIComponent(`We'd like ${toolkit.name} (${toolkit.slug}) enabled as a connector. Auth scheme: ${toolkit.authSchemes.join(', ')}.`)}`}
            onClick={(e) => e.stopPropagation()}
            title="This toolkit needs a custom OAuth app set up first"
            className="flex items-center gap-1.5 rounded-md border border-[#e3e0db] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#525252] hover:bg-[#f3f1ec] transition-colors"
          >
            <Mail size={12} /> Request access
          </a>
        )}
      </div>
    </div>
  );
}

// Popup showing every tool a toolkit exposes — "what can the agent actually
// do with this once it's connected", not just the tool COUNT the card shows.
function ToolkitDetailModal({ toolkit, onClose }) {
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

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-md border border-[#e3e0db] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e3e0db] flex-shrink-0">
          <div className="w-9 h-9 rounded-md bg-[#faf9f4] border border-[#e3e0db] flex items-center justify-center overflow-hidden flex-shrink-0">
            {toolkit.logo ? <img src={toolkit.logo} alt="" width={22} height={22} /> : <span className="text-[13px] font-bold text-[#a3a3a3]">{toolkit.name.slice(0, 1)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{toolkit.name}</h3>
            <p className="text-[11px] text-[#a3a3a3]">{toolkit.toolsCount} tools{toolkit.triggersCount > 0 ? ` · ${toolkit.triggersCount} triggers` : ''}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-[#a3a3a3] hover:bg-[#f3f1ec] hover:text-[#0a0a0a] flex-shrink-0" aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          {!tools && !error && (
            <div className="flex items-center justify-center py-10 text-[#a3a3a3]"><Loader2 size={18} className="animate-spin" /></div>
          )}
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
      </div>
    </div>
  );
}

export default function ComposioToolkitBrowser() {
  const [detailToolkit, setDetailToolkit] = useState(null);
  // Composio's real redirect-back after OAuth completes: it appends
  // ?status=success|failed&connected_account_id=ca_xxx to whatever
  // callback_url we passed, on top of our own ?composio_toolkit=<slug>.
  // Read all three once, synchronously, before first paint — this is what
  // actually marks a toolkit connected on return, not a guess/poll.
  const [returnParams] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const toolkit = params.get('composio_toolkit');
    if (!toolkit) return null;
    return { toolkit, status: params.get('status'), connectedAccountId: params.get('connected_account_id') };
  });

  const [query, setQuery] = useState(() => returnParams?.toolkit || '');
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
  const debounceRef = useRef(null);

  // Toast the outcome once, then strip our query params so a refresh or
  // re-share of this URL doesn't replay a stale "connected" state.
  useEffect(() => {
    if (!returnParams) return;
    if (returnParams.status === 'success') {
      setError('');
    } else if (returnParams.status === 'failed') {
      setError(`Connecting ${returnParams.toolkit} failed or was cancelled.`);
    }
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
      const data = await apiClient.listComposioToolkits({ search, cursor: appendCursor || null, limit: 24 });
      setToolkits((prev) => (appendCursor ? [...prev, ...(data.toolkits || [])] : (data.toolkits || [])));
      setCursor(data.next_cursor || null);
      setTotalItems(data.total_items || 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load Composio toolkits');
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

  const handleConnect = useCallback(async (toolkit) => {
    setConnectingSlug(toolkit.slug);
    try {
      // Slack is native-only — see NATIVE_SLACK_TOOLKIT note above. Same
      // full-page-redirect pattern as Composio, different origin server.
      if (toolkit.slug === NATIVE_SLACK_TOOLKIT) {
        const { auth_url } = await apiClient.startConnectorOAuth('slack', window.location.pathname, { target_scope: 'personal' });
        if (auth_url) window.location.href = auth_url;
        else throw new Error('No auth URL returned');
        return;
      }
      const isApiKey = !toolkit.authSchemes.includes('OAUTH2') && toolkit.authSchemes.includes('API_KEY');
      if (isApiKey) {
        // eslint-disable-next-line no-alert
        const key = window.prompt(`${toolkit.name} API key`);
        if (!key) return;
        await apiClient.createComposioApiKeyConnection(toolkit.slug, key.trim());
        setConnectedSlugs((prev) => ({ ...prev, [toolkit.slug]: 'connected' }));
        return;
      }
      // Full-page redirect, not a new tab — Composio genuinely redirects the
      // browser back to callback_url with ?status=success&connected_account_id
      // appended once OAuth completes, and the mount-effect below reads that
      // straight off window.location on the next load of this same page.
      const callbackUrl = `${window.location.origin}${window.location.pathname}?composio_toolkit=${encodeURIComponent(toolkit.slug)}`;
      const { redirect_url } = await apiClient.createComposioConnectLink(toolkit.slug, {
        toolkitMeta: {
          composioManagedAuthSchemes: toolkit.composioManagedAuthSchemes,
          noAuth: toolkit.noAuth,
        },
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
      if (toolkit.slug === NATIVE_SLACK_TOOLKIT) {
        await apiClient.disconnectConnector('slack');
      } else {
        await apiClient.disconnectComposioToolkit(toolkit.slug);
      }
      setConnectedSlugs((prev) => ({ ...prev, [toolkit.slug]: 'disconnected' }));
      setToolkits((prev) => prev.map((t) => (t.slug === toolkit.slug ? { ...t, connected: false } : t)));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `Failed to disconnect ${toolkit.name}`);
    } finally {
      setDisconnectingSlug(null);
    }
  }, []);

  // Connected apps (real per-org state from the server, or the optimistic
  // just-connected flip) float to the top of whatever's currently loaded —
  // a stable sort so the rest of the order (Composio's own relevance/search
  // ranking) doesn't shuffle every re-render.
  const sortedToolkits = [...toolkits].sort((a, b) => {
    const aConnected = a.connected || connectedSlugs[a.slug] === 'connected';
    const bConnected = b.connected || connectedSlugs[b.slug] === 'connected';
    return (bConnected ? 1 : 0) - (aConnected ? 1 : 0);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#525252] text-[11px] font-mono uppercase tracking-wider">
          Browse all toolkits (Composio) — {totalItems.toLocaleString()} available
        </h2>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search toolkits — Perplexity, SerpApi, Airtable, Firecrawl..."
          className="w-full pl-9 pr-3 py-2 rounded-md border border-[#e3e0db] bg-white text-[13px] text-[#0a0a0a] placeholder-[#c4c1bb] outline-none focus:border-[#117dff]/40"
        />
      </div>

      {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sortedToolkits.map((toolkit) => (
          <ToolkitCard
            key={toolkit.slug}
            toolkit={toolkit}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onOpenDetail={setDetailToolkit}
            connecting={connectingSlug === toolkit.slug}
            disconnecting={disconnectingSlug === toolkit.slug}
            connectResult={connectedSlugs[toolkit.slug]}
          />
        ))}
      </div>

      {detailToolkit && (
        <ToolkitDetailModal toolkit={detailToolkit} onClose={() => setDetailToolkit(null)} />
      )}

      {loading && toolkits.length === 0 && (
        <div className="flex items-center justify-center py-10 text-[#a3a3a3]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {cursor && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => load(query, cursor)}
            className="px-4 py-2 rounded-md border border-[#e3e0db] bg-white text-[12.5px] font-medium text-[#525252] hover:bg-[#faf9f4]"
          >
            Load more
          </button>
        </div>
      )}
      {loading && toolkits.length > 0 && (
        <div className="flex justify-center mt-4"><Loader2 size={16} className="animate-spin text-[#a3a3a3]" /></div>
      )}
    </div>
  );
}
