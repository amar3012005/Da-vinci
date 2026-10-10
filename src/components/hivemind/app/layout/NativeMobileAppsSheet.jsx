import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cable, Search, X } from 'lucide-react';
import apiClient from '../shared/api-client';
import { LegacyMobileAppsSheet } from '../mobile/LegacyChatSheets';

/** Mobile presentation of the existing authorized connector catalog and OAuth flow. */
export default function NativeMobileAppsSheet({ onClose, legacy = false }) {
  const panel = useRef(null);
  const [query, setQuery] = useState('');
  const [connected, setConnected] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [browsing, setBrowsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectedLoading, setConnectedLoading] = useState(true);
  const [connectedError, setConnectedError] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(null);
  const generation = useRef(0);
  const pageInFlight = useRef(false);
  const touchOrigin = useRef(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; generation.current += 1; }, []);
  const loadConnected = useCallback(async () => {
    setConnectedLoading(true); setConnectedError('');
    try {
      const data = await apiClient.listOAuthConnectors();
      if (!Array.isArray(data?.connectors) || data.connectors.some(row => !row || typeof row.provider !== 'string')) throw new Error('Connected apps returned an invalid list. Please try again.');
      const aliases = { 'google-drive': 'googledrive', 'google-calendar': 'googlecalendar', 'google-docs': 'googledocs', 'google-sheets': 'googlesheets', 'google-mail': 'gmail' };
      const rows = data.connectors.filter(row => row?.status === 'connected').map(row => ({
        slug: aliases[row.provider] || row.provider, name: row.label || row.provider, connected: true,
        logo: `https://logos.composio.dev/api/${encodeURIComponent(aliases[row.provider] || row.provider)}`,
      }));
      if (alive.current) setConnected(rows);
    } catch (err) { if (alive.current) setConnectedError(err?.message || 'Connected apps could not be loaded.'); }
    finally { if (alive.current) setConnectedLoading(false); }
  }, []);
  useEffect(() => { alive.current = true; void loadConnected(); }, [loadConnected]);
  const load = useCallback(async (search, after) => {
    if (pageInFlight.current) return;
    const current = ++generation.current;
    pageInFlight.current = true;
    setBrowsing(true); setLoading(true); setError('');
    try {
      // Same bounded catalog route as desktop. Never fetch catalog=all for a sheet.
      const data = await apiClient.listComposioToolkits({ search, cursor: after, limit: 24 });
      if (!alive.current || current !== generation.current) return;
      if (!Array.isArray(data?.toolkits) || data.toolkits.some(toolkit => !toolkit || typeof toolkit !== 'object' || typeof toolkit.slug !== 'string')) {
        throw new Error('Apps returned an invalid catalog. Please try again.');
      }
      setCatalog(previous => {
        const rows = new Map((after ? previous : []).map(row => [row.slug, row]));
        data.toolkits.forEach(row => rows.set(row.slug, row));
        return [...rows.values()];
      });
      setCursor(data.next_cursor || null);
    } catch (err) { if (alive.current && current === generation.current) setError(err?.message || 'Apps could not be loaded.'); }
    finally { if (alive.current && current === generation.current) { pageInFlight.current = false; setLoading(false); } }
  }, []);
  useEffect(() => {
    generation.current += 1; pageInFlight.current = false;
    setCatalog([]); setCursor(null); setLoading(false); setError(''); setBrowsing(false);
    if (!query.trim()) return undefined;
    const timer = setTimeout(() => load(query.trim(), null), 180);
    return () => { clearTimeout(timer); generation.current += 1; };
  }, [query, load]);
  const toolkits = (() => {
    const rows = new Map(catalog.map(row => [row.slug, row]));
    const search = query.trim().toLowerCase();
    connected.filter(row => !search || `${row.name || ''} ${row.slug}`.toLowerCase().includes(search))
      .forEach(row => rows.set(row.slug, { ...rows.get(row.slug), ...row }));
    return [...rows.values()]
      .sort((a, b) => Number(Boolean(b.connected)) - Number(Boolean(a.connected)) || String(a.name || a.slug).localeCompare(String(b.name || b.slug)));
  })();
  const more = () => { if (!loading && (!browsing || cursor)) void load(query.trim(), cursor); };
  const scroll = event => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    if (scrollTop > 0 && scrollHeight - scrollTop - clientHeight < 160) more();
  };
  const wheel = event => { if (event.deltaY > 0) scrollIntent(event.currentTarget); };
  const scrollIntent = element => {
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 160) more();
  };
  const touchStart = event => { touchOrigin.current = event.touches[0]?.clientY ?? null; };
  const touchMove = event => {
    const y = event.touches[0]?.clientY;
    if (touchOrigin.current !== null && y !== undefined && touchOrigin.current - y > 24) {
      scrollIntent(event.currentTarget); touchOrigin.current = y;
    }
  };
  const canLoadMore = !browsing || Boolean(cursor);
  const feedback = <>
    {connectedError && <div role="alert"><p>{connectedError}</p><button type="button" onClick={loadConnected}>Retry connected apps</button></div>}
    {connectedLoading && <p role="status">Loading connected apps…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => load(query.trim(), cursor)}>Retry apps</button></div>}
    {loading && <p role="status">Loading more apps…</p>}
    {canLoadMore && <button type="button" disabled={loading} onClick={more} className="w-full min-h-[44px] text-[#117dff]">{browsing ? 'Show more apps' : 'Browse apps to connect'}</button>}
  </>;
  useEffect(() => {
    if (legacy) return undefined;
    const previous = document.querySelector('[data-native-mobile-add]') || document.activeElement;
    const elements = () => [...(panel.current?.querySelectorAll('button:not(:disabled), input, a[href]') || [])];
    elements()[0]?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const items = elements(); const first = items[0]; const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [onClose, legacy]);
  const choose = async toolkit => {
    if (connecting !== null) return;
    if (toolkit.connected) {
      window.dispatchEvent(new CustomEvent('hivemind:connector-selected', { detail: { name: toolkit.name } }));
      onClose(); return;
    }
    setConnecting(toolkit.slug); setError('');
    try {
      const callback = new URL(window.location.href);
      callback.searchParams.set('native_apps', '1');
      callback.searchParams.set('composio_toolkit', toolkit.slug);
      let target;
      if (toolkit.slug === 'slack') {
        const data = await apiClient.startConnectorOAuth('slack', `${callback.pathname}${callback.search}`, { target_scope: 'personal' });
        target = data.auth_url;
      } else {
        const data = await apiClient.createComposioConnectLink(toolkit.slug, {
          toolkitMeta: { composioManagedAuthSchemes: toolkit.composioManagedAuthSchemes, noAuth: toolkit.noAuth },
          callbackUrl: callback.href,
        });
        target = data.redirect_url;
      }
      if (!target || new URL(target).protocol !== 'https:') throw new Error('A secure connection link was not returned.');
      if (alive.current) window.location.assign(target);
    } catch (err) { setError(err?.response?.data?.error || err?.message || 'Could not connect this app.'); }
    finally { setConnecting(null); }
  };
  if (legacy) return <div ref={panel} data-legacy-brain-apps>
    <LegacyMobileAppsSheet nativeViewport connectorSheetOpen onClose={onClose} connectorSearch={query} setConnectorSearch={setQuery} loading={false} error="" visibleToolkits={toolkits} chooseToolkit={choose} onScroll={scroll} onWheel={wheel} onTouchStart={touchStart} onTouchMove={touchMove} footer={feedback} emptyLabel={connectedLoading || connectedError || loading || error ? '' : browsing || query ? 'No apps match this search.' : 'No connected apps yet. Browse apps to connect.'} />
  </div>;
  return <div className="fixed inset-0 z-[90] flex items-end" data-native-mobile-apps style={{ bottom: 'auto', height: 'var(--hm-app-viewport-height, 100dvh)' }}>
    <button type="button" className="absolute inset-0 bg-black/35" aria-label="Close apps and connectors" onClick={onClose} />
    <section ref={panel} onScroll={scroll} onWheel={wheel} onTouchStart={touchStart} onTouchMove={touchMove} role="dialog" aria-modal="true" aria-label="Apps and connectors" className="relative w-full rounded-t-[24px] bg-white text-[#202020] px-5 pt-3 max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))', maxHeight: 'calc(var(--hm-app-viewport-height, 100dvh) - env(safe-area-inset-top, 0px) - 12px)' }}>
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d5d1c8]" />
      <header className="flex items-start justify-between gap-3"><div><h2 className="text-[18px] font-semibold">Apps &amp; connectors</h2><p className="mt-1 text-[13px] text-[#777]">Choose a connected app, or connect a new one.</p></div><button type="button" aria-label="Close apps" onClick={onClose} className="min-w-[44px] min-h-[44px] grid place-items-center"><X size={20} /></button></header>
      <label className="my-4 flex items-center gap-2 rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 min-h-[48px] focus-within:border-[#117dff]"><Search size={18} /><input type="search" aria-label="Search apps" placeholder="Search Gmail, Slack, Calendar…" value={query} onChange={event => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent text-[16px] outline-none" /></label>
      {toolkits.map(toolkit => {
        const supported = toolkit.connected || toolkit.slug === 'slack' || toolkit.noAuth || toolkit.authSchemes?.includes('OAUTH2') || toolkit.composioManagedAuthSchemes?.length > 0;
        return <div key={toolkit.slug} className="flex items-center gap-3 py-3">
          <span className="h-11 w-11 rounded-xl border border-[#e3e0db] bg-[#faf9f4] grid place-items-center shrink-0">{toolkit.logo ? <img src={toolkit.logo} alt="" loading="lazy" className="h-7 w-7 object-contain" /> : <Cable size={22} />}</span>
          <span className="min-w-0 flex-1"><strong className="block text-[15px]">{toolkit.name}</strong><small className="text-[#777]">{toolkit.connected ? 'Ready for this chat' : 'Connect to use this app'}</small></span>
          {supported ? <button type="button" disabled={connecting !== null} onClick={() => choose(toolkit)} className={`min-h-[44px] px-3 rounded-full text-[13px] ${toolkit.connected ? 'text-emerald-700 bg-emerald-50' : 'text-[#117dff] bg-blue-50'}`}>{connecting === toolkit.slug ? 'Connecting…' : toolkit.connected ? 'Connected' : 'Connect'}</button> : <a href="/hivemind/m/connectors" className="min-h-[44px] inline-flex items-center text-[13px] text-[#117dff]">Set up</a>}
        </div>;
      })}
      {!connectedLoading && !connectedError && !loading && !error && toolkits.length === 0 && <p className="py-3 text-[13px]">{browsing || query ? 'No apps found.' : 'No connected apps yet.'}</p>}
      {feedback}
    </section>
  </div>;
}
