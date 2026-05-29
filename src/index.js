import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import './i18n';
import { TProvider } from './components/i18n/T';
import App from './App';

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
