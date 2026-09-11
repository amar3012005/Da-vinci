import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';
const HARNESS_EXCHANGE_PATH = '/api/hivemind/embed/exchange';

function validBootstrap(data) {
  const mode = data?.mode;
  if (!['legacy', 'preview', 'harness'].includes(mode)) throw new Error('Unsupported Harness chat mode.');
  if (mode === 'legacy') return { mode, receipt: data?.flag_receipt || null };
  if (typeof data?.ticket !== 'string' || !data.ticket) {
    throw new Error('Harness chat did not issue a connection ticket.');
  }
  return { mode, ticket: data.ticket, receipt: data?.flag_receipt || null };
}

function canonicalHarnessDestination(url) {
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin) return HARNESS_OVERVIEW_PATH;
  if (target.pathname === HARNESS_OVERVIEW_PATH || target.pathname === `${HARNESS_OVERVIEW_PATH}/new`) {
    return `${target.pathname}${target.search}${target.hash}`;
  }
  if (/^\/hivemind\/app\/overview\/session\/[^/]+$/u.test(target.pathname)) {
    return `${target.pathname}${target.search}${target.hash}`;
  }
  return HARNESS_OVERVIEW_PATH;
}

async function navigateHarnessTicket(ticket) {
  const destination = canonicalHarnessDestination(window.location.href);
  const requestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const response = await fetch(HARNESS_EXCHANGE_PATH, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket, request_id: requestId }),
  });
  if (!response.ok) throw new Error('Could not establish the secure Harness session.');
  window.location.replace(destination);
}

/** Admission stays in Da-vinci; the admitted result is the complete native
 * Harness application on the same Overview URL. No iframe or duplicate chat
 * implementation is involved. */
export default function HarnessChatSurface({ legacy }) {
  const { t } = useTranslation('dashboard');
  const mountedRef = useRef(true);
  const [mode, setMode] = useState('legacy');
  const [notice, setNotice] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const openHarness = useCallback(async (ticket) => {
    setConnecting(true);
    setNotice(null);
    try {
      await navigateHarnessTicket(ticket);
    } catch (error) {
      if (!mountedRef.current) return;
      setConnecting(false);
      setNotice(error?.message || t('overview.harness.unavailable', 'Harness chat is temporarily unavailable.'));
    }
  }, [t]);

  const bootstrap = useCallback(async ({ activatePreview = false } = {}) => {
    setNotice(null);
    try {
      const response = await apiClient.controlPlane.post('/v1/harness-chat/bootstrap', {});
      if (!mountedRef.current) return;
      const next = validBootstrap(response?.data);
      setMode(next.mode);
      if (next.mode === 'harness' || (next.mode === 'preview' && activatePreview)) {
        await openHarness(next.ticket);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setConnecting(false);
      setNotice(error?.response?.data?.error || error?.message
        || t('overview.harness.unavailable', 'Harness chat is temporarily unavailable.'));
    }
  }, [openHarness, t]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {mode === 'preview' && !notice && !connecting && (
        <div className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-3 rounded-[10px] border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles size={14} className="flex-shrink-0 text-[#117dff]" />
            <p className="truncate text-[11px] text-blue-700">
              {t('overview.harness.previewAvailable', 'DeepSeek Harness preview is available for this workspace.')}
            </p>
          </div>
          <button type="button" onClick={() => bootstrap({ activatePreview: true })} className="flex-shrink-0 rounded-[6px] bg-[#117dff] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0]">
            {t('overview.harness.tryPreview', 'Try preview')}
          </button>
        </div>
      )}
      {notice && (
        <div className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-2 text-[11px] text-amber-700"><AlertTriangle size={13} />{notice}</p>
          <button type="button" onClick={() => bootstrap({ activatePreview: mode === 'preview' })} className="text-[11px] font-medium text-amber-700 hover:text-[#0a0a0a]">
            {t('overview.harness.retry', 'Retry')}
          </button>
        </div>
      )}
      {connecting ? (
        <div className="flex min-h-[360px] flex-1 items-center justify-center bg-[#faf9f4]">
          <div className="h-1 w-44 overflow-hidden rounded-full bg-[#e7e4dc]" aria-label="Opening HIVE-MIND chat">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#117dff]" />
          </div>
        </div>
      ) : legacy}
    </div>
  );
}

export { HARNESS_EXCHANGE_PATH, HARNESS_OVERVIEW_PATH, canonicalHarnessDestination, navigateHarnessTicket, validBootstrap };
