import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { TProvider } from './components/i18n/T';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TProvider enabled>
      <App />
    </TProvider>
  </React.StrictMode>
);
