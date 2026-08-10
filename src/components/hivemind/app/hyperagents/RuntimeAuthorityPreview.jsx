import React, { useRef } from 'react';
import {
  Bookmark, Check, ChevronLeft, ChevronRight, Heart, Instagram, Linkedin, Mail,
  MessageCircle, MoreHorizontal, Phone, Repeat2, Send, Share, ThumbsUp,
} from 'lucide-react';
import { CampaignAssetImage } from './campaigns/CampaignCreative';

function actionCopy(action = {}) {
  const payload = action.payload || {};
  return String(payload.final_copy || payload.text || payload.caption || payload.body || payload.message || '').trim();
}

function selectedAsset(action = {}) {
  const assets = action.assets || [];
  return assets.find((asset) => asset.id === action.payload?.asset_id)
    || assets.find((asset) => ['READY', 'APPROVED'].includes(asset.status))
    || assets.find((asset) => ['QUEUED', 'GENERATING', 'WAITING_QUOTA'].includes(asset.status))
    || null;
}

function Initials({ name, tone = 'bg-[#d5d5d5] text-[#262626]' }) {
  const letters = String(name || 'Company').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${tone}`}>{letters}</span>;
}

function TextCreative({ text, dark = false, className = '' }) {
  return <div className={`grid min-h-[180px] place-items-center px-7 py-9 text-center ${dark ? 'bg-[#101114] text-white' : 'bg-[#f0efec] text-[#171717]'} ${className}`}>
    <blockquote className="max-w-[34ch] text-[17px] font-medium leading-7">&ldquo;{text || 'Prepared campaign copy'}&rdquo;</blockquote>
  </div>;
}

function GeneratingCreative({ className = '', status = 'GENERATING' }) {
  const waitingForCapacity = status === 'WAITING_QUOTA';
  return <div className={`relative isolate overflow-hidden bg-[#111318] text-white ${className}`} aria-label={waitingForCapacity ? 'Campaign visual is waiting for capacity' : 'Campaign visual is generating'}>
    <style>{`@keyframes hm-campaign-particle{0%{opacity:.08;transform:translate3d(0,18px,0) scale(.75)}45%{opacity:.85}100%{opacity:.04;transform:translate3d(10px,-34px,0) scale(1.3)}}@keyframes hm-campaign-scan{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}@media(prefers-reduced-motion:reduce){.hm-campaign-particle,.hm-campaign-scan{animation:none!important;opacity:.35!important}}`}</style>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(61,120,255,0.25),transparent_58%)]" />
    {Array.from({ length: 30 }, (unused, index) => <span key={index} className="hm-campaign-particle absolute h-1 w-1 rounded-full bg-[#76a8ff]" style={{ left: `${8 + ((index * 29) % 86)}%`, top: `${12 + ((index * 37) % 78)}%`, animation: `hm-campaign-particle ${1.8 + (index % 7) * 0.19}s ease-in-out ${(index % 11) * 0.12}s infinite` }} />)}
    <span className="hm-campaign-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'hm-campaign-scan 2.4s ease-in-out infinite' }} />
    <div className="relative grid h-full min-h-[180px] place-items-center p-6 text-center"><div><div className={`mx-auto h-8 w-8 rounded-full border border-white/25 border-r-[#76a8ff] ${waitingForCapacity ? '' : 'animate-spin'}`} /><div className="mt-3 font-mono text-[9px] uppercase text-white/80">{waitingForCapacity ? 'Waiting for image capacity' : status === 'QUEUED' ? 'Visual queued' : 'Rendering visual'}</div><p className="mt-1 text-[10px] text-white/45">{waitingForCapacity ? 'The campaign is retained and will resume automatically.' : 'Caption and schedule are already retained.'}</p></div></div>
  </div>;
}

function Creative({ action, className = '', dark = false }) {
  const asset = selectedAsset(action);
  const text = actionCopy(action);
  if (asset && ['QUEUED', 'GENERATING', 'WAITING_QUOTA'].includes(asset.status)) return <GeneratingCreative className={className} status={asset.status} />;
  return asset
    ? <CampaignAssetImage asset={asset} alt={asset.metadata?.alt_text || action.payload?.asset_alt_text || ''} className={`w-full object-cover ${className}`} />
    : <TextCreative text={text} dark={dark} className={className} />;
}

