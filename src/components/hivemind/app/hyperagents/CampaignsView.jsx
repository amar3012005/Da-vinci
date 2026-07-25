import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Nango from '@nangohq/frontend';
import {
  AlertTriangle, BadgeDollarSign, BarChart3, CheckCircle2, Loader2,
  Megaphone, MousePointerClick, Plus, RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const EMPTY_SUMMARY = { campaigns: 0, active: 0, spend: 0, results: 0 };

export default function CampaignsView() {
  const { t } = useTranslation('dashboard');
  const [connector, setConnector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const campaigns = [];
  const summary = EMPTY_SUMMARY;

  const connected = Boolean(connector?.connection);
  const apiReady = connector?.catalogStatus === 'stable';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getConnectorsCatalogStatus();
      setConnector((data?.connectors || []).find((item) => item.id === 'x-ads') || null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not load X Ads status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError('');
    const baseURL = process.env.REACT_APP_NANGO_CONNECT_URL || 'https://api.hivemind.davinciai.eu:8043';
    const apiURL = process.env.REACT_APP_NANGO_HOST || 'https://api.hivemind.davinciai.eu:8042';
    const nango = new Nango();
    try {
      await new Promise((resolve, reject) => {
        const ui = nango.openConnectUI({
          baseURL,
          apiURL,
          onEvent: async (event) => {
            try {
              if (event?.type === 'connect') {
                const payload = event.payload || {};
                const providerKey = payload.providerConfigKey || payload.provider_config_key || 'twitter';
                const connectionId = payload.connectionId || payload.connection_id;
                if (!connectionId) throw new Error('X did not return a connection id');
                await apiClient.finalizeNangoConnection(providerKey, connectionId);
                resolve();
              } else if (event?.type === 'close') resolve();
              else if (event?.type === 'error') reject(new Error(event?.payload?.error || 'X connection failed'));
            } catch (err) { reject(err); }
          },
        });
        apiClient.getNangoConnectSession('x-ads')
          .then(({ connect_session_token: token }) => {
            if (ui && typeof ui.setSessionToken === 'function') ui.setSessionToken(token);
            else reject(new Error('X connection window unavailable'));
          })
          .catch((err) => {
            try { ui?.close?.(); } catch { /* noop */ }
            reject(err);
          });
      });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not connect X Ads');
    } finally {
      setConnecting(false);
    }
  }, [load]);

  const stats = useMemo(() => [
    { icon: Megaphone, label: t('campaigns.total', 'Campaigns'), value: summary.campaigns },
    { icon: CheckCircle2, label: t('campaigns.active', 'Active'), value: summary.active },
    { icon: BadgeDollarSign, label: t('campaigns.spend', 'Spend'), value: `€${summary.spend.toFixed(2)}` },
    { icon: MousePointerClick, label: t('campaigns.results', 'Results'), value: summary.results },
  ], [summary, t]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
      <header className="px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2">
            <BarChart3 size={20} className="text-[#0a0a0a]" /> {t('campaigns.title', 'Your Campaigns')}
          </h1>
          <p className="text-[11.5px] text-[#525252] mt-1">
            {t('campaigns.subtitle', 'X Ads campaigns, budgets, delivery and results.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="w-8 h-8 grid place-items-center text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg bg-white hover:bg-[#faf9f4] disabled:opacity-50"
            title={t('campaigns.refresh', 'Refresh campaigns')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button disabled={!connected || !apiReady}
            className="h-8 flex items-center gap-1.5 bg-[#0a0a0a] text-white text-[11.5px] font-semibold px-3 rounded-lg disabled:bg-[#d4d0ca] disabled:text-[#737373] disabled:cursor-not-allowed"
            title={!connected ? 'Connect X Ads first' : (!apiReady ? 'X Ads API activation required' : 'Create campaign')}>
            <Plus size={13} /> {t('campaigns.new', 'New campaign')}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="border border-[#e3e0db] rounded-lg px-3.5 py-3 bg-white flex items-center gap-3">
              <Icon size={15} className={value && value !== '€0.00' ? 'text-[#0a0a0a]' : 'text-[#c9c5be]'} />
              <div>
                <div className="text-[18px] leading-none font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{value}</div>
                <div className="text-[10.5px] font-mono uppercase text-[#a3a3a3] mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="mx-6 mt-4 border-y border-[#e3e0db] py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#0a0a0a] text-white grid place-items-center text-[17px] font-semibold shrink-0">X</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#0a0a0a]">
              {connected ? t('campaigns.connected', 'X Ads connected') : t('campaigns.connectTitle', 'Connect your X Ads account')}
            </div>
            <p className="text-[11.5px] text-[#525252] mt-0.5">
              {connected
                ? (apiReady ? t('campaigns.ready', 'Ready to create and monitor paid campaigns.') : t('campaigns.pendingAccess', 'Account connected. Campaign publishing is waiting for X Ads API activation.'))
                : t('campaigns.connectBody', 'Authorize the advertiser account that owns the billing profile and campaigns.')}
            </p>
          </div>
          {!connected && (
            <button onClick={connect} disabled={connecting || loading}
              className="h-8 flex items-center gap-1.5 border border-[#0a0a0a] text-[#0a0a0a] bg-white hover:bg-[#faf9f4] text-[11.5px] font-semibold px-3 rounded-lg disabled:opacity-50">
              {connecting ? <Loader2 size={13} className="animate-spin" /> : null}
              {connecting ? t('campaigns.connecting', 'Connecting') : t('campaigns.connect', 'Connect X Ads')}
            </button>
          )}
        </section>

        {error ? (
          <div className="mx-6 mt-4 flex items-center gap-2 text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} /> {error}
          </div>
        ) : null}

        <section className="mx-6 my-4 border border-[#e3e0db] rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.7fr_0.7fr_0.9fr_0.9fr_0.9fr] gap-3 px-4 py-2.5 bg-[#faf9f4] border-b border-[#e3e0db] text-[10px] font-mono uppercase text-[#a3a3a3]">
            <span>{t('campaigns.campaign', 'Campaign')}</span>
            <span>{t('campaigns.status', 'Status')}</span>
            <span>{t('campaigns.budget', 'Budget')}</span>
            <span>{t('campaigns.spend', 'Spend')}</span>
            <span>{t('campaigns.results', 'Results')}</span>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-14 text-center">
              <Megaphone size={22} className="text-[#c9c5be] mx-auto" />
              <p className="text-[12.5px] font-semibold text-[#525252] mt-2">{t('campaigns.empty', 'No X campaigns yet')}</p>
              <p className="text-[11px] text-[#a3a3a3] mt-1">
                {!connected ? t('campaigns.emptyConnect', 'Connect X Ads to begin.') : t('campaigns.emptyReady', 'Your paid campaigns will appear here.')}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
