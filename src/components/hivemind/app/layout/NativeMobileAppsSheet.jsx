import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cable, Search, X } from 'lucide-react';
import apiClient from '../shared/api-client';

/** Mobile presentation of the existing authorized connector catalog and OAuth flow. */
export default function NativeMobileAppsSheet({ onClose }) {
  const panel = useRef(null);
  const [query, setQuery] = useState('');
  const [toolkits, setToolkits] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(null);
  const generation = useRef(0);
  const load = useCallback(async (search, after) => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const data = await apiClient.listComposioToolkits({ search, cursor: after, limit: 40 });
      if (current !== generation.current) return;
      setToolkits(previous => after ? [...previous, ...(data.toolkits || [])] : data.toolkits || []);
      setCursor(data.next_cursor || null);
    } catch (err) { if (current === generation.current) setError(err?.message || 'Apps could not be loaded.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => load(query, null), 200);
    return () => { clearTimeout(timer); generation.current += 1; };
  }, [query, load]);
  useEffect(() => {
    const previous = document.querySelector('[data-native-mobile-add]') || document.activeElement;
    const elements = () => [...panel.current.querySelectorAll('button:not(:disabled), input, a[href]')];
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
  }, [onClose]);
  const choose = async toolkit => {
    if (toolkit.connected) {
      window.dispatchEvent(new CustomEvent('hivemind:connector-selected', { detail: { name: toolkit.name } }));
      onClose(); return;
    }
    const attempt = generation.current;
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
      if (attempt === generation.current) window.location.assign(target);
    } catch (err) { setError(err?.response?.data?.error || err?.message || 'Could not connect this app.'); }
    finally { setConnecting(null); }
  };
  return <div className="fixed inset-0 z-[90] flex items-end" data-native-mobile-apps>
    <button type="button" className="absolute inset-0 bg-black/35" aria-label="Close apps and connectors" onClick={onClose} />
    <section ref={panel} role="dialog" aria-modal="true" aria-label="Apps and connectors" className="relative w-full rounded-t-[24px] bg-white text-[#202020] px-5 pt-3 max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d5d1c8]" />
      <header className="flex items-start justify-between gap-3"><div><h2 className="text-[18px] font-semibold">Apps &amp; connectors</h2><p className="mt-1 text-[13px] text-[#777]">Choose a connected app, or connect a new one.</p></div><button type="button" aria-label="Close apps" onClick={onClose} className="min-w-[44px] min-h-[44px] grid place-items-center"><X size={20} /></button></header>
      <label className="my-4 flex items-center gap-2 rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 min-h-[48px] focus-within:border-[#117dff]"><Search size={18} /><input type="search" aria-label="Search apps" placeholder="Search Gmail, Slack, Calendar…" value={query} onChange={event => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent text-[16px] outline-none" /></label>
      {error && <p role="alert" className="py-2 text-[13px] text-red-700">{error}</p>}
      {toolkits.map(toolkit => {
        const supported = toolkit.connected || toolkit.slug === 'slack' || toolkit.noAuth || toolkit.authSchemes?.includes('OAUTH2') || toolkit.composioManagedAuthSchemes?.length > 0;
        return <div key={toolkit.slug} className="flex items-center gap-3 py-3">
          <span className="h-11 w-11 rounded-xl border border-[#e3e0db] bg-[#faf9f4] grid place-items-center shrink-0">{toolkit.logo ? <img src={toolkit.logo} alt="" className="h-7 w-7 object-contain" /> : <Cable size={22} />}</span>
          <span className="min-w-0 flex-1"><strong className="block text-[15px]">{toolkit.name}</strong><small className="text-[#777]">{toolkit.connected ? 'Ready for this chat' : 'Connect to use this app'}</small></span>
          {supported ? <button type="button" disabled={connecting !== null} onClick={() => choose(toolkit)} className={`min-h-[44px] px-3 rounded-full text-[13px] ${toolkit.connected ? 'text-emerald-700 bg-emerald-50' : 'text-[#117dff] bg-blue-50'}`}>{connecting === toolkit.slug ? 'Connecting…' : toolkit.connected ? 'Connected' : 'Connect'}</button> : <a href="/hivemind/m/connectors" className="min-h-[44px] inline-flex items-center text-[13px] text-[#117dff]">Set up</a>}
        </div>;
      })}
      {loading && <p role="status" className="py-3 text-[13px]">Loading apps…</p>}
      {!loading && !error && toolkits.length === 0 && <p className="py-3 text-[13px]">No apps found.</p>}
      {cursor && <button type="button" disabled={loading} onClick={() => load(query, cursor)} className="w-full min-h-[44px] text-[#117dff]">Show more apps</button>}
    </section>
  </div>;
}
