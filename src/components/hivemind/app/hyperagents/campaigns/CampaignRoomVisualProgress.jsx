import React, { useMemo, useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import RuntimeArtifactPopup from '../RuntimeArtifactPopup';
import { CampaignAssetImage } from './CampaignCreative';

export function campaignVisualProgress(campaign) {
  const actions = Array.isArray(campaign?.actions) ? campaign.actions : [];
  const visualActions = actions.filter((action) => action?.payload?.creative_brief?.required === true || (action.assets || []).length > 0);
  const assets = visualActions.flatMap((action) => (action.assets || []).map((asset) => ({ action, asset })));
  const ready = assets.filter(({ asset }) => ['READY', 'APPROVED'].includes(asset.status));
  const pending = assets.filter(({ asset }) => ['QUEUED', 'GENERATING', 'WAITING_QUOTA'].includes(asset.status));
  visualActions.forEach((action) => {
    if (action?.payload?.creative_brief?.required === true && !(action.assets || []).length) {
      pending.push({ action, asset: { id: `${action.id}-awaiting-asset`, status: 'QUEUED' } });
    }
  });
  return { visualActions, ready, pending, planning: campaign?.status === 'GENERATING' && visualActions.length === 0, complete: visualActions.length > 0 && pending.length === 0 };
}

export default function CampaignRoomVisualProgress({ campaign, onOpenCampaign }) {
  const [popup, setPopup] = useState(null);
  const progress = useMemo(() => campaignVisualProgress(campaign), [campaign]);
  if (!campaign || (!progress.planning && progress.visualActions.length === 0) || (progress.complete && !progress.ready.length)) return null;
  const expected = Math.max(progress.visualActions.length, progress.ready.length + progress.pending.length);
  const stillWorking = progress.planning || progress.pending.length > 0;
  return <section className="my-5 max-w-4xl border-y border-[#dfdbd4] bg-[#f8f7f3] py-5" data-testid="campaign-room-visual-progress" aria-live="polite">
    <div className="flex flex-wrap items-start justify-between gap-3 px-1"><div className="flex items-start gap-3"><span className="relative grid h-10 w-10 shrink-0 place-items-center border border-[#d8d3cc] bg-white"><Sparkles size={16} className={stillWorking ? 'animate-pulse text-[#256d5b]' : 'text-[#256d5b]'} />{stillWorking ? <span className="absolute inset-1 animate-ping rounded-full border border-[#6d9d8f]/40 motion-reduce:animate-none" /> : null}</span><div><div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#256d5b]">Campaign Intelligence</div><h3 className="mt-1 text-[15px] font-semibold text-[#24211f]">{stillWorking ? 'Generating campaign visuals' : 'Campaign visuals ready'}</h3><p className="mt-1 text-[11px] leading-5 text-[#777168]">{progress.planning ? 'The Campaign Board is selecting which actions need original imagery.' : `${progress.ready.length}${expected ? ` of ${expected}` : ''} visual${expected === 1 ? '' : 's'} ready. Each result remains attached to its campaign action.`}</p></div></div>{onOpenCampaign ? <button type="button" onClick={onOpenCampaign} className="h-8 border border-[#cfc9c1] bg-white px-3 text-[10px] font-semibold text-[#34312e] hover:border-[#256d5b]">Open Campaign Board</button> : null}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {progress.ready.map(({ action, asset }, index) => <button key={asset.id} type="button" onClick={() => setPopup({ action, asset })} className="group min-w-0 text-left" data-testid="campaign-room-visual-ready"><CampaignAssetImage asset={asset} alt={asset.metadata?.alt_text || action.payload?.asset_alt_text || 'Campaign visual'} className="aspect-video w-full border border-[#d8d3cc] object-cover transition group-hover:border-[#256d5b]" /><div className="mt-1.5 flex items-center gap-2 px-0.5"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#256d5b] text-white"><Check size={10} /></span><span className="truncate text-[10px] font-medium text-[#45413d]">{action.payload?.title || action.actionType || `Campaign visual ${index + 1}`}</span></div></button>)}
      {progress.pending.map(({ action, asset }, index) => <div key={asset.id || `${action.id}-${index}`} className="min-w-0" data-testid="campaign-room-visual-generating"><div className="relative aspect-video overflow-hidden border border-[#d8d3cc] bg-[#ebe8e1]"><div className="absolute inset-y-0 w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:animate-none" /><div className="absolute inset-0 grid place-items-center"><span className="inline-flex items-center gap-2 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#615c56]"><Loader2 size={13} className="animate-spin" />{asset.status === 'WAITING_QUOTA' ? 'Waiting for capacity' : 'Creating visual'}</span></div></div><div className="mt-1.5 truncate px-0.5 text-[10px] text-[#6f6962]">{action.payload?.title || action.actionType || `Campaign visual ${progress.ready.length + index + 1}`}</div></div>)}
      {progress.planning ? Array.from({ length: 3 }).map((unused, index) => <div key={index} className="relative aspect-video overflow-hidden border border-[#d8d3cc] bg-[#ebe8e1]" data-testid="campaign-room-visual-planning"><div className="absolute inset-y-0 w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:animate-none" style={{ animationDelay: `${index * 180}ms` }} /><div className="absolute inset-0 grid place-items-center"><Sparkles size={14} className="animate-pulse text-[#8a847d]" /></div></div>) : null}
    </div>
    {popup ? <RuntimeArtifactPopup open onClose={() => setPopup(null)} kind="image" title={popup.action.payload?.title || 'Campaign visual ready'} subline="Generated for this Campaign Board action" imageUrl={popup.asset.content_url} downloadUrl={popup.asset.content_url} shareUrl={popup.asset.content_url} /> : null}
  </section>;
}
