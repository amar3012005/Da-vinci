import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const HARNESS_ORIGIN = new URL(
  process.env.VITE_HIVEMIND_HARNESS_ORIGIN || 'https://chat.singulancelabs.com',
).origin;
const MESSAGE_VERSION = 1;
const READY_EVENT = 'hivemind:harness-ready.v1';
const BOOTSTRAP_EVENT = 'hivemind:harness-bootstrap.v1';
const CONNECTED_EVENT = 'hivemind:harness-connected.v1';
const AUTH_ERROR_EVENT = 'hivemind:harness-auth-error.v1';
const DISCONNECTED_EVENT = 'hivemind:harness-disconnected.v1';

function validBootstrap(data) {
  const mode = data?.mode;
  if (!['legacy', 'preview', 'harness'].includes(mode)) throw new Error('Unsupported Harness chat mode.');
  if (mode === 'legacy') return { mode, receipt: data?.flag_receipt || null };
  let embedUrl;
  try {
    embedUrl = new URL(data?.embed_url);
  } catch {
    throw new Error('Harness chat returned an invalid embed URL.');
  }
  if (embedUrl.origin !== HARNESS_ORIGIN
    || embedUrl.username || embedUrl.password || embedUrl.search || embedUrl.hash) {
    throw new Error('Harness chat returned an untrusted embed URL.');
  }
  return {
    mode,
    embedUrl: embedUrl.toString(),
    ticket: typeof data?.ticket === 'string' && data.ticket ? data.ticket : null,
    expiresAt: data?.expires_at || null,
    receipt: data?.flag_receipt || null,
  };
}

/**
 * Keep Overview's current chat authoritative unless the server enables the
 * external Harness surface. The one-time ticket crosses only a source- and
 * origin-pinned postMessage exchange after the child declares readiness.
 */
