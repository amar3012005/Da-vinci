import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { registerOpenDotFrame } from '../shared/open-dot-frames';
import { openDotLocale } from '../shared/open-dot-embed-target';
import { COMPANY_BRAIN_ORIGIN, buildCompanyBrainTarget, postToCompanyBrainFrame } from '../shared/company-brain-room';

const READY_TIMEOUT_MS = 15000;

/**
 * The Company Brain OpenDot room (brain-runner) embedded in the overview content area. The owner keeps it mounted
 * and hidden after the first load, so showing it is a display toggle on an already booted document.
 * @param {{ active: boolean, onStatus: (status: 'ready'|'failed') => void }} props - `active` when the room is on screen;
 *   `onStatus` reports `ready` once the room answered the handshake and `failed` when it did not within the timeout.
 */
export default function CompanyBrainRoom({ active, onStatus }) {
  const { t, i18n } = useTranslation('dashboard');
  const language = openDotLocale(i18n.language);
  const languageRef = useRef(language);
  languageRef.current = language;
  // The first address carries the language; later changes arrive as a message.
  const [src] = useState(() => buildCompanyBrainTarget(i18n.language));
  const iframeRef = useRef(null);
  const registration = useRef(null);
  const attachFrame = useCallback(node => {
    iframeRef.current = node;
    registration.current?.();
    registration.current = node ? registerOpenDotFrame(node) : null;
  }, []);
  const [loadedKey, setLoadedKey] = useState(null);
  const [readyKey, setReadyKey] = useState(null);
  const [failedKey, setFailedKey] = useState(null);
  // The handshake keeps running after a timeout, so a slow room that answers later still takes over from the fallback.
  const frameKey = 'company-brain';
  const ready = readyKey === frameKey;
  const failed = failedKey === frameKey && !ready;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (ready) return undefined;
    const timer = window.setTimeout(() => { setFailedKey(frameKey); onStatusRef.current('failed'); }, READY_TIMEOUT_MS);
    const connect = () => { if (loadedKey === frameKey) postToCompanyBrainFrame(iframeRef.current, { type: 'hivemind.open-dot.connect', version: 1 }); };
    connect();
    const probe = window.setInterval(connect, 1000);
    const onMessage = event => {
      if (event.origin !== COMPANY_BRAIN_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'hivemind.open-dot.locale' && event.data.version === 1 && typeof event.data.locale === 'string') {
        const next = openDotLocale(event.data.locale);
        if (next && next !== languageRef.current && (i18n.options?.supportedLngs || []).includes(next)) i18n.changeLanguage(next);
        return;
      }
      if (event.data?.type !== 'hivemind.open-dot.ready' || event.data.version !== 1) return;
      setReadyKey(frameKey);
      onStatusRef.current('ready');
    };
    window.addEventListener('message', onMessage);
    return () => { window.clearTimeout(timer); window.clearInterval(probe); window.removeEventListener('message', onMessage); };
  }, [frameKey, loadedKey, ready, i18n]);

  // Language changes after the first paint go to the room as a message, as for employee rooms.
  useEffect(() => {
    if (!language || !ready) return;
    postToCompanyBrainFrame(iframeRef.current, { type: 'hivemind.open-dot.locale', version: 1, locale: language });
  }, [language, ready]);

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" aria-busy={!ready && !failed}
      data-company-brain-room data-ready={String(ready)} hidden={!active} style={{ display: active ? 'flex' : 'none' }}>
      {!ready && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <AsciiWorkspaceLoading label={t('companyBrain.connecting', 'Opening Brain…')} />
        </div>
      )}
      <iframe
        key={frameKey}
        ref={attachFrame}
        onLoad={() => setLoadedKey(frameKey)}
        title={t('companyBrain.title', 'Company Brain')}
        src={src}
        allow="microphone; autoplay; clipboard-write"
        className="h-full min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
