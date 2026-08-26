import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import './i18n';
import { TProvider } from './components/i18n/T';
import App from './App';
import { initPostHog } from './analytics/posthog';
import { installChunkLoadRecovery } from './chunk-load-recovery';

// A tab opened before a deployment can still reference the previous hashed
// chunks. Recover once against the newly revalidated SPA shell.
installChunkLoadRecovery();

// Product analytics + session replay (no-op until REACT_APP_POSTHOG_KEY is set).
initPostHog();

const rootEl = document.getElementById('root');
const tree = (
  <React.StrictMode>
    <HelmetProvider>
      <TProvider enabled>
        <App />
      </TProvider>
    </HelmetProvider>
  </React.StrictMode>
);

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}

// Register the PWA service worker (enables Android install prompt + offline
// launch shell). Best-effort; never blocks the app. Served from origin root.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ });
  });
}
