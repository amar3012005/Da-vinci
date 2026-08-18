import React, { useState } from 'react';
import { X, Download, Share2, FileText, Image as ImageIcon, Check } from 'lucide-react';

/**
 * Generic Runtime artifact popup — reused for: a campaign image finishing
 * generation, a Room/specialist result producing a document/report, and
 * clicking an item in the Runtime "Artifacts" panel. One component so every
 * "here's what I made" moment in the Runtime terminal looks and behaves the
 * same, rather than three one-off modals.
 *
 * Matches this file's existing hand-rolled dialog style (rounded-[8px],
 * border-[#d8d3cc], bg-[#fbfaf7]) — see the Restart Runtime dialog above —
 * rather than importing a different modal language into this one room.
 */
export default function RuntimeArtifactPopup({
  open, onClose, kind = 'text', title, subline, imageUrl, textContent,
  downloadUrl, downloadFilename, shareUrl, shareText, loading = false,
}) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const effectiveDownloadUrl = downloadUrl || (kind !== 'image' && textContent
    ? URL.createObjectURL(new Blob([textContent], { type: 'text/plain' }))
    : null);

  const share = async () => {
    const url = shareUrl || downloadUrl || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: title || 'Runtime artifact', text: shareText || subline || '', url }); return; }
      catch { /* user cancelled the native share sheet — fall through to nothing */ return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable — no-op, button just does nothing */ }
  };

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={title || 'Runtime artifact'} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-lg overflow-hidden rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl">
      <div className="relative border-b border-[#e3e0db] px-5 py-4">
        <button type="button" onClick={onClose} aria-label="Close" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button>
        <div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#525252]">{kind === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}Runtime artifact</div>
        <h3 className="mt-3 pr-9 text-[18px] font-semibold leading-6 text-[#171717]">{title || 'Untitled artifact'}</h3>
        {subline ? <p className="mt-1.5 text-[12px] leading-5 text-[#777168]">{subline}</p> : null}
      </div>
      <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
        {loading ? <p className="py-8 text-center text-[12px] text-[#a3a3a3]">Loading…</p>
          : kind === 'image' && imageUrl ? <img src={imageUrl} alt={title || 'Runtime artifact'} className="w-full rounded-md border border-[#e7e4df] object-cover" />
            : <pre className="whitespace-pre-wrap break-words rounded-md border border-[#e7e4df] bg-white px-3 py-2.5 font-mono text-[11px] leading-5 text-[#292824]">{textContent || 'No preview available.'}</pre>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#e3e0db] px-5 py-3.5">
        <button type="button" onClick={share} className="inline-flex h-9 items-center gap-2 px-3 text-[11px] font-semibold text-[#525252] hover:text-[#171717]">
          {copied ? <><Check size={13} className="text-[#328347]" />Link copied</> : <><Share2 size={13} />Share</>}
        </button>
        {effectiveDownloadUrl ? <a href={effectiveDownloadUrl} download={downloadFilename || true} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white hover:bg-[#292824]"><Download size={13} />Download</a> : null}
      </div>
    </div>
  </div>;
}
