// Browse Composio's full ~1,100-toolkit catalog (Gmail, Perplexity, SerpApi,
// Airtable, Code Interpreter, ...) — not just the ~26 HIVEMIND curates in
// connectors-catalog.js. Deliberate dark visual island matching Composio's
// own toolkit browser (squared cards, official logos, tool/trigger counts,
// auth badges, version tag) — the rest of the app stays on the light theme;
// this section doesn't.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wrench, Zap, ShieldCheck, Search, Loader2, Plug, Check, Chrome } from 'lucide-react';
import apiClient from '../shared/api-client';

const CHROME_WEBSTORE_URL = 'https://chromewebstore.google.com/detail/hivemind-browser-intelligence';

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
  OAUTH2: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  OAUTH1: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  API_KEY: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  NO_AUTH: 'bg-white/[0.06] text-zinc-400 border-white/10',
  BASIC: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  S2S_OAUTH2: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
};

// Dark-theme Browser Intelligence banner — sits above the toolkit grid,
// matching this section's aesthetic rather than the light-theme card the
// rest of the page uses.
function BrowserIntelligenceBanner() {
  const [opened, setOpened] = useState(false);
  return (
    <div className="rounded-md border border-white/10 bg-zinc-900 px-4 py-3.5 mb-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#117dff] to-[#0066e0] flex items-center justify-center flex-shrink-0">
        <Chrome size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-white text-[13.5px] font-semibold font-['Space_Grotesk']">Browser Intelligence</h3>
          <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border border-emerald-500/25 bg-emerald-500/15 text-emerald-300">Official</span>
        </div>
        <p className="text-zinc-400 text-[12px] mt-0.5">Talk to HIVE from any tab — save pages, sections and AI chats straight into memory.</p>
      </div>
      <button
        onClick={() => { window.open(CHROME_WEBSTORE_URL, '_blank', 'noopener,noreferrer'); setOpened(true); }}
        className="flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/10 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/[0.1] transition-colors flex-shrink-0"
      >
        {opened ? <><Check size={13} className="text-emerald-400" /> Opened</> : <><Chrome size={13} /> Add to Chrome</>}
      </button>
    </div>
  );
}

function ToolkitCard({ toolkit, onConnect, connecting, connectResult }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isOAuth = toolkit.authSchemes.includes('OAUTH2');
  const isApiKey = !isOAuth && toolkit.authSchemes.includes('API_KEY');
  const isNoAuth = toolkit.noAuth;
  const connected = connectResult === 'connected';

  return (
    <div className="rounded-md border border-white/10 bg-zinc-900 hover:border-white/20 transition-colors overflow-hidden">
      <div className="p-4">
        <div className="w-11 h-11 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden mb-3">
          {toolkit.logo && !logoFailed ? (
            <img src={toolkit.logo} alt="" width={26} height={26} loading="lazy" onError={() => setLogoFailed(true)} />
          ) : (
            <span className="text-[14px] font-bold text-zinc-500">{toolkit.name.slice(0, 1)}</span>
          )}
        </div>

        <p className="text-[14px] font-semibold text-white font-['Space_Grotesk'] truncate" title={toolkit.name}>
          {toolkit.name}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-zinc-400 font-mono">
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
            <ShieldCheck size={13} className="text-zinc-500" title="Composio-managed auth available" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-white/[0.02]">
        <span className="text-[9px] font-mono text-zinc-600">{toolkit.version ? `v${toolkit.version.replace(/^v/, '')}` : ''}</span>
        {connected ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Check size={12} /> Connected
          </span>
        ) : isNoAuth ? (
          <span className="text-[10.5px] text-zinc-600 font-medium">No auth</span>
        ) : (
          <button
            onClick={() => onConnect(toolkit)}
            disabled={connecting}
            title={isApiKey ? 'Add API key' : 'Connect'}
            aria-label={isApiKey ? 'Add API key' : 'Connect'}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[#117dff]/15 border border-[#117dff]/30 text-[#4da3ff] hover:bg-[#117dff]/25 disabled:opacity-50 transition-colors"
          >
            {connecting ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
          </button>
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
    <div className="rounded-lg bg-zinc-950 border border-white/10 p-4 sm:p-5">
      <BrowserIntelligenceBanner />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
          Browse all toolkits (Composio) — {totalItems.toLocaleString()} available
        </h2>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search toolkits — Perplexity, SerpApi, Airtable, Firecrawl..."
          className="w-full pl-9 pr-3 py-2 rounded-md border border-white/10 bg-zinc-900 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-[#117dff]/50"
        />
      </div>

      {error && <p className="mb-3 text-[12px] text-red-400">{error}</p>}

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
        <div className="flex items-center justify-center py-10 text-zinc-600">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {cursor && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => load(query, cursor)}
            className="px-4 py-2 rounded-md border border-white/10 bg-zinc-900 text-[12.5px] font-medium text-zinc-300 hover:bg-white/[0.04]"
          >
            Load more
          </button>
        </div>
      )}
      {loading && toolkits.length > 0 && (
        <div className="flex justify-center mt-4"><Loader2 size={16} className="animate-spin text-zinc-600" /></div>
      )}
    </div>
  );
}
