import React, { useEffect, useRef } from 'react';

/** Cloudflare Turnstile for email sign-in, shared by the HIVEMIND login and the developer community. */
export function prepareEmailSecurityScript() {
  let script = document.querySelector('script[data-singulance-turnstile]');
  if (script?.dataset.loadState === 'error') { script.remove(); script = null; }
  if (!script) {
    script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.singulanceTurnstile = 'true';
    script.addEventListener('load', () => { script.dataset.loadState = 'ready'; }, { once: true });
    script.addEventListener('error', () => { script.dataset.loadState = 'error'; }, { once: true });
    document.head.appendChild(script);
  }
  return script;
}

export default function EmailTurnstile({ siteKey, onToken, onStatus }) {
  const host = useRef(null);
  useEffect(() => {
    if (!siteKey || !host.current) return undefined;
    let widgetId;
    let disposed = false;
    let timer;
    const fail = () => {
      if (disposed) return;
      window.clearTimeout(timer);
      onToken(''); onStatus('error');
    };
    const checking = () => {
      if (disposed) return;
      onToken(''); onStatus('checking');
      window.clearTimeout(timer);
      timer = window.setTimeout(fail, 15000);
    };
    checking();
    const render = () => {
      if (!window.turnstile || !host.current || widgetId !== undefined) return;
      try { widgetId = window.turnstile.render(host.current, {
        sitekey: siteKey, action: 'email_auth', appearance: 'always', size: 'flexible',
        retry: 'auto', 'retry-interval': 3000, 'refresh-expired': 'auto',
        callback: (token) => { if (!disposed) { window.clearTimeout(timer); onToken(token); onStatus('ready'); } },
        'expired-callback': checking,
        'timeout-callback': fail,
        'error-callback': fail,
      }); } catch { fail(); }
    };
    const script = prepareEmailSecurityScript();
    script.addEventListener('load', render); script.addEventListener('error', fail); render();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      script.removeEventListener('load', render); script.removeEventListener('error', fail);
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, onStatus, onToken]);
  return siteKey ? <div ref={host} className="min-h-[65px] w-full" aria-label="Bot verification" /> : null;
}