function Meta({ action, label }) {
  return <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.1em] text-[#85817b]">
    <span>{label}</span>
    <span>{action.status_label || (action.scheduled_at ? new Date(action.scheduled_at).toLocaleString() : 'After approval')}</span>
  </div>;
}

export function XPostPreview({ action, accountName }) {
  return <article className="mx-auto flex h-full w-full max-w-[510px] flex-col overflow-hidden rounded-[8px] border border-[#d8dde1] bg-white text-[#0f1419] shadow-[0_8px_24px_rgba(15,20,25,0.06)]" aria-label="X post preview">
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-start gap-3"><Initials name={accountName} tone="bg-[#0f1419] text-white" /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1"><strong className="truncate text-[14px]">{accountName}</strong><span className="shrink-0 text-[12px] text-[#536471]">@company</span></div><p className="mt-2 max-h-[84px] overflow-y-auto whitespace-pre-wrap pr-1 text-[14px] leading-5">{actionCopy(action)}</p></div><MoreHorizontal size={18} className="shrink-0 text-[#536471]" /></div>
      <Creative action={action} className="mt-3 aspect-video max-h-[230px] min-h-0 shrink-0 rounded-[8px] border border-[#d8dde1]" />
      <div className="mt-auto"><Meta action={action} label="X post" />
      <div className="mt-3 flex items-center justify-between border-t border-[#eff1f2] pt-3 text-[#536471]"><MessageCircle size={18} /><Repeat2 size={18} /><Heart size={18} /><Bookmark size={18} /><Share size={18} /></div></div>
    </div>
  </article>;
}

export function InstagramPostPreview({ action, accountName }) {
  return <article className="mx-auto flex h-full w-full max-w-[470px] flex-col overflow-hidden rounded-[8px] border border-[#dbdbdb] bg-white text-[#101010] shadow-[0_1px_2px_rgba(0,0,0,0.06)]" aria-label="Instagram post preview">
    <div className="flex h-[62px] shrink-0 items-center gap-3 px-4"><span className="rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]"><span className="block rounded-full bg-white p-[2px]"><Initials name={accountName} tone="bg-[#e7e7e7] text-[#222]" /></span></span><strong className="min-w-0 flex-1 truncate text-[13px]">{accountName}</strong><span className="grid h-7 w-7 place-items-center rounded-[6px] bg-[#f4f4f4] text-[#d62976]"><Instagram size={16} /></span><MoreHorizontal size={18} /></div>
    <Creative action={action} className="aspect-square max-h-[320px] shrink-0 border-y border-[#efefef]" dark />
    <div className="flex min-h-0 flex-1 flex-col px-4 py-3"><div className="flex shrink-0 items-center gap-4"><Heart size={22} /><MessageCircle size={22} /><Send size={21} /><Bookmark size={21} className="ml-auto" /></div><p className="mt-3 max-h-[76px] overflow-y-auto whitespace-pre-wrap pr-1 text-[13px] leading-5"><strong className="mr-1">{accountName}</strong>{actionCopy(action)}</p><div className="mt-auto"><Meta action={action} label="Instagram post" /></div></div>
  </article>;
}

export function LinkedInPostPreview({ action, accountName }) {
  return <article className="mx-auto flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[8px] border border-[#d4d8dc] bg-white text-[#191919] shadow-[0_1px_2px_rgba(0,0,0,0.07)]" aria-label="LinkedIn post preview">
    <div className="shrink-0 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-[#0a66c2] text-white"><Linkedin size={24} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-[14px]">{accountName}</strong><span className="text-[11px] text-[#666]">Company page · {action.status_label || 'Prepared post'}</span></div><MoreHorizontal size={18} className="text-[#666]" /></div><p className="mt-3 max-h-[94px] overflow-y-auto whitespace-pre-wrap pr-1 text-[13px] leading-5">{actionCopy(action)}</p></div>
    <Creative action={action} className="aspect-[1.91/1] max-h-[260px] shrink-0 border-y border-[#e1e4e6]" />
    <div className="mt-auto shrink-0 px-4 py-3"><Meta action={action} label="LinkedIn post" /><div className="mt-3 grid grid-cols-4 border-t border-[#e4e6e8] pt-3 text-[#555]"><span className="flex items-center justify-center gap-1 text-[11px]"><ThumbsUp size={16} />Like</span><span className="flex items-center justify-center gap-1 text-[11px]"><MessageCircle size={16} />Comment</span><span className="flex items-center justify-center gap-1 text-[11px]"><Repeat2 size={16} />Repost</span><span className="flex items-center justify-center gap-1 text-[11px]"><Send size={16} />Send</span></div></div>
  </article>;
}

export function GmailMessagePreview({ message, action, statusLabel = 'Preview only' }) {
  const payload = action?.payload || {};
  const to = message?.to || payload.to || '';
  const subject = message?.subject || payload.subject || '';
  const body = String(message?.body || actionCopy(action))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');
  return <article className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[8px] border border-[#d7dbe3] bg-white shadow-sm" aria-label="Gmail message preview">
    <div className="flex items-center gap-2 bg-[#f2f6fc] px-4 py-3 text-[#1f1f1f]"><Mail size={16} className="text-[#d93025]" /><strong className="text-[13px]">New message</strong><span className="ml-auto text-[18px] leading-none text-[#5f6368]">&minus;</span></div>
    <div className="divide-y divide-[#eceff3] px-4"><div className="flex min-h-10 items-center gap-3 text-[12px]"><span className="text-[#5f6368]">To</span><span className="min-w-0 truncate text-[#202124]">{to}</span></div><div className="flex min-h-10 items-center gap-3 text-[12px]"><span className="text-[#5f6368]">Subject</span><span className="min-w-0 truncate font-medium text-[#202124]">{subject}</span></div></div>
    <div className="min-h-[190px] whitespace-pre-wrap px-4 py-4 text-[13px] leading-6 text-[#202124]">{body}</div>
    <div className="flex items-center border-t border-[#eceff3] px-4 py-3"><span className="inline-flex h-8 items-center gap-2 rounded-full bg-[#0b57d0] px-5 text-[12px] font-semibold text-white">{statusLabel === 'Sent' ? <Check size={13} /> : null}{statusLabel === 'Sent' ? 'Sent' : 'Send'}{statusLabel === 'Sent' ? null : <span className="text-[9px]">▼</span>}</span><span className="ml-auto text-[10px] text-[#6b6f75]">{statusLabel}</span></div>
  </article>;
}

function GenericPostPreview({ action, accountName }) {
  return <article className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[8px] border border-[#d8d3cc] bg-white p-4"><div className="flex items-center gap-3"><Initials name={accountName} /><div><strong className="text-[13px]">{accountName}</strong><div className="mt-0.5 font-mono text-[8px] uppercase text-[#8a8577]">{String(action.channel || 'post').replaceAll('_', ' ')}</div></div></div><p className="mt-4 whitespace-pre-wrap text-[13px] leading-6">{actionCopy(action)}</p><Creative action={action} className="mt-4 aspect-video rounded-[6px]" /><Meta action={action} label="Prepared action" /></article>;
}

export function PlatformActionPreview({ action, accountName = 'Company' }) {
  const channel = String(action?.channel || '').toLowerCase();
  if (channel === 'x' || channel === 'twitter' || channel === 'x_organic') return <XPostPreview action={action} accountName={accountName} />;
  if (channel === 'instagram') return <InstagramPostPreview action={action} accountName={accountName} />;
  if (channel === 'linkedin') return <LinkedInPostPreview action={action} accountName={accountName} />;
  if (channel === 'gmail') return <GmailMessagePreview action={action} statusLabel={action.status_label || 'Preview only'} />;
  return <GenericPostPreview action={action} accountName={accountName} />;
}

export function CallPreview({ call, statusLabel = null }) {
  return <article className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[8px] border border-[#d8d3cc] bg-white" aria-label="TARA call preview"><div className="flex items-center gap-3 border-b border-[#ebe8e3] px-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#171717] text-white"><Phone size={16} /></span><div className="min-w-0"><div className="truncate text-[13px] font-semibold">{call.prospect || call.phone || 'TARA outreach call'}</div><div className="font-mono text-[9px] text-[#777168]">{call.phone || call.session_id}</div></div>{statusLabel ? <span className="ml-auto border border-[#d8d3cc] px-2 py-1 font-mono text-[8px] uppercase text-[#525252]">{statusLabel}</span> : null}</div><div className="space-y-3 px-4 py-4 text-[12px] leading-5 text-[#525252]">{call.goal ? <p><strong className="text-[#171717]">Goal</strong><br />{call.goal}</p> : null}{call.opener ? <p><strong className="text-[#171717]">Opening</strong><br />{call.opener}</p> : null}{call.strategy ? <p><strong className="text-[#171717]">Strategy</strong><br />{call.strategy}</p> : null}</div></article>;
}

export function CampaignLaunchPreview({ campaign }) {
  const accountName = campaign?.name || 'Company campaign';
  const actions = campaign?.actions || [];
  return <section aria-label="Campaign launch batch">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#dedbd6] pb-3"><div><div className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#85817b]">Coordinated launch batch</div><h4 className="mt-1 text-[15px] font-semibold text-[#171717]">{accountName}</h4></div><div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#85817b]">{actions.length} action{actions.length === 1 ? '' : 's'} · {campaign.status}</div></div>
    <div className="space-y-5">{actions.map((action) => <PlatformActionPreview key={action.id} action={action} accountName={accountName} />)}</div>
  </section>;
}

export function RuntimeCampaignCanvas({ campaign }) {
  const scrollRef = useRef(null);
  const accountName = campaign?.name || 'Company campaign';
  const actions = campaign?.actions || [];
  const visualActions = actions.filter((action) => action.payload?.creative_brief?.required === true || (action.assets || []).length);
  const readyCount = visualActions.filter((action) => ['READY', 'APPROVED'].includes(selectedAsset(action)?.status)).length;
  const pendingCount = visualActions.filter((action) => (action.assets || []).some((asset) => ['QUEUED', 'GENERATING'].includes(asset.status))).length;
  const capacityCount = visualActions.filter((action) => (action.assets || []).some((asset) => asset.status === 'WAITING_QUOTA')).length;
  const progressLabel = capacityCount
    ? `${capacityCount} visual${capacityCount === 1 ? '' : 's'} waiting for image capacity`
    : pendingCount
      ? `${pendingCount} visual${pendingCount === 1 ? '' : 's'} rendering`
      : 'Campaign posts ready';
  const move = (direction) => scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth, behavior: 'smooth' });
  if (!actions.length) return null;
  return <section className="my-7 border-y border-[#ddd9d2] py-5" aria-label="Campaign posts rendering">
    <div className="mb-4 flex items-center justify-between gap-4 px-1"><div className="min-w-0"><div className="font-mono text-[8px] uppercase text-[#777168]">Campaign Intelligence</div><h3 className="mt-1 truncate text-[16px] font-semibold text-[#171717]">{accountName}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#777168]"><span>{progressLabel}</span>{visualActions.length ? <span className="rounded-full bg-[#efede9] px-2 py-0.5 font-mono text-[8px] uppercase text-[#625f58]">{readyCount}/{visualActions.length} ready</span> : null}</div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#d8d3cc] bg-white text-[#525252] transition-colors hover:bg-[#f5f3ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315ed0]" aria-label="Previous campaign posts"><ChevronLeft size={17} /></button><button type="button" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#d8d3cc] bg-white text-[#171717] transition-colors hover:bg-[#f5f3ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315ed0]" aria-label="Next campaign posts"><ChevronRight size={17} /></button></div></div>
    <div ref={scrollRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((action) => <div key={action.id} className="h-[440px] w-full shrink-0 snap-start sm:w-[calc(50%-8px)] xl:w-[calc(33.333%-11px)]"><PlatformActionPreview action={action} accountName={accountName} /></div>)}
    </div>
  </section>;
}

export function AuthorityReviewContent({ approval }) {
  return <div className="space-y-5">
    {approval.campaign ? <CampaignLaunchPreview campaign={approval.campaign} /> : null}
    {(approval.calls || []).map((call, index) => <CallPreview key={`${call.id || call.phone || 'call'}-${index}`} call={call} />)}
    {!approval.campaign ? (approval.messages || []).map((message, index) => <GmailMessagePreview key={`${message.id || message.to || 'message'}-${index}`} message={message} />) : null}
  </div>;
}
