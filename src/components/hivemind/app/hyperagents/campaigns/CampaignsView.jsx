import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, Megaphone, Pause, Play, Plus, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../shared/api-client';
import CampaignDashboardModal from './CampaignDashboardModal';
import CampaignProgressDashboard from './CampaignProgressDashboard';
import CampaignActivation from './CampaignActivation';
import CreateCampaignWizard from './CreateCampaignWizard';
import { CHANNEL_NAMES } from './channel-catalog';

const statusTone = { RUNNING: 'text-emerald-700 bg-emerald-50', COMPLETED: 'text-emerald-700 bg-emerald-50', FAILED: 'text-red-700 bg-red-50', NEEDS_INPUT: 'text-amber-800 bg-amber-50' };

export function withCampaignSearchParam(searchParams, campaignId) {
  const next = new URLSearchParams(searchParams);
  if (campaignId) next.set('campaign', campaignId); else next.delete('campaign');
  return next;
}

export default function CampaignsView({ onOpenRoom }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCampaignId = searchParams.get('campaign');
  const [campaigns, setCampaigns] = useState([]); const [capabilities, setCapabilities] = useState(null);
  const [paidCampaigns, setPaidCampaigns] = useState([]);
  const [selected, setSelected] = useState(null); const [loading, setLoading] = useState(true); const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [activation, setActivation] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [caps, list, xStatus] = await Promise.all([apiClient.getCampaignCapabilities(), apiClient.getCampaigns(), apiClient.getXAdsStatus().catch(() => null)]);
      setCapabilities(caps); setCampaigns(list.campaigns || []);
      if (xStatus?.connections?.x && xStatus?.connections?.x_ads) {
        const paid = await apiClient.getXAdsCampaigns().catch(() => ({ campaigns: [] })); setPaidCampaigns(paid.campaigns || []);
      } else setPaidCampaigns([]);
    }
    catch (err) { setError(err?.response?.data?.message || err.message || 'Could not load campaigns'); }
    finally { setLoading(false); }
  }, []);
  const loadDetail = useCallback(async (id, quiet = false) => {
    if (!quiet) setDetailLoading(true);
    try { const data = await apiClient.getCampaign(id); setSelected(data.campaign); }
    catch (err) { if (!quiet) setError(err?.response?.data?.message || err.message); }
    finally { if (!quiet) setDetailLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selectedCampaignId) { if (selected) setSelected(null); return; }
    if (selected?.id === selectedCampaignId) return;
    loadDetail(selectedCampaignId);
  }, [selectedCampaignId, selected, loadDetail]);
  useEffect(() => {
    if (!selected || !['GENERATING', 'PREPARING_ASSETS', 'RUNNING', 'SCHEDULED'].includes(selected.status)) return undefined;
    const timer = window.setInterval(() => loadDetail(selected.id, true), 5000); return () => window.clearInterval(timer);
  }, [selected, loadDetail]);
  const setCampaignUrl = useCallback((campaignId, replace = false) => {
    setSearchParams(withCampaignSearchParam(searchParams, campaignId), { replace });
  }, [searchParams, setSearchParams]);
  const closeCampaign = useCallback(() => { setSelected(null); setCampaignUrl(null, true); load(); }, [load, setCampaignUrl]);
  const open = async (campaign) => {
    if (campaign.status === 'GENERATING' && onOpenRoom) {
      const data = await apiClient.getCampaign(campaign.id);
      if (data.campaign?.roomId) { onOpenRoom(data.campaign.roomId, campaign.id); return; }
    }
    setSelected(campaign); setCampaignUrl(campaign.id); loadDetail(campaign.id);
  };
  const create = async (payload) => {
    setShowCreate(false);
    setActivation({ status: 'working', step: 1, goal: payload.goal });
    const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    try {
      const data = await apiClient.createCampaign(payload);
      for (const step of [2, 3, 4]) { setActivation((current) => ({ ...current, step })); await delay(300); }
      setActivation((current) => ({ ...current, status: 'opening', step: 5, campaign: data.campaign }));
      await delay(700);
      setActivation(null);
      if (data.campaign?.roomId && onOpenRoom) { onOpenRoom(data.campaign.roomId, data.campaign.id); return; }
      await load();
      setCampaignUrl(data.campaign.id);
      await loadDetail(data.campaign.id);
    } catch (err) {
      setActivation((current) => ({ ...current, status: 'failed', error: err?.response?.data?.message || err.message || 'Could not create Campaign Room' }));
      throw err;
    }
  };
  const control = async (action) => { setBusy(true); setError(''); try { await apiClient.controlCampaign(selected.id, action); await loadDetail(selected.id); await load(); return true; } catch (err) { setError(err?.response?.data?.message || err.message); return false; } finally { setBusy(false); } };
  const controlPaid = async (campaignId, action) => { setBusy(true); setError(''); try { await apiClient.controlXAdsCampaign(campaignId, action); await load(); } catch (err) { setError(err?.response?.data?.message || err.message); } finally { setBusy(false); } };
  const connect = async (channel) => {
    if (channel === 'x_organic') { const data = await apiClient.startXAdsOAuth('oauth2'); window.location.assign(data.authorization_url); return; }
    window.location.assign(channel === 'tara' ? '/hivemind/app/tara' : '/hivemind/app/connectors');
  };
  const totals = useMemo(() => ({ running: campaigns.filter((x) => ['RUNNING', 'SCHEDULED'].includes(x.status)).length, actions: campaigns.reduce((n, x) => n + Number(x._count?.actions || 0), 0) }), [campaigns]);
  const selectedExecutionBlockers = selected?.requestedChannels?.filter((channel) => !capabilities?.channels?.find((item) => item.id === channel)?.execution_ready) || [];
  return <div className="h-full overflow-y-auto bg-[#fbfaf6]">
    <header className="px-4 sm:px-7 py-5 border-b border-[#dfdbd4] flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Megaphone size={17} /><h1 className="text-[18px] font-semibold">Your Campaigns</h1><span className="text-[9px] font-mono uppercase bg-[#ece9e3] rounded px-1.5 py-0.5">AI operated</span></div><p className="text-[11px] text-[#77716a] mt-1">One goal, one Campaign Room, coordinated execution across your connected channels.</p></div><div className="flex gap-2"><button onClick={load} disabled={loading} className="w-9 h-9 border border-[#c9c3bb] rounded-md grid place-items-center" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button><button onClick={() => setShowCreate(true)} disabled={!capabilities?.enabled} className="h-9 px-4 bg-[#171717] text-white rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-semibold disabled:bg-[#bcb6ae]"><Plus size={13} />Create campaign</button></div></header>
    <main className="px-4 sm:px-7 py-6">
      {error ? <div className="mb-4 flex gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"><AlertTriangle size={13} />{error}</div> : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[#dfdbd4] divide-x divide-[#dfdbd4]">{[['Campaigns', campaigns.length], ['Active', totals.running], ['Connected channels', capabilities?.channels?.filter((x) => x.executable).length || 0], ['Completed', campaigns.filter((x) => x.status === 'COMPLETED').length]].map(([label, value]) => <div key={label} className="py-4 px-3 sm:px-5 first:pl-0"><div className="text-[20px] font-semibold">{value}</div><div className="text-[9px] font-mono uppercase text-[#817b74] mt-1">{label}</div></div>)}</div>
      <div className="mt-7"><div className="grid grid-cols-[1fr_110px_100px_34px] gap-3 pb-2 border-b border-[#d8d3cc] text-[9px] font-mono uppercase text-[#817b74]"><span>Campaign</span><span>Status</span><span>Channels</span><span /></div>
        {loading ? <div className="py-16 grid place-items-center"><Loader2 size={20} className="animate-spin text-[#817b74]" /></div> : campaigns.length ? campaigns.map((campaign) => <button key={campaign.id} onClick={() => open(campaign)} className="w-full grid grid-cols-[1fr_110px_100px_34px] gap-3 items-center py-3.5 border-b border-[#e6e2dc] text-left hover:bg-white"><div className="min-w-0"><div className="text-[12.5px] font-semibold truncate">{campaign.name}</div><div className="text-[10.5px] text-[#817b74] truncate mt-0.5">{campaign.goal}</div></div><span className={`w-fit text-[8.5px] font-mono uppercase rounded px-1.5 py-1 ${statusTone[campaign.status] || 'bg-[#efede8] text-[#615c56]'}`}>{campaign.status}</span><span className="truncate text-[10.5px] text-[#615c56]">{campaign.requestedChannels.map((id) => CHANNEL_NAMES[id] || id).join(', ')}</span><BarChart3 size={13} className="text-[#817b74]" /></button>) : <div className="py-16 text-center"><Megaphone size={22} className="mx-auto text-[#aaa49c]" /><div className="text-[12.5px] font-semibold mt-3">No campaigns yet</div><div className="text-[10.5px] text-[#817b74] mt-1">Create an outcome-driven campaign and let your agents build the plan.</div></div>}
      </div>
      {paidCampaigns.length ? <section className="mt-9"><div className="flex items-center justify-between pb-2 border-b border-[#d8d3cc]"><div><h2 className="text-[12px] font-semibold">Paid X campaigns</h2><p className="text-[10px] text-[#817b74] mt-0.5">Existing Ads API campaigns remain independently controlled.</p></div></div>{paidCampaigns.map((campaign) => <div key={campaign.id} className="grid grid-cols-[1fr_110px_90px] gap-3 items-center py-3 border-b border-[#e6e2dc]"><div className="min-w-0"><div className="text-[12px] font-semibold truncate">{campaign.name}</div><div className="text-[10px] text-[#817b74] mt-0.5">{campaign.metrics?.impressions || 0} impressions · {campaign.metrics?.url_clicks || 0} link clicks</div></div><span className="text-[9px] font-mono uppercase">{campaign.status}</span><div className="flex justify-end gap-1">{['ACTIVE', 'PENDING_REVIEW'].includes(campaign.status) ? <button onClick={() => controlPaid(campaign.id, 'pause')} disabled={busy} className="w-8 h-8 border border-[#c9c3bb] rounded-md grid place-items-center" title="Pause paid campaign"><Pause size={12} /></button> : null}{campaign.status === 'PAUSED' ? <button onClick={() => controlPaid(campaign.id, 'resume')} disabled={busy} className="w-8 h-8 border border-[#c9c3bb] rounded-md grid place-items-center" title="Resume paid campaign"><Play size={12} /></button> : null}<button onClick={() => controlPaid(campaign.id, 'sync')} disabled={busy} className="w-8 h-8 border border-[#c9c3bb] rounded-md grid place-items-center" title="Refresh paid performance"><RefreshCw size={12} /></button></div></div>)}</section> : null}
    </main>
    {selected || (selectedCampaignId && detailLoading) ? <CampaignDashboardModal campaign={selected} loading={detailLoading} onClose={closeCampaign}>
      {selected ? <CampaignProgressDashboard campaign={selected} loading={detailLoading} onClose={closeCampaign} onOpenRoom={onOpenRoom || (() => {})} onLaunch={control} busy={busy} executionEnabled={Boolean(capabilities?.execution_enabled) && selectedExecutionBlockers.length === 0} /> : null}
    </CampaignDashboardModal> : null}
    {showCreate ? <CreateCampaignWizard capabilities={capabilities} onClose={() => setShowCreate(false)} onCreate={create} onConnect={connect} /> : null}
    {activation ? <CampaignActivation activation={activation} onClose={() => setActivation(null)} /> : null}
  </div>;
}
