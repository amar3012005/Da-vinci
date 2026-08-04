import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Phone } from 'lucide-react';
import {
  GmailMessagePreview, InstagramPostPreview, LinkedInPostPreview, XPostPreview,
} from './RuntimeAuthorityPreview';

function campaignCards(marker) {
  const campaign = marker?.campaign || {};
  return (campaign.actions || []).map((action) => ({
    id: action.id,
    kind: 'campaign_action',
    marker,
    action,
    accountName: campaign.name || 'Company campaign',
  }));
}

function markerCards(markers) {
  return (markers || []).flatMap((marker) => {
    if (marker?.kind === 'campaign_launch') return campaignCards(marker);
    if (marker?.kind === 'email_sent') return [{ id: marker.id, kind: 'email_sent', marker }];
    if (marker?.kind === 'call_started' || marker?.kind === 'call_completed') return [{ id: marker.id, kind: marker.kind, marker }];
    return [];
  });
}

function CampaignCard({ card }) {
  const channel = String(card.action?.channel || '').toLowerCase();
  if (['x', 'twitter', 'x_organic'].includes(channel)) return <XPostPreview action={card.action} accountName={card.accountName} />;
  if (channel === 'instagram') return <InstagramPostPreview action={card.action} accountName={card.accountName} />;
  if (channel === 'linkedin') return <LinkedInPostPreview action={card.action} accountName={card.accountName} />;
  if (channel === 'gmail') return <GmailMessagePreview action={card.action} />;
  return <article className="mx-auto w-full max-w-[560px] border border-[#d8d3cc] bg-white p-5" aria-label="Scheduled campaign action">
    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777168]">{channel.replaceAll('_', ' ') || 'Campaign action'}</div>
    <blockquote className="mt-4 whitespace-pre-wrap text-[16px] leading-7 text-[#171717]">&ldquo;{card.action?.payload?.final_copy || card.action?.payload?.text || card.action?.payload?.caption || 'Scheduled campaign content'}&rdquo;</blockquote>
  </article>;
}

function CallCard({ call = {} }) {
  return <article className="mx-auto w-full max-w-[620px] overflow-hidden border border-[#d8d3cc] bg-white" aria-label="TARA call activity">
    <div className="flex items-center gap-3 border-b border-[#ebe8e3] px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#171717] text-white"><Phone size={17} /></span><div className="min-w-0"><strong className="block truncate text-[14px]">{call.prospect || call.phone || 'Selected contact'}</strong><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#777168]">{call.status || 'dialing'} · {call.phone || 'verified number'}</span></div></div>
    <div className="space-y-4 px-5 py-5 text-[13px] leading-6 text-[#525252]">{call.goal ? <p><strong className="text-[#171717]">Goal</strong><br />{call.goal}</p> : null}{call.opener ? <p><strong className="text-[#171717]">Opening</strong><br />{call.opener}</p> : null}{call.strategy ? <p><strong className="text-[#171717]">Strategy</strong><br />{call.strategy}</p> : null}</div>
  </article>;
}

function ActivityCard({ card }) {
  if (card.kind === 'campaign_action') return <CampaignCard card={card} />;
  if (card.kind === 'email_sent') return <GmailMessagePreview message={card.marker.message} />;
  return <CallCard call={card.marker.call} />;
}

export default function RuntimeActionBanner({ markers = [] }) {
  const cards = useMemo(() => markerCards(markers), [markers]);
  const [index, setIndex] = useState(0);
  if (!cards.length) return null;
  const active = cards[Math.min(index, cards.length - 1)];
  const marker = active.marker || {};
  const move = (amount) => setIndex((current) => (current + amount + cards.length) % cards.length);
  return <section className="my-7 h-[430px] overflow-hidden border border-[#171717] bg-[#f7f6f2] shadow-[0_16px_42px_-34px_rgba(0,0,0,0.72)]" aria-label="Runtime external action">
    <header className="flex h-[86px] items-center gap-4 border-b border-[#171717] bg-[#171717] px-5 text-white">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/30"><CheckCircle2 size={17} /></span>
      <div className="min-w-0 flex-1"><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">External action recorded</div><h3 className="mt-1 truncate text-[17px] font-semibold">Congratulations! {marker.headline || 'Runtime completed an action'}</h3><p className="mt-1 truncate text-[11px] text-white/65">{marker.note}</p></div>
      {cards.length > 1 ? <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center border border-white/25 hover:bg-white/10" aria-label="Previous action"><ArrowLeft size={14} /></button><span className="min-w-10 text-center font-mono text-[9px] text-white/65">{index + 1}/{cards.length}</span><button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center border border-white/25 hover:bg-white/10" aria-label="Next action"><ArrowRight size={14} /></button></div> : null}
    </header>
    <div className="h-[344px] overflow-y-auto overscroll-contain p-5 sm:p-6" data-testid="runtime-action-frame">
      <ActivityCard card={active} />
      <div className="mx-auto mt-3 flex max-w-[620px] items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a8577]"><span>{active.kind === 'email_sent' ? <span className="inline-flex items-center gap-1"><Mail size={10} />Provider receipt retained</span> : 'Persisted Runtime checkpoint'}</span><span>{marker.occurred_at ? new Date(marker.occurred_at).toLocaleString() : ''}</span></div>
    </div>
  </section>;
}
