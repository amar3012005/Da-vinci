import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * DownloadMacButton — robust "Download for Mac".
 *
 * HIVEMIND ships ONE universal .dmg (arm64 + Intel), so — like Claude's desktop
 * download — there is no architecture branching to get wrong. Robustness here is
 * about never handing the user a dead button:
 *   • resolve the latest .dmg once, cache it (sessionStorage) so the rate-limited
 *     unauth GitHub API is hit at most once per tab;
 *   • 8s timeout + graceful handling of 403 (rate limit) / network errors;
 *   • the element is a real <a href> (works without JS, right-click-save, SEO),
 *     enhanced by JS — a click is NEVER dead: ready → download, still-resolving →
 *     resolve-then-download, failed → open the Releases page;
 *   • cross-origin-safe download via direct navigation (the `download` attribute
 *     is ignored cross-origin; browsers auto-download a .dmg on navigation).
 */

const REPO = 'amar3012005/HIVEMIND';
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = 'hm-mac-dl-v1';

const AppleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const Spinner = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const readCache = () => {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return c && c.dmgUrl ? c : null;
  } catch { return null; }
};

const DownloadMacButton = ({ className = '' }) => {
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const [version, setVersion] = useState(cached?.version || null);
  const [dmgUrl, setDmgUrl] = useState(cached?.dmgUrl || null);
  const [state, setState] = useState(cached?.dmgUrl ? 'ready' : 'resolving'); // resolving | ready | error
  const [downloading, setDownloading] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const resolving = useRef(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const p = `${navigator.userAgentData?.platform || navigator.platform || navigator.userAgent}`;
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(p));
    }
  }, []);

  const resolve = useCallback(() => {
    if (resolving.current) return resolving.current;
    if (dmgUrl) return Promise.resolve(dmgUrl);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const p = fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`gh ${r.status}`); // 403 = rate limit
        return r.json();
      })
      .then((data) => {
        const dmg = data.assets?.find((a) => a.name?.toLowerCase().endsWith('.dmg'));
        const url = dmg?.browser_download_url || null;
        if (!url) throw new Error('no dmg asset');
        const v = data.tag_name || null;
        setVersion(v); setDmgUrl(url); setState('ready');
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ version: v, dmgUrl: url, at: Date.now() })); } catch (_) {}
        return url;
      })
      .catch(() => { setState('error'); return null; })
      .finally(() => { clearTimeout(timer); resolving.current = null; });
    resolving.current = p;
    return p;
  }, [dmgUrl]);

  useEffect(() => { if (!dmgUrl) resolve(); /* one resolve on mount */ }, [dmgUrl, resolve]);

  const startDownload = (url) => {
    if (!url) return;
    setDownloading(true);
    window.location.href = url; // cross-origin-safe: browser auto-downloads the .dmg
    setTimeout(() => setDownloading(false), 4000);
  };

  const onClick = async (e) => {
    e.preventDefault();
    if (dmgUrl) return startDownload(dmgUrl);
    // still resolving or errored — try to resolve now, else open Releases (never dead)
    setDownloading(true);
    const url = await resolve();
    setDownloading(false);
    if (url) startDownload(url);
    else window.open(RELEASES_PAGE, '_blank', 'noopener,noreferrer');
  };

  const label = downloading ? 'Downloading…' : (state === 'resolving' && !dmgUrl) ? 'Preparing…' : 'Download for Mac';

  return (
    <motion.a
      href={dmgUrl || RELEASES_PAGE}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-busy={downloading}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white font-medium rounded-lg border border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors text-xs sm:text-sm cursor-pointer no-underline ${className}`}
    >
      {downloading ? <Spinner size={14} /> : <AppleIcon size={14} />}
      <span>
        {label}
        {version && <span className="ml-1.5 text-[10px] text-white/50 font-normal">{version}</span>}
      </span>
      <span className="ml-1 text-[10px] text-white/40">{isMac ? 'Universal' : '(macOS · .dmg)'}</span>
    </motion.a>
  );
};

export default DownloadMacButton;
