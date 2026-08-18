import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Download, Share2, Check } from 'lucide-react';

/**
 * Document-style markdown body for a Runtime artifact — a big serif title,
 * plain prose/bullets/inline-code, no card chrome. Modeled directly on an
 * existing reference render the user pointed at ("Day 14 — CEO Report":
 * bold serif heading, plain markdown body, simple close, no eyebrow/dark
 * chrome) — every artifact popup should read like a real document, not a
 * JSON dump or a boxed widget. Deliberately its own component rather than
 * reusing shared/MarkdownMessage.jsx: that one is tuned for small chat
 * bubbles (13-15px type); this needs a document-scaled typographic pass.
 * No rehype-raw, so content can never inject raw HTML.
 */
function ArtifactMarkdownBody({ markdown }) {
  return <div className="hm-artifact-md">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#117dff] underline underline-offset-2">{children}</a>,
        table: ({ node, ...props }) => <div className="my-3 overflow-x-auto"><table {...props} className="w-full border-collapse text-[13px]" /></div>,
        th: ({ node, ...props }) => <th {...props} className="border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-1.5 text-left font-semibold" />,
        td: ({ node, ...props }) => <td {...props} className="border border-[#e3e0db] px-2.5 py-1.5 align-top" />,
        code: ({ node, inline, ...props }) => (inline
          ? <code {...props} className="rounded bg-[#f3f1ec] px-1.5 py-0.5 font-mono text-[13px]" />
          : <code {...props} className="block overflow-x-auto rounded-md bg-[#f3f1ec] p-3 font-mono text-[13px]" />),
        ul: ({ node, ...props }) => <ul {...props} className="my-2 list-disc space-y-1 pl-5" />,
        ol: ({ node, ...props }) => <ol {...props} className="my-2 list-decimal space-y-1 pl-5" />,
        h1: ({ node, children, ...props }) => <h1 {...props} className="mb-2 mt-4 font-serif text-[22px] font-bold text-[#171717] first:mt-0">{children}</h1>,
        h2: ({ node, children, ...props }) => <h2 {...props} className="mb-2 mt-4 font-serif text-[19px] font-bold text-[#171717] first:mt-0">{children}</h2>,
        h3: ({ node, children, ...props }) => <h3 {...props} className="mb-1.5 mt-3.5 text-[15px] font-semibold text-[#171717] first:mt-0">{children}</h3>,
        p: ({ node, ...props }) => <p {...props} className="my-2.5 text-[15px] leading-7 text-[#292824] first:mt-0 last:mb-0" />,
        strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-[#171717]" />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  </div>;
}

/**
 * Generic Runtime artifact popup — reused for: a campaign image finishing
 * generation, a Room/specialist result producing a document/report, and
 * clicking an item in the Runtime "Artifacts" panel. One component so every
 * "here's what I made" moment in the Runtime terminal looks and behaves the
 * same.
 *
 * Content priority: `children` (a fully custom render) > `markdown` (the
 * common case — human-readable, never a raw JSON dump) > `imageUrl` >
 * `textContent` (last-resort plain-text fallback).
 */
export default function RuntimeArtifactPopup({
  open, onClose, kind = 'text', title, subline, imageUrl, textContent, markdown,
  downloadUrl, downloadFilename, shareUrl, shareText, loading = false, children,
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

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title || 'Runtime artifact'} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white shadow-2xl">
      <div className="relative shrink-0 border-b border-[#e3e0db] px-8 pb-5 pt-7">
        <button type="button" onClick={onClose} aria-label="Close" title="Close" className="absolute right-5 top-6 grid h-8 w-8 place-items-center rounded-md text-[#a3a3a3] hover:bg-[#faf9f4] hover:text-[#0a0a0a]"><X size={18} /></button>
        <h3 className="pr-10 font-serif text-[28px] font-bold leading-tight text-[#171717]">{title || 'Untitled artifact'}</h3>
        {subline ? <p className="mt-2 text-[13px] leading-5 text-[#737373]">{subline}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-5">
        {loading ? <p className="py-8 text-center text-[13px] text-[#a3a3a3]">Loading…</p>
          : children ? children
            : markdown ? <ArtifactMarkdownBody markdown={markdown} />
              : kind === 'image' && imageUrl ? <img src={imageUrl} alt={title || 'Runtime artifact'} className="w-full rounded-md border border-[#e7e4df] object-cover" />
                : <pre className="whitespace-pre-wrap break-words rounded-md border border-[#e7e4df] bg-[#faf9f4] px-3 py-2.5 font-mono text-[12px] leading-5 text-[#292824]">{textContent || 'No preview available.'}</pre>}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#e3e0db] px-6 py-3.5">
        <button type="button" onClick={share} className="inline-flex h-9 items-center gap-2 px-3 text-[12px] font-semibold text-[#525252] hover:text-[#171717]">
          {copied ? <><Check size={13} className="text-[#328347]" />Link copied</> : <><Share2 size={13} />Share</>}
        </button>
        {effectiveDownloadUrl ? <a href={effectiveDownloadUrl} download={downloadFilename || true} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[12px] font-semibold text-white hover:bg-[#292824]"><Download size={13} />Download</a> : null}
      </div>
    </div>
  </div>;
}
