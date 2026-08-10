import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * DownloadAllPlatforms — explicit "download for every platform" row, for
 * the /hivemind product page where a visitor may be testing on a device
 * different from the one they're browsing with (e.g. opening this page on
 * a phone to grab the Android APK). Unlike DownloadMacButton (auto-detects
 * ONE platform for the marketing homepage CTA), this always shows all
 * three side by side.
 *
 * One release fetch, three assets picked by extension (.dmg, .exe, .apk).
 * The Android APK is presently a manual debug-build upload (no Play
 * Store listing yet) — labeled accordingly so it's clear to a tester,
 * not presented as a polished release artifact.
 */

const REPO = 'amar3012005/HIVEMIND';
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = 'hm-desktop-dl-v1'; // shared with DownloadMacButton — one fetch either component needs

const AppleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const WindowsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 5.5 10.5 4.4v7.1H3V5.5zm8.5-1.2L21 3v8.5h-9.5V4.3zM3 12.5h7.5v7.1L3 18.5v-6zm8.5 0H21V21l-9.5-1.3v-7.2z" />
  </svg>
);

const AndroidIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.6 9.48l1.84-3.18a.4.4 0 0 0-.15-.55.4.4 0 0 0-.55.15l-1.86 3.23a11.4 11.4 0 0 0-9.76 0L5.26 5.9a.4.4 0 0 0-.55-.15.4.4 0 0 0-.15.55L6.4 9.48A10.6 10.6 0 0 0 1.5 17.5h21A10.6 10.6 0 0 0 17.6 9.48zM7 14.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
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
    return c || null;
  } catch { return null; }
};

const PlatformButton = ({ Icon, label, sub, url, loading, dark = false }) => {
  const [downloading, setDownloading] = useState(false);
  const onClick = (e) => {
    if (!url) { e.preventDefault(); window.open(RELEASES_PAGE, '_blank', 'noopener,noreferrer'); return; }
    setDownloading(true);
    setTimeout(() => setDownloading(false), 4000);
  };
  return (
    <motion.a
      href={url || RELEASES_PAGE}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-[12px] font-medium transition-colors no-underline cursor-pointer ${
        dark
          ? 'bg-[#0a0a0a] text-white border-[#1a1a1a] hover:bg-[#1a1a1a]'
          : 'bg-white text-[#0a0a0a] border-[#e3e0db] hover:bg-[#f6f5ef]'
      }`}
    >
      {(loading || downloading) ? <Spinner size={14} /> : <Icon size={14} />}
      <span>{label}</span>
      {sub && <span className={dark ? 'text-white/40 text-[10px]' : 'text-[#a3a3a3] text-[10px]'}>{sub}</span>}
    </motion.a>
  );
};

const DownloadAllPlatforms = ({ className = '' }) => {
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const [assets, setAssets] = useState(cached ? { dmgUrl: cached.dmgUrl, exeUrl: cached.exeUrl, apkUrl: cached.apkUrl } : {});
  const [version, setVersion] = useState(cached?.version || null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`gh ${r.status}`); return r.json(); })
      .then((data) => {
        const find = (ext) => data.assets?.find((a) => a.name?.toLowerCase().endsWith(ext))?.browser_download_url || null;
        const next = { dmgUrl: find('.dmg'), exeUrl: find('.exe'), apkUrl: find('.apk') };
        setAssets(next);
        setVersion(data.tag_name || null);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ version: data.tag_name, ...next, at: Date.now() })); } catch (_) {}
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setLoading(false); });
    return () => { clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2.5 ${className}`}>
      <PlatformButton Icon={AppleIcon} label="Mac" sub={version} url={assets.dmgUrl} loading={loading} dark />
      <PlatformButton Icon={WindowsIcon} label="Windows" sub="unsigned" url={assets.exeUrl} loading={loading} />
      <PlatformButton Icon={AndroidIcon} label="Android" sub="debug APK" url={assets.apkUrl} loading={loading} />
    </div>
  );
};

export default DownloadAllPlatforms;
