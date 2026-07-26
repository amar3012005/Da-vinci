import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeDollarSign, BarChart3, Check, CheckCircle2, ChevronRight,
  ExternalLink, ImagePlus, Loader2, Megaphone, MousePointerClick,
  Pause, Play, Plus, RefreshCw, Search, ShieldCheck, X,
  Send, Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const EMPTY_FORM = {
  name: '', destination_url: '', post_text: '', ad_account_id: '', funding_instrument_id: '',
  location_targets: [], language_targets: [], daily_budget: '', end_date: '', image: null,
};

function errorText(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

function money(micros, currency = 'USD') {
  const amount = Number(micros || 0) / 1_000_000;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}

function StatusMark({ done, label, detail, action, disabled, busy, actionLabel }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#e3e0db] last:border-b-0">
      <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f5f3ee] text-[#737373]'}`}>
        {done ? <Check size={15} /> : <ChevronRight size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[#0a0a0a]">{label}</div>
        <div className="text-[11px] text-[#737373] mt-0.5 truncate">{detail}</div>
      </div>
      {!done && action ? (
        <button type="button" onClick={action} disabled={disabled || busy}
          className="h-8 px-3 border border-[#0a0a0a] rounded-lg text-[11.5px] font-semibold disabled:opacity-40 flex items-center gap-1.5">
          {busy ? <Loader2 size={12} className="animate-spin" /> : null}{actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function TargetPicker({ type, label, selected, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    setLoading(true);
    try {
      const data = await apiClient.searchXAdsTargets(type, { q: query });
      setResults((data.targets || []).slice(0, 12));
    } catch { setResults([]); }
    finally { setLoading(false); }
  };
  const add = (item) => {
    if (!selected.some((target) => target.targeting_value === item.targeting_value)) {
      onChange([...selected, { name: item.name, targeting_value: item.targeting_value }]);
    }
    setQuery(''); setResults([]);
  };
  return (
    <div>
      <label className="block text-[10.5px] font-mono uppercase text-[#737373] mb-1.5">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#a3a3a3]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} disabled={disabled}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }}
            placeholder={type === 'locations' ? 'Search a city' : 'Search a language'}
            className="w-full h-9 pl-8 pr-3 border border-[#d4d0ca] rounded-lg text-[12px] outline-none focus:border-[#0a0a0a] disabled:bg-[#f5f3ee]" />
        </div>
        <button type="button" onClick={search} disabled={disabled || loading || (type === 'locations' && query.trim().length < 2)}
          className="w-9 h-9 grid place-items-center border border-[#d4d0ca] rounded-lg disabled:opacity-40" title={`Search ${label}`}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
        </button>
      </div>
      {results.length ? (
        <div className="mt-1 border border-[#d4d0ca] rounded-lg max-h-36 overflow-y-auto bg-white">
          {results.map((item) => (
            <button type="button" key={item.targeting_value} onClick={() => add(item)}
              className="w-full px-3 py-2 text-left text-[11.5px] hover:bg-[#faf9f4] border-b border-[#eeeae4] last:border-0">
              {item.name}{item.country_code ? ` · ${item.country_code}` : ''}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5 mt-2 min-h-[24px]">
        {selected.map((item) => (
          <span key={item.targeting_value} className="inline-flex items-center gap-1 bg-[#f0eee8] rounded px-2 py-1 text-[10.5px] text-[#333]">
            {item.name}
            <button type="button" onClick={() => onChange(selected.filter((target) => target.targeting_value !== item.targeting_value))} title={`Remove ${item.name}`}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function CampaignModal({ accounts, retryCampaign, onClose, onPublished }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [funding, setFunding] = useState([]);
  const [prepared, setPrepared] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedAccount = accounts.find((item) => item.id === form.ad_account_id);
  const selectedFunding = funding.find((item) => item.id === form.funding_instrument_id);

  useEffect(() => {
    if (!retryCampaign?.id) return;
    let live = true;
    setSaving(true);
    apiClient.prepareXAdsCampaign(retryCampaign.id)
      .then((value) => { if (live) setPrepared(value); })
      .catch((err) => { if (live) setError(errorText(err, 'Could not resume campaign setup')); })
      .finally(() => { if (live) setSaving(false); });
    return () => { live = false; };
  }, [retryCampaign]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectAccount = async (accountId) => {
    patch('ad_account_id', accountId); patch('funding_instrument_id', ''); setFunding([]);
    if (!accountId) return;
    try {
      const data = await apiClient.getXAdsFundingInstruments(accountId);
      setFunding((data.funding_instruments || []).filter((item) => item.eligible));
    } catch (err) { setError(errorText(err, 'Could not load billing profiles')); }
  };
  const prepare = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { image, ...payload } = form;
      let id = draftId;
      if (id) await apiClient.updateXAdsCampaign(id, payload);
      else {
        const created = await apiClient.createXAdsCampaign(payload);
        id = created.campaign.id; setDraftId(id);
      }
      if (image) await apiClient.uploadXAdsCampaignImage(id, image);
      setPrepared(await apiClient.prepareXAdsCampaign(id));
    } catch (err) { setError(errorText(err, 'Could not prepare campaign')); }
    finally { setSaving(false); }
  };
  const publish = async () => {
    setSaving(true); setError('');
    try {
      await apiClient.publishXAdsCampaign(prepared.campaign.id, prepared.confirmation_token);
      await onPublished(); onClose();
    } catch (err) { setError(errorText(err, 'Could not publish campaign')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white border border-[#d4d0ca] rounded-lg w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl">
        <div className="h-14 px-5 border-b border-[#e3e0db] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-[#0a0a0a]">{prepared ? 'Confirm campaign' : 'New website traffic campaign'}</div>
            <div className="text-[10.5px] text-[#737373] mt-0.5">{prepared ? 'Review the exact paid action before it is sent to X.' : 'One ad group, one public promoted post.'}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[#f5f3ee]" title="Close"><X size={15} /></button>
        </div>
        {!prepared && retryCampaign ? (
          <div className="py-16 px-5 text-center">
            {saving ? <Loader2 size={22} className="animate-spin text-[#737373] mx-auto" /> : <AlertTriangle size={22} className="text-red-600 mx-auto" />}
            <p className="text-[12px] text-[#525252] mt-3">{saving ? 'Revalidating the paused X setup…' : error}</p>
          </div>
        ) : !prepared ? (
          <form onSubmit={prepare} className="p-5 overflow-y-auto space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-[10.5px] font-mono uppercase text-[#737373]">Advertiser account
                <select required value={form.ad_account_id} onChange={(event) => selectAccount(event.target.value)} className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-2.5 bg-white text-[12px] normal-case font-sans">
                  <option value="">Select account</option>{accounts.filter((item) => item.approval_status === 'ACCEPTED' && item.writable && item.identity_matches && item.promotable_user_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-[10.5px] font-mono uppercase text-[#737373]">Funding instrument
                <select required value={form.funding_instrument_id} onChange={(event) => patch('funding_instrument_id', event.target.value)} disabled={!form.ad_account_id}
                  className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-2.5 bg-white text-[12px] normal-case font-sans disabled:bg-[#f5f3ee]">
                  <option value="">Select billing profile</option>{funding.filter((item) => item.eligible).map((item) => <option key={item.id} value={item.id}>{item.description} · {item.currency}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-[10.5px] font-mono uppercase text-[#737373]">Campaign name
              <input required maxLength={255} value={form.name} onChange={(event) => patch('name', event.target.value)} className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-3 text-[12px] normal-case font-sans" />
            </label>
            <label className="block text-[10.5px] font-mono uppercase text-[#737373]">Website destination
              <input required type="url" value={form.destination_url} onChange={(event) => patch('destination_url', event.target.value)} placeholder="https://example.com/offer" className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-3 text-[12px] normal-case font-sans" />
            </label>
            <label className="block text-[10.5px] font-mono uppercase text-[#737373]">Post text
              <textarea required maxLength={280} rows={4} value={form.post_text} onChange={(event) => patch('post_text', event.target.value)} placeholder="Include the website destination once in the post."
                className="mt-1.5 w-full border border-[#d4d0ca] rounded-lg px-3 py-2 text-[12px] leading-relaxed normal-case font-sans resize-none" />
              <span className="block text-right text-[10px] text-[#a3a3a3] normal-case font-sans mt-1">{form.post_text.length}/280</span>
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <TargetPicker type="locations" label="Locations" selected={form.location_targets} onChange={(value) => patch('location_targets', value)} disabled={!form.ad_account_id} />
              <TargetPicker type="languages" label="Languages" selected={form.language_targets} onChange={(value) => patch('language_targets', value)} disabled={!form.ad_account_id} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <label className="text-[10.5px] font-mono uppercase text-[#737373]">Daily budget {selectedFunding?.currency ? `(${selectedFunding.currency})` : ''}
                <input required inputMode="decimal" value={form.daily_budget} onChange={(event) => patch('daily_budget', event.target.value)} className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-3 text-[12px] normal-case font-sans" />
              </label>
              <label className="text-[10.5px] font-mono uppercase text-[#737373]">End date
                <input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.end_date} onChange={(event) => patch('end_date', event.target.value)} className="mt-1.5 w-full h-9 border border-[#d4d0ca] rounded-lg px-3 text-[12px] normal-case font-sans" />
              </label>
              <label className="h-9 border border-dashed border-[#bdb8af] rounded-lg flex items-center justify-center gap-2 text-[11.5px] font-semibold cursor-pointer hover:bg-[#faf9f4]">
                <ImagePlus size={14} /> {form.image ? form.image.name : 'Optional image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => patch('image', event.target.files?.[0] || null)} />
              </label>
            </div>
            {error ? <div className="flex gap-2 text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{error}</div> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="h-9 px-4 text-[11.5px] font-semibold border border-[#d4d0ca] rounded-lg">Cancel</button>
              <button type="submit" disabled={saving || !selectedAccount || !selectedFunding || !form.location_targets.length || !form.language_targets.length}
                className="h-9 px-4 text-[11.5px] font-semibold bg-[#0a0a0a] text-white rounded-lg disabled:bg-[#c9c5be] flex items-center gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Review campaign
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 overflow-y-auto">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[12px]">
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">X identity</div><div className="mt-1 font-semibold">@{prepared.campaign.x_identity?.username}</div></div>
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Advertiser</div><div className="mt-1 font-semibold">{prepared.campaign.account?.name}</div></div>
              <div className="sm:col-span-2"><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Public post</div><div className="mt-1 border-l-2 border-[#0a0a0a] pl-3 whitespace-pre-wrap">{prepared.campaign.post_text}</div></div>
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Targeting</div><div className="mt-1">{[...prepared.campaign.location_targets, ...prepared.campaign.language_targets].map((item) => item.name).join(', ')}</div></div>
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Schedule</div><div className="mt-1">Starts immediately · ends {prepared.campaign.end_date}</div></div>
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Daily limit</div><div className="mt-1 text-[17px] font-semibold">{money(prepared.campaign.daily_budget_micros, prepared.campaign.account?.currency)}</div></div>
              <div><div className="text-[10px] font-mono uppercase text-[#a3a3a3]">Maximum spend</div><div className="mt-1 text-[17px] font-semibold">{money(prepared.campaign.total_budget_micros, prepared.campaign.account?.currency)}</div></div>
            </div>
            <div className="mt-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-900">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" /> Publishing creates a public X post and activates paid delivery up to the maximum shown above.
            </div>
            {error ? <div className="mt-3 flex gap-2 text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertTriangle size={13} />{error}</div> : null}
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={onClose} disabled={saving} className="h-9 px-4 text-[11.5px] font-semibold border border-[#d4d0ca] rounded-lg">Cancel</button>
              <button type="button" onClick={publish} disabled={saving} className="h-9 px-4 text-[11.5px] font-semibold bg-[#0a0a0a] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />} Confirm and publish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignsView() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [retryCampaign, setRetryCampaign] = useState(null);
  const [postText, setPostText] = useState('');
  const [postBusy, setPostBusy] = useState('');
  const [testPost, setTestPost] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const nextStatus = await apiClient.getXAdsStatus(); setStatus(nextStatus);
      if (nextStatus.beta_enabled && nextStatus.connections.x && nextStatus.connections.x_ads) {
        const [accountData, campaignData] = await Promise.all([apiClient.getXAdsAccounts(), apiClient.getXAdsCampaigns()]);
        setAccounts(accountData.accounts || []); setCampaigns(campaignData.campaigns || []);
      } else { setAccounts([]); setCampaigns([]); }
    } catch (err) { setError(errorText(err, 'Could not load X campaigns')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('x_error');
    if (oauthError) setError(`X connection failed: ${oauthError.replaceAll('_', ' ')}`);
    if (params.has('x_connection') || oauthError) {
      params.delete('x_connection'); params.delete('x_error');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
  }, []);

  const connect = useCallback(async (kind) => {
    setConnecting(kind); setError('');
    try {
      const result = await apiClient.startXAdsOAuth(kind);
      if (!result?.authorization_url) throw new Error('X did not return an authorization URL');
      window.location.assign(result.authorization_url);
    } catch (err) { setError(errorText(err, 'Could not connect X')); }
    finally { setConnecting(''); }
  }, []);

  const control = async (campaign, action) => {
    setBusy(`${campaign.id}:${action}`); setError('');
    try { await apiClient.controlXAdsCampaign(campaign.id, action); await load(); }
    catch (err) { setError(errorText(err, `Could not ${action} campaign`)); }
    finally { setBusy(''); }
  };

  const publishTestPost = async () => {
    const text = postText.trim();
    if (!text || !window.confirm(`Publish this public Post as @${status?.identity?.username || 'your connected account'}?\n\n${text}`)) return;
    setPostBusy('publish'); setError('');
    try {
      const result = await apiClient.createXPost(text);
      setTestPost(result.post); setPostText('');
    } catch (err) { setError(errorText(err, 'Could not publish the X Post')); }
    finally { setPostBusy(''); }
  };

  const deleteTestPost = async () => {
    if (!testPost?.id || !window.confirm('Delete this public Post from X?')) return;
    setPostBusy('delete'); setError('');
    try { await apiClient.deleteXPost(testPost.id); setTestPost(null); }
    catch (err) { setError(errorText(err, 'Could not delete the X Post')); }
    finally { setPostBusy(''); }
  };

  const summary = useMemo(() => campaigns.reduce((value, campaign) => ({
    campaigns: value.campaigns + 1,
    active: value.active + (campaign.status === 'ACTIVE' ? 1 : 0),
    spend: value.spend + Number(campaign.metrics?.spend_micros || 0),
    results: value.results + Number(campaign.metrics?.url_clicks || 0),
  }), { campaigns: 0, active: 0, spend: 0, results: 0 }), [campaigns]);
  const currency = campaigns[0]?.account?.currency || 'EUR';
  const ready = status?.beta_enabled && status?.connections?.x && status?.connections?.x_ads && status?.ads_api_approved;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
      <header className="px-4 sm:px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-center justify-between bg-white shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2"><BarChart3 size={20} /> {t('campaigns.title', 'Your Campaigns')}</h1>
          <p className="text-[11.5px] text-[#525252] mt-1 truncate">{t('campaigns.subtitle', 'X Ads campaigns, budgets, delivery and results.')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load} disabled={loading} className="w-8 h-8 grid place-items-center border border-[#e3e0db] rounded-lg disabled:opacity-50" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowCreate(true)} disabled={!ready || !accounts.some((item) => item.approval_status === 'ACCEPTED' && item.writable && item.identity_matches && item.promotable_user_id)}
            className="h-8 flex items-center gap-1.5 bg-[#0a0a0a] text-white text-[11.5px] font-semibold px-3 rounded-lg disabled:bg-[#d4d0ca] disabled:text-[#737373]">
            <Plus size={13} /> <span className="hidden sm:inline">{t('campaigns.new', 'New campaign')}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 sm:px-6 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            [Megaphone, 'Campaigns', summary.campaigns], [CheckCircle2, 'Active', summary.active],
            [BadgeDollarSign, 'Spend', money(summary.spend, currency)], [MousePointerClick, 'Link clicks', summary.results],
          ].map(([Icon, label, value]) => (
            <div key={label} className="border border-[#e3e0db] rounded-lg px-3.5 py-3 bg-white flex items-center gap-3 min-w-0">
              <Icon size={15} className="text-[#737373] shrink-0" /><div className="min-w-0"><div className="text-[17px] leading-none font-semibold text-[#0a0a0a] truncate">{value}</div><div className="text-[10px] font-mono uppercase text-[#a3a3a3] mt-1">{label}</div></div>
            </div>
          ))}
        </div>

        <section className="mx-4 sm:mx-6 mt-4 border-y border-[#e3e0db]">
          <StatusMark done={Boolean(status?.connections?.x)} label="Connect X" detail={status?.identity?.username ? `Connected as @${status.identity.username}` : 'OAuth 2.0 PKCE for identity, media and public Posts.'}
            action={() => connect('oauth2')} disabled={!status?.beta_enabled} busy={connecting === 'oauth2'} actionLabel="Connect X" />
          <StatusMark done={Boolean(status?.connections?.x_ads)} label="Enable X Ads" detail={status?.ads_api_approved ? 'OAuth 1.0a access for advertiser accounts and paid delivery.' : 'Waiting for Singulance Ads API Standard Access approval.'}
            action={() => connect('oauth1')} disabled={!status?.beta_enabled || !status?.connections?.x || !status?.ads_api_approved} busy={connecting === 'oauth1'} actionLabel="Enable Ads" />
          <StatusMark done={ready} label="Campaign publishing" detail={ready ? 'Ready for confirmed paid campaigns.' : (status?.beta_enabled ? 'Complete both connections to publish.' : 'Customer beta access is not enabled for this organization.')} />
        </section>

        {status?.connections?.x ? (
          <section className="mx-4 sm:mx-6 mt-4 py-4 border-y border-[#e3e0db] grid lg:grid-cols-[220px_1fr_auto] gap-3 lg:items-end">
            <div>
              <div className="text-[12.5px] font-semibold text-[#0a0a0a]">Test X API</div>
              <div className="text-[10.5px] text-[#737373] mt-1">Publish an ordinary public Post as @{status.identity?.username}.</div>
            </div>
            <label className="text-[10.5px] font-mono uppercase text-[#737373]">Post text
              <textarea rows={2} maxLength={280} value={postText} onChange={(event) => setPostText(event.target.value)} disabled={Boolean(postBusy)}
                placeholder="Write a public test Post"
                className="mt-1.5 w-full border border-[#d4d0ca] rounded-lg px-3 py-2 text-[12px] leading-relaxed normal-case font-sans resize-none disabled:bg-[#f5f3ee]" />
              <span className="block text-right text-[10px] text-[#a3a3a3] normal-case font-sans mt-1">{Array.from(postText).length}/280</span>
            </label>
            <button type="button" onClick={publishTestPost} disabled={Boolean(postBusy) || !postText.trim()}
              className="h-9 px-3 bg-[#0a0a0a] text-white rounded-lg text-[11.5px] font-semibold flex items-center justify-center gap-1.5 disabled:bg-[#c9c5be]">
              {postBusy === 'publish' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Review and post
            </button>
            {testPost ? (
              <div className="lg:col-start-2 lg:col-span-2 flex items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
                <a href={testPost.url} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold text-emerald-800 inline-flex items-center gap-1.5">View public Post <ExternalLink size={11} /></a>
                <button type="button" onClick={deleteTestPost} disabled={Boolean(postBusy)} title="Delete test Post"
                  className="w-8 h-8 grid place-items-center text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50">
                  {postBusy === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertTriangle size={13} /> {error}</div> : null}

        <section className="mx-4 sm:mx-6 my-4 border border-[#e3e0db] rounded-lg overflow-x-auto">
          <div className="min-w-[1040px] grid grid-cols-[1.7fr_0.7fr_0.8fr_0.8fr_0.65fr_0.65fr_0.55fr_0.8fr_0.6fr] gap-3 px-4 py-2.5 bg-[#faf9f4] border-b border-[#e3e0db] text-[10px] font-mono uppercase text-[#a3a3a3]">
            <span>Campaign</span><span>Status</span><span>Budget</span><span>Spend</span><span>Impressions</span><span>Link clicks</span><span>CTR</span><span>Cost / click</span><span className="text-right">Control</span>
          </div>
          {loading ? <div className="py-14 grid place-items-center"><Loader2 size={20} className="animate-spin text-[#737373]" /></div> : campaigns.length === 0 ? (
            <div className="py-14 text-center"><Megaphone size={22} className="text-[#c9c5be] mx-auto" /><p className="text-[12.5px] font-semibold text-[#525252] mt-2">No X campaigns yet</p><p className="text-[11px] text-[#a3a3a3] mt-1">Complete the connection steps to create the first campaign.</p></div>
          ) : campaigns.map((campaign) => (
            <div key={campaign.id} className="min-w-[1040px] grid grid-cols-[1.7fr_0.7fr_0.8fr_0.8fr_0.65fr_0.65fr_0.55fr_0.8fr_0.6fr] gap-3 px-4 py-3 border-b border-[#eeeae4] last:border-0 items-center text-[11.5px]">
              <div className="min-w-0">
                <div className="font-semibold truncate">{campaign.name}</div>
                <a href={campaign.destination_url} target="_blank" rel="noreferrer" className="text-[10.5px] text-[#737373] flex items-center gap-1 truncate">{campaign.destination_url}<ExternalLink size={9} /></a>
                {campaign.x_ids?.post && ['SETUP_FAILED', 'REJECTED'].includes(campaign.status) ? <a href={`https://x.com/i/web/status/${campaign.x_ids.post}`} target="_blank" rel="noreferrer" className="text-[10px] text-[#525252] inline-flex items-center gap-1 mt-1">Public Post <ExternalLink size={8} /></a> : null}
                {campaign.last_error ? <div className="text-[9.5px] text-red-700 truncate mt-0.5" title={campaign.last_error}>{campaign.last_error}</div> : null}
              </div>
              <span className="font-mono text-[10px]">{campaign.status.replaceAll('_', ' ')}</span>
              <span>{money(campaign.daily_budget_micros, campaign.account?.currency)}/day</span>
              <span>{money(campaign.metrics?.spend_micros, campaign.account?.currency)}</span>
              <span>{Number(campaign.metrics?.impressions || 0).toLocaleString()}</span>
              <span>{campaign.metrics?.url_clicks || 0}</span>
              <span>{`${(Number(campaign.metrics?.click_through_rate || 0) * 100).toFixed(2)}%`}</span>
              <span>{campaign.metrics?.cost_per_link_click_micros ? money(campaign.metrics.cost_per_link_click_micros, campaign.account?.currency) : '-'}</span>
              <div className="flex justify-end gap-1">
                {campaign.status === 'ACTIVE' || campaign.status === 'PENDING_REVIEW' ? <button onClick={() => control(campaign, 'pause')} disabled={Boolean(busy)} className="w-8 h-8 grid place-items-center border border-[#d4d0ca] rounded-lg" title="Pause"><Pause size={12} /></button> : null}
                {campaign.status === 'PAUSED' ? <button onClick={() => control(campaign, 'resume')} disabled={Boolean(busy)} className="w-8 h-8 grid place-items-center border border-[#d4d0ca] rounded-lg" title="Resume"><Play size={12} /></button> : null}
                {campaign.status === 'SETUP_FAILED' ? <button onClick={() => setRetryCampaign(campaign)} disabled={Boolean(busy)} className="w-8 h-8 grid place-items-center border border-[#d4d0ca] rounded-lg" title="Retry setup"><Play size={12} /></button> : null}
                <button onClick={() => control(campaign, 'sync')} disabled={Boolean(busy)} className="w-8 h-8 grid place-items-center border border-[#d4d0ca] rounded-lg" title="Refresh performance"><RefreshCw size={12} className={busy === `${campaign.id}:sync` ? 'animate-spin' : ''} /></button>
              </div>
            </div>
          ))}
        </section>
      </div>
      {showCreate ? <CampaignModal accounts={accounts} onClose={() => { setShowCreate(false); load(); }} onPublished={load} /> : null}
      {retryCampaign ? <CampaignModal accounts={accounts} retryCampaign={retryCampaign} onClose={() => { setRetryCampaign(null); load(); }} onPublished={load} /> : null}
    </div>
  );
}
