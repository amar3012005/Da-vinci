import React, { useEffect, useState } from 'react';
import { buildCompanyBrainTarget } from '../shared/company-brain-room';
import { preloadAllowed, whenIdle } from '../shared/open-dot-preload';

/**
 * Hidden 0x0 copy of the Company Brain room. Brain chat is a top-level page on the brain-runner origin; loading the room here once, while
 * the person is elsewhere in the app, fills the browser HTTP cache and installs the OpenDot service worker, so the real navigation paints from cache.
 * Skipped on Data Saver and 2G. It is never shown and never receives a handshake.
 * @param {{ language?: string }} props - interface language for the room address.
 */
export default function CompanyBrainWarmup({ language }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!preloadAllowed()) return undefined;
    return whenIdle(() => setSrc(current => current || buildCompanyBrainTarget(language)), 4000);
  }, [language]);
  if (!src) return null;
  return <iframe src={src} title="Company Brain preload" aria-hidden="true" tabIndex={-1} data-company-brain-warmup
    style={{ position: 'absolute', width: 0, height: 0, border: 0, opacity: 0, pointerEvents: 'none' }} />;
}
