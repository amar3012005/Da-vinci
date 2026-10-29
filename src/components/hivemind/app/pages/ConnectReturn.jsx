import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appReturnLink, parseConnectReturn, returnTarget } from '../shared/connect-return';

/**
 * Public page a provider redirects to after app authorization. It needs no
 * session: inside the product (or a browser tab) it loads the page the person
 * started from, and in the system browser it hands the person back to the
 * desktop or mobile app. Sign-in is decided by the destination page, so a
 * signed-in person never sees the login or create-account page.
 */
export default function ConnectReturn() {
  const location = useLocation();
  const result = useMemo(() => parseConnectReturn(location.search), [location.search]);
  const target = returnTarget(result);
  const inApp = typeof window !== 'undefined'
    && (window.electron?.isElectron === true || window.Capacitor?.isNativePlatform?.() === true);
  const handBack = result.client !== 'web' && !inApp;
  const [handedBack, setHandedBack] = useState(false);

  useEffect(() => {
    if (!handBack) { window.location.replace(target); return undefined; }
    window.location.href = appReturnLink(result);
    const timer = window.setTimeout(() => setHandedBack(true), 1500);
    return () => window.clearTimeout(timer);
  }, [handBack, result, target]);

  if (!handBack) return null;
  const name = (result.toolkit || 'The app').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const failed = result.status === 'failed';
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf9f4', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div>
        <h1 style={{ fontSize: 18, margin: 0 }}>{failed ? `${name} was not connected` : `${name} connected`}</h1>
        <p style={{ color: '#5f5b54', fontSize: 14 }}>{handedBack ? 'If SINGULANCE did not open, use the button below.' : 'Returning to SINGULANCE…'}</p>
        <p>
          <a href={appReturnLink(result)} style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 999, background: '#111', color: '#fff', textDecoration: 'none', fontSize: 14 }}>Open SINGULANCE</a>
        </p>
        <p><a href={target} style={{ color: '#117dff', fontSize: 13 }}>Continue in this browser</a></p>
      </div>
    </main>
  );
}
