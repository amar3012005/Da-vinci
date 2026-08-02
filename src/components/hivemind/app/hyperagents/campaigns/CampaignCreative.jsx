import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, Pencil, Sparkles, Trash2, Upload, X } from 'lucide-react';
import apiClient from '../../shared/api-client';

export function CampaignAssetImage({ asset, alt = '', className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    if (!asset?.content_url) { setSrc(''); return undefined; }
    apiClient.getCampaignImageBlob(asset.content_url).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob); setSrc(objectUrl);
    }).catch(() => { if (active) setSrc(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset?.content_url]);
  if (!src) return <div className={`grid place-items-center bg-[#efede8] text-[#8a847d] ${className}`}><Loader2 size={16} className={['READY', 'APPROVED'].includes(asset?.status) ? '' : 'animate-spin'} /></div>;
  return <img src={src} alt={alt} className={className} />;
}

function creativeFrom(action) {
  const creative = action?.payload?.creative_brief;
  return creative && typeof creative === 'object' ? creative : {};
}

export function CampaignCreativeGallery({ actions = [] }) {
  const visual = actions.filter((action) => (action.assets || []).some((asset) => ['READY', 'APPROVED'].includes(asset.status)));
  if (!visual.length) return null;
  return <section className="mt-6 border-y border-[#dfdbd4] py-5"><div className="flex items-center gap-2"><ImageIcon size={14} /><h3 className="text-[12px] font-semibold">Campaign visuals</h3></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{visual.map((action) => {
    const selected = (action.assets || []).find((asset) => asset.id === action.payload?.asset_id) || action.assets.find((asset) => ['READY', 'APPROVED'].includes(asset.status));
    return <figure key={action.id} className="min-w-0"><CampaignAssetImage asset={selected} alt={selected?.metadata?.alt_text || action.payload?.asset_alt_text || ''} className="aspect-video w-full rounded-md border border-[#d8d3cc] object-cover" /><figcaption className="mt-1.5 truncate text-[10px] text-[#6f6962]">{action.payload?.title || action.actionType}</figcaption></figure>;
  })}</div></section>;
}

export default function CampaignCreative({ action, onGenerate, onUpload, onSelect, onRemove, busy }) {
  const inputRef = useRef(null); const creative = useMemo(() => creativeFrom(action), [action]);
  const assets = (action.assets || []).filter((asset) => !asset.deletedAt);
  const selectedId = action.payload?.asset_id; const selected = assets.find((asset) => asset.id === selectedId) || assets.find((asset) => asset.status === 'READY');
  const generating = assets.some((asset) => ['QUEUED', 'GENERATING'].includes(asset.status));
  const [editing, setEditing] = useState(false); const [prompt, setPrompt] = useState(creative.generation_prompt || ''); const [altText, setAltText] = useState(creative.alt_text || '');
  useEffect(() => { setPrompt(creative.generation_prompt || ''); setAltText(creative.alt_text || ''); }, [creative.generation_prompt, creative.alt_text]);
  if (action.channel !== 'x_organic') return null;
  const generate = async () => {
    try {
      await onGenerate(action.id, { creative_brief: { ...creative, required: true, generation_prompt: prompt, alt_text: altText }, variant_count: 2 });
      setEditing(false);
    } catch { /* The campaign page displays the API error. */ }
  };
  const upload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (file) { try { await onUpload(action.id, file, altText); } catch { /* The campaign page displays the API error. */ } }
  };
  return <section className="mt-4 border-y border-[#ddd8d0] py-4" aria-label="Campaign image creative">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-1.5 text-[10.5px] font-semibold"><ImageIcon size={13} />Campaign visual</div><p className="mt-0.5 text-[9.5px] text-[#817b74]">{creative.required ? 'The campaign plan selected this action for original imagery.' : 'The campaign plan selected text-only. You can still upload an approved image.'}</p></div><div className="flex gap-1">
      {creative.required ? <button onClick={() => setEditing((value) => !value)} disabled={busy || generating} className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc9c1]" title="Edit image prompt"><Pencil size={12} /></button> : null}
      <button onClick={() => inputRef.current?.click()} disabled={busy} className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc9c1]" title="Upload replacement image"><Upload size={12} /></button>
      {selected ? <button onClick={() => onRemove(action.id, selected.id)} disabled={busy} className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc9c1] text-red-700" title="Remove selected image"><Trash2 size={12} /></button> : null}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
    </div></div>
    {selected ? <CampaignAssetImage asset={selected} alt={selected.metadata?.alt_text || action.payload?.asset_alt_text || ''} className="mt-3 aspect-video w-full max-w-2xl rounded-md border border-[#d8d3cc] object-cover" /> : generating ? <div className="mt-3 flex aspect-video w-full max-w-2xl items-center justify-center rounded-md border border-[#d8d3cc] bg-[#f2f0eb] text-[10.5px] text-[#6f6962]"><Loader2 size={14} className="mr-2 animate-spin" />Creating campaign visual</div> : null}
    {assets.filter((asset) => ['READY', 'APPROVED'].includes(asset.status)).length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto">{assets.filter((asset) => ['READY', 'APPROVED'].includes(asset.status)).map((asset) => <button key={asset.id} onClick={() => onSelect(action.id, asset.id)} disabled={busy || asset.id === selectedId || asset.status === 'APPROVED'} className={`relative shrink-0 rounded-md border ${asset.id === selectedId ? 'border-[#256d5b]' : 'border-[#d8d3cc]'}`} title={asset.id === selectedId ? 'Selected image' : 'Use this image'}><CampaignAssetImage asset={asset} alt="" className="h-16 w-24 rounded-[5px] object-cover" />{asset.id === selectedId ? <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#256d5b] text-white"><Check size={10} /></span> : null}</button>)}</div> : null}
    {editing ? <div className="mt-3 space-y-2"><textarea rows={5} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Detailed visual generation prompt" className="w-full resize-y rounded-md border border-[#cfc9c1] p-3 text-[11px]" /><input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Accessibility alt text" className="h-9 w-full rounded-md border border-[#cfc9c1] px-3 text-[11px]" /><div className="flex gap-2"><button onClick={generate} disabled={busy || !prompt.trim() || !altText.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10.5px] font-semibold text-white disabled:bg-[#aaa49c]"><Sparkles size={12} />Generate two variants</button><button onClick={() => setEditing(false)} className="grid h-8 w-8 place-items-center rounded-md border border-[#cfc9c1]" title="Close prompt editor"><X size={12} /></button></div></div> : null}
    {creative.required && !editing && !selected && !generating ? <button onClick={() => setEditing(true)} disabled={busy} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10.5px] font-semibold text-white"><Sparkles size={12} />Generate image</button> : null}
    {selected?.metadata?.alt_text ? <p className="mt-2 text-[9.5px] text-[#817b74]">Alt text: {selected.metadata.alt_text}</p> : null}
  </section>;
}
