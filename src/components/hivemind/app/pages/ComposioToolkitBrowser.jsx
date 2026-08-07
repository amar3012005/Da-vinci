// Browse Composio's full ~1,100-toolkit catalog (Gmail, Perplexity, SerpApi,
// Airtable, Code Interpreter, ...) — not just the ~26 HIVEMIND curates in
// connectors-catalog.js. Same day-mode design system as the rest of
// Connectors.jsx (white cards, #e3e0db borders, #117dff accent), sharp
// squared corners, official brand logos. Sits below the existing curated
// grid + Browser Intelligence card — no duplicate chrome of its own.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wrench, Zap, ShieldCheck, Search, Loader2, Plug, Check, Mail } from 'lucide-react';
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

function ToolkitCard({ toolkit, onConnect, connecting, connectResult }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const available = isSelfServeConnectable(toolkit);
  const isApiKey = available && !toolkit.authSchemes.includes('OAUTH2') && toolkit.authSchemes.includes('API_KEY');
  const isNoAuth = toolkit.noAuth;
  const connected = connectResult === 'connected';

  return (
    <div className="rounded-md border border-[#e3e0db] bg-white hover:border-[#c4c1bb] transition-colors overflow-hidden flex flex-col">
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

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e3e0db] bg-[#faf9f4]">
        <span className="text-[9px] font-mono text-[#c4c1bb]">{toolkit.version ? `v${toolkit.version.replace(/^v/, '')}` : ''}</span>
        {connected ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Check size={12} /> Connected
          </span>
        ) : isNoAuth ? (
          <span className="text-[10.5px] text-[#a3a3a3] font-medium">No auth</span>
        ) : available ? (
          <button
            onClick={() => onConnect(toolkit)}
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

export default function ComposioToolkitBrowser() {
  const [query, setQuery] = useState('');
  const [toolkits, setToolkits] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectingSlug, setConnectingSlug] = useState(null);
  const [connectedSlugs, setConnectedSlugs] = useState({});
  const debounceRef = useRef(null);

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
      const isApiKey = !toolkit.authSchemes.includes('OAUTH2') && toolkit.authSchemes.includes('API_KEY');
      if (isApiKey) {
        // eslint-disable-next-line no-alert
        const key = window.prompt(`${toolkit.name} API key`);
        if (!key) return;
        await apiClient.createComposioApiKeyConnection(toolkit.slug, key.trim());
        setConnectedSlugs((prev) => ({ ...prev, [toolkit.slug]: 'connected' }));
        return;
      }
      const { redirect_url } = await apiClient.createComposioConnectLink(toolkit.slug, {
        composioManagedAuthSchemes: toolkit.composioManagedAuthSchemes,
        noAuth: toolkit.noAuth,
      });
      if (redirect_url) window.open(redirect_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `Failed to connect ${toolkit.name}`);
    } finally {
      setConnectingSlug(null);
    }
  }, []);

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
        {toolkits.map((toolkit) => (
          <ToolkitCard
            key={toolkit.slug}
            toolkit={toolkit}
            onConnect={handleConnect}
            connecting={connectingSlug === toolkit.slug}
            connectResult={connectedSlugs[toolkit.slug]}
          />
        ))}
      </div>

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
