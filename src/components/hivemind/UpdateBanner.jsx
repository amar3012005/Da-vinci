import React, { useEffect, useState } from 'react';

/**
 * UpdateBanner — desktop (Electron) auto-update UI, driven by the preload bridge
 * (window.electron.onUpdateStatus). Shows a slim bottom banner while an update
 * downloads (with %), then a "Restart to update" prompt when ready. Renders
 * nothing on the web or when no update is in flight.
 */
const UpdateBanner = () => {
  const [st, setSt] = useState(null); // { status, percent, version, message }

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electron : null;
    if (!api || typeof api.onUpdateStatus !== 'function') return undefined;
    const off = api.onUpdateStatus((data) => setSt(data));
    return off;
  }, []);

  if (!st) return null;
  const { status, percent, version, message } = st;
  if (!['downloading', 'downloaded', 'error'].includes(status)) return null;

  const base =
    'fixed inset-x-0 bottom-0 z-[300] flex items-center gap-3 px-5 py-3 text-[13px] text-white shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.6)]';

  if (status === 'downloading') {
    return (
      <div className={`${base} bg-[#0a0d18] border-t border-white/10`}>
        <span className="font-medium">Updating HIVEMIND{version ? ` to ${version}` : ''}…</span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#117dff] transition-[width] duration-300" style={{ width: `${percent || 5}%` }} />
        </div>
        <span className="font-mono text-white/60">{percent ? `${percent}%` : ''}</span>
      </div>
    );
  }

  if (status === 'downloaded') {
    return (
      <div className={`${base} justify-between bg-[#0a0d18] border-t border-[#117dff]/40`}>
        <span className="font-medium">HIVEMIND {version || ''} is ready to install.</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setSt(null)} className="rounded-md px-3 py-1.5 text-white/60 hover:text-white">Later</button>
          <button
            onClick={() => window.electron?.installUpdate?.()}
            className="rounded-md bg-[#117dff] px-3 py-1.5 font-semibold text-white hover:bg-[#0066e0]"
          >
            Restart &amp; update
          </button>
        </div>
      </div>
    );
  }

  // error — quiet, dismissible
  return (
    <div className={`${base} justify-between bg-[#1a0d0d] border-t border-red-500/30`}>
      <span className="text-white/80">Update failed{message ? `: ${message}` : ''}.</span>
      <div className="flex items-center gap-2">
        <button onClick={() => window.electron?.checkForUpdates?.()} className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20">Retry</button>
        <button onClick={() => setSt(null)} className="rounded-md px-3 py-1.5 text-white/50 hover:text-white">Dismiss</button>
      </div>
    </div>
  );
};

export default UpdateBanner;