export default function HarnessChatSurface({ legacy }) {
  const { t } = useTranslation('dashboard');
  const translationRef = useRef(t);
  translationRef.current = t;
  const iframeRef = useRef(null);
  const ticketRef = useRef(null);
  const requestIdRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const [mode, setMode] = useState('legacy');
  const [active, setActive] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [frameGeneration, setFrameGeneration] = useState(0);
  const [connection, setConnection] = useState('idle');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ticketRef.current = null;
      requestIdRef.current = null;
    };
  }, []);

  const bootstrap = useCallback(async ({ activate = false } = {}) => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setNotice(null);
    if (activate) setConnection('loading');
    try {
      const response = await apiClient.controlPlane.post('/v1/harness-chat/bootstrap', {});
      if (!mountedRef.current || generation !== loadGenerationRef.current) return;
      const next = validBootstrap(response?.data);
      setMode(next.mode);
      if (next.mode === 'legacy') {
        ticketRef.current = null;
        requestIdRef.current = null;
        setActive(false);
        setEmbedUrl(null);
        setConnection('idle');
        return;
      }
      const shouldActivate = activate || next.mode === 'harness';
      if (!shouldActivate) {
        ticketRef.current = null;
        requestIdRef.current = null;
        setConnection('idle');
        return;
      }
      if (!next.ticket) throw new Error('Harness chat did not issue a connection ticket.');
      ticketRef.current = next.ticket;
      requestIdRef.current = null;
      setEmbedUrl(next.embedUrl);
      setActive(true);
      setConnection('loading');
      setFrameGeneration((value) => value + 1);
    } catch (error) {
      if (!mountedRef.current || generation !== loadGenerationRef.current) return;
      ticketRef.current = null;
      requestIdRef.current = null;
      if (activate) setConnection('disconnected');
      setNotice(error?.response?.data?.error || error?.message
        || translationRef.current('overview.harness.unavailable', 'Harness chat is temporarily unavailable.'));
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!active || !embedUrl) return undefined;
    const expectedOrigin = new URL(embedUrl).origin;
    const onMessage = (event) => {
      if (event.origin !== expectedOrigin || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.version !== MESSAGE_VERSION || typeof data.request_id !== 'string' || !data.request_id) return;
      if (data.type === READY_EVENT) {
        const ticket = ticketRef.current;
        if (!ticket) return;
        requestIdRef.current = data.request_id;
        event.source.postMessage({
          type: BOOTSTRAP_EVENT,
          version: MESSAGE_VERSION,
          request_id: data.request_id,
          ticket,
        }, expectedOrigin);
        ticketRef.current = null;
        setConnection('connecting');
        return;
      }
      if (data.request_id !== requestIdRef.current) return;
      if (data.type === CONNECTED_EVENT) {
        setNotice(null);
        setConnection('connected');
      } else if (data.type === AUTH_ERROR_EVENT || data.type === DISCONNECTED_EVENT) {
        requestIdRef.current = null;
        setConnection('disconnected');
        setNotice(data.type === AUTH_ERROR_EVENT
          ? t('overview.harness.authError', 'The secure Harness connection expired. Reconnect to continue.')
          : t('overview.harness.disconnected', 'Harness chat disconnected. Your HIVE-MIND session is still safe.'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [active, embedUrl, t]);

  const useLegacy = () => {
    ticketRef.current = null;
    requestIdRef.current = null;
    setActive(false);
    setEmbedUrl(null);
    setConnection('idle');
    setNotice(null);
  };

  if (!active || !embedUrl) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        {mode === 'preview' && !notice && (
          <div className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-3 rounded-[10px] border border-blue-200 bg-blue-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles size={14} className="flex-shrink-0 text-[#117dff]" />
              <p className="truncate text-[11px] text-blue-700">
                {t('overview.harness.previewAvailable', 'DeepSeek Harness preview is available for this workspace.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => bootstrap({ activate: true })}
              className="flex-shrink-0 rounded-[6px] bg-[#117dff] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0]"
            >
              {t('overview.harness.tryPreview', 'Try preview')}
            </button>
          </div>
        )}
        {notice && (
          <div className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="flex items-center gap-2 text-[11px] text-amber-700"><AlertTriangle size={13} />{notice}</p>
            <button type="button" onClick={() => bootstrap({ activate: mode === 'preview' })} className="text-[11px] font-medium text-amber-700 hover:text-[#0a0a0a]">
              {t('overview.harness.retry', 'Retry')}
            </button>
          </div>
        )}
        {legacy}
      </div>
    );
  }

  const waiting = connection === 'loading' || connection === 'connecting';
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#e3e0db] bg-[#faf9f4] px-3 py-2">
        <div className="flex items-center gap-2">
          {waiting ? <Loader2 size={13} className="animate-spin text-[#117dff]" /> : <Sparkles size={13} className="text-[#117dff]" />}
          <span className="text-[11px] font-semibold text-[#0a0a0a]">DeepSeek Harness</span>
          <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] ${connection === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : connection === 'disconnected' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {connection === 'connected'
              ? t('overview.harness.connected', 'Connected')
              : connection === 'disconnected'
                ? t('overview.harness.needsReconnect', 'Reconnect needed')
                : t('overview.harness.connecting', 'Connecting')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(connection === 'disconnected' || notice) && (
            <button type="button" onClick={() => bootstrap({ activate: true })} className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0]">
              <RefreshCw size={11} /> {t('overview.harness.reconnect', 'Reconnect')}
            </button>
          )}
          {mode === 'preview' && (
            <button type="button" onClick={useLegacy} className="text-[11px] text-[#737373] hover:text-[#0a0a0a]">
              {t('overview.harness.classicChat', 'Classic chat')}
            </button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <iframe
          key={frameGeneration}
          ref={iframeRef}
          title={t('overview.harness.title', 'DeepSeek Harness chat')}
          src={embedUrl}
          sandbox="allow-downloads allow-forms allow-popups allow-same-origin allow-scripts"
          allow="clipboard-read; clipboard-write"
          onLoad={() => setConnection('connecting')}
          onError={() => {
            ticketRef.current = null;
            requestIdRef.current = null;
            setConnection('disconnected');
            setNotice(t('overview.harness.loadError', 'Harness chat could not load. Reconnect to try again.'));
          }}
          className="h-full min-h-[480px] w-full border-0 bg-white"
        />
        {waiting && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/90">
            <div className="text-center">
              <Loader2 size={20} className="mx-auto animate-spin text-[#117dff]" />
              <p className="mt-2 text-[11px] text-[#737373]">{t('overview.harness.loading', 'Opening your governed Harness workspace…')}</p>
            </div>
          </div>
        )}
        {connection === 'disconnected' && (
          <div className="absolute inset-0 grid place-items-center bg-white/95 p-6">
            <div className="max-w-sm text-center">
              <AlertTriangle size={20} className="mx-auto text-amber-600" />
              <p className="mt-2 text-[12px] font-medium text-[#0a0a0a]">{notice}</p>
              <button type="button" onClick={() => bootstrap({ activate: true })} className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#0066e0]">
                <RefreshCw size={12} /> {t('overview.harness.reconnect', 'Reconnect')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export {
  AUTH_ERROR_EVENT,
  BOOTSTRAP_EVENT,
  CONNECTED_EVENT,
  DISCONNECTED_EVENT,
  HARNESS_ORIGIN,
  MESSAGE_VERSION,
  READY_EVENT,
  validBootstrap,
};
